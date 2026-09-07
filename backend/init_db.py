import sys
import os

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.database import engine, Base, SessionLocal
from app.models.user import User
from app.utils.security import hash_password

def setup():
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully.")
    
    db = SessionLocal()
    try:
        email = "akshitujjain@kalpanaaasoftwaresolutions.in"
        password = "Kalpanaaa@123"
        role = "CEO"
        
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            print("CEO user already exists.")
        else:
            user = User(
                email=email,
                hashed_password=hash_password(password),
                first_name="Akshit",
                last_name="Ujjain",
                role=role,
            )
            db.add(user)
            db.commit()
            print(f"Successfully created CEO: {email}")
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    setup()
