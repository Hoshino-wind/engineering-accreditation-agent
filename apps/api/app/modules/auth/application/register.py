from datetime import UTC, datetime
from uuid import uuid4

from fastapi import HTTPException

from app.modules.auth.application.jwt import create_access_token
from app.modules.auth.application.ports import UserProvisioner, UserRepository
from app.modules.auth.domain.user import User


class RegisterUser:
    def __init__(
        self,
        repository: UserRepository,
        crypt_context,
        jwt_secret: str,
        jwt_algorithm: str,
        jwt_access_token_ttl_minutes: int,
        repo_manager: UserProvisioner | None = None,
    ) -> None:
        self._repository = repository
        self._crypt_context = crypt_context
        self._jwt_secret = jwt_secret
        self._jwt_algorithm = jwt_algorithm
        self._jwt_access_token_ttl_minutes = jwt_access_token_ttl_minutes
        self._repo_manager = repo_manager

    async def execute(
        self,
        username: str,
        password: str,
        display_name: str | None,
        role: str,
    ) -> tuple[User, str, int]:
        existing = await self._repository.get_by_username(username)
        if existing is not None:
            raise HTTPException(status_code=409, detail="用户名已存在")
        password_hash = self._crypt_context.hash(password)
        user = User(
            id=f"user-{uuid4().hex[:12]}",
            username=username,
            password_hash=password_hash,
            display_name=display_name or username,
            role=role,
            created_at=datetime.now(UTC).isoformat(),
            avatar_url=None,
        )
        created = await self._repository.create(user)
        if self._repo_manager is not None:
            self._repo_manager.provision_user(created.id)
        ttl = self._jwt_access_token_ttl_minutes
        token = create_access_token(
            sub=created.id,
            ttl_minutes=ttl,
            secret=self._jwt_secret,
            algorithm=self._jwt_algorithm,
        )
        expires_in = ttl * 60
        return created, token, expires_in
