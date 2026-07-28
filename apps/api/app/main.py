from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.modules.system.routes.status import router as system_router
from app.platform.config import get_settings


def create_app() -> FastAPI:
    settings = get_settings()
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
    application.include_router(system_router, prefix=settings.api_v1_prefix)
    return application


app = create_app()
