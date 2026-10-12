import sys
import os

# Add backend directory to sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

from app.database import SessionLocal, Base, engine
from app.models.user import User
from app.utils.security import hash_password

DEFAULT_PASSWORD = os.getenv("DEFAULT_SEED_PASSWORD", "Kalpanaaa@123")

INITIAL_USERS = [
    {
        "email": "founder@kalpanaaasoftwaresolutions.in",
        "first_name": "Founder",
        "last_name": "CEO",
        "role": "CEO",
        "department": "Management",
        "password": DEFAULT_PASSWORD
    },
    {
        "email": "akshitujjain@kalpanaaasoftwaresolutions.in",
        "first_name": "Akshit",
        "last_name": "Ujjain",
        "role": "CTO",
        "department": "Management",
        "password": DEFAULT_PASSWORD
    },
    {
        "email": "d.koushik@kalpanaaasoftwaresolutions.in",
        "first_name": "D.",
        "last_name": "Koushik",
        "role": "PM",
        "department": "Engineering",
        "password": DEFAULT_PASSWORD
    }
]

def seed_users():
    print("Ensuring tables exist...")
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        for udata in INITIAL_USERS:
            email = udata["email"].strip().lower()
            existing = db.query(User).filter(User.email == email).first()
            if existing:
                print(f"Updating existing user: {email} ({udata['role']})")
                existing.first_name = udata["first_name"]
                existing.last_name = udata["last_name"]
                existing.role = udata["role"]
                existing.department = udata["department"]
                existing.hashed_password = hash_password(udata["password"])
                existing.is_active = True
            else:
                print(f"Creating user: {email} ({udata['role']})")
                user = User(
                    email=email,
                    hashed_password=hash_password(udata["password"]),
                    first_name=udata["first_name"],
                    last_name=udata["last_name"],
                    role=udata["role"],
                    department=udata["department"],
                    is_active=True
                )
                db.add(user)
        db.commit()
        print("Successfully seeded all 3 users into the database!")
    except Exception as e:
        db.rollback()
        print("Error seeding users:", e)
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_users()
