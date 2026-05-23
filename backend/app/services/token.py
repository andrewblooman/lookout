"""Fernet encryption helpers for feed API tokens."""
import base64
import hashlib

from cryptography.fernet import Fernet
from app.core.config import settings


def _get_fernet() -> Fernet:
    key = settings.feed_secret_key
    if not key:
        # Derive a stable key from a placeholder — tokens won't survive restarts without a real key
        derived = base64.urlsafe_b64encode(hashlib.sha256(b"lookout-dev-key").digest())
        return Fernet(derived)
    return Fernet(key.encode() if isinstance(key, str) else key)


def encrypt_token(token: str) -> str:
    return _get_fernet().encrypt(token.encode()).decode()


def decrypt_token(encrypted: str) -> str:
    return _get_fernet().decrypt(encrypted.encode()).decode()
