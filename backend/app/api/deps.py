"""FastAPI route dependencies for database sessions and JWT authentication."""

import os
from typing import Optional, Union
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.app.core.database import get_db
from backend.app.core.security import decode_access_token, AuthUser
from backend.app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


async def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> Union[AuthUser, User]:
    """Extract and validate Supabase or local JWT token, returning authenticated user identity."""
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is missing. Please sign in to access this resource.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    sub_val = str(payload["sub"])
    email = payload.get("email", sub_val)
    user_id = str(payload.get("id", sub_val))
    role = payload.get("role", "authenticated")

    # If user registered locally in SQLite/Postgres dev users table, fetch profile
    try:
        stmt = select(User).where((User.email == email) | (User.email == sub_val))
        result = await db.execute(stmt)
        db_user = result.scalar_one_or_none()
        if db_user and db_user.is_active:
            return db_user
    except Exception:
        pass

    # Standard Supabase user (UUID sub)
    return AuthUser(id=user_id, email=email, role=role, is_active=True)


async def get_optional_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> Optional[Union[AuthUser, User]]:
    """Extract authenticated user if token present, otherwise return None."""
    if not token:
        return None
    try:
        return await get_current_user(token=token, db=db)
    except HTTPException:
        return None
