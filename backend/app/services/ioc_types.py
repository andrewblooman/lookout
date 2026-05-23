_HASH_TYPE_MAP = {
    "md5": "hash-md5",
    "sha1": "hash-sha1",
    "sha256": "hash-sha256",
}


def normalize_ioc_type(ioc_type: str) -> str:
    normalized = ioc_type.strip().lower()
    return _HASH_TYPE_MAP.get(normalized, normalized)


def equivalent_ioc_types(ioc_type: str) -> tuple[str, ...]:
    canonical = normalize_ioc_type(ioc_type)
    equivalents = [canonical]
    for legacy, normalized in _HASH_TYPE_MAP.items():
        if normalized == canonical:
            equivalents.append(legacy)
    return tuple(dict.fromkeys(equivalents))
