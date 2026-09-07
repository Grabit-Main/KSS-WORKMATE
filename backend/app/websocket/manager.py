from fastapi import WebSocket
import asyncio


class ConnectionManager:
    """Room-based WebSocket manager. Each user is auto-joined to user:{id}.
    Clients can join/leave team:{id}, task:{id}, project:{id}, global:admins."""

    def __init__(self):
        # room -> set of (user_id_str, WebSocket)
        self.rooms: dict[str, set] = {}

    async def connect(self, websocket: WebSocket):
        await websocket.accept()

    def _add(self, room: str, user_id: str, ws: WebSocket):
        self.rooms.setdefault(room, set()).add((user_id, ws))

    def _remove(self, user_id: str, ws: WebSocket):
        for room, members in list(self.rooms.items()):
            members.discard((user_id, ws))
            if not members:
                del self.rooms[room]

    async def join(self, room: str, user_id: str, ws: WebSocket):
        self._add(room, user_id, ws)

    async def leave(self, room: str, user_id: str, ws: WebSocket):
        if room in self.rooms:
            self.rooms[room].discard((user_id, ws))

    async def broadcast(self, room: str, event: dict, exclude: str = None):
        """Send event to all sockets in a room."""
        dead = set()
        for uid, ws in list(self.rooms.get(room, set())):
            if uid == exclude:
                continue
            try:
                await ws.send_json(event)
            except Exception:
                dead.add((uid, ws))
        # clean up dead connections
        if dead and room in self.rooms:
            self.rooms[room] -= dead

    async def send_to_user(self, user_id: str, event: dict):
        await self.broadcast(f"user:{user_id}", event)

    async def disconnect(self, user_id: str, ws: WebSocket):
        self._remove(user_id, ws)


# ponytail: global singleton — per-process. Fine for single Vercel function instance.
manager = ConnectionManager()
