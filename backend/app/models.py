from sqlalchemy import Column, Integer, String, DateTime, Date, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)  # Hashed password
    role = Column(String, default="representative")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    interactions = relationship("Interaction", back_populates="creator")

class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    specialization = Column(String, nullable=False)
    hospital = Column(String, nullable=False)
    city = Column(String, nullable=False)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    
    # AI relationship metrics
    relationship_score = Column(Integer, default=75)
    sales_opportunity = Column(String, default="Medium") # e.g. High, Medium, Low
    risk_level = Column(String, default="Low") # e.g. High, Medium, Low
    ai_summary = Column(Text, nullable=True)
    next_best_action = Column(Text, nullable=True)

class Interaction(Base):
    __tablename__ = "interactions"

    id = Column(Integer, primary_key=True, index=True)
    doctor_name = Column(String, index=True, nullable=False)
    hospital = Column(String, nullable=False)
    specialization = Column(String, nullable=False)
    interaction_date = Column(Date, nullable=False)
    interaction_type = Column(String, nullable=False)  # e.g., In-Person, Virtual, Email, Phone
    products_discussed = Column(String, nullable=False)  # Stored as comma-separated or JSON string
    notes = Column(Text, nullable=False)
    summary = Column(Text, nullable=True)
    sentiment = Column(String, nullable=True)
    interest_level = Column(String, nullable=False)  # e.g., High, Medium, Low
    follow_up_date = Column(Date, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    creator = relationship("User", back_populates="interactions")
    follow_ups = relationship("FollowUp", back_populates="interaction", cascade="all, delete-orphan")

class FollowUp(Base):
    __tablename__ = "followups"

    id = Column(Integer, primary_key=True, index=True)
    interaction_id = Column(Integer, ForeignKey("interactions.id", ondelete="CASCADE"), nullable=False)
    follow_up_date = Column(Date, nullable=False)
    status = Column(String, default="Pending")  # e.g., Pending, Completed, Overdue
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Smart planning fields
    priority = Column(String, default="Medium") # High, Medium, Low
    objective = Column(Text, nullable=True)
    risk_if_delayed = Column(Text, nullable=True)

    # Relationships
    interaction = relationship("Interaction", back_populates="follow_ups")

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    code = Column(String, unique=True, index=True, nullable=False)
    therapeutic_area = Column(String, nullable=False)
    clinical_indication = Column(String, nullable=False)
    formulation = Column(String, nullable=False)
    formulary_status = Column(String, default="Formulary Active") # Formulary Active, Pending Review, Not Submitted
    sample_inventory = Column(Integer, default=0)
    description = Column(Text, nullable=True)
    market_segment = Column(String, default="Prescription")
    launch_date = Column(Date, nullable=True)
    mrp = Column(Integer, default=0)
    warehouse_location = Column(String, default="Main Warehouse")
    last_restocked = Column(Date, nullable=True)
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

from sqlalchemy import Float, Boolean

class SystemConfig(Base):
    __tablename__ = "system_configs"

    id = Column(Integer, primary_key=True, index=True)
    engine_mode = Column(String, default="Evaluation")  # Evaluation, Production
    evaluation_mode = Column(Boolean, default=True)
    production_mode = Column(Boolean, default=False)
    ai_enabled = Column(Boolean, default=True)
    active_model = Column(String, default="llama-3.3-70b-versatile")
    temperature = Column(Float, default=0.2)
    max_tokens = Column(Integer, default=2048)
    top_p = Column(Float, default=0.9)
    frequency_penalty = Column(Float, default=0.0)
    presence_penalty = Column(Float, default=0.0)
    api_key = Column(String, default="gsk_l9H5wJpW5wJwJpW5wJwJ")
    api_status = Column(String, default="Connected")
    last_connection_time = Column(String, default="May 16, 2026 • 10:30 AM")

class SystemTool(Base):
    __tablename__ = "system_tools"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=False)
    enabled = Column(Boolean, default=True)
