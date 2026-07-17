from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date
from app.database import get_db
from app.models import Interaction, Doctor, FollowUp, User
from app.schemas import InteractionCreate, InteractionUpdate, InteractionResponse
from app.api.auth import get_current_user
from app.langgraph.tools import analyze_sentiment_rules, _compute_relationship_score

def recalculate_doctor_metrics(db: Session, doctor_name: str):
    # Lookup doctor
    doc = db.query(Doctor).filter(Doctor.name.ilike(doctor_name.strip())).first()
    if not doc:
        return
        
    # Get all interactions
    interactions = db.query(Interaction).filter(Interaction.doctor_name.ilike(f"%{doctor_name.strip()}%")).order_by(Interaction.interaction_date.desc()).all()
    total_interactions = len(interactions)
    
    # Gather statistics
    pos_count = sum(1 for i in interactions if i.sentiment == "Positive")
    neg_count = sum(1 for i in interactions if i.sentiment == "Negative")
    
    completed_f = db.query(FollowUp).join(Interaction).filter(
        Interaction.doctor_name.ilike(f"%{doctor_name.strip()}%"), FollowUp.status == "Completed"
    ).count()
    pending_f = db.query(FollowUp).join(Interaction).filter(
        Interaction.doctor_name.ilike(f"%{doctor_name.strip()}%"), FollowUp.status == "Pending"
    ).count()
    
    days_since = 999
    last_interest = "Medium"
    if total_interactions > 0:
        if isinstance(interactions[0].interaction_date, str):
            try:
                int_date = datetime.strptime(interactions[0].interaction_date, "%Y-%m-%d").date()
            except Exception:
                int_date = date.today()
        else:
            int_date = interactions[0].interaction_date
        days_since = (date.today() - int_date).days
        last_interest = interactions[0].interest_level
        
    # Compute score
    score = _compute_relationship_score(
        base_score=doc.relationship_score or 75,
        interest_level=last_interest,
        days_since_last=days_since,
        positive_count=pos_count,
        negative_count=neg_count,
        total_count=total_interactions,
        completed_followups=completed_f,
        pending_followups=pending_f
    )
    
    # Risk level
    risk_level = "Low"
    if days_since > 30:
        risk_level = "High"
    elif days_since > 14:
        risk_level = "Medium"
        
    # Sales opportunity
    sales_opp = {"High": "High", "Low": "Low"}.get(last_interest, "Medium")
    
    # Visit frequency
    visit_freq = "No past visits"
    if total_interactions > 1:
        try:
            d0 = interactions[0].interaction_date
            dn = interactions[-1].interaction_date
            if isinstance(d0, str):
                d0 = datetime.strptime(d0, "%Y-%m-%d").date()
            if isinstance(dn, str):
                dn = datetime.strptime(dn, "%Y-%m-%d").date()
            total_days = (d0 - dn).days
            visit_freq = f"Every {max(1, round(total_days / (total_interactions - 1)))} days"
        except Exception:
            visit_freq = "Multiple meetings"
    elif total_interactions == 1:
        visit_freq = "Single introductory meeting"
        
    ai_summary = f"{doc.name} shows a {sales_opp} opportunity level. Visit frequency is {visit_freq}. Recent sentiment is {interactions[0].sentiment if total_interactions > 0 else 'none'}."
    
    doc.relationship_score = score
    doc.risk_level = risk_level
    doc.sales_opportunity = sales_opp
    doc.ai_summary = ai_summary
    db.commit()

router = APIRouter(prefix="/api/interactions", tags=["interactions"])

