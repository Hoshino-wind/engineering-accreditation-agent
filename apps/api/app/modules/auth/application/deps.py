from collections.abc import Callable
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.modules.auth.application.jwt import decode_token
from app.modules.auth.application.ports import (
    AuthenticatedUser,
    JwtSettings,
    UserRepository,
)


def make_provide_user_repository(
    repository: UserRepository,
) -> Callable[[], UserRepository]:
    def provide() -> UserRepository:
        return repository

    return provide


def make_provide_crypt_context(crypt_context) -> Callable[[], object]:
    def provide():
        return crypt_context

    return provide


_bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user_factory(
    provide_user_repository: Callable[[], UserRepository],
    provide_settings: Callable[[], JwtSettings],
) -> Callable:
    async def get_current_user(
        credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer_scheme)],
        settings: Annotated[JwtSettings, Depends(provide_settings)],
        repository: Annotated[UserRepository, Depends(provide_user_repository)],
    ) -> AuthenticatedUser:
        if credentials is None or credentials.scheme.lower() != "bearer":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="未提供有效的认证令牌",
                headers={"WWW-Authenticate": "Bearer"},
            )
        token = credentials.credentials
        try:
            payload = decode_token(
                token,
                secret=settings.jwt_secret,
                algorithm=settings.jwt_algorithm,
            )
        except jwt.PyJWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="无效或已过期的认证令牌",
                headers={"WWW-Authenticate": "Bearer"},
            )
        user_id: str | None = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="无效的认证令牌载荷",
                headers={"WWW-Authenticate": "Bearer"},
            )
        user = await repository.get_by_id(user_id)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="用户不存在或已被删除",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return user

    return get_current_user
