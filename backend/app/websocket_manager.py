import json
import logging
from collections import deque
from datetime import datetime, timezone
from typing import Deque, Dict, List

from fastapi import WebSocket

logger = logging.getLogger("websocket")

REPLAY_BUFFER = 500


class ConnectionManager:
    """Tenant-scoped broadcaster. Every message carries a monotonically
    increasing per-tenant `seq`; reconnecting clients pass their last seen seq
    and receive what they missed from a bounded replay buffer (PRD §8)."""

    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
        self._seq: Dict[str, int] = {}
        self._history: Dict[str, Deque[dict]] = {}

    async def connect(self, websocket: WebSocket, tenant_id: str, last_seq: int = 0):
        await websocket.accept()
        self.active_connections.setdefault(tenant_id, []).append(websocket)
        current = self._seq.get(tenant_id, 0)
        history = self._history.get(tenant_id, deque())
        oldest = history[0]["seq"] if history else current + 1
        resync = bool(last_seq) and (last_seq > current or last_seq + 1 < oldest)
        await websocket.send_text(json.dumps({"type": "hello", "seq": current, "resync_required": resync}))
        if last_seq and not resync:
            for msg in history:
                if msg["seq"] > last_seq:
                    await websocket.send_text(json.dumps(msg, default=str))
        logger.info("WS client connected to tenant %s (total %d)", tenant_id, len(self.active_connections[tenant_id]))

    def disconnect(self, websocket: WebSocket, tenant_id: str):
        conns = self.active_connections.get(tenant_id)
        if conns and websocket in conns:
            conns.remove(websocket)
            if not conns:
                del self.active_connections[tenant_id]

    def connection_count(self, tenant_id: str) -> int:
        return len(self.active_connections.get(tenant_id, []))

    async def broadcast(self, tenant_id: str, message: dict):
        seq = self._seq.get(tenant_id, 0) + 1
        self._seq[tenant_id] = seq
        message = {**message, "seq": seq}
        message.setdefault("timestamp", datetime.now(timezone.utc).isoformat())
        self._history.setdefault(tenant_id, deque(maxlen=REPLAY_BUFFER)).append(message)

        serialized = json.dumps(message, default=str)
        dead = []
        for connection in list(self.active_connections.get(tenant_id, [])):
            try:
                await connection.send_text(serialized)
            except Exception as e:  # noqa: BLE001
                logger.warning("Error sending to websocket: %s", e)
                dead.append(connection)
        for d in dead:
            self.disconnect(d, tenant_id)


ws_manager = ConnectionManager()
