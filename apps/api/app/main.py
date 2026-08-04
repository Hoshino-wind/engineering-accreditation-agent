from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.bootstrap_per_user import PerUserRepositoryManager
from app.core.config import get_settings
from app.core.database import (
    is_postgres_url,
    run_database_migrations,
    run_database_migrations_sync,
)
from app.modules.academic.application import (
    CreateCompetencyIndicator,
    CreateCourse,
    CreateCourseObjective,
    CreateExperimentProject,
    CreateGraduationRequirement,
    CreateRubricItem,
    GetAcademicCatalog,
    UpdateAcademicProgram,
    UpdateCompetencyIndicator,
    UpdateCourse,
    UpdateCourseObjective,
    UpdateExperimentProject,
    UpdateGraduationRequirement,
    UpdateRubricItem,
)
from app.modules.academic.infra import (
    PostgresAcademicCatalogRepository,
    SQLiteAcademicCatalogRepository,
)
from app.modules.academic.routes import create_academic_router
from app.modules.auth.application import (
    AuthenticateUser,
    RegisterUser,
    get_current_user_factory,
    make_provide_user_repository,
)
from app.modules.auth.domain.user import User
from app.modules.auth.infra.crypto import build_crypt_context
from app.modules.auth.infra.sqlite_users import PostgresUserRepository, SQLiteUserRepository
from app.modules.auth.routes import create_auth_router
from app.modules.autopilot.orchestrator import AutopilotOrchestrator
from app.modules.autopilot.routes import create_autopilot_router
from app.modules.diagnostics.application import (
    DecideFinding,
    ListFindings,
    RunGraphDiagnostics,
)
from app.modules.diagnostics.infra import (
    PostgresFindingRepository,
    SQLiteFindingRepository,
)
from app.modules.diagnostics.routes import create_diagnostics_router
from app.modules.graph.application import GetAbilityGraph, ReviewGraphEdge
from app.modules.graph.infra import (
    PostgresAbilityGraphRepository,
    SQLiteAbilityGraphRepository,
)
from app.modules.graph.routes import create_graph_router
from app.modules.llm.application.ports import LLMClientPort
from app.modules.llm.application.rag_port import RAGSearchPort
from app.modules.llm.infra.llm_client import LLMConfig, OpenAICompatibleLLMClient
from app.modules.llm.routes.llm import create_llm_router
from app.modules.materials.application import (
    GetMaterialFile,
    GetOcrRuntimeStatus,
    ListMaterialVersions,
    ListUploadedMaterials,
    ParseMaterial,
    UploadMaterial,
)
from app.modules.materials.infra import MaterialPostgresStore, MaterialSQLiteStore
from app.modules.materials.routes import create_materials_router
from app.modules.orchestration.infra.orchestrator import LangGraphAgentOrchestrator
from app.modules.orchestration.routes.runs import create_orchestration_router
from app.modules.recognition.application import ListCandidates, ReviewCandidate
from app.modules.recognition.infra import (
    PostgresCandidateRepository,
    SQLiteCandidateRepository,
)
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
    postgres_enabled = is_postgres_url(settings.database_url)
    if postgres_enabled:
        run_database_migrations_sync(settings.database_url or "")

    # --- Auth ---
    user_repo = (
        PostgresUserRepository(settings.database_url or "")
        if postgres_enabled
        else SQLiteUserRepository()
    )
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
        if settings.database_migrate_on_startup and is_postgres_url(settings.database_url):
            await run_database_migrations(settings.database_url or "")
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

    # --- Academic master data ---
    def academic_repository(
        user_id: str,
    ) -> SQLiteAcademicCatalogRepository | PostgresAcademicCatalogRepository:
        if postgres_enabled:
            return PostgresAcademicCatalogRepository(user_id, settings.database_url or "")
        return SQLiteAcademicCatalogRepository(user_id)

    def provide_get_academic_catalog(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> GetAcademicCatalog:
        return GetAcademicCatalog(repository=academic_repository(current_user.id))

    def provide_update_academic_program(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> UpdateAcademicProgram:
        return UpdateAcademicProgram(repository=academic_repository(current_user.id))

    def provide_create_course(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> CreateCourse:
        return CreateCourse(repository=academic_repository(current_user.id))

    def provide_update_course(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> UpdateCourse:
        return UpdateCourse(repository=academic_repository(current_user.id))

    def provide_create_graduation_requirement(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> CreateGraduationRequirement:
        return CreateGraduationRequirement(repository=academic_repository(current_user.id))

    def provide_update_graduation_requirement(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> UpdateGraduationRequirement:
        return UpdateGraduationRequirement(repository=academic_repository(current_user.id))

    def provide_create_competency_indicator(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> CreateCompetencyIndicator:
        return CreateCompetencyIndicator(repository=academic_repository(current_user.id))

    def provide_update_competency_indicator(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> UpdateCompetencyIndicator:
        return UpdateCompetencyIndicator(repository=academic_repository(current_user.id))

    def provide_create_course_objective(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> CreateCourseObjective:
        return CreateCourseObjective(repository=academic_repository(current_user.id))

    def provide_update_course_objective(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> UpdateCourseObjective:
        return UpdateCourseObjective(repository=academic_repository(current_user.id))

    def provide_create_experiment_project(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> CreateExperimentProject:
        return CreateExperimentProject(repository=academic_repository(current_user.id))

    def provide_update_experiment_project(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> UpdateExperimentProject:
        return UpdateExperimentProject(repository=academic_repository(current_user.id))

    def provide_create_rubric_item(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> CreateRubricItem:
        return CreateRubricItem(repository=academic_repository(current_user.id))

    def provide_update_rubric_item(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> UpdateRubricItem:
        return UpdateRubricItem(repository=academic_repository(current_user.id))

    # --- M3 Resources ---
    material_store = (
        MaterialPostgresStore(settings.database_url or "")
        if postgres_enabled
        else MaterialSQLiteStore()
    )

    def candidate_repository(
        user_id: str,
    ) -> SQLiteCandidateRepository | PostgresCandidateRepository:
        if postgres_enabled:
            return PostgresCandidateRepository(user_id, settings.database_url or "")
        return SQLiteCandidateRepository(user_id)

    def graph_repository(
        user_id: str,
    ) -> SQLiteAbilityGraphRepository | PostgresAbilityGraphRepository:
        if postgres_enabled:
            return PostgresAbilityGraphRepository(user_id, settings.database_url or "")
        return SQLiteAbilityGraphRepository(user_id)

    def provide_list_materials(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> ListUploadedMaterials:
        return ListUploadedMaterials(store=material_store, user_id=current_user.id)

    def provide_upload_material(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> UploadMaterial:
        return UploadMaterial(
            store=material_store,
            user_id=current_user.id,
            uploaded_by=current_user.display_name,
        )

    def provide_parse_material(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> ParseMaterial:
        return ParseMaterial(
            store=material_store,
            candidates=candidate_repository(current_user.id),
            user_id=current_user.id,
            catalog=academic_repository(current_user.id),
            llm=llm_client,
        )

    def provide_get_material_file(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> GetMaterialFile:
        return GetMaterialFile(store=material_store, user_id=current_user.id)

    def provide_list_material_versions(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> ListMaterialVersions:
        return ListMaterialVersions(store=material_store, user_id=current_user.id)

    def provide_ocr_status() -> GetOcrRuntimeStatus:
        return GetOcrRuntimeStatus()

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
        return ListCandidates(repository=candidate_repository(current_user.id))

    def provide_review_candidate(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> ReviewCandidate:
        return ReviewCandidate(
            repository=candidate_repository(current_user.id),
            projection=graph_repository(current_user.id),
            reviewer_name=current_user.display_name,
        )

    # --- M2 Ability Graph ---
    def provide_get_graph(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> GetAbilityGraph:
        return GetAbilityGraph(repository=graph_repository(current_user.id))

    def provide_review_graph_edge(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> ReviewGraphEdge:
        return ReviewGraphEdge(repository=graph_repository(current_user.id))

    # --- M5 Diagnostics ---
    def finding_repository(
        user_id: str,
    ) -> SQLiteFindingRepository | PostgresFindingRepository:
        if postgres_enabled:
            return PostgresFindingRepository(user_id, settings.database_url or "")
        return SQLiteFindingRepository(user_id)

    def provide_list_findings(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> ListFindings:
        return ListFindings(repository=finding_repository(current_user.id))

    def provide_decide_finding(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> DecideFinding:
        return DecideFinding(repository=finding_repository(current_user.id))

    def provide_run_graph_diagnostics(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> RunGraphDiagnostics:
        return RunGraphDiagnostics(
            graph_repository=graph_repository(current_user.id),
            finding_repository=finding_repository(current_user.id),
            llm=llm_client,
        )

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
        create_academic_router(
            provide_get_academic_catalog,
            provide_update_academic_program,
            provide_create_course,
            provide_update_course,
            provide_create_graduation_requirement,
            provide_update_graduation_requirement,
            provide_create_competency_indicator,
            provide_update_competency_indicator,
            provide_create_course_objective,
            provide_update_course_objective,
            provide_create_experiment_project,
            provide_update_experiment_project,
            provide_create_rubric_item,
            provide_update_rubric_item,
        ),
        prefix=settings.api_v1_prefix,
    )
    application.include_router(
        create_resources_router(provide_list_resources, provide_get_resource),
        prefix=settings.api_v1_prefix,
    )
    application.include_router(
        create_materials_router(
            provide_list_materials,
            provide_upload_material,
            provide_parse_material,
            provide_get_material_file,
            provide_list_material_versions,
            provide_ocr_status,
        ),
        prefix=settings.api_v1_prefix,
    )
    application.include_router(
        create_recognition_router(provide_list_candidates, provide_review_candidate),
        prefix=settings.api_v1_prefix,
    )
    application.include_router(
        create_graph_router(provide_get_graph, provide_review_graph_edge),
        prefix=settings.api_v1_prefix,
    )
    application.include_router(
        create_diagnostics_router(
            provide_list_findings,
            provide_decide_finding,
            provide_run_graph_diagnostics,
        ),
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
