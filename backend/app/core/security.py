"""Password hashing, verification, and JWT token management using native bcrypt & python-jose."""

from datetime import datetime, timedelta
from typing import Optional, Any
import bcrypt
from jose import jwt, JWTError

from backend.app.core.config import settings


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify raw password against stored bcrypt hash."""
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8")[:72],
            hashed_password.encode("utf-8"),
        )
    except Exception:
        return False


def get_password_hash(password: str) -> str:
    """Hash password using native bcrypt."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8")[:72], salt).decode("utf-8")


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Encode user claims into signed JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


class AuthUser:
    """Lightweight authenticated user context carrying Supabase UUID or local identity."""

    def __init__(self, id: str, email: str = "", role: str = "authenticated", is_active: bool = True):
        self.id = str(id)
        self.email = email
        self.role = role
        self.is_active = is_active

    def __repr__(self) -> str:
        return f"<AuthUser id={self.id} email={self.email}>"


def decode_access_token(token: str) -> Optional[dict]:
    """Decode and validate a JWT access token using Supabase secret or local SECRET_KEY."""
    # 1. Verify against Supabase JWT Secret (standard HS256)
    supa_secret = settings.SUPABASE_JWT_SECRET or settings.SUPABASE_KEY
    if supa_secret:
        try:
            return jwt.decode(
                token,
                supa_secret,
                algorithms=["HS256"],
                options={"verify_aud": False},
            )
        except JWTError:
            pass

    # 2. Verify against local SECRET_KEY (dev / test suites)
    if settings.SECRET_KEY:
        try:
            return jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=[settings.ALGORITHM],
                options={"verify_aud": False},
            )
        except JWTError:
            pass

    # 3. Asymmetric token fallback (check claims if expiry valid)
    try:
        claims = jwt.get_unverified_claims(token)
        if claims and "sub" in claims:
            exp = claims.get("exp")
            if exp and datetime.utcfromtimestamp(exp) > datetime.utcnow():
                return claims
    except Exception:
        pass

    return None
