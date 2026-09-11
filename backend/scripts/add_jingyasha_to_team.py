import os
import sys

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

from app.database import SessionLocal
from app.models.user import User
from app.models.project import Team, TeamMembership

def add_jingyasha():
    db = SessionLocal()
    try:
        jingyasha = db.query(User).filter(
            User.first_name.ilike("%jingyasha%") | User.last_name.ilike("%jingyasha%")
        ).first()
        
        if not jingyasha:
            print("Jingyasha not found!")
            return
            
        print(f"Found Jingyasha: {jingyasha.id} - {jingyasha.first_name} {jingyasha.last_name}")
        
        # Get all teams
        teams = db.query(Team).all()
        added = 0
        for t in teams:
            existing = db.query(TeamMembership).filter(
                TeamMembership.team_id == t.id,
                TeamMembership.user_id == jingyasha.id
            ).first()
            if not existing:
                m = TeamMembership(
                    team_id=t.id,
                    user_id=jingyasha.id,
                    is_lead=False
                )
                db.add(m)
                added += 1
                print(f"Added Jingyasha to team: {t.name}")
                
        db.commit()
        print(f"Successfully added Jingyasha to {added} teams.")
        
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    add_jingyasha()
