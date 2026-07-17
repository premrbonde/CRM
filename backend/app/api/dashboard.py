from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import date, datetime, timedelta
from typing import List, Dict, Any, Optional
from app.database import get_db
from app.models import Interaction, FollowUp, Doctor, User, Product
from app.api.auth import get_current_user
from pydantic import BaseModel

router = APIRouter(prefix="/api", tags=["dashboard"])

# Pydantic Schemas for Dashboard Response
class DailyBriefResponse(BaseModel):
    doctor_name: str
    hospital: str
    specialization: str
    relationship_score: int
    opportunity_score: str
    last_visit: str
    recommended_product: str
    expected_success: int
    ai_summary: str
    reason: str

class InsightItem(BaseModel):
    id: int
    title: str
    summary: str
    category: str # RISK, OPP, TREND
    link_label: str

class TodayScheduleItem(BaseModel):
    id: int
    doctor_name: str
    hospital: str
    time: str
    visit_type: str
    priority: str

class PendingFollowupItem(BaseModel):
    id: int
    doctor_name: str
    hospital: str
    due_date: str
    priority: str
    product: str
    objective: str

class HighPriorityHCPItem(BaseModel):
    id: int
    doctor_name: str
    hospital: str
    relationship_score: int
    trend: str # up, down, neutral
    risk: str # Low, Medium, High
    opportunity_score: str

class ProductOpportunityResponse(BaseModel):
    recommended_product: str
    interest_pct: int
    doctors_discussing: int
    expected_conversion: int
    weekly_trend: int
    top_region: str
    opportunity: str

class PerformanceSummaryResponse(BaseModel):
    today_visits: int
    completed_visits: int
    pending_visits: int
    monthly_target: int
    achievement_pct: int
    active_doctors: int
    interactions_this_week: int
    followups_pending: int

class RecentActivityItem(BaseModel):
    id: int
    activity_type: str
    description: str
    time: str

class NotificationItem(BaseModel):
    id: int
    message: str
    time: str
    type: str # INFO, WARNING, SUCCESS

class SearchResultItem(BaseModel):
    id: int
    title: str
    subtitle: str
    type: str # Doctor, Hospital, Product, Interaction

class GlobalSearchResponse(BaseModel):
    query: str
    results: List[SearchResultItem]

# ── Weighted multi-factor AI success probability engine ─────────────────────
def compute_success_probability(
    relationship_score: int,
    interest_level: str,
    days_since_last_interaction: int,
    positive_sentiments: int,
    negative_sentiments: int,
    total_interactions: int,
    completed_followups: int,
    pending_followups: int,
) -> int:
    """
    Calculates a 0-99 success probability using a weighted multi-factor model:
      30% — Relationship Score   (normalized trust/loyalty)
      25% — Interest Level       (High=100, Medium=60, Low=20)
      20% — Recency              (exponential decay by days since last visit)
      15% — Sentiment History    (positive ratio minus negative penalty)
      10% — Follow-up Completion (completed / total follow-ups)
    """
    # 1. Relationship score (30%)
    rel_component = (min(100, relationship_score or 0) / 100.0) * 30

    # 2. Interest level (25%)
    interest_map = {"High": 100, "Medium": 60, "Low": 20}
    interest_val = interest_map.get(interest_level or "Medium", 60)
    interest_component = (interest_val / 100.0) * 25

    # 3. Recency — stepped decay (20%)
    d = max(0, days_since_last_interaction)
    recency_score = 100 if d <= 7 else 80 if d <= 14 else 50 if d <= 30 else 20 if d <= 60 else 5
    recency_component = (recency_score / 100.0) * 20

    # 4. Sentiment history (15%)
    if total_interactions > 0:
        pos_ratio = positive_sentiments / total_interactions
        neg_penalty = (negative_sentiments / total_interactions) * 0.5
        sentiment_score = max(0.0, min(100.0, (pos_ratio - neg_penalty) * 100))
    else:
        sentiment_score = 50.0
    sentiment_component = (sentiment_score / 100.0) * 15

    # 5. Follow-up completion rate (10%)
    total_f = completed_followups + pending_followups
    completion_rate = (completed_followups / total_f) if total_f > 0 else 0.5
    followup_component = completion_rate * 10

    total = rel_component + interest_component + recency_component + sentiment_component + followup_component
    return max(5, min(99, int(round(total))))


