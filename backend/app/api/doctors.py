import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import Doctor, Interaction, User
from app.schemas import DoctorResponse, DoctorCreate
from app.api.auth import get_current_user
from app.langgraph.tools import hcp_relationship_intelligence_tool, next_best_action_engine_tool

router = APIRouter(prefix="/api/doctors", tags=["doctors"])

@router.get("", response_model=List[DoctorResponse])
def get_doctors(
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Doctor)
    if search:
        query = query.filter(
            (Doctor.name.ilike(f"%{search}%")) |
            (Doctor.hospital.ilike(f"%{search}%")) |
            (Doctor.specialization.ilike(f"%{search}%"))
        )
    return query.order_by(Doctor.name).all()

@router.post("", response_model=DoctorResponse)
def create_doctor(
    doctor_in: DoctorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    existing = db.query(Doctor).filter(Doctor.name.ilike(doctor_in.name.strip())).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Doctor profile with this name already exists"
        )
    
    new_doc = Doctor(
        name=doctor_in.name.strip(),
        specialization=doctor_in.specialization.strip(),
        hospital=doctor_in.hospital.strip(),
        city=doctor_in.city.strip(),
        email=doctor_in.email,
        phone=doctor_in.phone
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)
    return new_doc

@router.get("/{doctor_id}")
def get_doctor_profile(
    doctor_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    doc = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Doctor #{doctor_id} not found"
        )
        
    # Get interaction history
    history = db.query(Interaction).filter(
        Interaction.doctor_name.ilike(doc.name)
    ).order_by(Interaction.interaction_date.desc()).all()
    
    # Process history products
    history_list = []
    for item in history:
        history_list.append({
            "id": item.id,
            "date": str(item.interaction_date),
            "type": item.interaction_type,
            "products": item.products_discussed.split(","),
            "interest_level": item.interest_level,
            "sentiment": item.sentiment,
            "notes": item.notes,
            "summary": item.summary,
            "follow_up_date": str(item.follow_up_date) if item.follow_up_date else None
        })
        
    # Call relationship intelligence tool
    rel_result_str = hcp_relationship_intelligence_tool.invoke({"doctor_name": doc.name})
    rel_intel = {}
    try:
        rel_json = json.loads(rel_result_str)
        if rel_json.get("success"):
            rel_intel = rel_json.get("data")
    except Exception:
        pass
        
    # Call Next Best Action tool
    nba_result_str = next_best_action_engine_tool.invoke({"doctor_name": doc.name})
    nba_rec = {}
    try:
        nba_json = json.loads(nba_result_str)
        if nba_json.get("success"):
            nba_rec = nba_json.get("data")
    except Exception:
        pass
        
    return {
        "profile": doc,
        "history": history_list,
        "relationship_intelligence": rel_intel,
        "next_best_action": nba_rec
    }
