from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.websocket.manager import manager
from app.utils.security import decode_jwt

router = APIRouter()


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    user_id = None

    try:
        # First message must be auth
        auth_msg = await websocket.receive_json()
        if auth_msg.get("type") != "auth":
            await websocket.send_json({"type": "error", "message": "First message must be auth"})
            await websocket.close()
            return

        payload = decode_jwt(auth_msg.get("token", ""))
        if not payload:
            await websocket.send_json({"type": "error", "message": "Invalid token"})
            await websocket.close()
            return

        user_id = str(payload["sub"])
        role = payload.get("role", "")

        # Auto-join personal room
        await manager.join(f"user:{user_id}", user_id, websocket)

        # Auto-join admins room for CEO/CTO
        if role in ("CEO", "CTO"):
            await manager.join("global:admins", user_id, websocket)

        # Auto-join user teams
        try:
            from app.database import SessionLocal
            from app.models.project import TeamMembership
            db = SessionLocal()
            try:
                memberships = db.query(TeamMembership).filter(TeamMembership.user_id == user_id).all()
                for m in memberships:
                    await manager.join(f"team:{m.team_id}", user_id, websocket)
            finally:
                db.close()
        except Exception as e:
            print(f"[WS] Error joining team rooms for {user_id}: {e}")

        await websocket.send_json({"type": "connected", "user_id": user_id})

        # Listen for join/leave room commands from client
        while True:
            msg = await websocket.receive_json()
            msg_type = msg.get("type")
            room = msg.get("room", "")

            if msg_type == "join" and room:
                await manager.join(room, user_id, websocket)
                await websocket.send_json({"type": "joined", "room": room})
            elif msg_type == "leave" and room:
                await manager.leave(room, user_id, websocket)
                await websocket.send_json({"type": "left", "room": room})
            elif msg_type == "ping":
                await websocket.send_json({"type": "pong"})

    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        if user_id:
            await manager.disconnect(user_id, websocket)
