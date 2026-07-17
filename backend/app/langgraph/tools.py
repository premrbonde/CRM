import json
from datetime import datetime, date, timedelta
from typing import List, Optional, Dict, Any
from langchain_core.tools import tool
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import User, Doctor, Interaction, FollowUp

def get_db_session():
    return SessionLocal()

# ── Shared weighted multi-factor relationship scorer ─────────────────────────
def _compute_relationship_score(
    base_score: int,
    interest_level: str,
    days_since_last: int,
    positive_count: int,
    negative_count: int,
    total_count: int,
    completed_followups: int,
    pending_followups: int,
) -> int:
    """
    Weighted relationship score (0-100) — mirrors dashboard success probability:
      30% base relationship score, 25% interest, 20% recency,
      15% sentiment history, 10% follow-up completion.
    """
    rel = (min(100, base_score or 0) / 100.0) * 30
    interest_map = {"High": 100, "Medium": 60, "Low": 20}
    interest_v = (interest_map.get(interest_level or "Medium", 60) / 100.0) * 25
    d = max(0, days_since_last)
    rec = (100 if d <= 7 else 80 if d <= 14 else 50 if d <= 30 else 20 if d <= 60 else 5) / 100.0 * 20
    if total_count > 0:
        sent_score = max(0.0, min(100.0, ((positive_count / total_count) - (negative_count / total_count) * 0.5) * 100))
    else:
        sent_score = 50.0
    sent = (sent_score / 100.0) * 15
    total_f = completed_followups + pending_followups
    fol = ((completed_followups / total_f) if total_f > 0 else 0.5) * 10
    return max(5, min(100, int(round(rel + interest_v + rec + sent + fol))))

def analyze_sentiment_rules(notes: str) -> str:
    """Analyze sentiment based on keyword matching."""
    notes_lower = notes.lower()
    pos_words = ["interested", "great", "excellent", "impressed", "positive", "good", "satisfied", "excited", "happy", "will prescribe", "willing", "receptive"]
    neg_words = ["uninterested", "busy", "rejected", "negative", "bad", "poor", "skeptical", "complained", "difficult", "dislike", "refused", "concerned", "query"]
    
    pos_count = sum(1 for w in pos_words if w in notes_lower)
    neg_count = sum(1 for w in neg_words if w in notes_lower)
    
    if pos_count > neg_count:
        return "Positive"
    elif neg_count > pos_count:
        return "Negative"
    else:
        return "Neutral"

import re

