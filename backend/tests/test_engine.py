import pytest
from datetime import datetime, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base
from app.models import Tenant, User, Lead, Event, ScoringWeight, ScoreExplanation, PipelineTransition
from app.scoring_engine import evaluate_lead_event, ensure_default_weights
from app.assignment_engine import assign_lead, check_and_reassign_hot_queue, get_rep_open_lead_count

@pytest.fixture
def test_db():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

def test_idempotency_and_scoring(test_db):
    db = test_db
    tenant = Tenant(name="Test AG")
    db.add(tenant)
    db.commit()

    ensure_default_weights(db, tenant.id)

    lead = Lead(
        tenant_id=tenant.id,
        company_name="Roche Diagnostics",
        contact_name="Lukas",
        contact_email="lukas@roche.ch",
        current_score=30,
        stage="New"
    )
    db.add(lead)
    db.commit()

    # Event 1: Email open (+5 points)
    event1 = Event(
        tenant_id=tenant.id,
        event_id="evt_unique_101",
        lead_id=lead.id,
        event_type="email_open",
        payload={"subject": "Q4 Update"}
    )
    db.add(event1)
    db.commit()

    new_score, explanation, transition = evaluate_lead_event(db, lead, event1)
    assert new_score == 35
    assert explanation.delta == 5
    assert "email open" in explanation.reason_text.lower()
    assert explanation.previous_score == 30
    assert explanation.new_score == 35

    # Check immutable explanation in DB
    saved_exp = db.query(ScoreExplanation).filter(ScoreExplanation.event_id == "evt_unique_101").first()
    assert saved_exp is not None
    assert saved_exp.delta == 5

def test_auto_stage_transition(test_db):
    db = test_db
    tenant = Tenant(name="Test AG")
    db.add(tenant)
    db.commit()
    ensure_default_weights(db, tenant.id)

    lead = Lead(
        tenant_id=tenant.id,
        company_name="ABB Robotics",
        contact_name="Marco",
        contact_email="marco@abb.ch",
        current_score=40,
        stage="Contacted"
    )
    db.add(lead)
    db.commit()

    # Meeting booked event (+35 points) -> moves score to 75, which crosses Qualified (>= 70)
    event = Event(
        tenant_id=tenant.id,
        event_id="evt_meeting_202",
        lead_id=lead.id,
        event_type="meeting_booked",
        payload={"topic": "Demo"}
    )
    db.add(event)
    db.commit()

    new_score, explanation, transition = evaluate_lead_event(db, lead, event)
    assert new_score == 75
    assert lead.stage == "Qualified"
    assert transition is not None
    assert transition.to_stage == "Qualified"
    assert transition.is_automatic == True

def test_round_robin_capacity_and_hot_queue(test_db):
    db = test_db
    tenant = Tenant(name="Test AG")
    db.add(tenant)
    db.commit()

    # Create 2 reps with max capacity of 1 each to test capacity limit!
    rep1 = User(
        tenant_id=tenant.id,
        email="rep1@test.ch",
        name="Rep One",
        hashed_password="pw",
        role="sales_rep",
        max_concurrent_leads=1,
        is_available=True
    )
    rep2 = User(
        tenant_id=tenant.id,
        email="rep2@test.ch",
        name="Rep Two",
        hashed_password="pw",
        role="sales_rep",
        max_concurrent_leads=1,
        is_available=True
    )
    db.add_all([rep1, rep2])
    db.commit()

    # Lead 1 -> Assigned to rep1
    l1 = Lead(tenant_id=tenant.id, company_name="Co 1", contact_name="A", contact_email="a@co.com", current_score=50, stage="New")
    db.add(l1)
    db.commit()
    assigned1, status1 = assign_lead(db, l1)
    assert status1 == "assigned"
    assert assigned1 in [rep1.id, rep2.id]

    # Lead 2 -> Assigned to rep2
    l2 = Lead(tenant_id=tenant.id, company_name="Co 2", contact_name="B", contact_email="b@co.com", current_score=60, stage="New")
    db.add(l2)
    db.commit()
    assigned2, status2 = assign_lead(db, l2)
    assert status2 == "assigned"
    assert assigned2 in [rep1.id, rep2.id]
    assert assigned2 != assigned1 # round-robin distributed!

    # Lead 3 -> Both reps are now full (1/1). Must enter Hot Queue!
    l3 = Lead(tenant_id=tenant.id, company_name="Co 3", contact_name="C", contact_email="c@co.com", current_score=80, stage="New")
    db.add(l3)
    db.commit()
    assigned3, status3 = assign_lead(db, l3)
    assert status3 == "hot_queue_entered"
    assert l3.is_hot_queue == True
    assert l3.assigned_to is None

    # Free capacity on rep1 by closing lead 1 (Closed-Won)
    l1.stage = "Closed-Won"
    db.commit()

    # Check and reassign hot queue to rep1
    reassigned = check_and_reassign_hot_queue(db, assigned1)
    assert reassigned is not None
    assert reassigned.id == l3.id
    assert reassigned.is_hot_queue == False
    assert reassigned.assigned_to == assigned1
