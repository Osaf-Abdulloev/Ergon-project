import json
import uuid
from typing import Dict, Set
from fastapi import WebSocket
from app.core.config import settings

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[uuid.UUID, Set[WebSocket]] = {}

    async def connect(self, user_id: uuid.UUID, websocket: WebSocket):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(websocket)

    def disconnect(self, user_id: uuid.UUID, websocket: WebSocket):
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        await websocket.send_text(json.dumps(message))

    async def send_to_user(self, user_id: uuid.UUID, message: dict):
        if user_id in self.active_connections:
            data = json.dumps(message)
            for ws in list(self.active_connections[user_id]):
                try:
                    await ws.send_text(data)
                except Exception:
                    self.active_connections[user_id].discard(ws)

    def is_user_online(self, user_id: uuid.UUID) -> bool:
        return user_id in self.active_connections and len(self.active_connections[user_id]) > 0

ws_manager = ConnectionManager()
