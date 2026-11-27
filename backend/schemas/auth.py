import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, computed_field, field_validator

from core.config import get_settings
from schemas.common import ORM


class RegisterIn(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    phone: str | None = Field(default=None, max_length=30)
    city: str | None = Field(default=None, max_length=80)
    target_exam: str | None = Field(default=None, pattern="^(HAT|USAT)$")

    @field_validator("full_name")
    @classmethod
    def _name(cls, v: str) -> str:
        return " ".join(v.split())


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=72)


class ChangePasswordIn(BaseModel):
    current_password: str = Field(min_length=1, max_length=72)
    new_password: str = Field(min_length=8, max_length=72)


class ProfileUpdateIn(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=120)
    phone: str | None = Field(default=None, max_length=30)
    city: str | None = Field(default=None, max_length=80)
    preferred_category: str | None = Field(default=None, max_length=24)


class MeOut(ORM):
    id: uuid.UUID
    email: str
    full_name: str
    phone: str | None
    city: str | None
    role: str
    preferred_category: str | None = None
    created_at: datetime

    @computed_field
    @property
    def is_super_admin(self) -> bool:
        return get_settings().is_super_admin(self.role, self.email)


class AuthOut(BaseModel):
    user: MeOut
