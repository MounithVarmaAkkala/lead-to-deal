"""In-process latency + counter metrics, exposed as JSON and Prometheus text.

Real measurements replace the previously hardcoded p95 figure. For multi-worker
deployments, swap this for prometheus_client with a multiprocess registry."""
import threading
import time
from collections import defaultdict, deque
from typing import Deque, Dict

_lock = threading.Lock()
_latency: Dict[str, Deque[float]] = defaultdict(lambda: deque(maxlen=1000))
_counters: Dict[str, int] = defaultdict(int)
_started = time.time()


def observe_latency(tenant_id: str, ms: float) -> None:
    with _lock:
        _latency[tenant_id].append(ms)
        _latency["__all__"].append(ms)


def inc(name: str, amount: int = 1) -> None:
    with _lock:
        _counters[name] += amount


def _pct(values, p: float) -> float:
    if not values:
        return 0.0
    ordered = sorted(values)
    idx = min(len(ordered) - 1, max(0, int(round(p / 100.0 * len(ordered) + 0.5)) - 1))
    return round(ordered[idx], 2)


def latency_summary(tenant_id: str = "__all__") -> dict:
    with _lock:
        values = list(_latency.get(tenant_id, ()))
    return {
        "samples": len(values),
        "p50_ms": _pct(values, 50),
        "p95_ms": _pct(values, 95),
        "p99_ms": _pct(values, 99),
        "max_ms": round(max(values), 2) if values else 0.0,
    }


def prometheus_text() -> str:
    s = latency_summary()
    with _lock:
        counters = dict(_counters)
    lines = [
        "# HELP ltd_event_latency_ms Event ingest to WebSocket push latency (ms)",
        "# TYPE ltd_event_latency_ms summary",
        f'ltd_event_latency_ms{{quantile="0.5"}} {s["p50_ms"]}',
        f'ltd_event_latency_ms{{quantile="0.95"}} {s["p95_ms"]}',
        f'ltd_event_latency_ms{{quantile="0.99"}} {s["p99_ms"]}',
        f"ltd_event_latency_ms_count {s['samples']}",
        "# HELP ltd_uptime_seconds Process uptime",
        "# TYPE ltd_uptime_seconds gauge",
        f"ltd_uptime_seconds {round(time.time() - _started, 1)}",
    ]
    for name, value in sorted(counters.items()):
        lines += [f"# TYPE ltd_{name}_total counter", f"ltd_{name}_total {value}"]
    return "\n".join(lines) + "\n"