@router.post("", response_model=InteractionResponse, status_code=status.HTTP_201_CREATED)
def create_interaction(
    interaction_in: InteractionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Resolve or Create Doctor Profile
    doc = db.query(Doctor).filter(Doctor.name.ilike(interaction_in.doctor_name.strip())).first()
    if not doc:
        doc = Doctor(
            name=interaction_in.doctor_name.strip(),
            specialization=interaction_in.specialization.strip(),
            hospital=interaction_in.hospital.strip(),
            city=interaction_in.doctor_city.strip() if interaction_in.doctor_city else "",
            email=interaction_in.doctor_email.strip() if interaction_in.doctor_email else "",
            phone=interaction_in.doctor_phone.strip() if interaction_in.doctor_phone else ""
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
    else:
        # Update missing contact details if provided on manual log
        updated = False
        if interaction_in.doctor_city and not doc.city:
            doc.city = interaction_in.doctor_city.strip()
            updated = True
        if interaction_in.doctor_email and not doc.email:
            doc.email = interaction_in.doctor_email.strip()
            updated = True
        if interaction_in.doctor_phone and not doc.phone:
            doc.phone = interaction_in.doctor_phone.strip()
            updated = True
        if updated:
            db.commit()

    # 2. Analyze Sentiment & Generate Summary
    sentiment = analyze_sentiment_rules(interaction_in.notes)
    summary = f"Met with {interaction_in.doctor_name} at {interaction_in.hospital} to discuss {', '.join(interaction_in.products_discussed)}. Interest level was {interaction_in.interest_level}. Key notes: {interaction_in.notes[:100]}..."

    # 3. Create Interaction
    db_interaction = Interaction(
        doctor_name=interaction_in.doctor_name.strip(),
        hospital=interaction_in.hospital.strip(),
        specialization=interaction_in.specialization.strip(),
        interaction_date=interaction_in.interaction_date,
        interaction_type=interaction_in.interaction_type,
        products_discussed=",".join(interaction_in.products_discussed),
        notes=interaction_in.notes,
        summary=summary,
        sentiment=sentiment,
        interest_level=interaction_in.interest_level,
        follow_up_date=interaction_in.follow_up_date,
        created_by=current_user.id
    )
    db.add(db_interaction)
    db.commit()
    db.refresh(db_interaction)

    # 4. Schedule Follow-up if date is provided
    if interaction_in.follow_up_date:
        followup = FollowUp(
            interaction_id=db_interaction.id,
            follow_up_date=interaction_in.follow_up_date,
            status="Pending",
            notes=f"Follow-up regarding {', '.join(interaction_in.products_discussed)}."
        )
        db.add(followup)
        db.commit()
        db.refresh(db_interaction)

    # 5. Recalculate doctor relationship metrics dynamically on save
    recalculate_doctor_metrics(db, interaction_in.doctor_name)

    # Parse products_discussed back to list for response schema
    response_data = db_interaction
    response_data.products_discussed = db_interaction.products_discussed.split(",")
    return response_data

@router.get("", response_model=List[InteractionResponse])
def read_interactions(
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Interaction).filter(
        Interaction.created_by == current_user.id,
        ~Interaction.notes.like("Planned:%")
    )
    if search:
        query = query.filter(
            (Interaction.doctor_name.ilike(f"%{search}%")) |
            (Interaction.hospital.ilike(f"%{search}%")) |
            (Interaction.products_discussed.ilike(f"%{search}%"))
        )
    interactions = query.order_by(Interaction.interaction_date.desc()).all()
    
    # Format products_discussed back to list of strings
    for item in interactions:
        item.products_discussed = item.products_discussed.split(",")
        
    return interactions

@router.get("/export")
def export_interactions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    import io
    import csv
    from fastapi.responses import StreamingResponse

    interactions = db.query(Interaction).filter(Interaction.created_by == current_user.id).order_by(Interaction.interaction_date.desc()).all()
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Header
    writer.writerow([
        "ID", "Doctor Name", "Hospital", "Specialization", "Interaction Date", 
        "Interaction Type", "Products Discussed", "Notes", "Summary", 
        "Sentiment", "Interest Level", "Follow-up Date", "Created At"
    ])
    
    # Rows
    for item in interactions:
        writer.writerow([
            item.id,
            item.doctor_name,
            item.hospital,
            item.specialization,
            item.interaction_date.strftime("%Y-%m-%d") if item.interaction_date else "",
            item.interaction_type,
            item.products_discussed,
            item.notes,
            item.summary or "",
            item.sentiment or "",
            item.interest_level,
            item.follow_up_date.strftime("%Y-%m-%d") if item.follow_up_date else "",
            item.created_at.strftime("%Y-%m-%d %H:%M:%S") if item.created_at else ""
        ])
        
    output.seek(0)
    
    # Return as StreamingResponse
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=interactions_export.csv"}
    )

@router.get("/{interaction_id}", response_model=InteractionResponse)
def read_interaction(
    interaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    interaction = db.query(Interaction).filter(
        Interaction.id == interaction_id,
        Interaction.created_by == current_user.id
    ).first()
    if not interaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Interaction #{interaction_id} not found"
        )
    
    interaction.products_discussed = interaction.products_discussed.split(",")
    return interaction

@router.put("/{interaction_id}", response_model=InteractionResponse)
def update_interaction(
    interaction_id: int,
    interaction_in: InteractionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    interaction = db.query(Interaction).filter(
        Interaction.id == interaction_id,
        Interaction.created_by == current_user.id
    ).first()
    if not interaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Interaction #{interaction_id} not found"
        )
    
    update_data = interaction_in.dict(exclude_unset=True)
    
    # Special handling for products
    if "products_discussed" in update_data:
        prods = update_data["products_discussed"]
        interaction.products_discussed = ",".join(prods)
        del update_data["products_discussed"]
        
    for key, value in update_data.items():
        setattr(interaction, key, value)
        
    # Sync associated FollowUp if follow_up_date is updated
    if "follow_up_date" in update_data:
        fup_date = update_data["follow_up_date"]
        followup = db.query(FollowUp).filter(FollowUp.interaction_id == interaction_id).first()
        if fup_date:
            if followup:
                followup.follow_up_date = fup_date
            else:
                followup = FollowUp(
                    interaction_id=interaction_id,
                    follow_up_date=fup_date,
                    status="Pending",
                    notes="Follow-up scheduled from updated interaction."
                )
                db.add(followup)
        else:
            if followup:
                db.delete(followup)
                
    # Re-analyze sentiment and summary if notes updated
    if "notes" in update_data:
        interaction.sentiment = analyze_sentiment_rules(interaction.notes)
        prods_list = interaction.products_discussed.split(",")
        interaction.summary = f"Updated: Met with {interaction.doctor_name} at {interaction.hospital} to discuss {', '.join(prods_list)}. Interest level: {interaction.interest_level}. Key notes: {interaction.notes[:100]}..."
        
    interaction.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(interaction)
    
    interaction.products_discussed = interaction.products_discussed.split(",")
    return interaction

@router.delete("/{interaction_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_interaction(
    interaction_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    interaction = db.query(Interaction).filter(
        Interaction.id == interaction_id,
        Interaction.created_by == current_user.id
    ).first()
    if not interaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Interaction #{interaction_id} not found"
        )
    db.delete(interaction)
    db.commit()
    return None
