from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models import Actor, Campaign, IOC, Relationship
from app.schemas.graph import GraphData, GraphEdge, GraphNode

router = APIRouter(prefix="/graph", tags=["graph"])


@router.get("", response_model=GraphData)
async def get_graph(db: AsyncSession = Depends(get_db)):
    actors = (await db.execute(select(Actor).limit(30))).scalars().all()
    campaigns = (await db.execute(select(Campaign).limit(50))).scalars().all()
    iocs = (await db.execute(select(IOC).limit(20))).scalars().all()
    rels = (await db.execute(select(Relationship).limit(200))).scalars().all()

    nodes: list[GraphNode] = []
    actor_ids: set[str] = set()
    campaign_ids: set[str] = set()
    ioc_ids: set[str] = set()

    for a in actors:
        sid = str(a.id)
        nodes.append(GraphNode(id=sid, type="actor", label=a.name,
                               meta={"country": a.origin_country, "motivation": a.motivation}))
        actor_ids.add(sid)

    for c in campaigns:
        sid = str(c.id)
        nodes.append(GraphNode(id=sid, type="campaign", label=c.name,
                               meta={"status": c.status, "campaign_type": c.campaign_type}))
        campaign_ids.add(sid)

    for ioc in iocs:
        sid = str(ioc.id)
        short_val = ioc.value[:40] + ("…" if len(ioc.value) > 40 else "")
        nodes.append(GraphNode(id=sid, type="ioc", label=f"{ioc.type}: {short_val}",
                               meta={"ioc_type": ioc.type, "confidence": ioc.confidence}))
        ioc_ids.add(sid)

    all_ids = actor_ids | campaign_ids | ioc_ids
    edges: list[GraphEdge] = []

    for c in campaigns:
        if c.actor_id and str(c.actor_id) in actor_ids:
            edges.append(GraphEdge(source=str(c.id), target=str(c.actor_id), type="attributed_to"))

    for ioc in iocs:
        if ioc.actor_id and str(ioc.actor_id) in actor_ids:
            edges.append(GraphEdge(source=str(ioc.id), target=str(ioc.actor_id), type="attributed_to"))
        if ioc.campaign_id and str(ioc.campaign_id) in campaign_ids:
            edges.append(GraphEdge(source=str(ioc.id), target=str(ioc.campaign_id), type="used_in"))

    for rel in rels:
        src, tgt = str(rel.source_id), str(rel.target_id)
        if src in all_ids and tgt in all_ids:
            edges.append(GraphEdge(source=src, target=tgt, type=rel.relationship_type))

    return GraphData(nodes=nodes, edges=edges)
