"""Pydantic V2 schemas for user registration, authentication, and tokens."""

from typing import Optional, Union
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class UserCreate(BaseModel):
    email: EmailStr = Field(..., description="Unique email address")
    password: str = Field(..., min_length=6, description="Account password (min 6 characters)")
    full_name: Optional[str] = Field(None, description="Optional full name")


class UserLogin(BaseModel):
    email: EmailStr = Field(..., description="Registered email address")
    password: str = Field(..., description="Account password")


class UserResponse(BaseModel):
    id: Union[int, str]
    email: EmailStr
    full_name: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
