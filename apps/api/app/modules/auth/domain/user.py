from dataclasses import dataclass
from typing import Literal


@dataclass(frozen=True, slots=True)
class User:
    id: str
    username: str
    password_hash: str
    display_name: str
    role: Literal["admin", "teacher"]
    created_at: str
    avatar_url: str | None = None
