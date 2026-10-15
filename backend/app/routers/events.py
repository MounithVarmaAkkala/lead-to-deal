import time
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import metrics
from app.assignment_engine import assign_lead
from app.auth import get_current_user
from app.database import get_db
from app.models import Event, Lead, User
from app.rate_limit import check_ingest_rate
from app.schemas import EventIngestRequest, EventResponse
from app.scoring_engine import evaluate_lead_event
from app.serializers import lead_payload
from app.websocket_manager import ws_manager

router = APIRouter(prefix="/events", tags=["events"])


def _duplicate_response(ev: Event) -> EventResponse:
    metrics.inc("events_duplicate")
    return EventResponse(
        id=ev.id, event_id=ev.event_id, tenant_id=ev.tenant_id, lead_id=ev.lead_id,
        event_type=ev.event_type, payload=ev.payload or {}, received_at=ev.received_at,
        duplicate=True, message="Event already processed (idempotency preserved, no double-scoring)",
    )


async def process_event(db: Session, tenant_id: str, event_req: EventIngestRequest) -> EventResponse:
    """Idempotent ingest → score → stage → assign → broadcast. Shared by the
    authenticated API and the signed webhook receivers."""
    start_time = time.perf_counter()
    check_ingest_rate(tenant_id)

    existing = db.query(Event).filter(Event.tenant_id == tenant_id, Event.event_id == event_req.event_id).first()
    if existing:
        return _duplicate_response(existing)

    lead = None
    if event_req.lead_id:
        lead = db.query(Lead).filter(Lead.id == event_req.lead_id, Lead.tenant_id == tenant_id).first()
    if not lead and event_req.contact_email:
        lead = db.query(Lead).filter(Lead.contact_email == event_req.contact_email, Lead.tenant_id == tenant_id).first()

    lead_was_created = False
    if not lead:
        now = datetime.now(timezone.utc)
        lead = Lead(
            tenant_id=tenant_id,
            company_name=event_req.company_name or "Prospect Co",
            company_size=str(event_req.payload.get("company_size", "11-50")),
            contact_name=event_req.contact_name or "Inbound Contact",
            contact_email=event_req.contact_email or f"lead_{event_req.event_id[:8]}@example.com",
            current_score=0,
            stage="New",
            created_at=now,
            updated_at=now,
        )
        db.add(lead)
        db.flush()
        lead_was_created = True

    new_event = Event(
        tenant_id=tenant_id, event_id=event_req.event_id, lead_id=lead.id,
        event_type=event_req.event_type, payload=event_req.payload, received_at=datetime.now(timezone.utc),
    )
    db.add(new_event)
    try:
        db.commit()
    except IntegrityError:
        # Lost a race with a concurrent duplicate: the unique (tenant_id, event_id)
        # constraint is the source of truth for idempotency.
        db.rollback()
        existing = db.query(Event).filter(Event.tenant_id == tenant_id, Event.event_id == event_req.event_id).first()
        return _duplicate_response(existing)
    db.refresh(new_event)

    _, explanation, transition = evaluate_lead_event(db, lead, new_event)

    assignment_status = "already_assigned"
    if not lead.assigned_to and not lead.is_hot_queue:
        _, assignment_status = assign_lead(db, lead)
        db.refresh(lead)

    elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
    metrics.observe_latency(tenant_id, elapsed_ms)
    metrics.inc("events_ingested")
    if transition:
        metrics.inc("stage_transitions_auto")
    if assignment_status == "hot_queue_entered":
        metrics.inc("hot_queue_entered")

    assignee = db.query(User).filter(User.id == lead.assigned_to).first() if lead.assigned_to else None
    await ws_manager.broadcast(tenant_id, {
        "type": "lead_updated",
        "elapsed_ms": elapsed_ms,
        "lead_created": lead_was_created,
        "lead": lead_payload(lead, assignee.name if assignee else None),
        "event": {"event_id": new_event.event_id, "event_type": new_event.event_type, "payload": new_event.payload},
        "explanation": {
            "id": explanation.id,
            "previous_score": explanation.previous_score,
            "new_score": explanation.new_score,
            "delta": explanation.delta,
            "reason_text": explanation.reason_text,
            "features": explanation.features,
            "created_at": explanation.created_at.isoformat(),
        },
        "transition": {
            "from_stage": transition.from_stage,
            "to_stage": transition.to_stage,
            "reason": transition.reason,
            "is_automatic": transition.is_automatic,
        } if transition else None,
        "assignment_status": assignment_status,
    })

    return EventResponse(
        id=new_event.id, event_id=new_event.event_id, tenant_id=new_event.tenant_id, lead_id=new_event.lead_id,
        event_type=new_event.event_type, payload=new_event.payload or {}, received_at=new_event.received_at,
        duplicate=False, message=f"Event processed successfully in {elapsed_ms}ms",
    )


@router.post("", response_model=EventResponse)
async def ingest_event(
    event_req: EventIngestRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return await process_event(db, current_user.tenant_id, event_req)