def parse_date_string(date_str: str) -> Optional[date]:
    if not date_str:
        return None
    ds = date_str.lower().strip()
    today = date.today()
    
    if "today" in ds:
        return today
    elif "tomorrow" in ds:
        return today + timedelta(days=1)
    elif "next monday" in ds:
        days_ahead = 0 - today.weekday()
        if days_ahead <= 0:
            days_ahead += 7
        return today + timedelta(days=days_ahead)
    elif "next friday" in ds:
        days_ahead = 4 - today.weekday()
        if days_ahead <= 0:
            days_ahead += 7
        return today + timedelta(days=days_ahead)
    elif "next week" in ds:
        return today + timedelta(days=7)
    elif "two weeks" in ds or "2 weeks" in ds:
        return today + timedelta(days=14)
    elif "three weeks" in ds or "3 weeks" in ds:
        return today + timedelta(days=21)
    elif "next month" in ds:
        return today + timedelta(days=30)
        
    match = re.search(r"(\d{4}-\d{2}-\d{2})", ds)
    if match:
        try:
            return datetime.strptime(match.group(1), "%Y-%m-%d").date()
        except Exception:
            pass
            
    for fmt in ("%b %d, %Y", "%b %d %Y", "%B %d, %Y", "%B %d %Y", "%Y/%m/%d", "%d/%m/%Y", "%m/%d/%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(date_str.strip(), fmt).date()
        except ValueError:
            pass
            
    return None

# 1. LOG INTERACTION TOOL
@tool
def log_interaction_tool(
    doctor_name: str,
    hospital: Optional[str] = None,
    specialization: Optional[str] = None,
    interaction_type: Optional[str] = "Meeting",
    meeting_mode: Optional[str] = "In-Person",
    meeting_objective: Optional[str] = "Product Discussion",
    interaction_date: Optional[str] = None,
    interaction_time: Optional[str] = "10:30",
    products_discussed: Optional[Any] = None,
    topics_discussed: Optional[str] = None,
    materials_shared: Optional[Any] = None,
    samples_distributed: Optional[Any] = None,
    sentiment: Optional[str] = "Positive",
    interest_level: Optional[str] = "Medium",
    key_outcomes: Optional[str] = None,
    next_step: Optional[str] = None,
    priority: Optional[str] = "Medium",
    follow_up_date: Optional[str] = None,
    summary: Optional[str] = None,
    notes: Optional[str] = None,
    created_by_user_id: Optional[Any] = 1
) -> str:
    """
    Logs a new interaction with a doctor. Creates a doctor profile if it doesn't exist.
    Extracts all structured fields from the meeting description to auto-populate the log form.
    
    Inputs:
    - doctor_name: Full name of the doctor (e.g. Dr. Rahul Sharma)
    - hospital: Hospital name (e.g. Apollo Hospital)
    - specialization: Doctor's specialization (e.g. Cardiology, Neurology, Orthopedics, Endocrinology)
    - interaction_type: Type of meeting (Meeting, Virtual Call, Phone Call, Email)
    - meeting_mode: Mode of meeting (In-Person, Virtual)
    - meeting_objective: Objective of meeting (Product Discussion, Formulary Follow-up, Symposium Invitation, Sample Distribution)
    - interaction_date: Date of meeting in YYYY-MM-DD format (must resolve relative dates like today, yesterday, tomorrow)
    - interaction_time: Time of meeting in HH:MM format (24h or 12h, e.g. 14:30)
    - products_discussed: List of medical products discussed (CardioPlus, NeuroShield, DiaCure, OsteoRelief)
    - topics_discussed: Summary of discussion topics / notes
    - materials_shared: List of brochures/papers shared (e.g. ['Efficacy Brochure'])
    - samples_distributed: List of distributed drug samples with quantities, format: [{'product': 'CardioPlus', 'quantity': 2}]
    - sentiment: Sentiment of the interaction (Positive, Neutral, Negative)
    - interest_level: Doctor's interest level (High, Medium, Low)
    - key_outcomes: Key outcomes, agreements, or requests (e.g. He requested additional long-term safety data)
    - next_step: The next concrete follow-up step/action (e.g. Share long-term safety data)
    - priority: Priority of followup (High, Medium, Low)
    - follow_up_date: Scheduled next follow-up date in YYYY-MM-DD format (must resolve relative dates like next Friday)
    - summary: A concise 1-sentence summary of the meeting
    - notes: Full raw discussion notes
    - created_by_user_id: User ID of the sales representative
    """
    db: Session = get_db_session()
    try:
        hosp = hospital.strip() if hospital and str(hospital).lower() not in ("null", "none", "undefined") else "Unknown Hospital"
        spec = specialization.strip() if specialization and str(specialization).lower() not in ("null", "none", "undefined") else "Cardiology"
        
        # Normalize interaction_type & meeting_mode
        int_type = interaction_type.strip() if interaction_type else "Meeting"
        if int_type.lower() in ("meeting", "in-person", "in person"):
            int_type = "Meeting"
        elif int_type.lower() in ("virtual", "virtual call", "zoom", "teams", "online"):
            int_type = "Virtual Call"
        elif int_type.lower() in ("phone", "call", "phone call"):
            int_type = "Phone Call"
        elif int_type.lower() in ("email", "mail"):
            int_type = "Email"
            
        m_mode = meeting_mode.strip() if meeting_mode else "In-Person"
        if m_mode.lower() in ("virtual", "online", "zoom", "teams"):
            m_mode = "Virtual"
        else:
            m_mode = "In-Person"
            
        # Safely coerce products_discussed
        prods = []
        if products_discussed:
            if isinstance(products_discussed, str):
                if products_discussed.lower() not in ("null", "none", "undefined"):
                    prods = [products_discussed]
            elif isinstance(products_discussed, list):
                prods = [str(p) for p in products_discussed if p]
        if not prods:
            prods = ["CardioPlus"]
            
        # Safely coerce materials_shared
        mats = []
        if materials_shared:
            if isinstance(materials_shared, str):
                if materials_shared.lower() not in ("null", "none", "undefined"):
                    mats = [materials_shared]
            elif isinstance(materials_shared, list):
                mats = [str(m) for m in materials_shared if m]
                
        # Safely coerce samples_distributed
        samps = []
        if samples_distributed:
            if isinstance(samples_distributed, str):
                if samples_distributed.lower() not in ("null", "none", "undefined"):
                    try:
                        parsed = json.loads(samples_distributed)
                        if isinstance(parsed, list):
                            samps = parsed
                        else:
                            samps = [parsed]
                    except Exception:
                        samps = [samples_distributed]
            elif isinstance(samples_distributed, list):
                samps = samples_distributed

        interest = interest_level.strip() if interest_level else "Medium"
        
        # Read-only lookup for existing doctor to fetch specialization and hospital
        doc = db.query(Doctor).filter(Doctor.name.ilike(doctor_name.strip())).first()
        if doc:
            if not hosp or hosp == "Unknown Hospital":
                hosp = doc.hospital
            if not spec or spec == "Cardiology":
                spec = doc.specialization

        interest = interest_level.strip() if interest_level else "Medium"
        
        # Safely coerce created_by_user_id
        try:
            user_id = int(created_by_user_id) if created_by_user_id is not None and str(created_by_user_id).lower() not in ("null", "none", "undefined") else 1
        except Exception:
            user_id = 1

        # Parse Dates using helper
        int_date = parse_date_string(interaction_date) if interaction_date else None
        if not int_date:
            int_date = date.today()
            
        fup_date = parse_date_string(follow_up_date) if follow_up_date else None
        
        # Construct notes in the standardized UI structure
        raw_notes = notes or ""
        if not raw_notes:
            notes_parts = []
            if topics_discussed:
                notes_parts.append(f"Topics: {topics_discussed}")
            if mats:
                notes_parts.append(f"Materials Shared: {', '.join(mats)}")
            if samps:
                s_list = []
                for s in samps:
                    if isinstance(s, dict):
                        s_list.append(f"{s.get('product')} ({s.get('quantity', 1)} units)")
                    else:
                        s_list.append(str(s))
                notes_parts.append(f"Samples Distributed: {', '.join(s_list)}")
            if key_outcomes:
                notes_parts.append(f"Outcomes: {key_outcomes}")
            if next_step:
                notes_parts.append(f"Next Step: {next_step}")
            
            raw_notes = ". ".join(notes_parts) if notes_parts else "Interaction logged via AI assistant."
        
        # Compute sentiment & summary
        sent = sentiment.strip() if sentiment else analyze_sentiment_rules(raw_notes)
        comp_summary = summary or f"Met with {doctor_name} at {hosp} to discuss {', '.join(prods)}. Interest level: {interest}."
        
        result = {
            "success": True,
            "message": "Form details auto-extracted.",
            "data": {
                "id": None,
                "doctor_name": doctor_name.strip(),
                "hospital": hosp,
                "specialization": spec,
                "interaction_type": int_type,
                "meeting_mode": m_mode,
                "meeting_objective": meeting_objective or "Product Discussion",
                "interaction_date": str(int_date),
                "interaction_time": interaction_time or "10:30",
                "products_discussed": prods,
                "topics_discussed": topics_discussed or raw_notes,
                "materials_shared": mats,
                "samples_distributed": samps,
                "sentiment": sent,
                "interest_level": interest,
                "key_outcomes": key_outcomes or "",
                "next_step": next_step or "",
                "priority": priority or "Medium",
                "follow_up_date": str(fup_date) if fup_date else None,
                "summary": comp_summary
            }
        }
        return json.dumps(result)
    except Exception as e:
        db.rollback()
        return json.dumps({"success": False, "message": f"Failed to log interaction: {str(e)}"})
    finally:
        db.close()

# 2. EDIT INTERACTION TOOL
@tool
def edit_interaction_tool(
    interaction_id: int,
    updates: Dict[str, Any]
) -> str:
    """
    Modifies an existing interaction record.
    Inputs:
    - interaction_id: ID of the interaction to update
    - updates: A dictionary of fields to update. Valid keys: doctor_name, hospital, specialization, notes, interest_level, follow_up_date, products_discussed (list).
    """
    db: Session = get_db_session()
    try:
        interaction = db.query(Interaction).filter(Interaction.id == interaction_id).first()
        if not interaction:
            return json.dumps({"success": False, "message": f"Interaction #{interaction_id} not found."})
        
        allowed_fields = ["doctor_name", "hospital", "specialization", "notes", "interest_level", "interaction_type"]
        for field in allowed_fields:
            if field in updates and updates[field] is not None:
                setattr(interaction, field, updates[field])
        
        if "products_discussed" in updates and updates["products_discussed"] is not None:
            prods = updates["products_discussed"]
            if isinstance(prods, list):
                interaction.products_discussed = ",".join(prods)
            elif isinstance(prods, str):
                interaction.products_discussed = prods
 
        if "follow_up_date" in updates and updates["follow_up_date"] is not None:
            fup_str = updates["follow_up_date"]
            try:
                fup_date = datetime.strptime(fup_str.strip(), "%Y-%m-%d").date()
                interaction.follow_up_date = fup_date
                
                # Update follow-up status
                followup = db.query(FollowUp).filter(FollowUp.interaction_id == interaction_id).first()
                if followup:
                    followup.follow_up_date = fup_date
                else:
                    followup = FollowUp(
                        interaction_id=interaction_id,
                        follow_up_date=fup_date,
                        status="Pending",
                        notes=f"Follow-up regarding {interaction.products_discussed}.",
                        priority="High" if interaction.interest_level == "High" else "Medium",
                        objective=f"Discuss {interaction.products_discussed}.",
                        risk_if_delayed="Delayed scheduling may allow competitor outreach."
                    )
                    db.add(followup)
            except Exception:
                pass
                
        # Recalculate summary and sentiment
        if "notes" in updates and updates["notes"] is not None:
            interaction.sentiment = analyze_sentiment_rules(interaction.notes)
            prods_list = interaction.products_discussed.split(",")
            interaction.summary = f"Updated: Met with {interaction.doctor_name} at {interaction.hospital} to discuss {', '.join(prods_list)}. Interest level: {interaction.interest_level}. Notes: {interaction.notes[:80]}..."
            
        interaction.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(interaction)
        
        return json.dumps({
            "success": True,
            "message": f"Successfully updated interaction #{interaction_id}.",
            "data": {
                "id": interaction.id,
                "doctor_name": interaction.doctor_name,
                "notes": interaction.notes,
                "interest_level": interaction.interest_level,
                "follow_up_date": str(interaction.follow_up_date) if interaction.follow_up_date else None,
                "products_discussed": interaction.products_discussed.split(",")
            }
        })
    except Exception as e:
        db.rollback()
        return json.dumps({"success": False, "message": f"Failed to edit interaction: {str(e)}"})
    finally:
        db.close()

# 3. HCP RELATIONSHIP INTELLIGENCE TOOL
@tool
def hcp_relationship_intelligence_tool(
    doctor_name: str
) -> str:
    """
    Performs a deep AI relationship audit for a doctor. Analyzes interaction history, sentiments, interests, 
    risk levels, and updates the doctor's metrics.
    Inputs:
    - doctor_name: The name of the doctor to audit.
    """
    db: Session = get_db_session()
    try:
        # Resolve doctor
        doc = db.query(Doctor).filter(Doctor.name.ilike(f"%{doctor_name.strip()}%")).first()
        if not doc:
            return json.dumps({"success": False, "message": f"Doctor '{doctor_name}' not found in directory."})
            
        # Retrieve all interactions
        interactions = db.query(Interaction).filter(
            Interaction.doctor_name.ilike(f"%{doctor_name.strip()}%")
        ).order_by(Interaction.interaction_date.desc()).all()
        
        # Calculate timeline
        timeline = []
        objections = []
        products_discussed = set()
        total_interactions = len(interactions)
        
        score = doc.relationship_score or 75
        
        for item in interactions:
            timeline.append({
                "date": str(item.interaction_date),
                "type": item.interaction_type,
                "products": item.products_discussed.split(","),
                "interest": item.interest_level,
                "sentiment": item.sentiment,
                "summary": item.summary
            })
            for p in item.products_discussed.split(","):
                products_discussed.add(p.strip())
                
            # Scan notes for objections / concerns
            notes_lower = item.notes.lower()
            if "price" in notes_lower or "cost" in notes_lower or "expensive" in notes_lower:
                objections.append(f"Pricing concerns on {item.products_discussed}")
            if "side effect" in notes_lower or "safety" in notes_lower or "tolerability" in notes_lower:
                objections.append(f"Safety/tolerability queries on {item.products_discussed}")
                
        # Gather interaction stats
        pos_count = sum(1 for i in interactions if i.sentiment == "Positive")
        neg_count = sum(1 for i in interactions if i.sentiment == "Negative")
        completed_f = db.query(FollowUp).join(Interaction).filter(
            Interaction.doctor_name.ilike(f"%{doctor_name.strip()}%"), FollowUp.status == "Completed"
        ).count()
        pending_f = db.query(FollowUp).join(Interaction).filter(
            Interaction.doctor_name.ilike(f"%{doctor_name.strip()}%"), FollowUp.status == "Pending"
        ).count()

        # Determine days since last visit and last interest level
        days_since = 999
        last_interest = "Medium"
        if total_interactions > 0:
            days_since = (date.today() - interactions[0].interaction_date).days
            last_interest = interactions[0].interest_level

        # Compute new relationship score using weighted multi-factor model
        score = _compute_relationship_score(
            base_score=doc.relationship_score or 75,
            interest_level=last_interest,
            days_since_last=days_since,
            positive_count=pos_count,
            negative_count=neg_count,
            total_count=total_interactions,
            completed_followups=completed_f,
            pending_followups=pending_f,
        )

        # Risk level from recency
        risk_level = "Low"
        if days_since > 30:
            risk_level = "High"
        elif days_since > 14:
            risk_level = "Medium"

        # Sales opportunity from last interest level
        sales_opp = {"High": "High", "Low": "Low"}.get(last_interest, "Medium")

        # Visit frequency
        visit_freq = "No past visits"
        if total_interactions > 1:
            total_days = (interactions[0].interaction_date - interactions[-1].interaction_date).days
            visit_freq = f"Every {max(1, round(total_days / (total_interactions - 1)))} days"
        elif total_interactions == 1:
            visit_freq = "Single introductory meeting"
                
        # Generate AI Summary & Rationale
        ai_summary = f"{doc.name} shows a {sales_opp} opportunity level. Visit frequency is {visit_freq}. Recent sentiment has been {interactions[0].sentiment if total_interactions > 0 else 'none'}."
        if objections:
            ai_summary += f" Key objections raised: {'; '.join(list(set(objections)))}."
        else:
            ai_summary += " No active clinical or cost objections detected."
            
        # Update doctor model in DB
        doc.relationship_score = score
        doc.risk_level = risk_level
        doc.sales_opportunity = sales_opp
        doc.ai_summary = ai_summary
        db.commit()
        
        return json.dumps({
            "success": True,
            "message": f"Successfully audited relationship for {doc.name}.",
            "data": {
                "doctor_name": doc.name,
                "relationship_score": score,
                "products_discussed": list(products_discussed),
                "doctor_interests": doc.specialization,
                "objections": list(set(objections)),
                "visit_frequency": visit_freq,
                "last_interaction": str(interactions[0].interaction_date) if total_interactions > 0 else "None",
                "ai_relationship_summary": ai_summary,
                "risk_level": risk_level,
                "sales_opportunity": sales_opp,
                "timeline": timeline
            }
        })
    except Exception as e:
        return json.dumps({"success": False, "message": f"Failed to audit relationship: {str(e)}"})
    finally:
        db.close()

# 4. SMART FOLLOW-UP PLANNER TOOL
@tool
def smart_followup_planner_tool(
    doctor_name: str,
    suggested_date: Optional[str] = None
) -> str:
    """
    Generates intelligent follow-up suggestions for an HCP.
    Inputs:
    - doctor_name: The name of the doctor.
    - suggested_date: Suggested date in YYYY-MM-DD. If empty, automatically calculates optimal date.
    """
    db: Session = get_db_session()
    try:
        doc = db.query(Doctor).filter(Doctor.name.ilike(f"%{doctor_name.strip()}%")).first()
        if not doc:
            return json.dumps({"success": False, "message": f"Doctor '{doctor_name}' not found."})
            
        interactions = db.query(Interaction).filter(
            Interaction.doctor_name.ilike(f"%{doctor_name.strip()}%")
        ).order_by(Interaction.interaction_date.desc()).all()
        
        last_prod = "CardioPlus"
        interest = "Medium"
        if interactions:
            last_prod = interactions[0].products_discussed.split(",")[0]
            interest = interactions[0].interest_level
            
        # Calculate optimal gap
        gap = 14
        if interest == "High":
            gap = 7
        elif interest == "Low":
            gap = 30
            
        calc_date = date.today() + timedelta(days=gap)
        if suggested_date:
            try:
                calc_date = datetime.strptime(suggested_date.strip(), "%Y-%m-%d").date()
            except Exception:
                pass
                
        # Smart planning values
        priority = "High" if interest == "High" else "Medium"
        objective = f"Review clinical safety data for {last_prod} and address pending patient objections."
        topics = [f"{last_prod} Phase III Trials", "Competitor price comparisons", "Hospital formulary guidelines"]
        risk = "Delays exceeding 14 days increase the risk of the doctor prescribing competitor offerings."
        
        # Query last interaction to link follow-up
        int_id = interactions[0].id if interactions else 1
        
        # Add to SQLite FollowUp table
        fup = db.query(FollowUp).filter(FollowUp.interaction_id == int_id).first()
        if fup:
            fup.follow_up_date = calc_date
            fup.priority = priority
            fup.objective = objective
            fup.risk_if_delayed = risk
        else:
            fup = FollowUp(
                interaction_id=int_id,
                follow_up_date=calc_date,
                status="Pending",
                notes=f"AI planned follow-up for {last_prod}.",
                priority=priority,
                objective=objective,
                risk_if_delayed=risk
            )
            db.add(fup)
        db.commit()
        
        return json.dumps({
            "success": True,
            "message": f"Planned smart follow-up for {doctor_name}.",
            "data": {
                "doctor_name": doc.name,
                "suggested_follow_up_date": str(calc_date),
                "meeting_objective": objective,
                "priority": priority,
                "suggested_discussion_topics": topics,
                "recommended_product": last_prod,
                "required_clinical_literature": f"{last_prod} Prescribing Booklet.pdf",
                "risk_if_delayed": risk
            }
        })
    except Exception as e:
        return json.dumps({"success": False, "message": f"Failed to plan follow-up: {str(e)}"})
    finally:
        db.close()

# 5. NEXT BEST ACTION ENGINE TOOL
@tool
def next_best_action_engine_tool(
    doctor_name: str
) -> str:
    """
    Recommends specific sales actions, cross-selling materials, and clinical papers for the next doctor visit.
    Inputs:
    - doctor_name: The name of the doctor.
    """
    db: Session = get_db_session()
    try:
        doc = db.query(Doctor).filter(Doctor.name.ilike(f"%{doctor_name.strip()}%")).first()
        if not doc:
            return json.dumps({"success": False, "message": f"Doctor '{doctor_name}' not found."})
            
        interactions = db.query(Interaction).filter(
            Interaction.doctor_name.ilike(f"%{doctor_name.strip()}%")
        ).order_by(Interaction.interaction_date.desc()).all()
        
        last_prod = "CardioPlus"
        interest = "Medium"
        if interactions:
            last_prod = interactions[0].products_discussed.split(",")[0]
            interest = interactions[0].interest_level
            
        # Rationale and outcome
        rec_prod = last_prod
        cross_sell = "None"
        samples = "None"
        paper = ""
        rationale = ""
        expected = ""
        
        if interest == "High":
            rationale = f"Doctor is highly interested in {last_prod}. Secure hospital formulary inclusion form immediately."
            paper = f"{last_prod}_Formulary_Inclusion_Packet.pdf"
            samples = f"{last_prod} 10mg Starter packs (20 units)"
            expected = "Formal placement on hospital formulary list within 30 days."
        elif interest == "Medium":
            # Dynamically find a cross-sell product from the DB
            from app.models import Product
            all_prods = [p.name for p in db.query(Product).filter(Product.name != last_prod).all()]
            rec_prod = all_prods[0] if all_prods else last_prod
            cross_sell = f"Introduce {rec_prod} to capture additional prescription share."
            rationale = f"Doctor shows moderate interest in {last_prod}. Cross-selling {rec_prod} will expand portfolio footprint."
            paper = f"{rec_prod}_Clinical_Efficacy_Brief.pdf"
            samples = f"{rec_prod} trial packs (10 units)"
            expected = "Pilot prescribing rate of 5+ patients in the first month."
        else:
            # Dynamically find the highest-inventory alternative product
            from app.models import Product
            alt = db.query(Product).filter(Product.name != last_prod).order_by(Product.sample_inventory.desc()).first()
            rec_prod = alt.name if alt else last_prod
            rationale = f"Low interest in {last_prod}. Pivot focus to {rec_prod} which has better portfolio fit."
            paper = f"{rec_prod}_Outcomes_Summary.pdf"
            samples = f"{rec_prod} sample units (5 units)"
            expected = "Outpatient prescription trial agreement."
            
        # Update Doctor profile with AI next best action string
        nba_str = f"Product: {rec_prod} | Action: {rationale} | Material: {paper}"
        doc.next_best_action = nba_str
        db.commit()
        
        return json.dumps({
            "success": True,
            "message": f"Generated next best action recommendation for {doctor_name}.",
            "data": {
                "doctor_name": doc.name,
                "recommended_product": rec_prod,
                "clinical_paper": paper,
                "suggested_samples": samples,
                "sales_opportunity": doc.sales_opportunity,
                "cross_selling": cross_sell,
                "risk_level": doc.risk_level,
                "ai_rationale": rationale,
                "expected_outcome": expected
            }
        })
    except Exception as e:
        return json.dumps({"success": False, "message": f"Failed to compute next action: {str(e)}"})
    finally:
        db.close()
