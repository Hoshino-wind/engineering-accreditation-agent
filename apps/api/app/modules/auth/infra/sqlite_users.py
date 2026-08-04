from __future__ import annotations

import sqlite3
from datetime import UTC, datetime
from pathlib import Path

from app.core.database import run_database_migrations_sync
from app.core.postgres import connect
from app.modules.auth.domain.user import User
from app.modules.auth.infra.crypto import build_crypt_context

_crypt_context = build_crypt_context()

_ROLES: tuple[tuple[str, str, str], ...] = (
    ("role-admin", "admin", "系统管理员"),
    ("role-teacher", "teacher", "任课教师"),
)

_PERMISSIONS: tuple[tuple[str, str, str], ...] = (
    ("perm-master-data-write", "master_data:write", "维护专业、课程、指标点和评分项"),
    ("perm-material-upload", "material:upload", "上传教学材料"),
    ("perm-material-parse", "material:parse", "解析教学材料"),
    ("perm-relation-review", "relation:review", "审核支撑关系"),
    ("perm-report-read", "report:read", "查看诊断和认证支撑结果"),
)

_ROLE_PERMISSIONS: dict[str, tuple[str, ...]] = {
    "role-admin": tuple(permission_id for permission_id, _, _ in _PERMISSIONS),
    "role-teacher": (
        "perm-material-upload",
        "perm-material-parse",
        "perm-relation-review",
        "perm-report-read",
    ),
}

_SEED_USERS: tuple[dict[str, str], ...] = (
    {
        "id": "user-admin",
        "username": "admin",
        "password": "admin123",
        "display_name": "系统管理员",
        "role": "admin",
    },
    {
        "id": "user-wang",
        "username": "wang",
        "password": "123456",
        "display_name": "王老师（专业负责人）",
        "role": "teacher",
    },
    {
        "id": "user-li",
        "username": "li",
        "password": "123456",
        "display_name": "李老师（任课教师）",
        "role": "teacher",
    },
)


