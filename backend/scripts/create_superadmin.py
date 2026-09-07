import sys
import os
from sqlalchemy.orm import Session
from getpass import getpass

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.models.user import User
from app.utils.security import hash_password

def main():
    print("Workmate Superadmin Creator")
    print("---------------------------")
    email = input("Email: ").strip()
    password = getpass("Password: ").strip()
    first_name = input("First Name: ").strip()
    last_name = input("Last Name: ").strip()
    role = input("Role (CEO/CTO) [CEO]: ").strip().upper() or "CEO"

    if role not in ("CEO", "CTO"):
        print("Role must be CEO or CTO")
        return

    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            print("User with this email already exists.")
            return

        user = User(
            email=email,
            hashed_password=hash_password(password),
            first_name=first_name,
            last_name=last_name,
            role=role,
        )
        db.add(user)
        db.commit()
        print(f"Successfully created {role}: {email}")
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main()
