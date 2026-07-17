import os
import sys
from datetime import date, datetime, timedelta

# Ensure python knows where backend modules are
sys.path.insert(0, os.path.abspath("backend"))

from app.database import SessionLocal
from app.models import User, Doctor, Product, Interaction, FollowUp, SystemConfig, SystemTool
from app.api.auth import get_password_hash

def seed():
    db = SessionLocal()
    try:
        print("Starting Demo Database Seeding (3-Phase Scenario)...")
        
        # 1. Clean existing tables
        print("Cleaning old data...")
        db.query(FollowUp).delete()
        db.query(Interaction).delete()
        db.query(Doctor).delete()
        db.query(Product).delete()
        db.query(User).filter(User.email == "representative@crm.com").delete()
        db.query(SystemConfig).delete()
        db.query(SystemTool).delete()
        db.commit()

        # 2. Seed System Configuration
        print("Seeding System Configuration...")
        sys_config = SystemConfig(
            engine_mode="Production",
            evaluation_mode=False,
            production_mode=True,
            ai_enabled=True,
            active_model="gemma2-9b-it",
            temperature=0.2,
            max_tokens=2048,
            top_p=0.9,
            frequency_penalty=0.0,
            presence_penalty=0.0,
            api_key="gsk_l9H5wJpW5wJwJpW5wJwJ",
            api_status="Connected",
            last_connection_time="July 17, 2026 • 05:00 PM"
        )
        db.add(sys_config)
        db.commit()

        # Seed System Tools
        print("Seeding System Tools...")
        default_tools = [
            SystemTool(id="log_interaction", name="Log Interaction Tool", description="Extract and analyze interaction data from doctor discussions.", enabled=True),
            SystemTool(id="edit_interaction", name="Edit Interaction Tool", description="Refine, update, and correct interaction summaries.", enabled=True),
            SystemTool(id="relationship_intelligence", name="Relationship Intelligence Tool", description="Compute HCP relationships, scores, and risk flags.", enabled=True),
            SystemTool(id="follow_up_planner", name="Smart Follow-up Planner Tool", description="Schedule, update, and optimize follow-up visits.", enabled=True),
            SystemTool(id="next_best_action", name="Next Best Action Tool", description="Generate dynamic product and visit recommendations.", enabled=True)
        ]
        db.add_all(default_tools)
        db.commit()

        # 3. Seed User (Alex Johnson)
        print("Creating User Alex Johnson...")
        hashed_password = get_password_hash("password123")
        user = User(
            name="Alex Johnson",
            email="representative@crm.com",
            password=hashed_password,
            role="Medical Representative"
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # 4. Seed Products
        print("Creating Product Portfolio...")
        products = [
            Product(
                name="CardioPlus",
                code="CP001",
                therapeutic_area="Cardiology",
                clinical_indication="Heart Failure",
                formulation="10mg/20mg Film-Coated Tablets",
                sample_inventory=250,
                mrp=45,
                market_segment="Prescription",
                formulary_status="Formulary Active",
                description="Indicated for the treatment of stable chronic heart failure with reduced left ventricular ejection fraction."
            ),
            Product(
                name="NeuroShield",
                code="NS002",
                therapeutic_area="Neurology",
                clinical_indication="Migraine Prevention",
                formulation="50mg Extended Release Capsules",
                sample_inventory=180,
                mrp=120,
                market_segment="Prescription",
                formulary_status="Formulary Active",
                description="Designed for the prophylactic treatment of migraine in adults."
            ),
            Product(
                name="DiaCure",
                code="DC003",
                therapeutic_area="Diabetology",
                clinical_indication="Type 2 Diabetes",
                formulation="500mg Tablets",
                sample_inventory=320,
                mrp=65,
                market_segment="Prescription",
                formulary_status="Formulary Active",
                description="Oral antihyperglycemic drug used in the management of type 2 diabetes mellitus."
            ),
            Product(
                name="OsteoRelief",
                code="OR004",
                therapeutic_area="Orthopedics",
                clinical_indication="Osteoarthritis",
                formulation="5ml Injectable Solution",
                sample_inventory=150,
                mrp=280,
                market_segment="Prescription",
                formulary_status="Formulary Active",
                description="Intra-articular injection providing pain relief and joint lubrication for osteoarthritis patients."
            ),
            Product(
                name="PulmoCare",
                code="PC005",
                therapeutic_area="Pulmonology",
                clinical_indication="Asthma & COPD",
                formulation="200mcg Metered Dose Inhaler",
                sample_inventory=200,
                mrp=350,
                market_segment="Prescription",
                formulary_status="Formulary Active",
                description="Inhalation aerosol indicated for the prophylaxis and maintenance treatment of asthma."
            )
        ]
        db.add_all(products)
        db.commit()

        # 5. Seed HCPs (10 Doctors)
        # Relationship scores are adjusted slightly so Dr Rahul Sharma is the top profile at 78.
        # This ensures he naturally becomes the AI Daily Brief highlight.
        print("Creating HCP Directory...")
        doctors = [
            Doctor(
                name="Dr Rahul Sharma",
                specialization="Cardiology",
                hospital="Apollo Hospital",
                city="Mumbai",
                email="rahul.sharma@apollo.com",
                phone="9876543210",
                relationship_score=78,
                sales_opportunity="High",
                risk_level="Low",
                ai_summary="Key cardiologist at Apollo Hospital. Expressed interest in CardioPlus outcome trials.",
                next_best_action="Product: CardioPlus | Deliver CardioPlus outcome charts"
            ),
            Doctor(
                name="Dr Meera Joshi",
                specialization="Cardiology",
                hospital="Kokilaben Hospital",
                city="Mumbai",
                email="meera.joshi@kokilaben.com",
                phone="9876543211",
                relationship_score=77,
                sales_opportunity="High",
                risk_level="Low",
                ai_summary="Senior cardiologist at Kokilaben. Prescribes CardioPlus selectively. Needs titration chart.",
                next_best_action="Product: CardioPlus | Share CardioPlus titration card"
            ),
            Doctor(
                name="Dr Rohan Kulkarni",
                specialization="Orthopedics",
                hospital="Ruby Hall Clinic",
                city="Pune",
                email="rohan.kulkarni@ruby.com",
                phone="9876543212",
                relationship_score=76,
                sales_opportunity="High",
                risk_level="Low",
                ai_summary="Leading orthopedic surgeon. Receptive to OsteoRelief cost-benefit arguments.",
                next_best_action="Product: OsteoRelief | Deliver OsteoRelief price sheet"
            ),
            Doctor(
                name="Dr Nisha Shah",
                specialization="Diabetology",
                hospital="HCG Hospital",
                city="Ahmedabad",
                email="nisha.shah@hcg.com",
                phone="9876543213",
                relationship_score=75,
                sales_opportunity="Medium",
                risk_level="Low",
                ai_summary="Diabetologist with medium volume. Evaluated DiaCure for elderly patient cohorts.",
                next_best_action="Product: DiaCure | Share DiaCure efficacy monograph"
            ),
            Doctor(
                name="Dr Rajesh Gupta",
                specialization="Pulmonology",
                hospital="Medanta Hospital",
                city="Gurugram",
                email="rajesh.gupta@medanta.com",
                phone="9876543214",
                relationship_score=74,
                sales_opportunity="Medium",
                risk_level="Medium",
                ai_summary="Pulmonologist evaluating PulmoCare inhaler consistency. Target for formulary push.",
                next_best_action="Product: PulmoCare | Deliver PulmoCare starter inhalers"
            ),
            Doctor(
                name="Dr Vikram Kapoor",
                specialization="Neurology",
                hospital="Fortis Hospital",
                city="Delhi",
                email="vikram.kapoor@fortis.com",
                phone="9876543215",
                relationship_score=73,
                sales_opportunity="High",
                risk_level="Low",
                ai_summary="Neurologist with strong interest in NeuroShield extended release profiles.",
                next_best_action="Product: NeuroShield | Present NeuroShield elderly trial data"
            ),
            Doctor(
                name="Dr Sneha Verma",
                specialization="Neurology",
                hospital="Max Hospital",
                city="Delhi",
                email="sneha.verma@max.com",
                phone="9876543216",
                relationship_score=72,
                sales_opportunity="Medium",
                risk_level="Low",
                ai_summary="Neurology lead. Receptive to NeuroShield safety trials. Needs follow-up.",
                next_best_action="Product: NeuroShield | Provide NeuroShield safety booklets"
            ),
            Doctor(
                name="Dr Pooja Singh",
                specialization="Pulmonology",
                hospital="Apollo Hospital",
                city="Hyderabad",
                email="pooja.singh@apollo.com",
                phone="9876543217",
                relationship_score=71,
                sales_opportunity="Medium",
                risk_level="Low",
                ai_summary="Pulmonology consultant. Needs clinical updates regarding PulmoCare safety data.",
                next_best_action="Product: PulmoCare | Review PulmoCare outcomes abstract"
            ),
            Doctor(
                name="Dr Amit Patel",
                specialization="Diabetology",
                hospital="Fortis Hospital",
                city="Bangalore",
                email="amit.patel@fortis.com",
                phone="9876543218",
                relationship_score=69,
                sales_opportunity="Medium",
                risk_level="Medium",
                ai_summary="Diabetologist concerned with DiaCure MRP. Needs pricing and package comparisons.",
                next_best_action="Product: DiaCure | Share DiaCure cost-efficacy comparisons"
            ),
            Doctor(
                name="Dr Kavita Nair",
                specialization="Orthopedics",
                hospital="Manipal Hospital",
                city="Bangalore",
                email="kavita.nair@manipal.com",
                phone="9876543219",
                relationship_score=65,
                sales_opportunity="Low",
                risk_level="High",
                ai_summary="Orthopedist prescribing generic joint lubricants. Raising cost objections.",
                next_best_action="Product: OsteoRelief | Present OsteoRelief cost-benefit sheets"
            )
        ]
        db.add_all(doctors)
        db.commit()

        # 6. Seed 5 Upcoming Planned Visits in the Calendar
        # Note: notes starts with "Planned:" so these are ignored by historical views, but show up on the calendar.
        print("Seeding Upcoming Calendar Visits...")
        today_val = date.today()
        
        calendar_configs = [
            ("Dr Rahul Sharma", "Apollo Hospital", "Cardiology", 1, "10:30 AM", "CardioPlus", "CardioPlus Introduction"),
            ("Dr Sneha Verma", "Max Hospital", "Neurology", 1, "02:00 PM", "NeuroShield", "NeuroShield Discussion"),
            ("Dr Amit Patel", "Fortis Hospital", "Diabetology", 3, "11:00 AM", "DiaCure", "DiaCure Clinical Trial Review"),
            ("Dr Kavita Nair", "Manipal Hospital", "Orthopedics", 4, "01:30 PM", "OsteoRelief", "OsteoRelief Sample Distribution"),
            ("Dr Rajesh Gupta", "Medanta Hospital", "Pulmonology", 5, "04:00 PM", "PulmoCare", "PulmoCare Product Introduction")
        ]

        for doc_name, hosp, spec, days_offset, visit_time, product, agenda in calendar_configs:
            v_date = today_val + timedelta(days=days_offset)
            
            # Create placeholder Interaction record
            db_placeholder = Interaction(
                doctor_name=doc_name,
                hospital=hosp,
                specialization=spec,
                interaction_date=v_date,
                interaction_type="In-Person",
                products_discussed=product,
                notes=f"Planned: {agenda}.",
                summary=agenda,
                sentiment="Neutral",
                interest_level="Medium",
                follow_up_date=v_date,
                created_by=user.id
            )
            db.add(db_placeholder)
            db.commit()
            db.refresh(db_placeholder)

            # Create FollowUp record
            db_followup = FollowUp(
                interaction_id=db_placeholder.id,
                follow_up_date=v_date,
                status="Pending",
                notes=f"Time: {visit_time} | {agenda}",
                priority="Medium",
                objective=agenda
            )
            db.add(db_followup)
        db.commit()
        print("Upcoming calendar visits successfully seeded!")

        # 7. Print Demo Readiness Report
        print("\n" + "="*60)
        print("DEMO READINESS REPORT")
        print("="*60)
        
        users_count = db.query(User).count()
        doctors_count = db.query(Doctor).count()
        products_count = db.query(Product).count()
        interactions_count = db.query(Interaction).filter(~Interaction.notes.like("Planned:%")).count()
        calendar_events = db.query(Interaction).filter(Interaction.notes.like("Planned:%")).count()
        
        print(f"Users:               {users_count}")
        print(f"Doctors:             {doctors_count}")
        print(f"Products:            {products_count}")
        print(f"Interactions (Hist): {interactions_count} (Must be 0)")
        print(f"Calendar Visits:     {calendar_events} (Must be 5)")
        print("Dashboard Status:    Dynamic Metrics Ready")
        print("Database Status:     SQLite (crm.db) Online")
        print("AI Tool Readiness:   5 Tools Activated")
        print("="*60)
        print("Production demo dataset created successfully and ready for recording.")
        print("="*60)

    except Exception as e:
        db.rollback()
        print(f"Error seeding demo dataset: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed()
