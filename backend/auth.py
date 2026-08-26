"""
Authentication for the Admin Dashboard.

This protects the read/write dashboard endpoints (employees, analytics, alerts)
with a JWT bearer token obtained via POST /api/auth/login.

It is intentionally simple (a single admin account defined via environment
variables) rather than a full user-management system, since this tool is
meant to be operated by one admin/HR team behind its own deployment. Swap in
a real user table + roles if you need multiple admins or audit trails.
"""
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer(auto_error=False)

JWT_SECRET_KEY = os.environ.get("JWT_SECRET_KEY")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))  # 8 hours

ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME")
ADMIN_PASSWORD_HASH = os.environ.get("ADMIN_PASSWORD_HASH")


def _require_config():
    """Fail loudly at request time (not import time) if the server is misconfigured,
    so the whole app doesn't crash on import in environments still being set up,
    but no one can accidentally authenticate against a missing/blank config."""
    missing = [
        name
        for name, val in [
            ("JWT_SECRET_KEY", JWT_SECRET_KEY),
            ("ADMIN_USERNAME", ADMIN_USERNAME),
            ("ADMIN_PASSWORD_HASH", ADMIN_PASSWORD_HASH),
        ]
        if not val
    ]
    if missing:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Server auth is not configured. Missing env vars: {', '.join(missing)}. "
                   f"See .env.example and README for setup (scripts/generate_password_hash.py).",
        )


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def hash_password(plain_password: str) -> str:
    return pwd_context.hash(plain_password)


def authenticate_admin(username: str, password: str) -> bool:
    _require_config()
    if username != ADMIN_USERNAME:
        return False
    return verify_password(password, ADMIN_PASSWORD_HASH)


def create_access_token(subject: str) -> str:
    _require_config()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": subject, "exp": expire}
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> Optional[str]:
    """Returns the subject (username) if the token is valid, else None."""
    if not JWT_SECRET_KEY:
        return None
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None


async def get_current_admin(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> str:
    """FastAPI dependency: require a valid Bearer token on protected routes."""
    _require_config()
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated. Include 'Authorization: Bearer <token>'.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    username = decode_token(credentials.credentials)
    if username is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return username


def decode_token_for_websocket(token: Optional[str]) -> Optional[str]:
    """Same as get_current_admin but usable outside of the HTTP dependency system,
    for the WebSocket endpoint which receives the token as a query parameter."""
    if not token:
        return None
    return decode_token(token)
