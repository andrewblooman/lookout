from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.session import engine
from app.db.base import Base
from app.api.v1.router import router as v1_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all tables on startup (Alembic handles migrations in prod)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Seed and start scheduler after tables exist
    from app.services.ingest.seed import seed_if_empty
    from app.core.scheduler import start_scheduler

    await seed_if_empty()
    start_scheduler()
    logger.info("Lookout backend started")
    yield
    from app.core.scheduler import shutdown_scheduler
    shutdown_scheduler()


app = FastAPI(title="Lookout Threat Intelligence API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(v1_router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "ok"}
