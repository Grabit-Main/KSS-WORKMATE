import os
import sys

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)

from app.database import SessionLocal
from app.models.kpi import DailyKPILog

def clear_demo_data():
    db = SessionLocal()
    try:
        deleted_count = db.query(DailyKPILog).delete()
        db.commit()
        print(f"Successfully cleared {deleted_count} demo KPI log records from the database.")
    except Exception as e:
        db.rollback()
        print(f"Error clearing KPI demo data: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    clear_demo_data()
