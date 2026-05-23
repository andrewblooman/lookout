import asyncio
from fastapi import APIRouter

router = APIRouter(prefix="/ingest", tags=["ingest"])


@router.post("/trigger", status_code=202)
async def trigger_all():
    from app.core.scheduler import run_all_feeds
    asyncio.create_task(run_all_feeds())
    return {"status": "triggered"}
