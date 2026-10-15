from pathlib import Path
from typing import Annotated, List
import os

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

# Anchor the default SQLite file to the backend folder so the DB is the same
# regardless of which directory uvicorn is launched from.
_BACKEND_DIR = Path(__file__).resolve().parent.parent
_DEFAULT_SQLITE = f"sqlite:///{(_BACKEND_DIR / 'lead_to_deal.db').as_posix()}"


class Settings(BaseSettings):
    PROJECT_NAME: str = "Autonomous Lead-to-Deal Intelligence System"
    VERSION: str = "1.1.0"
    API_V1_STR: str = "/api/v1"

    # Database
    # Hosts like Render/Heroku hand out "postgres://", which SQLAlchemy 2 rejects.
    DATABASE_URL: str = os.getenv("DATABASE_URL", _DEFAULT_SQLITE).replace("postgres://", "postgresql://", 1)

    # JWT Auth (PRD §6 Security: short expiry + refresh)
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-only-insecure-secret-change-me")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

    # Webhook HMAC secret (per-deployment; per-tenant secrets are a v2 concern)
    WEBHOOK_SECRET: str = os.getenv("WEBHOOK_SECRET", "dev-webhook-secret")

    # Ingest rate limit (PRD NFR: 100 events/sec per tenant)
    INGEST_RATE_PER_SEC: int = int(os.getenv("INGEST_RATE_PER_SEC", "100"))

    # CORS (comma-separated in the environment)
    CORS_ORIGINS: Annotated[List[str], NoDecode] = [
        "http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000", "http://127.0.0.1:3000",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def _split_origins(cls, v):
        if isinstance(v, str):
            return [o.strip().rstrip("/") for o in v.split(",") if o.strip()]
        return v

    @field_validator("DATABASE_URL", mode="after")
    @classmethod
    def _fix_pg_scheme(cls, v: str) -> str:
        return v.replace("postgres://", "postgresql://", 1)

    # Optional regex for extra origins, e.g. Vercel preview URLs:
    #   https://my-app(-[a-z0-9-]+)?\.vercel\.app
    CORS_ORIGIN_REGEX: str | None = os.getenv("CORS_ORIGIN_REGEX") or None

    # Scoring Thresholds
    ENGAGED_SCORE_THRESHOLD: int = 20
    CONTACTED_SCORE_THRESHOLD: int = 40
    QUALIFIED_SCORE_THRESHOLD: int = 70
    PROPOSAL_SCORE_THRESHOLD: int = 85
    HOT_LEAD_THRESHOLD: int = 65

    # Seed demo data on an empty database
    SEED_DEMO_DATA: bool = os.getenv("SEED_DEMO_DATA", "true").lower() == "true"

    model_config = SettingsConfigDict(case_sensitive=True)


settings = Settings()