class SQLiteUserRepository:
    def __init__(self, base_dir: Path | None = None) -> None:
        api_root = Path(__file__).resolve().parents[4]
        self._base_dir = base_dir or api_root / "var"
        self._db_path = self._base_dir / "ea_mvp.sqlite3"
        self._base_dir.mkdir(parents=True, exist_ok=True)
        self._ensure_schema()
        self._ensure_seed()

    async def get_by_username(self, username: str) -> User | None:
        with self._connect() as conn:
            row = conn.execute(
                "select * from users where username = ? and status = 'active'",
                (username,),
            ).fetchone()
        return _row_to_user(row) if row else None

    async def create(self, user: User) -> User:
        now = user.created_at or _now()
        role_id = _role_id(user.role)
        with self._connect() as conn:
            conn.execute(
                """
                insert into users (
                    id, username, password_hash, display_name, role,
                    avatar_url, status, created_at, updated_at
                ) values (?, ?, ?, ?, ?, ?, 'active', ?, ?)
                """,
                (
                    user.id,
                    user.username,
                    user.password_hash,
                    user.display_name,
                    user.role,
                    user.avatar_url,
                    now,
                    now,
                ),
            )
            conn.execute(
                """
                insert or ignore into user_roles (user_id, role_id)
                values (?, ?)
                """,
                (user.id, role_id),
            )
        return user

    async def get_by_id(self, user_id: str) -> User | None:
        with self._connect() as conn:
            row = conn.execute(
                "select * from users where id = ? and status = 'active'",
                (user_id,),
            ).fetchone()
        return _row_to_user(row) if row else None

    async def list_all(self) -> list[User]:
        with self._connect() as conn:
            rows = conn.execute(
                "select * from users where status = 'active' order by username"
            ).fetchall()
        return [_row_to_user(row) for row in rows]

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _ensure_schema(self) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                create table if not exists users (
                    id text primary key,
                    username text not null unique,
                    password_hash text not null,
                    display_name text not null,
                    role text not null,
                    avatar_url text,
                    status text not null default 'active',
                    created_at text not null,
                    updated_at text not null
                )
                """
            )
            conn.execute(
                """
                create table if not exists roles (
                    id text primary key,
                    code text not null unique,
                    name text not null,
                    description text not null default ''
                )
                """
            )
            conn.execute(
                """
                create table if not exists permissions (
                    id text primary key,
                    code text not null unique,
                    name text not null,
                    description text not null default ''
                )
                """
            )
            conn.execute(
                """
                create table if not exists user_roles (
                    user_id text not null,
                    role_id text not null,
                    primary key(user_id, role_id)
                )
                """
            )
            conn.execute(
                """
                create table if not exists role_permissions (
                    role_id text not null,
                    permission_id text not null,
                    primary key(role_id, permission_id)
                )
                """
            )
            conn.execute(
                """
                create index if not exists idx_users_username
                on users(username)
                """
            )

    def _ensure_seed(self) -> None:
        now = _now()
        with self._connect() as conn:
            for role_id, code, name in _ROLES:
                conn.execute(
                    """
                    insert or ignore into roles (id, code, name, description)
                    values (?, ?, ?, ?)
                    """,
                    (role_id, code, name, name),
                )
            for permission_id, code, name in _PERMISSIONS:
                conn.execute(
                    """
                    insert or ignore into permissions (id, code, name, description)
                    values (?, ?, ?, ?)
                    """,
                    (permission_id, code, name, name),
                )
            for role_id, permission_ids in _ROLE_PERMISSIONS.items():
                for permission_id in permission_ids:
                    conn.execute(
                        """
                        insert or ignore into role_permissions (role_id, permission_id)
                        values (?, ?)
                        """,
                        (role_id, permission_id),
                    )
            for seed in _SEED_USERS:
                conn.execute(
                    """
                    insert or ignore into users (
                        id, username, password_hash, display_name, role,
                        avatar_url, status, created_at, updated_at
                    ) values (?, ?, ?, ?, ?, null, 'active', ?, ?)
                    """,
                    (
                        seed["id"],
                        seed["username"],
                        _crypt_context.hash(seed["password"]),
                        seed["display_name"],
                        seed["role"],
                        now,
                        now,
                    ),
                )
                conn.execute(
                    """
                    insert or ignore into user_roles (user_id, role_id)
                    values (?, ?)
                    """,
                    (seed["id"], _role_id(seed["role"])),
                )


def _row_to_user(row: sqlite3.Row) -> User:
    return User(
        id=row["id"],
        username=row["username"],
        password_hash=row["password_hash"],
        display_name=row["display_name"],
        role=row["role"],
        created_at=row["created_at"],
        avatar_url=row["avatar_url"],
    )


def _role_id(role: str) -> str:
    return "role-admin" if role == "admin" else "role-teacher"


def _now() -> str:
    return datetime.now(UTC).isoformat()


class PostgresUserRepository(SQLiteUserRepository):
    def __init__(self, database_url: str) -> None:
        self._database_url = database_url
        run_database_migrations_sync(database_url)
        self._ensure_seed()

    async def create(self, user: User) -> User:
        now = user.created_at or _now()
        role_id = _role_id(user.role)
        with self._connect() as conn:
            conn.execute(
                """
                insert into users (
                    id, username, password_hash, display_name, role,
                    avatar_url, status, created_at, updated_at
                ) values (?, ?, ?, ?, ?, ?, 'active', ?, ?)
                """,
                (
                    user.id,
                    user.username,
                    user.password_hash,
                    user.display_name,
                    user.role,
                    user.avatar_url,
                    now,
                    now,
                ),
            )
            conn.execute(
                """
                insert into user_roles (user_id, role_id)
                values (?, ?)
                on conflict do nothing
                """,
                (user.id, role_id),
            )
        return user

    def _connect(self):
        return connect(self._database_url)

    def _ensure_schema(self) -> None:
        run_database_migrations_sync(self._database_url)

    def _ensure_seed(self) -> None:
        now = _now()
        with self._connect() as conn:
            for role_id, code, name in _ROLES:
                conn.execute(
                    """
                    insert into roles (id, code, name, description)
                    values (?, ?, ?, ?)
                    on conflict do nothing
                    """,
                    (role_id, code, name, name),
                )
            for permission_id, code, name in _PERMISSIONS:
                conn.execute(
                    """
                    insert into permissions (id, code, name, description)
                    values (?, ?, ?, ?)
                    on conflict do nothing
                    """,
                    (permission_id, code, name, name),
                )
            for role_id, permission_ids in _ROLE_PERMISSIONS.items():
                for permission_id in permission_ids:
                    conn.execute(
                        """
                        insert into role_permissions (role_id, permission_id)
                        values (?, ?)
                        on conflict do nothing
                        """,
                        (role_id, permission_id),
                    )
            for seed in _SEED_USERS:
                conn.execute(
                    """
                    insert into users (
                        id, username, password_hash, display_name, role,
                        avatar_url, status, created_at, updated_at
                    ) values (?, ?, ?, ?, ?, null, 'active', ?, ?)
                    on conflict do nothing
                    """,
                    (
                        seed["id"],
                        seed["username"],
                        _crypt_context.hash(seed["password"]),
                        seed["display_name"],
                        seed["role"],
                        now,
                        now,
                    ),
                )
                conn.execute(
                    """
                    insert into user_roles (user_id, role_id)
                    values (?, ?)
                    on conflict do nothing
                    """,
                    (seed["id"], _role_id(seed["role"])),
                )
