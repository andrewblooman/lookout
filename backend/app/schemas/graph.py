from typing import Any
from pydantic import BaseModel


class GraphNode(BaseModel):
    id: str
    type: str  # "actor" | "campaign" | "ioc"
    label: str
    meta: dict[str, Any] = {}


class GraphEdge(BaseModel):
    source: str
    target: str
    type: str


class GraphData(BaseModel):
    nodes: list[GraphNode]
    edges: list[GraphEdge]
