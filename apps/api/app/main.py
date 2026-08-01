from collections.abc import AsyncIterator, Callable
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.bootstrap_per_user import PerUserRepositoryManager
from app.core.config import get_settings
from app.modules.auth.application import (
    AuthenticateUser,
    RegisterUser,
    get_current_user_factory,
    make_provide_user_repository,
)
from app.modules.auth.domain.user import User
from app.modules.auth.infra.crypto import build_crypt_context
from app.modules.auth.infra.inmemory_users import InMemoryUserRepository
from app.modules.auth.routes import create_auth_router
from app.modules.autopilot.orchestrator import AutopilotOrchestrator
from app.modules.autopilot.routes import create_autopilot_router
from app.modules.diagnostics.application import DecideFinding, ListFindings
from app.modules.diagnostics.routes import create_diagnostics_router
from app.modules.llm.application.ports import LLMClientPort
from app.modules.llm.application.rag_port import RAGSearchPort
from app.modules.llm.infra.llm_client import LLMConfig, OpenAICompatibleLLMClient
from app.modules.llm.infra.rag_inmemory import InMemoryRAGRepository
from app.modules.llm.routes.llm import create_llm_router
from app.modules.orchestration.infra.orchestrator import LangGraphAgentOrchestrator
from app.modules.orchestration.routes.runs import create_orchestration_router
from app.modules.recognition.application import ListCandidates, ReviewCandidate
from app.modules.recognition.routes import create_recognition_router
from app.modules.resources.application import GetResource, ListResources
from app.modules.resources.routes import create_resources_router
from app.modules.system.application import GetSystemStatus
from app.modules.system.infra import (
    UtcClock,
    build_system_runtime_configuration,
)
from app.modules.system.routes import create_system_router


def create_app() -> FastAPI:
    settings = get_settings()

    # --- Auth ---
    user_repo = InMemoryUserRepository()
    crypt_ctx = build_crypt_context()

    # --- 按用户独立的业务仓储管理器 ---
    per_user_mgr = PerUserRepositoryManager()

    register_uc = RegisterUser(
        repository=user_repo,
        crypt_context=crypt_ctx,
        jwt_secret=settings.jwt_secret,
        jwt_algorithm=settings.jwt_algorithm,
        jwt_access_token_ttl_minutes=settings.jwt_access_token_ttl_minutes,
        repo_manager=per_user_mgr,
    )
    authenticate_uc = AuthenticateUser(
        repository=user_repo,
        crypt_context=crypt_ctx,
        jwt_secret=settings.jwt_secret,
        jwt_algorithm=settings.jwt_algorithm,
        jwt_access_token_ttl_minutes=settings.jwt_access_token_ttl_minutes,
        repo_manager=per_user_mgr,
    )

    def provide_register() -> RegisterUser:
        return register_uc

    def provide_authenticate() -> AuthenticateUser:
        return authenticate_uc

    provide_user_repo_provider = make_provide_user_repository(user_repo)
    get_current_user = get_current_user_factory(provide_user_repo_provider, get_settings)

    @asynccontextmanager
    async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
        seed_users = await user_repo.list_all()
        for u in seed_users:
            per_user_mgr.provision_user(u.id)
        yield

    # --- System ---
    system_status_use_case = GetSystemStatus(
        configuration=build_system_runtime_configuration(settings),
        clock=UtcClock(),
    )

    def provide_system_status_use_case() -> GetSystemStatus:
        return system_status_use_case

    # --- M3 Resources ---
    def provide_list_resources(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> ListResources:
        repos = per_user_mgr.get(current_user.id)
        return ListResources(repository=repos.resources)

    def provide_get_resource(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> GetResource:
        repos = per_user_mgr.get(current_user.id)
        return GetResource(repository=repos.resources)

    # --- M4 Recognition ---
    def provide_list_candidates(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> ListCandidates:
        repos = per_user_mgr.get(current_user.id)
        return ListCandidates(repository=repos.candidates)

    def provide_review_candidate(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> ReviewCandidate:
        repos = per_user_mgr.get(current_user.id)
        return ReviewCandidate(repository=repos.candidates)

    # --- M5 Diagnostics ---
    def provide_list_findings(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> ListFindings:
        repos = per_user_mgr.get(current_user.id)
        return ListFindings(repository=repos.findings)

    def provide_decide_finding(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> DecideFinding:
        repos = per_user_mgr.get(current_user.id)
        return DecideFinding(repository=repos.findings)

    # --- LLM + RAG ---
    llm_config = LLMConfig()
    llm_client = OpenAICompatibleLLMClient(config=llm_config)

    def provide_llm_client(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> LLMClientPort:
        return llm_client

    def provide_rag_search(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> RAGSearchPort:
        repos = per_user_mgr.get(current_user.id)
        return repos.rag

    # --- Autopilot（一键编排：材料→图谱→诊断→建议） ---
    def provide_autopilot_orchestrator(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> AutopilotOrchestrator:
        repos = per_user_mgr.get(current_user.id)
        return AutopilotOrchestrator(
            llm_client=llm_client,
            rag_repo=repos.rag,
            resources_repo=repos.resources,
            candidates_repo=repos.candidates,
            findings_repo=repos.findings,
        )

    # --- Orchestration（多智能体协作）---
    orchestrator = LangGraphAgentOrchestrator(llm=llm_client, rag=None)

    def provide_orchestrator() -> LangGraphAgentOrchestrator:
        return orchestrator

    application = FastAPI(
        title="工程认证智能体 API",
        summary="实验教学证据治理与持续改进平台",
        version=settings.app_version,
        docs_url="/api/docs",
        openapi_url="/api/openapi.json",
        lifespan=lifespan,
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )
    application.include_router(
        create_auth_router(
            provide_register,
            provide_authenticate,
            provide_user_repo_provider,
            get_settings,
        ),
        prefix=settings.api_v1_prefix,
    )
    application.include_router(
        create_system_router(provide_system_status_use_case),
        prefix=settings.api_v1_prefix,
    )
    application.include_router(
        create_resources_router(provide_list_resources, provide_get_resource),
        prefix=settings.api_v1_prefix,
    )
    application.include_router(
        create_recognition_router(provide_list_candidates, provide_review_candidate),
        prefix=settings.api_v1_prefix,
    )
    application.include_router(
        create_diagnostics_router(provide_list_findings, provide_decide_finding),
        prefix=settings.api_v1_prefix,
    )
    application.include_router(
        create_llm_router(provide_llm_client, provide_rag_search),
        prefix=settings.api_v1_prefix,
    )
    application.include_router(
        create_autopilot_router(provide_autopilot_orchestrator),
        prefix=settings.api_v1_prefix,
    )
    application.include_router(
        create_orchestration_router(provide_orchestrator, get_current_user),
        prefix=settings.api_v1_prefix,
    )
    return application


app = create_app()
