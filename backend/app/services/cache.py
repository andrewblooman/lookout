import json
from typing import Any
import redis.asyncio as aioredis
from app.core.config import settings

_redis: aioredis.Redis | None = None


def get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(settings.redis_url, decode_responses=True)
    return _redis


async def cache_get(key: str) -> Any | None:
    r = get_redis()
    val = await r.get(key)
    return json.loads(val) if val else None


async def cache_set(key: str, value: Any, ttl: int = 300) -> None:
    r = get_redis()
    await r.set(key, json.dumps(value, default=str), ex=ttl)


async def cache_delete(key: str) -> None:
    r = get_redis()
    await r.delete(key)
