from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.modules.system.application import GetSystemStatus
from app.modules.system.infra import (
    UtcClock,
    build_system_runtime_configuration,
)
from app.modules.system.routes import create_system_router


def create_app() -> FastAPI:
    settings = get_settings()
    system_status_use_case = GetSystemStatus(
        configuration=build_system_runtime_configuration(settings),
        clock=UtcClock(),
    )

    def provide_system_status_use_case() -> GetSystemStatus:
        return system_status_use_case

    application = FastAPI(
        title="工程认证智能体 API",
        summary="实验教学证据治理与持续改进平台",
        version=settings.app_version,
        docs_url="/api/docs",
        openapi_url="/api/openapi.json",
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )
    application.include_router(
        create_system_router(provide_system_status_use_case),
        prefix=settings.api_v1_prefix,
    )
    return application


app = create_app()
