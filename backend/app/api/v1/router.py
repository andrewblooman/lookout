from fastapi import APIRouter
from app.api.v1 import dashboard, actors, campaigns, iocs, cves, news, feeds, ingest, graph, reports, malware

router = APIRouter()
router.include_router(dashboard.router)
router.include_router(actors.router)
router.include_router(campaigns.router)
router.include_router(iocs.router)
router.include_router(cves.router)
router.include_router(news.router)
router.include_router(feeds.router)
router.include_router(ingest.router)
router.include_router(graph.router)
router.include_router(reports.router)
router.include_router(malware.router)