# ── Core helpers to compute metrics from Database ────────────────────────────
def get_daily_brief_data(db: Session, user_id: int) -> DailyBriefResponse:
    doc = db.query(Doctor).order_by(Doctor.relationship_score.desc()).first()
    if not doc:
        return DailyBriefResponse(
            doctor_name="No HCP profiles yet",
            hospital="—", specialization="—",
            relationship_score=0, opportunity_score="—",
            last_visit="No visits logged", recommended_product="—",
            expected_success=0,
            ai_summary="Add your first HCP and log an interaction to see AI insights here.",
            reason="No data available"
        )

    doc_name, hosp, spec = doc.name, doc.hospital, doc.specialization
    score = doc.relationship_score or 0
    opp = doc.sales_opportunity or "Medium"

    # Dynamic last_visit — most recent interaction for this doctor
    last_interaction = (
        db.query(Interaction)
        .filter(Interaction.doctor_name.ilike(f"%{doc_name}%"))
        .order_by(Interaction.interaction_date.desc())
        .first()
    )
    if last_interaction and last_interaction.interaction_date:
        days_ago = (date.today() - last_interaction.interaction_date).days
        last_visit = "Today" if days_ago == 0 else "Yesterday" if days_ago == 1 else f"{days_ago} days ago"
    else:
        days_ago, last_visit = 999, "No visits logged"

    # Dynamic recommended product from next_best_action or last interaction
    recommended_product = "—"
    if doc.next_best_action:
        parts = doc.next_best_action.split("|")
        prod_part = parts[0].replace("Product:", "").strip()
        if prod_part:
            recommended_product = prod_part
    if recommended_product == "—" and last_interaction and last_interaction.products_discussed:
        recommended_product = last_interaction.products_discussed.split(",")[0].strip()

    # Gather stats for weighted scoring
    all_ints = db.query(Interaction).filter(Interaction.doctor_name.ilike(f"%{doc_name}%")).all()
    total_ints = len(all_ints)
    pos_sents = sum(1 for i in all_ints if i.sentiment == "Positive")
    neg_sents = sum(1 for i in all_ints if i.sentiment == "Negative")
    completed_f = (
        db.query(FollowUp).join(Interaction)
        .filter(Interaction.doctor_name.ilike(f"%{doc_name}%"), FollowUp.status == "Completed")
        .count()
    )
    pending_f = (
        db.query(FollowUp).join(Interaction)
        .filter(Interaction.doctor_name.ilike(f"%{doc_name}%"), FollowUp.status == "Pending")
        .count()
    )
    last_interest = last_interaction.interest_level if last_interaction else "Medium"

    expected_success = compute_success_probability(
        relationship_score=score,
        interest_level=last_interest,
        days_since_last_interaction=days_ago,
        positive_sentiments=pos_sents,
        negative_sentiments=neg_sents,
        total_interactions=total_ints,
        completed_followups=completed_f,
        pending_followups=pending_f,
    )

    ai_summary = doc.ai_summary or (
        f"{doc_name} at {hosp} shows a {opp.lower()} opportunity. "
        "Log interactions to generate an AI relationship summary."
    )
    reason = doc.next_best_action or f"Doctor shows a {opp.lower()} sales opportunity based on relationship score of {score}."

    return DailyBriefResponse(
        doctor_name=doc_name, hospital=hosp, specialization=spec,
        relationship_score=score, opportunity_score=opp,
        last_visit=last_visit, recommended_product=recommended_product,
        expected_success=expected_success, ai_summary=ai_summary, reason=reason
    )


