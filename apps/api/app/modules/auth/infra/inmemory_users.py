from datetime import datetime, timezone
from uuid import uuid4

from app.core.json_persistence import JsonPersistenceMixin
from app.modules.auth.domain.user import User
from app.modules.auth.infra.crypto import build_crypt_context

_crypt_context = build_crypt_context()


def _seed_user(
    username: str,
    password: str,
    display_name: str,
    role: str,
) -> User:
    return User(
        id=f"user-{uuid4().hex[:12]}",
        username=username,
        password_hash=_crypt_context.hash(password),
        display_name=display_name,
        role=role,
        created_at=datetime.now(timezone.utc).isoformat(),
        avatar_url=None,
    )


_SEED_USERS: list[User] = [
    _seed_user("admin", "admin123", "系统管理员", "admin"),
    _seed_user("wang", "123456", "王老师", "teacher"),
    _seed_user("li", "123456", "李老师", "teacher"),
]


class InMemoryUserRepository(JsonPersistenceMixin):
    _repo_name = "users"

    def __init__(self) -> None:
        self._store: dict[str, User] = {}
        self._by_username: dict[str, User] = {}
        self._load()
        # 如果持久化文件为空（首次启动），填入 seed 用户
        if not self._store:
            for u in _SEED_USERS:
                self._store[u.id] = u
                self._by_username[u.username] = u
            self._schedule_save()
        else:
            self._rebuild_index()

    def _rebuild_index(self) -> None:
        self._by_username = {u.username: u for u in self._store.values()}

    def _from_dict(self, data: dict) -> User | None:
        try:
            return User(**data)
        except (TypeError, KeyError):
            return None

    async def get_by_username(self, username: str) -> User | None:
        return self._by_username.get(username)

    async def create(self, user: User) -> User:
        self._store[user.id] = user
        self._by_username[user.username] = user
        self._schedule_save()
        return user

    async def get_by_id(self, user_id: str) -> User | None:
        return self._store.get(user_id)

    async def list_all(self) -> list[User]:
        return list(self._store.values())
