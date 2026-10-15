"""Webhook receivers for HubSpot, Salesforce and Segment (PRD P1).

Every request must carry:
  X-Tenant-Id:  the tenant the events belong to
  X-Signature:  hex HMAC-SHA256 of the raw body using WEBHOOK_SECRET
                (a "sha256=" prefix is accepted)
Invalid signatures get 401 and are logged (PRD §8)."""
import hashlib
import hmac
import json
import logging
import uuid
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlalchemy.orm import Session

from app import metrics
from app.config import settings
from app.database import get_db
from app.models import Tenant
from app.routers.events import process_event
from app.schemas import EventIngestRequest

router = APIRouter(prefix="/webhooks", tags=["webhooks"])
logger = logging.getLogger("webhooks")


def sign(body: bytes, secret: Optional[str] = None) -> str:
    return hmac.new((secret or settings.WEBHOOK_SECRET).encode(), body, hashlib.sha256).hexdigest()


async def _verified_body(
    provider: str, request: Request, db: Session, tenant_id: Optional[str], signature: Optional[str]
) -> tuple[Tenant, Any]:
    raw = await request.body()
    provided = (signature or "").removeprefix("sha256=")
    if not provided or not hmac.compare_digest(provided, sign(raw)):
        metrics.inc("webhook_signature_rejected")
        logger.warning("Rejected %s webhook: invalid signature (tenant=%s, ip=%s)",
                       provider, tenant_id, request.client.host if request.client else "?")
        raise HTTPException(status_code=401, detail="Invalid webhook signature")
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first() if tenant_id else None
    if not tenant:
        raise HTTPException(status_code=404, detail="Unknown tenant")
    try:
        return tenant, json.loads(raw or b"{}")
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Body must be JSON")


def _hubspot_type(subscription_type: str) -> str:
    s = subscription_type.lower()
    if "form" in s:
        return "form_submission"
    if "email.open" in s:
        return "email_open"
    if "email.click" in s:
        return "email_click"
    if "meeting" in s:
        return "meeting_booked"
    if "call" in s:
        return "call_logged"
    if "deal" in s:
        return "deal_stage_change"
    return "page_visit"


@router.post("/hubspot")
async def hubspot_webhook(
    request: Request,
    x_tenant_id: Optional[str] = Header(None),
    x_signature: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    tenant, body = await _verified_body("hubspot", request, db, x_tenant_id, x_signature)
    items = body if isinstance(body, list) else [body]
    results = []
    for item in items:
        email = item.get("email") or item.get("properties", {}).get("email", {}).get("value")
        req = EventIngestRequest(
            event_id=f"hubspot_{item.get('eventId') or uuid.uuid4()}",
            event_type=_hubspot_type(item.get("subscriptionType", "contact.propertyChange")),
            contact_email=email,
            company_name=item.get("company", "HubSpot Lead"),
            payload={"source": "hubspot", "raw": item},
        )
        results.append(await process_event(db, tenant.id, req))
    return {"status": "ok", "provider": "hubspot", "processed": len(results),
            "duplicates": sum(1 for r in results if r.duplicate)}


@router.post("/salesforce")
async def salesforce_webhook(
    request: Request,
    x_tenant_id: Optional[str] = Header(None),
    x_signature: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    tenant, body = await _verified_body("salesforce", request, db, x_tenant_id, x_signature)
    event_type = str(body.get("Type", "lead_update")).lower()
    mapped: str = "deal_stage_change" if "stage" in event_type else (
        "call_logged" if "call" in event_type else (
            "meeting_booked" if "meeting" in event_type or "event" == event_type else "email_open"))
    req = EventIngestRequest(
        event_id=f"sf_{body.get('Id') or uuid.uuid4()}",
        event_type=mapped,
        contact_email=body.get("Email"),
        contact_name=body.get("Name"),
        company_name=body.get("Company", "Salesforce Account"),
        payload={"source": "salesforce", "raw": body},
    )
    res = await process_event(db, tenant.id, req)
    return {"status": "ok", "provider": "salesforce", "result": res}


@router.post("/segment")
async def segment_webhook(
    request: Request,
    x_tenant_id: Optional[str] = Header(None),
    x_signature: Optional[str] = Header(None),
    db: Session = Depends(get_db),
):
    tenant, body = await _verified_body("segment", request, db, x_tenant_id, x_signature)
    event_name = str(body.get("event", "Page Viewed")).lower()
    props: Dict[str, Any] = body.get("properties", {}) or {}
    traits: Dict[str, Any] = body.get("traits", {}) or {}

    mapped = "page_visit"
    if "pricing" in str(props.get("path", "")).lower():
        mapped = "pricing_page_visit"
    elif "submit" in event_name or "form" in event_name:
        mapped = "form_submission"
    elif "meeting" in event_name or "demo" in event_name:
        mapped = "meeting_booked"
    elif "email opened" in event_name:
        mapped = "email_open"
    elif "email link clicked" in event_name:
        mapped = "email_click"

    req = EventIngestRequest(
        event_id=f"seg_{body.get('messageId') or uuid.uuid4()}",
        event_type=mapped,
        contact_email=traits.get("email"),
        contact_name=traits.get("name"),
        company_name=traits.get("company", "Segment User"),
        payload={"source": "segment", "properties": props, "url": props.get("path", "")},
    )
    res = await process_event(db, tenant.id, req)
    return {"status": "ok", "provider": "segment", "result": res}