def get_insights_data(db: Session, user_id: int) -> List[InsightItem]:
    today = date.today()
    cutoff_21 = today - timedelta(days=21)
    insights: List[InsightItem] = []

    # INSIGHT 1 (RISK): HCPs not visited in 21+ days
    all_docs = db.query(Doctor).all()
    at_risk = 0
    for d in all_docs:
        last = (
            db.query(Interaction)
            .filter(Interaction.doctor_name.ilike(f"%{d.name}%"))
            .order_by(Interaction.interaction_date.desc())
            .first()
        )
        if not last or last.interaction_date < cutoff_21:
            at_risk += 1
    if at_risk > 0:
        insights.append(InsightItem(
            id=1,
            title=f"{at_risk} HCP{'s have' if at_risk > 1 else ' has'} not been visited in over 21 days.",
            summary="High risk of brand neglect and competitor outreach.",
            category="RISK", link_label="View Now →"
        ))

    # INSIGHT 2 (TREND): Most discussed product this week
    start_week = today - timedelta(days=7)
    product_counts: Dict[str, int] = {}
    for inter in db.query(Interaction).filter(
        Interaction.created_by == user_id,
        Interaction.interaction_date >= start_week
    ).all():
        for p in (inter.products_discussed or "").split(","):
            p = p.strip()
            if p:
                product_counts[p] = product_counts.get(p, 0) + 1
    if product_counts:
        top_p = max(product_counts, key=product_counts.get)
        cnt = product_counts[top_p]
        insights.append(InsightItem(
            id=2,
            title=f"{top_p} discussed in {cnt} interaction{'s' if cnt != 1 else ''} this week.",
            summary="Strong territory demand — prioritize this product in upcoming visits.",
            category="TREND", link_label="See Details →"
        ))

    # INSIGHT 3 (OPP): Highest-opportunity doctor with a pending follow-up
    top_opp = db.query(Doctor).filter(Doctor.sales_opportunity == "High").order_by(Doctor.relationship_score.desc()).first()
    if top_opp:
        pending = (
            db.query(FollowUp).join(Interaction)
            .filter(Interaction.doctor_name.ilike(f"%{top_opp.name}%"), FollowUp.status == "Pending")
            .first()
        )
        if pending:
            action = (top_opp.next_best_action or "Schedule the next visit to maintain momentum.")[:120]
            insights.append(InsightItem(
                id=3,
                title=f"High-potential opportunity with {top_opp.name}.",
                summary=action,
                category="OPP", link_label="View Recommendation →"
            ))

    if not insights:
        insights.append(InsightItem(
            id=1,
            title="All HCPs are up to date — great work!",
            summary="No risk flags detected. Log new interactions to generate AI insights.",
            category="TREND", link_label="Log Interaction →"
        ))
    return insights


def get_today_schedule_data(db: Session, user_id: int) -> List[TodayScheduleItem]:
    today = date.today()
    followups = (
        db.query(FollowUp).join(Interaction)
        .filter(Interaction.created_by == user_id, FollowUp.follow_up_date == today)
        .order_by(FollowUp.priority.desc())
        .all()
    )
    times = ["09:00 AM", "10:30 AM", "12:00 PM", "02:30 PM", "04:00 PM"]
    output = [
        TodayScheduleItem(
            id=f.id,
            doctor_name=f.interaction.doctor_name,
            hospital=f.interaction.hospital,
            time=times[idx % len(times)],
            visit_type=f.interaction.interaction_type,
            priority=f.priority or "Medium"
        )
        for idx, f in enumerate(followups)
    ]
    return output[:3]


def get_pending_followups_data(db: Session, user_id: int) -> List[PendingFollowupItem]:
    today = date.today()
    followups = (
        db.query(FollowUp).join(Interaction)
        .filter(
            Interaction.created_by == user_id,
            FollowUp.status == "Pending",
            FollowUp.follow_up_date >= today
        )
        .order_by(FollowUp.follow_up_date.asc())
        .limit(3)
        .all()
    )
    return [
        PendingFollowupItem(
            id=f.id,
            doctor_name=f.interaction.doctor_name,
            hospital=f.interaction.hospital,
            due_date=f.follow_up_date.strftime("%b %d, %Y"),
            priority=f.priority or "Medium",
            product=(f.interaction.products_discussed or "—").split(",")[0].strip(),
            objective=f.notes or f.objective or "Follow up on last discussion"
        )
        for f in followups
    ]


