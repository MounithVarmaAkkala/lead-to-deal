# Autonomous Lead-to-Deal Intelligence System (v1.1)

> **Theme & Design**: [Zesiger.net](https://zesiger.net/) Swiss Web Development Aesthetic  
> **Backend**: Python 3.12 + FastAPI + SQLite / PostgreSQL + WebSockets  
> **Frontend**: React 18 + Vite + TypeScript + Vanilla CSS Swiss Design Tokens  

---

## 🇨🇭 Overview & Strategic Vision

An autonomous, real-time lead-to-deal intelligence system that ingests lead and engagement events, continuously calculates explainable lead scores and pipeline stages, auto-assigns and prioritizes leads via round-robin with concurrency limits, and maintains an **append-only immutable audit ledger** for every score change and stage transition.

Built according to the `Autonomous_Lead-to-Deal_Intelligence_System_PRD_v1.1.txt` specification and styled in the **Zesiger.net** Swiss design language (Swiss navy, Plus Jakarta Sans/Satoshi typography, electric blue accents, floating HUD cards, and day/night toggles).

---

## 🚀 Key Features Implemented

| PRD Section | Feature | Implementation Details |
| :--- | :--- | :--- |
| **US-01 & P0** | **Real-Time Score Updates** | Ingests events (`email_open`, `meeting_booked`, `page_visit`, `form_submission`, etc.) with unique `event_id` idempotency. Evaluates rule weights and pushes live updates over WebSockets in `< 500 ms`. |
| **US-02 & P0** | **Automatic Forward Staging** | Leads automatically advance stages when crossing score thresholds (`Qualified >= 70`, `Proposal >= 85`) or upon key events (`meeting_booked`). |
| **US-03 & P0** | **Manual Confirmation Dialog** | Moving a lead backward or transitioning to `Closed-Won` / `Closed-Lost` strictly requires explicit manual human confirmation with a recorded rationale. |
| **US-04 & P0** | **Round-Robin & Hot Queue** | Enforces `max_concurrent_leads` per sales representative. When reps are at capacity, leads enter the **Hot Queue**; when reps free capacity (e.g. closing a lead), hot leads are automatically reassigned. |
| **US-05 & P0** | **Fine-Grained Explanations** | Every score evaluation creates an **append-only immutable record** in `score_explanations` with delta, previous/new score, exact features applied, and human-readable reasoning. |
| **US-06 & P1** | **Admin Scoring Weight Tuning** | Interactive sliders to tune feature weights and time decay windows in real-time, logging changes to `weight_change_audit`. |
| **P1** | **Webhook Receivers** | Endpoints for HubSpot, Salesforce, and Segment webhook payloads. |
| **P2** | **Audit Export** | 1-click CSV export of the entire immutable score explanation ledger. |
| **Simulation** | **Autonomous Event Simulator** | Built-in interactive testbench and auto-stream mode emitting simulated buyer activities every 3.5s to showcase live WebSocket telemetry. |

---

## 🛠️ Architecture & Tech Stack

```
[ Webhook / Event Simulator ]
            ↓
  FastAPI Ingest Layer (Idempotent by event_id)
            ↓
  Scoring + Assignment Engine (Rule weights + Concurrency checks)
            ↓
  Database (SQLAlchemy 2.0: Multi-tenant, Immutable Audit Tables)
            ↓
  WebSocket Broadcaster (p95 latency < 500ms) ──→ React Client (Zesiger.net HUD)
```

---

## 🏃 Quick Start (Local Development)

### Option 1: One-Click Windows Launchers
Double-click `start_dev.bat` or run:
```powershell
.\start_dev.ps1
```

### Option 2: Manual Terminal Commands

#### 1. Backend
```bash
cd backend
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
```
- API Documentation (Swagger): [http://localhost:8000/docs](http://localhost:8000/docs)
- Health Check: [http://localhost:8000/health](http://localhost:8000/health)

#### 2. Frontend
```bash
cd frontend
npm install
npm run dev -- --port 5173
```
- Web Application: [http://localhost:5173](http://localhost:5173)

---

## 🐳 Docker Compose Deployment

Run the complete multi-container stack (FastAPI + Postgres 16 + Redis 7 + Nginx React Frontend):
```bash
docker-compose up --build
```

---

## 🧪 Automated Test Suite

Run unit and integration tests covering idempotency, scoring formulas, auto-staging, and capacity-based Hot Queue routing:
```bash
cd backend
python -m pytest tests/test_engine.py
```
*(All tests pass in `< 0.4s`)*

---

## 👤 Default Demo Personas

- **Jordan Weber (Admin / Sales Ops)**: `admin@zesiger.net` / `admin123`
- **Alex Fischer (Senior AE)**: `alex@zesiger.net` / `alex123`
- **Taylor Keller (Inbound SDR)**: `taylor@zesiger.net` / `taylor123`

*(Switch personas anytime via the profile button in the top HUD).*

---

## 🔐 v1.1 Hardening & Upgrades

| Area | Change |
| :--- | :--- |
| **Auth** | No more silent admin fallback: every API call needs a JWT. Short-lived access tokens (30 min) + refresh tokens (7 days) via `POST /api/v1/auth/refresh`; the client refreshes transparently. Sign-up always creates a *new* workspace (admin); teammates join via admin-only `POST /api/v1/auth/invite`. |
| **WebSocket** | `/ws/tenant/{id}?token=…&last_seq=…` — token must belong to that tenant. Every message has a per-tenant `seq`; reconnecting clients get missed messages replayed (or a resync signal). Client uses exponential backoff. |
| **Webhooks** | HubSpot / Salesforce / Segment require `X-Tenant-Id` and `X-Signature` (hex HMAC-SHA256 of the raw body with `WEBHOOK_SECRET`). Bad signatures → 401 + log. |
| **Assignment** | True round-robin (rep whose last assignment is oldest goes next, full reps skipped). The hot queue drains into *all* freed capacity — on close, capacity raise, rep availability, invite, manual reassignment, and at startup. New admin endpoint `POST /leads/{id}/assign`. |
| **Audit** | Score explanations, transitions, assignment log and weight audit are append-only: ORM updates/deletes raise `ImmutableRecordError`. |
| **Integrity** | Idempotency race-safe via the `(tenant_id, event_id)` unique constraint; optimistic locking on transitions (`expected_version` → 409); closing/backward moves require a rationale; event types and weights validated. |
| **Observability** | Real p50/p95/p99 latency (no more hardcoded numbers) in `/api/v1/analytics/overview`, `/health`, and Prometheus `/metrics`. Per-tenant ingest rate limit (`INGEST_RATE_PER_SEC`, default 100). |
| **Privacy** | `DELETE /api/v1/leads/{id}/personal-data` (admin) erases contact PII and raw event payloads while keeping the numeric audit trail. |
| **Frontend** | Sign-in / sign-up screen with one-click demo accounts, **Ctrl/⌘+K command palette** (views, actions, lead search), optimistic stage changes with rollback, authenticated CSV export, relative API URLs (Vite proxy in dev, nginx in Docker), hot-queue / auto-reassignment toasts. |

Signing a test webhook:
```bash
BODY='{"event":"Demo Requested","messageId":"m1","traits":{"email":"a@b.com","company":"ACME"}}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" -hex | cut -d' ' -f2)
curl -X POST localhost:8000/api/v1/webhooks/segment -H "Content-Type: application/json" \
  -H "X-Tenant-Id: <tenant-id>" -H "X-Signature: $SIG" -d "$BODY"
```
