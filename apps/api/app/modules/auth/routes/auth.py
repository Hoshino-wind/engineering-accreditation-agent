from collections.abc import Callable
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.modules.auth.application import AuthenticateUser, RegisterUser
from app.modules.auth.application.deps import get_current_user_factory
from app.modules.auth.application.ports import (
    AuthenticatedUser,
    JwtSettings,
    UserRepository,
)
from app.modules.auth.contracts.auth import (
    AuthTokenResponse,
    LoginRequest,
    MeResponse,
    RegisterRequest,
)


def create_auth_router(
    register_use_case: Callable[[], RegisterUser],
    authenticate_use_case: Callable[[], AuthenticateUser],
    provide_user_repository: Callable[[], UserRepository],
    provide_settings: Callable[[], JwtSettings],
) -> APIRouter:
    router = APIRouter(prefix="/auth", tags=["auth"])

    get_current_user = get_current_user_factory(provide_user_repository, provide_settings)

    @router.post(
        "/register",
        response_model=AuthTokenResponse,
        summary="注册新用户",
    )
    async def register(
        body: RegisterRequest,
        use_case: Annotated[RegisterUser, Depends(register_use_case)],
    ) -> AuthTokenResponse:
        if not provide_settings().allow_public_registration:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="公开注册已关闭，请联系管理员创建账号",
            )
        _user, token, expires_in = await use_case.execute(
            username=body.username,
            password=body.password,
            display_name=body.display_name,
            role="teacher",
        )
        return AuthTokenResponse(access_token=token, expires_in=expires_in)

    @router.post(
        "/login",
        response_model=AuthTokenResponse,
        summary="用户登录",
    )
    async def login(
        body: LoginRequest,
        use_case: Annotated[AuthenticateUser, Depends(authenticate_use_case)],
    ) -> AuthTokenResponse:
        result = await use_case.execute(
            username=body.username,
            password=body.password,
        )
        if result is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="用户名或密码错误",
            )
        _user, token, expires_in = result
        return AuthTokenResponse(access_token=token, expires_in=expires_in)

    @router.get(
        "/me",
        response_model=MeResponse,
        summary="获取当前登录用户信息",
    )
    async def get_me(
        current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    ) -> MeResponse:
        return MeResponse(
            id=current_user.id,
            username=current_user.username,
            display_name=current_user.display_name,
            role=current_user.role,
            avatar_url=current_user.avatar_url,
            created_at=current_user.created_at,
        )

    @router.post(
        "/logout",
        summary="用户登出",
    )
    async def logout() -> dict[str, bool]:
        return {"ok": True}

    return router
