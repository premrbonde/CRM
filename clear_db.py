import sys
import os

# Adjust python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend')))

from app.database import SessionLocal
from app.models import Interaction, FollowUp, Doctor

def clear_data():
    db = SessionLocal()
    try:
        print("Clearing all logged HCP interactions and follow-ups...")
        db.query(FollowUp).delete()
        db.query(Interaction).delete()
        
        print("Resetting doctor profiles to default relationship scores...")
        doctors = db.query(Doctor).all()
        for doc in doctors:
            doc.relationship_score = 75
            doc.sales_opportunity = "Medium"
            doc.risk_level = "Low"
            doc.ai_summary = None
            doc.next_best_action = None
            
        db.commit()
        print("Database cleared successfully!")
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == '__main__':
    clear_data()
