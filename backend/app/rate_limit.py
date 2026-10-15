"""Per-tenant token-bucket rate limiter for ingest (PRD §6 Security).

In-process; with multiple workers move the bucket into Redis (INCR + EXPIRE)."""
import threading
import time
from typing import Dict, Tuple

from fastapi import HTTPException, status

from app.config import settings

_lock = threading.Lock()
_buckets: Dict[str, Tuple[float, float]] = {}


def check_ingest_rate(tenant_id: str) -> None:
    rate = float(settings.INGEST_RATE_PER_SEC)
    burst = rate * 2
    now = time.monotonic()
    with _lock:
        tokens, last = _buckets.get(tenant_id, (burst, now))
        tokens = min(burst, tokens + (now - last) * rate)
        if tokens < 1:
            _buckets[tenant_id] = (tokens, now)
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Ingest rate limit exceeded",
                headers={"Retry-After": "1"},
            )
        _buckets[tenant_id] = (tokens - 1, now)
