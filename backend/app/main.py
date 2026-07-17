import os
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import date, datetime, timedelta
from app.config import settings
from app.database import engine, Base, SessionLocal
from app.models import User, Doctor, Interaction, FollowUp
from app.api.auth import get_password_hash
from app.api import auth, interactions, doctors, hcps, calendar, followups, dashboard, chat, products, system

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI-First Healthcare CRM API", version="1.0.0")

# CORS middleware configuration
origins = [o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(interactions.router)
app.include_router(doctors.router)
app.include_router(hcps.router)
app.include_router(calendar.router)
app.include_router(followups.router)
app.include_router(dashboard.router)
app.include_router(chat.router)
app.include_router(products.router)
app.include_router(system.router)

# Database Seed function
def seed_database():
    db = SessionLocal()
    try:
        from app.models import Doctor
        if db.query(Doctor).count() > 0:
            print("Database already seeded. Skipping startup seed.")
            return

        # Clear existing data to force fresh seed with rich sample data if empty
        from app.models import FollowUp, Interaction, Product, SystemConfig, SystemTool
        db.query(FollowUp).delete()
        db.query(Interaction).delete()
        db.query(Doctor).delete()
        db.query(Product).delete()
        db.query(SystemConfig).delete()
        db.query(SystemTool).delete()
        db.commit()

        # 1. Seed User
        default_user = db.query(User).filter(User.email == "representative@crm.com").first()
        if not default_user:
            default_user = User(
                name="Alex Rep",
                email="representative@crm.com",
                password=get_password_hash("password123"),
                role="Medical Representative"
            )
            db.add(default_user)
            db.commit()
            db.refresh(default_user)
            print("Seeded default sales representative: representative@crm.com / password123")

        # 2. Seed HCP Doctor Profiles
        seed_doctors = [
            Doctor(
                name="Dr. Sharma", specialization="Cardiology", hospital="Apollo Hospital", city="Delhi", email="sharma@apollo.com", phone="555-0101",
                relationship_score=85, sales_opportunity="High", risk_level="Low",
                ai_summary="Dr. Sharma is a primary prescriber of CardioPlus with strong brand loyalty. Responds well to clinical data.",
                next_best_action="Secure hospital formulary inclusion form."
            ),
            Doctor(
                name="Dr. Patel", specialization="Neurology", hospital="Fortis Hospital", city="Mumbai", email="patel@fortis.com", phone="555-0102",
                relationship_score=60, sales_opportunity="Medium", risk_level="Medium",
                ai_summary="Shows moderate interest in NeuroShield but concerned about side effects. Requires patient safety briefs.",
                next_best_action="Deliver patient safety profile data and titration instructions."
            ),
            Doctor(
                name="Dr. Sen", specialization="Endocrinology", hospital="Max Hospital", city="Kolkata", email="sen@max.com", phone="555-0103",
                relationship_score=40, sales_opportunity="Low", risk_level="High",
                ai_summary="Unresponsive to digital follow-ups. Very busy clinic outpatient schedule.",
                next_best_action="Introduce new portfolio package and schedule an early morning in-person check-in."
            ),
            Doctor(
                name="Dr. Verma", specialization="Orthopedics", hospital="Medanta Hospital", city="Gurgaon", email="verma@medanta.com", phone="555-0104",
                relationship_score=92, sales_opportunity="High", risk_level="Low",
                ai_summary="Highly satisfied with OsteoRelief samples. Actively recommending to osteoarthritis patients.",
                next_best_action="Present package volume pricing and draft monthly contract."
            ),
            Doctor(
                name="Dr. Danish", specialization="Cardiology", hospital="Manipal Hospital", city="Bangalore", email="danish@manipal.com", phone="555-0105",
                relationship_score=88, sales_opportunity="High", risk_level="Low",
                ai_summary="Adopts new cardiology therapies quickly. Highly receptive to CardioPlus efficacy statistics.",
                next_best_action="Request patient registry feedback and clinical study enrollment."
            ),
            Doctor(
                name="Dr. Kapoor", specialization="Neurology", hospital="Kokilaben Hospital", city="Mumbai", email="kapoor@kokilaben.com", phone="555-0106",
                relationship_score=78, sales_opportunity="Medium", risk_level="Low",
                ai_summary="Requested hospital formulary inclusion parameters for NeuroShield. Good outlook.",
                next_best_action="Provide formal formulary inclusion request packet."
            ),
            Doctor(
                name="Dr. Iyer", specialization="Cardiology", hospital="Apollo Hospital", city="Chennai", email="iyer@apollo.com", phone="555-0107",
                relationship_score=65, sales_opportunity="Medium", risk_level="Medium",
                ai_summary="Concerned about CardioPlus cost-effectiveness vs generic alternatives.",
                next_best_action="Provide pharmacoeconomic report highlighting long-term outcomes benefit."
            ),
            Doctor(
                name="Dr. Das", specialization="Endocrinology", hospital="Yashoda Hospital", city="Hyderabad", email="das@yashoda.com", phone="555-0108",
                relationship_score=70, sales_opportunity="Medium", risk_level="Low",
                ai_summary="Actively reviewing clinical safety parameters of DiaCure. Promising lead.",
                next_best_action="Deliver the DiaCure phase 3 trial safety summary."
            ),
            Doctor(
                name="Dr. Reddy", specialization="Oncology", hospital="Apollo Cancer Center", city="Hyderabad", email="reddy@apollo.com", phone="555-0109",
                relationship_score=50, sales_opportunity="Medium", risk_level="High",
                ai_summary="Has not been visited in 45 days. High churn risk.",
                next_best_action="Arrange high-priority oncology product brief session."
            )
        ]
        db.add_all(seed_doctors)
        db.commit()
        print("Seeded HCP doctor profiles with AI relationship metrics.")

        # 3. Seed Interactions spanning a 7-day trend
        today = date.today()
        seed_interactions = [
            Interaction(
                doctor_name="Dr. Sharma",
                hospital="Apollo Hospital",
                specialization="Cardiology",
                interaction_date=today - timedelta(days=5),
                interaction_type="In-Person",
                products_discussed="CardioPlus",
                notes="Discussed CardioPlus Phase III trials. Dr. Sharma was highly receptive and requested safety profiles comparison with competitor brands.",
                summary="Met Dr. Sharma at Apollo Hospital to discuss CardioPlus. Interest level: High.",
                sentiment="Positive",
                interest_level="High",
                follow_up_date=today + timedelta(days=2),
                created_by=default_user.id
            ),
            Interaction(
                doctor_name="Dr. Patel",
                hospital="Fortis Hospital",
                specialization="Neurology",
                interaction_date=today - timedelta(days=4),
                interaction_type="Virtual",
                products_discussed="NeuroShield",
                notes="Product overview of NeuroShield. Dr. Patel had queries about the side effects profile. Neutral overall.",
                summary="Virtual call with Dr. Patel to discuss NeuroShield. Interest level: Medium.",
                sentiment="Neutral",
                interest_level="Medium",
                follow_up_date=today + timedelta(days=6),
                created_by=default_user.id
            ),
            Interaction(
                doctor_name="Dr. Sen",
                hospital="Max Hospital",
                specialization="Endocrinology",
                interaction_date=today - timedelta(days=3),
                interaction_type="Phone",
                products_discussed="DiaCure",
                notes="Dr. Sen was in the middle of rounds. Brief phone call. Asked us to drop an email with product dosage guidelines.",
                summary="Brief call with Dr. Sen to discuss DiaCure launch. Interest level: Low.",
                sentiment="Neutral",
                interest_level="Low",
                follow_up_date=today + timedelta(days=28),
                created_by=default_user.id
            ),
            Interaction(
                doctor_name="Dr. Danish",
                hospital="Manipal Hospital",
                specialization="Cardiology",
                interaction_date=today - timedelta(days=2),
                interaction_type="In-Person",
                products_discussed="CardioPlus",
                notes="Met Dr. Danish. Very interested in CardioPlus efficacy stats. Promised to prescribe to at least 5 patients this week.",
                summary="Met Dr. Danish at Manipal Hospital. Great reception to CardioPlus. Interest level: High.",
                sentiment="Positive",
                interest_level="High",
                follow_up_date=today + timedelta(days=5),
                created_by=default_user.id
            ),
            Interaction(
                doctor_name="Dr. Kapoor",
                hospital="Kokilaben Hospital",
                specialization="Neurology",
                interaction_date=today - timedelta(days=2),
                interaction_type="Virtual",
                products_discussed="NeuroShield",
                notes="Shared NeuroShield brief. Dr. Kapoor requested formulary forms to include it in hospital prescriptions.",
                summary="Virtual call with Dr. Kapoor. Requested formulary details. Interest level: High.",
                sentiment="Positive",
                interest_level="High",
                follow_up_date=today + timedelta(days=10),
                created_by=default_user.id
            ),
            Interaction(
                doctor_name="Dr. Verma",
                hospital="Medanta Hospital",
                specialization="Orthopedics",
                interaction_date=today - timedelta(days=1),
                interaction_type="In-Person",
                products_discussed="OsteoRelief",
                notes="Discussed OsteoRelief sample feedback. Patients reported positive results. Dr. Verma wants to proceed with more samples.",
                summary="Met Dr. Verma. Shared sample feedback on OsteoRelief. Interest level: High.",
                sentiment="Positive",
                interest_level="High",
                follow_up_date=today + timedelta(days=4),
                created_by=default_user.id
            ),
            Interaction(
                doctor_name="Dr. Das",
                hospital="Yashoda Hospital",
                specialization="Endocrinology",
                interaction_date=today - timedelta(days=1),
                interaction_type="Email",
                products_discussed="DiaCure",
                notes="Email correspondence sent. Doctor replied requesting details about clinical safety parameters.",
                summary="Emailed details of DiaCure. Interest level: Medium.",
                sentiment="Neutral",
                interest_level="Medium",
                follow_up_date=today + timedelta(days=14),
                created_by=default_user.id
            ),
            Interaction(
                doctor_name="Dr. Iyer",
                hospital="Apollo Hospital",
                specialization="Cardiology",
                interaction_date=today,
                interaction_type="In-Person",
                products_discussed="CardioPlus",
                notes="Presented CardioPlus slides. Dr. Iyer questioned the price comparison points. Neutral interest.",
                summary="Met Dr. Iyer to discuss CardioPlus pricing. Interest level: Medium.",
                sentiment="Neutral",
                interest_level="Medium",
                follow_up_date=today + timedelta(days=8),
                created_by=default_user.id
            )
        ]
        db.add_all(seed_interactions)
        db.commit()

        # 4. Refresh and seed followups
        inserted_interactions = db.query(Interaction).all()
        for inter in inserted_interactions:
            if inter.follow_up_date:
                priority = "High" if inter.interest_level == "High" else "Medium"
                objective = f"Follow up on {inter.products_discussed} trial discussion and handle any pricing or efficacy concerns."
                risk = "Competitors may secure formulary spots if follow-up is delayed past 14 days."
                
                fup = FollowUp(
                    interaction_id=inter.id,
                    follow_up_date=inter.follow_up_date,
                    status="Pending",
                    notes=f"Follow-up regarding {inter.products_discussed}.",
                    priority=priority,
                    objective=objective,
                    risk_if_delayed=risk
                )
                db.add(fup)
        db.commit()
        print("Seeded baseline interactions and follow-ups successfully.")

        # 5. Seed Product Portfolio
        seed_products = [
            Product(
                name="CardioPlus", code="CP-100", therapeutic_area="Cardiology", clinical_indication="Heart Failure, Hypertension",
                formulation="10mg/20mg Tablets", formulary_status="Formulary Active", sample_inventory=120,
                description="CardioPlus is indicated for the treatment of heart failure and hypertension. Clinically proven to improve outcomes.",
                market_segment="Prescription", launch_date=date(2024, 1, 15), mrp=45, warehouse_location="Main Warehouse - Sector A",
                last_restocked=date.today() - timedelta(days=5)
            ),
            Product(
                name="NeuroShield", code="NS-50", therapeutic_area="Neurology", clinical_indication="Neuropathy, Cognitive Support",
                formulation="50mg Capsules", formulary_status="Formulary Active", sample_inventory=80,
                description="Provides neuroprotective benefits and neurovascular support in chronic degenerative cases.",
                market_segment="Prescription", launch_date=date(2023, 11, 10), mrp=95, warehouse_location="Main Warehouse - Sector B",
                last_restocked=date.today() - timedelta(days=12)
            ),
            Product(
                name="DiaCure", code="DC-500", therapeutic_area="Diabetology", clinical_indication="Type-2 Diabetes Control",
                formulation="500mg Tablets", formulary_status="Pending Review", sample_inventory=45,
                description="Enables tight glycemic index control for adult patients with type-2 diabetes mellitus.",
                market_segment="Prescription", launch_date=date(2024, 5, 20), mrp=30, warehouse_location="Cold Storage 1",
                last_restocked=date.today() - timedelta(days=2)
            ),
            Product(
                name="OsteoRelief", code="OR-5ML", therapeutic_area="Orthopedics", clinical_indication="Osteoporosis, Joint Pain",
                formulation="Injectable 5ml", formulary_status="Formulary Active", sample_inventory=60,
                description="Fast acting intra-articular injection promoting cartilage regeneration and lubrication.",
                market_segment="Specialist Prescription", launch_date=date(2023, 8, 5), mrp=125, warehouse_location="Cold Storage 2",
                last_restocked=date.today() - timedelta(days=8)
            ),
            Product(
                name="RespiraCare", code="RC-250", therapeutic_area="Pulmonology", clinical_indication="Asthma, COPD Management",
                formulation="250mcg Inhaler", formulary_status="Pending Review", sample_inventory=30,
                description="Inhaled corticosteroid targeting bronchiolar inflammation in severe asthma cases.",
                market_segment="Prescription", launch_date=date(2024, 3, 1), mrp=65, warehouse_location="Main Warehouse - Sector C",
                last_restocked=date.today() - timedelta(days=20)
            ),
            Product(
                name="GastroGuard", code="GG-40", therapeutic_area="Gastroenterology", clinical_indication="Acid Reflux, Gastritis",
                formulation="40mg Tablets", formulary_status="Not Submitted", sample_inventory=25,
                description="Proton pump inhibitor offering long lasting gastric acid secretion control.",
                market_segment="OTC/Prescription", launch_date=date(2024, 2, 18), mrp=20, warehouse_location="Main Warehouse - Sector D",
                last_restocked=date.today() - timedelta(days=15)
            ),
            Product(
                name="OncoViva", code="OV-200", therapeutic_area="Oncology", clinical_indication="Supportive Cancer Therapy",
                formulation="200mg Capsules", formulary_status="Formulary Active", sample_inventory=15,
                description="Adjuvant cancer supportive therapeutic capsule mitigating myelosuppressive side effects.",
                market_segment="Specialist Prescription", launch_date=date(2023, 12, 1), mrp=350, warehouse_location="Cold Storage 3",
                last_restocked=date.today() - timedelta(days=22)
            ),
            Product(
                name="OptiVision", code="OV-10", therapeutic_area="Ophthalmology", clinical_indication="Dry Eye, Eye Irritation",
                formulation="10ml Eye Drops", formulary_status="Formulary Active", sample_inventory=55,
                description="Lubricating artificial tears formulation treating severe dry eye conditions.",
                market_segment="OTC", launch_date=date(2024, 1, 10), mrp=15, warehouse_location="Main Warehouse - Sector E",
                last_restocked=date.today() - timedelta(days=3)
            )
        ]
        db.add_all(seed_products)
        db.commit()
        print("Seeded product portfolio records successfully.")

        # 6. Seed System Configurations and Tools
        sys_config = SystemConfig(
            engine_mode="Evaluation",
            evaluation_mode=True,
            production_mode=False,
            ai_enabled=True,
            active_model="llama-3.3-70b-versatile",
            temperature=0.2,
            max_tokens=2048,
            top_p=0.9,
            frequency_penalty=0.0,
            presence_penalty=0.0,
            api_key="gsk_l9H5wJpW5wJwJpW5wJwJ****************",
            api_status="Connected",
            last_connection_time="May 16, 2026 • 10:30 AM"
        )
        db.add(sys_config)
        
        default_tools = [
            SystemTool(id="log_interaction", name="Log Interaction Tool", description="Extract and analyze interaction data from doctor discussions.", enabled=True),
            SystemTool(id="edit_interaction", name="Edit Interaction Tool", description="Refine, update, and correct interaction summaries.", enabled=True),
            SystemTool(id="relationship_intelligence", name="Relationship Intelligence Tool", description="Compute HCP relationships, scores, and risk flags.", enabled=True),
            SystemTool(id="next_best_action", name="Next Best Action Engine", description="Recommend products to promote and actions to take.", enabled=True),
            SystemTool(id="smart_followup", name="Smart Follow-up Planner", description="Schedule subsequent visits automatically.", enabled=True),
            SystemTool(id="compliance_guard", name="Safety & Compliance Guard", description="Validate compliance with medical guidelines.", enabled=True)
        ]
        db.add_all(default_tools)
        db.commit()
        print("Seeded default AI system configurations and tools list.")

    except Exception as e:
        print(f"Error seeding database: {str(e)}")
        db.rollback()
    finally:
        db.close()

@app.on_event("startup")
def startup_event():
    seed_database()


@app.get("/")
def read_root():
    return {"message": "Welcome to the AI-First Healthcare CRM API"}