def get_high_priority_hcps_data(db: Session, user_id: int) -> List[HighPriorityHCPItem]:
    docs = db.query(Doctor).order_by(Doctor.relationship_score.desc()).limit(3).all()
    output = []
    for d in docs:
        # Determine trend from last two interactions
        recent = (
            db.query(Interaction)
            .filter(Interaction.doctor_name.ilike(f"%{d.name}%"))
            .order_by(Interaction.interaction_date.desc())
            .limit(2).all()
        )
        trend = "neutral"
        if len(recent) >= 2:
            if recent[0].interest_level == "High" and recent[1].interest_level != "High":
                trend = "up"
            elif recent[0].interest_level == "Low" and recent[1].interest_level != "Low":
                trend = "down"
        elif len(recent) == 1:
            trend = "up" if recent[0].interest_level == "High" else "neutral"

        output.append(HighPriorityHCPItem(
            id=d.id, doctor_name=d.name, hospital=d.hospital,
            relationship_score=d.relationship_score or 0,
            trend=trend, risk=d.risk_level or "Low",
            opportunity_score=d.sales_opportunity or "Medium"
        ))
    return output


def get_product_opportunity_data(db: Session, user_id: int) -> ProductOpportunityResponse:
    # Find most-discussed product across all interactions for this user
    interactions = db.query(Interaction).filter(Interaction.created_by == user_id).all()
    product_counts: Dict[str, int] = {}
    for inter in interactions:
        for p in (inter.products_discussed or "").split(","):
            p = p.strip()
            if p:
                product_counts[p] = product_counts.get(p, 0) + 1

    if not product_counts:
        return ProductOpportunityResponse(
            recommended_product="—", interest_pct=0, doctors_discussing=0,
            expected_conversion=0, weekly_trend=0, top_region="—", opportunity="No data yet"
        )

    top_product = max(product_counts, key=product_counts.get)
    total_discussing = product_counts[top_product]

    total_for_prod = db.query(Interaction).filter(Interaction.products_discussed.ilike(f"%{top_product}%")).count()
    positive_for_prod = db.query(Interaction).filter(
        Interaction.products_discussed.ilike(f"%{top_product}%"),
        Interaction.sentiment == "Positive"
    ).count()
    interest_pct = int((positive_for_prod / total_for_prod) * 100) if total_for_prod > 0 else 0
    expected_conversion = max(0, min(99, int(interest_pct * 0.75)))

    today = date.today()
    this_week = db.query(Interaction).filter(
        Interaction.products_discussed.ilike(f"%{top_product}%"),
        Interaction.interaction_date >= today - timedelta(days=7)
    ).count()
    last_week = db.query(Interaction).filter(
        Interaction.products_discussed.ilike(f"%{top_product}%"),
        Interaction.interaction_date >= today - timedelta(days=14),
        Interaction.interaction_date < today - timedelta(days=7)
    ).count()
    weekly_trend = this_week - last_week

    city_counts: Dict[str, int] = {}
    for inter in db.query(Interaction).filter(Interaction.products_discussed.ilike(f"%{top_product}%")).all():
        doc = db.query(Doctor).filter(Doctor.name.ilike(f"%{inter.doctor_name}%")).first()
        if doc and doc.city:
            city_counts[doc.city] = city_counts.get(doc.city, 0) + 1
    top_region = max(city_counts, key=city_counts.get) if city_counts else "All Regions"
    opportunity = "High Potential" if interest_pct >= 70 else "Medium Potential" if interest_pct >= 40 else "Developing"

    return ProductOpportunityResponse(
        recommended_product=top_product, interest_pct=interest_pct,
        doctors_discussing=total_discussing, expected_conversion=expected_conversion,
        weekly_trend=weekly_trend, top_region=top_region, opportunity=opportunity
    )


