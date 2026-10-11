import asyncio
import os
import sys
import uuid
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, engine
from app.models.user import User
from app.models.task import Task
from app.models.mywork import MyWorkFocusSession
from app.schemas.mywork import FocusSessionCreate, FocusSessionResponse
from app.routers.mywork import save_focus_session, get_focus_sessions

async def run_tests():
    db = SessionLocal()
    try:
        # Find a test user
        user = db.query(User).first()
        if not user:
            print("No test user found in DB!")
            return

        print(f"Testing with user: {user.email} (ID: {user.id})")

        # Find a test task
        task = db.query(Task).first()
        task_id = task.id if task else None
        print(f"Testing with task: {task.title if task else 'None'} (ID: {task_id})")

        # Test 1: Save with both summary fields filled
        test_session_id_1 = f"test_session_{uuid.uuid4().hex[:8]}"
        req1 = FocusSessionCreate(
            session_id=test_session_id_1,
            task_id=task_id,
            duration_mins=26,
            active_duration_secs=1560,
            status="completed",
            accomplishment="Implemented focus session summary saving bugfix and verified endpoints.",
            remaining_work="Add end-to-end frontend tests and document fix.",
            started_at=datetime.utcnow(),
            ended_at=datetime.utcnow()
        )
        saved1 = await save_focus_session(req1, db=db, user=user)
        assert saved1 is not None, "Saved session 1 should not be None"
        assert saved1.session_id == test_session_id_1, f"Expected {test_session_id_1}, got {saved1.session_id}"
        assert saved1.duration_mins == 26, f"Expected 26 mins, got {saved1.duration_mins}"
        assert saved1.active_duration_secs == 1560
        assert saved1.accomplishment == req1.accomplishment
        assert saved1.remaining_work == req1.remaining_work
        print("[PASS] Test 1 Passed: Saved session with both summary fields filled.")

        # Test 2: Save with optional summary fields empty
        test_session_id_2 = f"test_session_{uuid.uuid4().hex[:8]}"
        req2 = FocusSessionCreate(
            session_id=test_session_id_2,
            task_id=task_id,
            duration_mins=45,
            active_duration_secs=2700,
            status="completed",
            accomplishment=None,
            remaining_work=None
        )
        saved2 = await save_focus_session(req2, db=db, user=user)
        assert saved2 is not None
        assert saved2.session_id == test_session_id_2
        assert saved2.accomplishment is None
        assert saved2.remaining_work is None
        print("[PASS] Test 2 Passed: Saved session with optional summary fields empty.")

        # Test 3: Duplicate submission prevention
        req1_duplicate = FocusSessionCreate(
            session_id=test_session_id_1,
            task_id=task_id,
            duration_mins=26,
            active_duration_secs=1560,
            status="completed",
            accomplishment="Updated accomplishment summary text.",
            remaining_work="Updated remaining work."
        )
        saved1_dup = await save_focus_session(req1_duplicate, db=db, user=user)
        assert saved1_dup.id == saved1.id, "Duplicate submission should update same record, not create new record"
        assert saved1_dup.accomplishment == "Updated accomplishment summary text."
        
        # Verify DB count
        count_for_session_1 = db.query(MyWorkFocusSession).filter(
            MyWorkFocusSession.session_id == test_session_id_1
        ).count()
        assert count_for_session_1 == 1, f"Expected exactly 1 record for session_id {test_session_id_1}, got {count_for_session_1}"
        print("[PASS] Test 3 Passed: Duplicate submission prevention confirmed (updated in-place, exactly 1 record).")

        # Test 4: Query sessions using get_focus_sessions
        sessions = get_focus_sessions(user_id=user.id, db=db, user=user)
        assert len(sessions) >= 2, "Expected at least 2 sessions"
        found_test_1 = any(s.session_id == test_session_id_1 for s in sessions)
        assert found_test_1, "Persisted session 1 must be present in get_focus_sessions results"
        print("[PASS] Test 4 Passed: Query get_focus_sessions returns persisted sessions.")

        # Test 5: Schema validator resilience (invalid UUID string, empty string, etc.)
        req_resilient = FocusSessionCreate(
            session_id=f"test_session_{uuid.uuid4().hex[:8]}",
            task_id="general",  # Non-UUID string
            duration_mins=15,
            active_duration_secs=900,
            status="completed"
        )
        assert req_resilient.task_id is None, "Non-UUID string 'general' should safely coerce to None"
        saved_resilient = await save_focus_session(req_resilient, db=db, user=user)
        assert saved_resilient.task_id is None
        print("[PASS] Test 5 Passed: Schema validator gracefully handles non-UUID task IDs without 422 error.")

        # Cleanup test records
        db.query(MyWorkFocusSession).filter(
            MyWorkFocusSession.session_id.in_([test_session_id_1, test_session_id_2, req_resilient.session_id])
        ).delete(synchronize_session=False)
        db.commit()
        print("[PASS] Cleanup: Test records cleaned up successfully.")

        print("\nALL BACKEND FOCUS SESSION VERIFICATION TESTS PASSED SUCCESSFULLY!")
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(run_tests())
