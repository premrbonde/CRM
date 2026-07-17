from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime, date

# --- User Schemas ---
class UserBase(BaseModel):
    name: str
    email: EmailStr
    role: Optional[str] = "representative"

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class TokenData(BaseModel):
    email: Optional[str] = None
    user_id: Optional[int] = None

# --- Doctor Schemas ---
class DoctorBase(BaseModel):
    name: str
    specialization: str
    hospital: str
    city: str
    email: Optional[str] = None
    phone: Optional[str] = None

class DoctorCreate(DoctorBase):
    pass

class DoctorResponse(DoctorBase):
    id: int
    relationship_score: Optional[int] = 75
    sales_opportunity: Optional[str] = "Medium"
    risk_level: Optional[str] = "Low"
    ai_summary: Optional[str] = None
    next_best_action: Optional[str] = None

    class Config:
        from_attributes = True

# --- FollowUp Schemas ---
class FollowUpBase(BaseModel):
    follow_up_date: date
    status: Optional[str] = "Pending"
    notes: Optional[str] = None
    priority: Optional[str] = "Medium"
    objective: Optional[str] = None
    risk_if_delayed: Optional[str] = None

class FollowUpCreate(BaseModel):
    interaction_id: int
    follow_up_date: date
    status: Optional[str] = "Pending"
    notes: Optional[str] = None
    priority: Optional[str] = "Medium"
    objective: Optional[str] = None
    risk_if_delayed: Optional[str] = None

class FollowUpUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    follow_up_date: Optional[date] = None
    priority: Optional[str] = None
    objective: Optional[str] = None
    risk_if_delayed: Optional[str] = None

class FollowUpResponse(FollowUpBase):
    id: int
    interaction_id: int
    created_at: datetime

    class Config:
        from_attributes = True

# --- Interaction Schemas ---
class InteractionBase(BaseModel):
    doctor_name: str
    hospital: str
    specialization: str
    interaction_date: date
    interaction_type: str
    products_discussed: List[str]  # We will deserialize this to list of strings
    notes: str
    interest_level: str
    follow_up_date: Optional[date] = None
    doctor_email: Optional[str] = ""
    doctor_phone: Optional[str] = ""
    doctor_city: Optional[str] = ""

class InteractionCreate(InteractionBase):
    pass

class InteractionUpdate(BaseModel):
    doctor_name: Optional[str] = None
    hospital: Optional[str] = None
    specialization: Optional[str] = None
    interaction_date: Optional[date] = None
    interaction_type: Optional[str] = None
    products_discussed: Optional[List[str]] = None
    notes: Optional[str] = None
    interest_level: Optional[str] = None
    follow_up_date: Optional[date] = None
    summary: Optional[str] = None
    sentiment: Optional[str] = None

class InteractionResponse(BaseModel):
    id: int
    doctor_name: str
    hospital: str
    specialization: str
    interaction_date: date
    interaction_type: str
    products_discussed: List[str]
    notes: str
    summary: Optional[str] = None
    sentiment: Optional[str] = None
    interest_level: str
    follow_up_date: Optional[date] = None
    created_by: int
    created_at: datetime
    updated_at: datetime
    follow_ups: List[FollowUpResponse] = []

    class Config:
        from_attributes = True

# --- Chat & AI Schemas ---
class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str
    extracted_data: Optional[dict] = None
    tool_triggered: Optional[str] = None
    success: bool = True

# --- Dashboard Stats Schemas ---
class RecentActivity(BaseModel):
    id: int
    doctor_name: str
    hospital: str
    interaction_type: str
    interaction_date: date
    interest_level: str

class UpcomingFollowUp(BaseModel):
    id: int
    doctor_name: str
    hospital: str
    follow_up_date: date
    notes: Optional[str] = None
    status: str

class DashboardStatsResponse(BaseModel):
    total_doctors: int
    today_visits: int
    pending_followups: int
    completed_meetings: int
    recent_activity: List[RecentActivity]
    upcoming_followups: List[UpcomingFollowUp]
    interest_distribution: dict  # e.g., {"High": 5, "Medium": 2, "Low": 1}
    visits_trend: List[dict]  # e.g., [{"date": "2026-07-10", "count": 2}]
    product_distribution: dict  # e.g., {"CardioPlus": 5, "NeuroShield": 3}
