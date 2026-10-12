import csv
import io
import os
import re
import sys
from datetime import datetime

# Add parent directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import SessionLocal
from app.models.user import User
from app.models.kpi import DailyKPILog

def normalize_name(s: str) -> str:
    if not s:
        return ""
    return re.sub(r"[^a-zA-Z0-9]", "", s).lower()

CSV_FILE_PATH = r"C:\Users\dassa\.gemini\antigravity-ide\brain\a25983a6-9ed4-428f-b206-cb85f172de47\.user_uploaded\media_1791805444141.csv"

def run_import():
    db = SessionLocal()
    try:
        # 1. Fetch TL
        tl = db.query(User).filter(User.email.ilike("%satya.ranjan.dash%")).first()
        if not tl:
            tl = db.query(User).filter(User.role == "TL").first()
        if not tl:
            print("ERROR: TL user not found in database!")
            return

        print(f"TL Evaluator: {tl.first_name} {tl.last_name} ({tl.email}, {tl.id})")

        # 2. Build map of employees
        all_users = db.query(User).all()
        user_map = {}
        for u in all_users:
            full = f"{u.first_name or ''} {u.last_name or ''}".strip()
            norm = normalize_name(full)
            user_map[norm] = u
            # Also map by email prefix if helpful
            email_pref = normalize_name(u.email.split("@")[0])
            user_map[email_pref] = u

        # Manual mappings if needed
        # Check all 10 developers
        dev_names = [
            "Shruti Sanjana Sahoo",
            "Prahlad Sharma",
            "Pratiksha Harode",
            "Thabeethal Asnath I",
            "Asbin T S",
            "Jingyasha Priyadarsini Rout",
            "Ritish Devadiga",
            "Kuruva Mahesh",
            "Akash SB",
            "Priyanka Kushwah"
        ]

        mapped_devs = {}
        for name in dev_names:
            norm = normalize_name(name)
            matched = user_map.get(norm)
            if not matched:
                # Try parts
                for k, u in user_map.items():
                    if norm in k or k in norm:
                        matched = u
                        break
            if matched:
                mapped_devs[name] = matched
                print(f"Mapped '{name}' -> {matched.first_name} {matched.last_name} ({matched.email})")
            else:
                print(f"WARNING: Could not map '{name}'")

        if len(mapped_devs) != len(dev_names):
            print(f"ERROR: Only mapped {len(mapped_devs)} out of {len(dev_names)} developers!")
            return

        # 3. Read CSV and insert/update
        with open(CSV_FILE_PATH, "r", encoding="utf-8-sig") as f:
            reader = csv.reader(f)
            rows = list(reader)

        header_idx = -1
        for i, row in enumerate(rows):
            if len(row) > 1 and row[0].strip().lower() == "date" and "employee" in row[1].strip().lower():
                header_idx = i
                break

        if header_idx == -1:
            print("ERROR: CSV header row not found!")
            return

        print(f"Header found at row {header_idx}: {rows[header_idx]}")

        data_rows = rows[header_idx + 1:]
        inserted_count = 0
        updated_count = 0

        for row in data_rows:
            if not row or len(row) < 14 or not row[0].strip():
                continue

            date_str = row[0].strip()
            emp_name = row[1].strip()

            # Parse date e.g. "21-Sep-26"
            try:
                log_date = datetime.strptime(date_str, "%d-%b-%y").date()
            except Exception as e:
                print(f"Failed to parse date '{date_str}': {e}")
                continue

            matched_user = mapped_devs.get(emp_name)
            if not matched_user:
                # Try norm
                norm = normalize_name(emp_name)
                for d_name, u in mapped_devs.items():
                    if normalize_name(d_name) == norm:
                        matched_user = u
                        break

            if not matched_user:
                print(f"Skipping unknown employee: '{emp_name}'")
                continue

            task_comp = int(float(row[2].strip()))
            quality = int(float(row[3].strip()))
            prod = int(float(row[4].strip()))
            deadline = int(float(row[5].strip()))
            ownership = int(float(row[6].strip()))
            prob_solv = int(float(row[7].strip()))
            comm = int(float(row[8].strip()))
            team_collab = int(float(row[9].strip()))
            learning = int(float(row[10].strip()))
            attendance = int(float(row[11].strip()))

            pct_raw = row[12].strip().replace("%", "")
            pct = float(pct_raw)
            month_str = row[13].strip()
            status_str = row[14].strip() if len(row) > 14 else ""

            # Check if record exists
            existing = db.query(DailyKPILog).filter(
                DailyKPILog.employee_id == matched_user.id,
                DailyKPILog.date == log_date
            ).first()

            if existing:
                existing.evaluator_id = tl.id
                existing.task_completion = task_comp
                existing.quality = quality
                existing.productivity = prod
                existing.deadline_adherence = deadline
                existing.ownership = ownership
                existing.problem_solving = prob_solv
                existing.communication = comm
                existing.team_collaboration = team_collab
                existing.learning_improvement = learning
                existing.attendance_discipline = attendance
                existing.daily_kpi_percentage = pct
                existing.month = month_str
                existing.status = status_str
                existing.updated_at = datetime.utcnow()
                updated_count += 1
            else:
                new_log = DailyKPILog(
                    employee_id=matched_user.id,
                    evaluator_id=tl.id,
                    date=log_date,
                    task_completion=task_comp,
                    quality=quality,
                    productivity=prod,
                    deadline_adherence=deadline,
                    ownership=ownership,
                    problem_solving=prob_solv,
                    communication=comm,
                    team_collaboration=team_collab,
                    learning_improvement=learning,
                    attendance_discipline=attendance,
                    daily_kpi_percentage=pct,
                    month=month_str,
                    status=status_str
                )
                db.add(new_log)
                inserted_count += 1

        db.commit()
        print(f"SUCCESS: Imported {inserted_count} new logs, updated {updated_count} logs.")

        total = db.query(DailyKPILog).count()
        print(f"Total DailyKPILogs in database now: {total}")

    except Exception as exc:
        db.rollback()
        print(f"ERROR during import: {exc}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    run_import()