def get_performance_summary_data(db: Session, user_id: int) -> PerformanceSummaryResponse:
    today = date.today()
    start_of_month = today.replace(day=1)

    today_visits = db.query(Interaction).filter(
        Interaction.created_by == user_id, Interaction.interaction_date == today, ~Interaction.notes.like("Planned:%")
    ).count()
    completed_visits = db.query(FollowUp).join(Interaction).filter(
        Interaction.created_by == user_id,
        FollowUp.status == "Completed",
        FollowUp.follow_up_date >= start_of_month
    ).count()
    pending_visits = db.query(FollowUp).join(Interaction).filter(
        Interaction.created_by == user_id, FollowUp.status == "Pending"
    ).count()
    total_hcps = db.query(Doctor).count()
    interactions_this_month = db.query(Interaction).filter(
        Interaction.created_by == user_id,
        Interaction.interaction_date >= start_of_month,
        ~Interaction.notes.like("Planned:%")
    ).count()

    monthly_target = 24
    achievement_pct = min(100, int((interactions_this_month / monthly_target) * 100)) if monthly_target > 0 else 0

    return PerformanceSummaryResponse(
        today_visits=today_visits,
        completed_visits=completed_visits,
        pending_visits=pending_visits,
        monthly_target=monthly_target,
        achievement_pct=achievement_pct,
        active_doctors=total_hcps,
        interactions_this_week=interactions_this_month,
        followups_pending=pending_visits
    )


def get_recent_activities_data(db: Session, user_id: int) -> List[RecentActivityItem]:
    today = date.today()
    interactions = (
        db.query(Interaction)
        .filter(Interaction.created_by == user_id, ~Interaction.notes.like("Planned:%"))
        .order_by(Interaction.interaction_date.desc(), Interaction.created_at.desc())
        .limit(5).all()
    )
    output = []
    for item in interactions:
        if item.interaction_date == today:
            time_str = item.created_at.strftime("%I:%M %p") if item.created_at else "Today"
        elif item.interaction_date == today - timedelta(days=1):
            time_str = "Yesterday"
        else:
            time_str = item.interaction_date.strftime("%b %d")
        output.append(RecentActivityItem(
            id=item.id,
            activity_type="Interaction Logged",
            description=f"Logged visit with {item.doctor_name} at {item.hospital} — {item.interaction_type}",
            time=time_str
        ))
    return output


def get_notifications_data(db: Session, user_id: int) -> List[NotificationItem]:
    today = date.today()
    notifications: List[NotificationItem] = []
    nid = 1

    # 1. Today's upcoming visit
    today_visit = (
        db.query(FollowUp).join(Interaction)
        .filter(Interaction.created_by == user_id, FollowUp.follow_up_date == today, FollowUp.status == "Pending")
        .order_by(FollowUp.priority.desc()).first()
    )
    if today_visit:
        notifications.append(NotificationItem(
            id=nid, type="INFO", time="Today",
            message=f"Visit with {today_visit.interaction.doctor_name} scheduled for today."
        ))
        nid += 1

    # 2. Overdue follow-ups
    overdue = db.query(FollowUp).join(Interaction).filter(
        Interaction.created_by == user_id, FollowUp.status == "Pending", FollowUp.follow_up_date < today
    ).count()
    if overdue > 0:
        notifications.append(NotificationItem(
            id=nid, type="WARNING", time="Overdue",
            message=f"{overdue} follow-up{'s are' if overdue > 1 else ' is'} overdue — take action now."
        ))
        nid += 1

    # 3. Low stock alert (< 20 units)
    low_stock = db.query(Product).filter(Product.sample_inventory < 20, Product.sample_inventory > 0).first()
    if low_stock:
        notifications.append(NotificationItem(
            id=nid, type="WARNING", time="Inventory",
            message=f"{low_stock.name} stock is low: {low_stock.sample_inventory} units remaining."
        ))
        nid += 1

    # 4. Out-of-stock product
    oos = db.query(Product).filter(Product.sample_inventory == 0).first()
    if oos:
        notifications.append(NotificationItem(
            id=nid, type="WARNING", time="Inventory",
            message=f"{oos.name} is out of stock — restock immediately."
        ))
        nid += 1

    # 5. High-risk doctor alert
    high_risk = db.query(Doctor).filter(Doctor.risk_level == "High").first()
    if high_risk:
        notifications.append(NotificationItem(
            id=nid, type="WARNING", time="AI Alert",
            message=f"High-risk HCP alert: {high_risk.name} requires immediate attention."
        ))
        nid += 1

    # 6. AI next best action ready
    nba_doc = (
        db.query(Doctor)
        .filter(Doctor.next_best_action != None, Doctor.next_best_action != "")
        .order_by(Doctor.relationship_score.desc()).first()
    )
    if nba_doc:
        notifications.append(NotificationItem(
            id=nid, type="SUCCESS", time="AI",
            message=f"AI recommendation ready for {nba_doc.name} — check next best action."
        ))

    return notifications[:5]

