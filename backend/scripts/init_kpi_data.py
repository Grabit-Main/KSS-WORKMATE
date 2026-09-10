import csv
import os
import sys
from datetime import datetime

# Add backend directory to sys.path
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

from app.database import Base, engine, SessionLocal
from app.models.kpi import DailyKPILog
from app.models.user import User

def normalize_name(name: str) -> str:
    return "".join(c.lower() for c in name if c.isalnum())

def main():
    print("Creating tables in database...")
    Base.metadata.create_all(bind=engine)
    print("Tables created successfully.")

    db = SessionLocal()
    try:
        # Find Team Lead
        tl = db.query(User).filter(User.role == "TL").first()
        if not tl:
            tl = db.query(User).filter(User.email.ilike("%satya%")).first()
        if not tl:
            tl = db.query(User).first()
        print(f"Using Evaluator (TL): {tl.full_name} ({tl.role}, {tl.id})")

        # Map all users by normalized full name and first/last name
        users = db.query(User).all()
        user_map = {}
        for u in users:
            norm_full = normalize_name(u.full_name)
            user_map[norm_full] = u
            user_map[normalize_name(f"{u.first_name}{u.last_name}")] = u
            user_map[normalize_name(u.first_name)] = u

        csv_path = "/Users/work/Downloads/Employee_KPI_Tracker-01(Daily KPI Log).csv"
        if not os.path.exists(csv_path):
            csv_path = os.path.join(backend_dir, "..", "Employee_KPI_Tracker-01.csv")

        if not os.path.exists(csv_path):
            print(f"CSV file not found at {csv_path}, skipping seeding.")
            return

        with open(csv_path, mode="r", encoding="utf-8") as f:
            reader = list(csv.reader(f))

        # Header is at row index 3
        seeded = 0
        skipped = 0

        for r in reader[4:]:
            if len(r) < 15 or not r[0].strip() or not r[1].strip() or not r[2].strip():
                continue

            date_str = r[0].strip()       # e.g. '01-Sep-26'
            emp_name = r[1].strip()       # e.g. 'Asbin T S'
            try:
                log_date = datetime.strptime(date_str, "%d-%b-%y").date()
            except ValueError:
                try:
                    log_date = datetime.strptime(date_str, "%Y-%m-%d").date()
                except ValueError:
                    continue

            norm_emp = normalize_name(emp_name)
            matched_user = user_map.get(norm_emp)

            # Try partial matching if exact match not found
            if not matched_user:
                for k, u in user_map.items():
                    if norm_emp in k or k in norm_emp:
                        matched_user = u
                        break

            if not matched_user:
                print(f"Could not match employee '{emp_name}', skipping row.")
                skipped += 1
                continue

            try:
                scores = [int(float(x.strip())) for x in r[2:12]]
            except Exception as e:
                print(f"Error parsing scores for {emp_name} on {date_str}: {e}")
                continue

            pct, month_str, status_str = DailyKPILog.calculate_metrics(
                scores[0], scores[1], scores[2], scores[3], scores[4],
                scores[5], scores[6], scores[7], scores[8], scores[9],
                log_date
            )

            # Check if exists
            existing = db.query(DailyKPILog).filter(
                DailyKPILog.employee_id == matched_user.id,
                DailyKPILog.date == log_date
            ).first()

            if not existing:
                kpi_log = DailyKPILog(
                    date=log_date,
                    employee_id=matched_user.id,
                    evaluator_id=tl.id,
                    task_completion=scores[0],
                    quality=scores[1],
                    productivity=scores[2],
                    deadline_adherence=scores[3],
                    ownership=scores[4],
                    problem_solving=scores[5],
                    communication=scores[6],
                    team_collaboration=scores[7],
                    learning_improvement=scores[8],
                    attendance_discipline=scores[9],
                    daily_kpi_percentage=pct,
                    month=month_str,
                    status=status_str,
                    notes=f"Daily performance evaluation for {matched_user.full_name}"
                )
                db.add(kpi_log)
                seeded += 1

        db.commit()
        print(f"Seeding completed. Seeded {seeded} records, skipped {skipped}.")

    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    main()
