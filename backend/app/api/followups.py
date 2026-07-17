from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from app.database import get_db
from app.models import FollowUp, Interaction, User
from app.schemas import FollowUpResponse, FollowUpCreate, FollowUpUpdate
from app.api.auth import get_current_user

router = APIRouter(prefix="/api/followups", tags=["followups"])

@router.get("", response_model=List[FollowUpResponse])
def get_followups(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(FollowUp).join(Interaction).filter(Interaction.created_by == current_user.id)
    if status_filter:
        query = query.filter(FollowUp.status.ilike(status_filter))
    return query.order_by(FollowUp.follow_up_date.asc()).all()

@router.post("", response_model=FollowUpResponse, status_code=status.HTTP_201_CREATED)
def create_followup(
    followup_in: FollowUpCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify interaction belongs to user
    interaction = db.query(Interaction).filter(
        Interaction.id == followup_in.interaction_id,
        Interaction.created_by == current_user.id
    ).first()
    if not interaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Associated Interaction #{followup_in.interaction_id} not found"
        )
        
    db_followup = FollowUp(
        interaction_id=followup_in.interaction_id,
        follow_up_date=followup_in.follow_up_date,
        status=followup_in.status or "Pending",
        notes=followup_in.notes
    )
    db.add(db_followup)
    
    # Sync date back to interaction
    interaction.follow_up_date = followup_in.follow_up_date
    
    db.commit()
    db.refresh(db_followup)
    return db_followup

@router.put("/{followup_id}", response_model=FollowUpResponse)
def update_followup(
    followup_id: int,
    followup_in: FollowUpUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    followup = db.query(FollowUp).join(Interaction).filter(
        FollowUp.id == followup_id,
        Interaction.created_by == current_user.id
    ).first()
    if not followup:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Follow-up #{followup_id} not found"
        )
        
    update_data = followup_in.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(followup, key, value)
        
    # If date was updated, sync back to interaction
    if "follow_up_date" in update_data and update_data["follow_up_date"]:
        interaction = db.query(Interaction).filter(Interaction.id == followup.interaction_id).first()
        if interaction:
            interaction.follow_up_date = update_data["follow_up_date"]
            
    db.commit()
    db.refresh(followup)
    return followup

@router.delete("/{followup_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_followup(
    followup_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    followup = db.query(FollowUp).join(Interaction).filter(
        FollowUp.id == followup_id,
        Interaction.created_by == current_user.id
    ).first()
    if not followup:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Follow-up #{followup_id} not found"
        )
    db.delete(followup)
    db.commit()
    return None