# Dashboard APIs
@router.get("/dashboard/daily-brief", response_model=DailyBriefResponse)
def get_daily_brief(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return get_daily_brief_data(db, current_user.id)

@router.get("/dashboard/insights", response_model=List[InsightItem])
def get_insights(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return get_insights_data(db, current_user.id)

@router.get("/calendar/today", response_model=List[TodayScheduleItem])
def get_today_schedule(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return get_today_schedule_data(db, current_user.id)

@router.get("/dashboard/followups", response_model=List[PendingFollowupItem])
def get_dashboard_followups(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return get_pending_followups_data(db, current_user.id)

@router.get("/dashboard/high-priority", response_model=List[HighPriorityHCPItem])
def get_high_priority(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return get_high_priority_hcps_data(db, current_user.id)

@router.get("/dashboard/product-opportunity", response_model=ProductOpportunityResponse)
def get_product_opportunity(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return get_product_opportunity_data(db, current_user.id)

@router.get("/dashboard/performance", response_model=PerformanceSummaryResponse)
def get_performance(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return get_performance_summary_data(db, current_user.id)

@router.get("/dashboard/recent-activities", response_model=List[RecentActivityItem])
def get_recent_activities(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return get_recent_activities_data(db, current_user.id)

@router.get("/dashboard/notifications", response_model=List[NotificationItem])
def get_notifications(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return get_notifications_data(db, current_user.id)

# Unified Single Response Dashboard Stats endpoint
@router.get("/dashboard", response_model=Dict[str, Any])
def get_unified_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    user_id = current_user.id
    return {
        "daily_brief": get_daily_brief_data(db, user_id),
        "insights": get_insights_data(db, user_id),
        "schedule": get_today_schedule_data(db, user_id),
        "followups": get_pending_followups_data(db, user_id),
        "high_priority_hcps": get_high_priority_hcps_data(db, user_id),
        "product_opportunity": get_product_opportunity_data(db, user_id),
        "performance": get_performance_summary_data(db, user_id),
        "recent_activities": get_recent_activities_data(db, user_id),
        "notifications": get_notifications_data(db, user_id),
    }

# Search endpoint
@router.get("/search", response_model=GlobalSearchResponse)
def get_global_search(q: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    results = []
    
    # 1. Search Doctors
    docs = db.query(Doctor).filter(
        (Doctor.name.ilike(f"%{q}%")) | 
        (Doctor.hospital.ilike(f"%{q}%")) | 
        (Doctor.specialization.ilike(f"%{q}%")) |
        (Doctor.city.ilike(f"%{q}%"))
    ).limit(3).all()
    for d in docs:
        results.append(SearchResultItem(id=d.id, title=d.name, subtitle=f"{d.specialization} • {d.hospital}", type="Doctor"))

    # 2. Search Products
    prods = db.query(Product).filter(
        (Product.name.ilike(f"%{q}%")) | (Product.code.ilike(f"%{q}%")) | (Product.therapeutic_area.ilike(f"%{q}%"))
    ).limit(3).all()
    for p in prods:
        results.append(SearchResultItem(id=p.id, title=p.name, subtitle=f"{p.code} • {p.therapeutic_area}", type="Product"))

    # 3. Search Interactions
    inters = db.query(Interaction).filter(
        (Interaction.created_by == current_user.id) & 
        ((Interaction.doctor_name.ilike(f"%{q}%")) | (Interaction.summary.ilike(f"%{q}%")) | (Interaction.products_discussed.ilike(f"%{q}%")))
    ).limit(3).all()
    for i in inters:
        results.append(SearchResultItem(id=i.id, title=f"Logged visit with {i.doctor_name}", subtitle=f"{i.interaction_date} • {i.summary[:60]}...", type="Interaction"))

    return GlobalSearchResponse(query=q, results=results)
