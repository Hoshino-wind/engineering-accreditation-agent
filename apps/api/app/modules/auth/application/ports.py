from typing import Protocol

from app.modules.auth.domain.user import User


class UserRepository(Protocol):
    async def get_by_username(self, username: str) -> User | None: ...

    async def create(self, user: User) -> User: ...

    async def get_by_id(self, user_id: str) -> User | None: ...


class UserProvisioner(Protocol):
    """能够为新用户初始化按用户隔离仓储的组件（由 app.core 提供具体实现）。"""

    def provision_user(self, user_id: str) -> None: ...


class JwtSettings(Protocol):
    """签发/校验 JWT 所需的配置字段（避免 application 层依赖 app.core.Settings）。"""

    jwt_secret: str
    jwt_algorithm: str
    jwt_access_token_ttl_minutes: int


class AuthenticatedUser(Protocol):
    """路由层可用的已认证用户视图（避免 routes 层直接依赖 domain.User）。"""

    id: str
    username: str
    display_name: str
    role: str
    avatar_url: str | None
    created_at: str
