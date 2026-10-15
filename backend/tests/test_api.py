import json
import uuid

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.database import SessionLocal
from app.models import ScoreExplanation, ImmutableRecordError
from app.routers.webhooks import sign


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def login(client, email, pw):
    r = client.post("/api/v1/auth/login", json={"email": email, "password": pw})
    assert r.status_code == 200, r.text
    return r.json()


def auth(tok):
    return {"Authorization": f"Bearer {tok['access_token']}"}


@pytest.fixture(scope="module")
def admin(client):
    return login(client, "admin@zesiger.net", "admin123")


def test_requests_without_token_are_rejected(client):
    assert client.get("/api/v1/leads").status_code == 401
    assert client.get("/api/v1/admin/scoring-weights").status_code == 401


def test_rep_cannot_use_admin_endpoints(client):
    rep = login(client, "alex@zesiger.net", "alex123")
    assert client.get("/api/v1/admin/scoring-weights", headers=auth(rep)).status_code == 403


def test_refresh_token_flow(client, admin):
    r = client.post("/api/v1/auth/refresh", json={"refresh_token": admin["refresh_token"]})
    assert r.status_code == 200
    # An access token must not be accepted as a refresh token.
    r = client.post("/api/v1/auth/refresh", json={"refresh_token": admin["access_token"]})
    assert r.status_code == 401


def test_register_cannot_join_existing_tenant(client):
    r = client.post("/api/v1/auth/register", json={
        "email": "evil@example.com", "name": "Evil", "password": "password123",
        "tenant_name": "Zesiger Intelligence AG",
    })
    assert r.status_code == 409


def test_seeded_hot_queue_is_consistent(client, admin):
    reps = client.get("/api/v1/auth/reps", headers=auth(admin)).json()
    for rep in reps:
        if rep["role"] == "sales_rep":
            assert rep["current_leads_count"] <= rep["max_concurrent_leads"]
    hot = client.get("/api/v1/leads?is_hot_queue=true", headers=auth(admin)).json()
    # Hot leads only exist while every rep is full.
    if hot:
        assert all(r["current_leads_count"] >= r["max_concurrent_leads"]
                   for r in reps if r["role"] == "sales_rep" and r["is_available"])


def test_idempotent_ingest(client, admin):
    leads = client.get("/api/v1/leads", headers=auth(admin)).json()
    lead = next(l for l in leads if l["stage"] == "Engaged")
    eid = f"t_{uuid.uuid4()}"
    body = {"event_id": eid, "lead_id": lead["id"], "event_type": "email_open"}
    r1 = client.post("/api/v1/events", json=body, headers=auth(admin)).json()
    r2 = client.post("/api/v1/events", json=body, headers=auth(admin)).json()
    assert r1["duplicate"] is False and r2["duplicate"] is True
    detail = client.get(f"/api/v1/leads/{lead['id']}", headers=auth(admin)).json()
    assert sum(1 for e in detail["explanations"] if e["event_id"] == eid) == 1


def test_invalid_event_type_rejected(client, admin):
    r = client.post("/api/v1/events", json={"event_id": "x1", "event_type": "hack"}, headers=auth(admin))
    assert r.status_code == 422


def test_closing_lead_drains_hot_queue(client, admin):
    hot_before = client.get("/api/v1/leads?is_hot_queue=true", headers=auth(admin)).json()
    assert hot_before, "seed should start with a hot-queue lead"
    leads = client.get("/api/v1/leads", headers=auth(admin)).json()
    victim = next(l for l in leads if l["assigned_to"] and l["stage"] not in ("Closed-Won", "Closed-Lost"))

    # Closing without a rationale is refused (US-03).
    r = client.post(f"/api/v1/leads/{victim['id']}/transition",
                    json={"to_stage": "Closed-Lost", "confirmed": True}, headers=auth(admin))
    assert r.status_code == 400

    r = client.post(f"/api/v1/leads/{victim['id']}/transition",
                    json={"to_stage": "Closed-Lost", "confirmed": True, "reason": "Budget cut",
                          "expected_version": victim["version"]}, headers=auth(admin))
    assert r.status_code == 200, r.text
    hot_after = client.get("/api/v1/leads?is_hot_queue=true", headers=auth(admin)).json()
    assert len(hot_after) == len(hot_before) - 1


def test_optimistic_lock_conflict(client, admin):
    leads = client.get("/api/v1/leads", headers=auth(admin)).json()
    lead = next(l for l in leads if l["stage"] == "Contacted")
    r = client.post(f"/api/v1/leads/{lead['id']}/transition",
                    json={"to_stage": "Qualified", "expected_version": lead["version"] - 1}, headers=auth(admin))
    assert r.status_code == 409


def test_audit_ledger_is_immutable(client):
    db = SessionLocal()
    try:
        exp = db.query(ScoreExplanation).first()
        exp.delta = 999
        with pytest.raises(ImmutableRecordError):
            db.commit()
        db.rollback()
    finally:
        db.close()


def test_webhook_signature(client, admin):
    tenant_id = admin["user"]["tenant_id"]
    body = json.dumps({"event": "Demo Requested", "messageId": str(uuid.uuid4()),
                       "traits": {"email": "wh@example.com", "company": "WH AG"}}).encode()
    bad = client.post("/api/v1/webhooks/segment", content=body,
                      headers={"X-Tenant-Id": tenant_id, "X-Signature": "deadbeef", "Content-Type": "application/json"})
    assert bad.status_code == 401
    good = client.post("/api/v1/webhooks/segment", content=body,
                       headers={"X-Tenant-Id": tenant_id, "X-Signature": sign(body), "Content-Type": "application/json"})
    assert good.status_code == 200, good.text


def test_websocket_requires_matching_token(client, admin):
    tenant_id = admin["user"]["tenant_id"]
    with pytest.raises(Exception):
        with client.websocket_connect(f"/ws/tenant/{tenant_id}?token=bad") as ws:
            ws.receive_text()
    with client.websocket_connect(f"/ws/tenant/{tenant_id}?token={admin['access_token']}") as ws:
        hello = ws.receive_json()
        assert hello["type"] == "hello"


def test_metrics_endpoint(client):
    r = client.get("/metrics")
    assert r.status_code == 200 and "ltd_event_latency_ms" in r.text
