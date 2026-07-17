import json
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models import Doctor, Interaction, User
from app.schemas import DoctorResponse, DoctorCreate
from app.api.auth import get_current_user
from app.langgraph.tools import hcp_relationship_intelligence_tool, next_best_action_engine_tool

router = APIRouter(prefix="/api/hcps", tags=["hcps"])

@router.get("", response_model=List[DoctorResponse])
def get_hcps(
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
    # Sort by relationship score descending
    return query.order_by(Doctor.relationship_score.desc()).all()

@router.post("", response_model=DoctorResponse)
def create_hcp(
    doctor_in: DoctorCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    existing = db.query(Doctor).filter(Doctor.name.ilike(doctor_in.name.strip())).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="HCP profile with this name already exists"
        )
    
    new_doc = Doctor(
        name=doctor_in.name.strip(),
        specialization=doctor_in.specialization.strip(),
        hospital=doctor_in.hospital.strip(),
        city=doctor_in.city.strip(),
        email=doctor_in.email,
        phone=doctor_in.phone,
        relationship_score=75,
        sales_opportunity="Medium",
        risk_level="Low"
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)
    return new_doc

@router.get("/{hcp_id}", response_model=DoctorResponse)
def get_hcp(
    hcp_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    doc = db.query(Doctor).filter(Doctor.id == hcp_id).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"HCP #{hcp_id} not found"
        )
    return doc

@router.put("/{hcp_id}", response_model=DoctorResponse)
def update_hcp(
    hcp_id: int,
    doctor_in: DoctorCreate, # Reuse creation schema since they contain same fields
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    doc = db.query(Doctor).filter(Doctor.id == hcp_id).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"HCP #{hcp_id} not found"
        )
    
    doc.name = doctor_in.name.strip()
    doc.specialization = doctor_in.specialization.strip()
    doc.hospital = doctor_in.hospital.strip()
    doc.city = doctor_in.city.strip()
    doc.email = doctor_in.email
    doc.phone = doctor_in.phone
    
    db.commit()
    db.refresh(doc)
    return doc

@router.delete("/{hcp_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_hcp(
    hcp_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    doc = db.query(Doctor).filter(Doctor.id == hcp_id).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"HCP #{hcp_id} not found"
        )
    db.delete(doc)
    db.commit()
    return None

@router.get("/{hcp_id}/relationship-summary")
def get_hcp_relationship_summary(
    hcp_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    doc = db.query(Doctor).filter(Doctor.id == hcp_id).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"HCP #{hcp_id} not found"
        )
    
    rel_result_str = hcp_relationship_intelligence_tool.invoke({"doctor_name": doc.name})
    rel_intel = {}
    try:
        rel_json = json.loads(rel_result_str)
        if rel_json.get("success"):
            rel_intel = rel_json.get("data")
    except Exception:
        pass
    return rel_intel

@router.get("/{hcp_id}/next-best-actions")
def get_hcp_next_best_actions(
    hcp_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    doc = db.query(Doctor).filter(Doctor.id == hcp_id).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"HCP #{hcp_id} not found"
        )
    
    nba_result_str = next_best_action_engine_tool.invoke({"doctor_name": doc.name})
    nba_rec = {}
    try:
        nba_json = json.loads(nba_result_str)
        if nba_json.get("success"):
            nba_rec = nba_json.get("data")
    except Exception:
        pass
    return nba_rec

@router.get("/{hcp_id}/interaction-history")
def get_hcp_interaction_history(
    hcp_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    doc = db.query(Doctor).filter(Doctor.id == hcp_id).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"HCP #{hcp_id} not found"
        )
        
    history = db.query(Interaction).filter(
        Interaction.doctor_name.ilike(f"%{doc.name}%")
    ).order_by(Interaction.interaction_date.desc()).all()
    
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
    return history_list
