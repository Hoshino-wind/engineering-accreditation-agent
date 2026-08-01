from typing import Literal

from pydantic import BaseModel, ConfigDict


class LoginRequest(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    username: str
    password: str


class RegisterRequest(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    username: str
    password: str
    display_name: str | None = None
    role: Literal["admin", "teacher"] = "teacher"


class AuthTokenResponse(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    access_token: str
    token_type: str = "bearer"
    expires_in: int


class MeResponse(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    id: str
    username: str
    display_name: str
    role: str
    avatar_url: str | None = None
    created_at: str
