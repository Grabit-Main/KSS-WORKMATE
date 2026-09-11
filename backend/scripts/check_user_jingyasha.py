import os
import sys

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

from app.database import SessionLocal
from app.models.user import User
from app.models.project import Team, TeamMembership

def check_jingyasha():
    db = SessionLocal()
    try:
        users = db.query(User).filter(User.first_name.ilike("%jingyasha%") | User.last_name.ilike("%jingyasha%")).all()
        print(f"Found {len(users)} users matching 'jingyasha':")
        for u in users:
            print(f"ID: {u.id}, Name: {u.first_name} {u.last_name}, Email: {u.email}, Role: {u.role}, Active: {u.is_active}, Dept: {u.department}")
            memberships = db.query(TeamMembership).filter(TeamMembership.user_id == u.id).all()
            print(f"  Team memberships ({len(memberships)}):")
            for m in memberships:
                team = db.query(Team).filter(Team.id == m.team_id).first()
                print(f"    Team: {team.name if team else m.team_id}, is_lead: {m.is_lead}")
                
        print("\n--- All Users in DB ---")
        all_u = db.query(User).all()
        for u in all_u:
            print(f" - {u.first_name} {u.last_name} ({u.email}, Role: {u.role}, Active: {u.is_active}, Dept: {u.department})")
            
        print("\n--- All Teams in DB ---")
        all_t = db.query(Team).all()
        for t in all_t:
            print(f" Team: {t.name} ({t.id})")
            m_list = db.query(TeamMembership).filter(TeamMembership.team_id == t.id).all()
            for m in m_list:
                member_u = db.query(User).filter(User.id == m.user_id).first()
                m_name = f"{member_u.first_name} {member_u.last_name}" if member_u else str(m.user_id)
                print(f"   Member: {m_name} (is_lead={m.is_lead})")
            
    finally:
        db.close()

if __name__ == "__main__":
    check_jingyasha()
