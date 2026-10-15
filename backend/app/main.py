import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse

from app.config import settings
from app.database import engine, Base, SessionLocal
from app.models import Tenant, User, Lead, ScoringWeight, ScoreExplanation, PipelineTransition, AssignmentLog
from app.auth import get_password_hash, user_from_token
from app.assignment_engine import fill_capacity_from_hot_queue
from app import metrics
from app.scoring_engine import ensure_default_weights, calculate_priority_score
from app.websocket_manager import ws_manager
from app.routers import auth, events, leads, admin, webhooks, analytics

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("main")

def seed_initial_demo_data():
    """Seeds rich multi-tenant sample data if database is fresh."""
    db = SessionLocal()
    try:
        # Check tenant
        tenant = db.query(Tenant).first()
        if not tenant:
            logger.info("Seeding initial tenant and users...")
            tenant = Tenant(name="Zesiger Intelligence AG")
            db.add(tenant)
            db.commit()
            db.refresh(tenant)

            # Admin
            admin_user = User(
                tenant_id=tenant.id,
                email="admin@zesiger.net",
                name="Jordan Weber (Admin / Sales Ops)",
                hashed_password=get_password_hash("admin123"),
                role="admin",
                max_concurrent_leads=15,
                is_available=True
            )
            # Rep 1: Alex (Sales Rep)
            rep1 = User(
                tenant_id=tenant.id,
                email="alex@zesiger.net",
                name="Alex Fischer (Senior AE)",
                hashed_password=get_password_hash("alex123"),
                role="sales_rep",
                max_concurrent_leads=3,  # full with seed leads -> demonstrates the Hot Queue
                is_available=True
            )
            # Rep 2: Taylor (Sales Rep)
            rep2 = User(
                tenant_id=tenant.id,
                email="taylor@zesiger.net",
                name="Taylor Keller (Inbound SDR)",
                hashed_password=get_password_hash("taylor123"),
                role="sales_rep",
                max_concurrent_leads=2,
                is_available=True
            )
            db.add_all([admin_user, rep1, rep2])
            db.commit()
            db.refresh(admin_user)
            db.refresh(rep1)
            db.refresh(rep2)

            ensure_default_weights(db, tenant.id)

            # Sample Leads across stages
            sample_leads_data = [
                {
                    "company": "Novartis Pharma Tech",
                    "contact": "Dr. Beatrice Meyer",
                    "email": "beatrice.meyer@novartis-tech.ch",
                    "size": "500+",
                    "score": 92,
                    "stage": "Proposal",
                    "rep": rep1.id,
                    "is_hot": False,
                    "reason": "+35 points: Booked Enterprise Demo with Procurement Committee"
                },
                {
                    "company": "Swisscom Cloud Services",
                    "contact": "Stefan Bachmann",
                    "email": "stefan.b@swisscom-cloud.ch",
                    "size": "201-500",
                    "score": 78,
                    "stage": "Qualified",
                    "rep": rep2.id,
                    "is_hot": False,
                    "reason": "+20 points: Form submission requesting custom security compliance specs"
                },
                {
                    "company": "Logitech Hardware AI",
                    "contact": "Elena Rossi",
                    "email": "elena.rossi@logitech-ai.com",
                    "size": "51-200",
                    "score": 88,
                    "stage": "Qualified",
                    "rep": None,
                    "is_hot": True, # In Hot Queue!
                    "reason": "+35 points: Meeting booked, but all active reps at max concurrent capacity"
                },
                {
                    "company": "Zurich Financial Systems",
                    "contact": "Marc Dupont",
                    "email": "marc.dupont@zfs-fin.ch",
                    "size": "500+",
                    "score": 45,
                    "stage": "Contacted",
                    "rep": rep1.id,
                    "is_hot": False,
                    "reason": "+12 points: Clicked high-conversion CTA in product announcement"
                },
                {
                    "company": "Stadler Rail Digital",
                    "contact": "Karin Hofer",
                    "email": "k.hofer@stadler-rail.ch",
                    "size": "51-200",
                    "score": 25,
                    "stage": "Engaged",
                    "rep": rep2.id,
                    "is_hot": False,
                    "reason": "+15 points: Visited high-intent pricing page twice in 24 hours"
                },
                {
                    "company": "On Running Logistics",
                    "contact": "Lukas Widmer",
                    "email": "lukas@on-logistics.ch",
                    "size": "201-500",
                    "score": 95,
                    "stage": "Negotiation",
                    "rep": rep1.id,
                    "is_hot": False,
                    "reason": "+20 points: Contract review requested and legal terms shared"
                },
                {
                    "company": "Pictet Asset Tech",
                    "contact": "Claire Vaudreuil",
                    "email": "claire.v@pictet-tech.ch",
                    "size": "51-200",
                    "score": 100,
                    "stage": "Closed-Won",
                    "rep": rep2.id,
                    "is_hot": False,
                    "reason": "Closed-Won: Master Services Agreement signed ($140k ARR)"
                }
            ]

            now = datetime.now(timezone.utc)
            for item in sample_leads_data:
                lead = Lead(
                    tenant_id=tenant.id,
                    company_name=item["company"],
                    company_size=item["size"],
                    contact_name=item["contact"],
                    contact_email=item["email"],
                    current_score=item["score"],
                    priority_score=calculate_priority_score(item["score"], now),
                    stage=item["stage"],
                    assigned_to=item["rep"],
                    is_hot_queue=item["is_hot"],
                    created_at=now,
                    updated_at=now
                )
                db.add(lead)
                db.commit()
                db.refresh(lead)

                # Add explanation
                exp = ScoreExplanation(
                    tenant_id=tenant.id,
                    lead_id=lead.id,
                    previous_score=max(0, item["score"] - 25),
                    new_score=item["score"],
                    delta=25,
                    reason_text=item["reason"],
                    features={"feature_name": "sample_seed", "weight": 25}
                )
                db.add(exp)

                if item["is_hot"]:
                    db.add(AssignmentLog(
                        tenant_id=tenant.id,
                        lead_id=lead.id,
                        from_user=None,
                        to_user=None,
                        reason="All reps at capacity. Lead entered Hot Queue."
                    ))
                elif item["rep"]:
                    db.add(AssignmentLog(
                        tenant_id=tenant.id,
                        lead_id=lead.id,
                        from_user=None,
                        to_user=item["rep"],
                        reason="Assigned via Round-Robin load balancer"
                    ))
            db.commit()
            logger.info("Sample leads, explanations, and assignment logs seeded successfully!")
    finally:
        db.close()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB tables
    Base.metadata.create_all(bind=engine)
    if settings.SEED_DEMO_DATA:
        seed_initial_demo_data()
    # Enforce the hot-queue invariant on boot: no lead waits while a rep has room.
    db = SessionLocal()
    try:
        for t in db.query(Tenant).all():
            fill_capacity_from_hot_queue(db, t.id)
    finally:
        db.close()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=settings.CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(events.router, prefix=settings.API_V1_STR)
app.include_router(leads.router, prefix=settings.API_V1_STR)
app.include_router(admin.router, prefix=settings.API_V1_STR)
app.include_router(webhooks.router, prefix=settings.API_V1_STR)
app.include_router(analytics.router, prefix=settings.API_V1_STR)

# Real-time WebSocket endpoint (JWT in ?token=, resume with ?last_seq=)
@app.websocket("/ws/tenant/{tenant_id}")
async def websocket_endpoint(websocket: WebSocket, tenant_id: str, token: str = "", last_seq: int = 0):
    db = SessionLocal()
    try:
        user = user_from_token(db, token)
    finally:
        db.close()
    if user is None or user.tenant_id != tenant_id:
        # Tenant isolation: a token only ever opens its own tenant's channel.
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await ws_manager.connect(websocket, tenant_id, last_seq)
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_json({"type": "pong", "received": data})
    except WebSocketDisconnect:
        pass
    except Exception as e:  # noqa: BLE001
        logger.warning(f"WebSocket connection closed: {e}")
    finally:
        ws_manager.disconnect(websocket, tenant_id)


@app.get("/metrics", response_class=PlainTextResponse)
def prometheus_metrics():
    return metrics.prometheus_text()


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "latency": metrics.latency_summary(),
    }
