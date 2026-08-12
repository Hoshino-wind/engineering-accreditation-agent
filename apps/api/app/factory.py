from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.modules.evaluations.application import (
    CreateEvaluationRun,
    CreateScoreImportBatch,
    GetEvaluationPreflight,
    GetEvaluationRun,
    GetEvaluationRunReference,
    GetGraphEvaluationSources,
    GetScoreImportBatch,
    ListEvaluationObjects,
)
from app.modules.evaluations.infra import (
    DeterministicEvaluationRunEvaluator,
    DeterministicScoreImportBatchValidator,
    SqliteScoreImportRepository,
    UtcEvaluationRunClock,
    UtcScoreImportClock,
    UuidEvaluationRunIdGenerator,
    UuidScoreImportIdGenerator,
    build_local_evaluation_read_repository_at,
)
from app.modules.evaluations.infra.graph_source_runtime import (
    PilotFileEvaluationPolicyRepository,
    TeachingGraphPublishedSnapshotRepository,
)
from app.modules.evaluations.routes import (
    create_evaluations_router,
)
from app.modules.materials.application import (
    GetMaterial,
    ListMaterials,
    ProcessMaterial,
    RegisterMaterial,
    RetryMaterial,
)
from app.modules.materials.infra import (
    DeepSeekClient,
    DeepSeekOcrGateway,
    DeepSeekStructureGateway,
    LocalDocumentParser,
    LocalMaterialSecurityScanner,
    LocalObjectStore,
    SqliteMaterialRepository,
    SystemClock,
    UuidGenerator,
)
from app.modules.materials.infra.local_runtime import Sha256Digest
from app.modules.materials.routes import create_materials_router
from app.modules.system.application import GetSystemStatus
from app.modules.system.infra import (
    UtcClock,
    build_system_runtime_configuration,
)
from app.modules.system.routes import create_system_router
from app.modules.teaching_graph.application import (
    GetGraphWorkspace,
    ImportCoursePackage,
    ListGraphAuditEvents,
    PublishGraph,
    SaveGraphDraft,
    StartGraphRevision,
)
from app.modules.teaching_graph.infra import (
    SqliteGraphWorkspaceRepository,
    UtcGraphClock,
)
from app.modules.teaching_graph.routes import create_teaching_graph_router


def create_app() -> FastAPI:
    settings = get_settings()
    data_dir = settings.local_data_dir.resolve()
    repository = SqliteMaterialRepository(data_dir / "materials.sqlite3")
    graph_repository = SqliteGraphWorkspaceRepository(
        data_dir / "teaching-graph.sqlite3"
    )
    object_store = LocalObjectStore(data_dir / "objects")
    clock = SystemClock()
    ocr_api_key = (
        settings.deepseek_ocr_api_key.get_secret_value().strip()
        if settings.deepseek_ocr_api_key
        else ""
    )
    ocr_gateway = None
    if settings.deepseek_ocr_base_url:
        ocr_gateway = DeepSeekOcrGateway(
            DeepSeekClient(
                base_url=settings.deepseek_ocr_base_url,
                api_key=ocr_api_key or None,
                model=settings.deepseek_ocr_model,
                timeout_seconds=settings.deepseek_timeout_seconds,
            )
        )
    structure_api_key = (
        settings.deepseek_api_key.get_secret_value().strip()
        if settings.deepseek_api_key
        else ""
    )
    structure_gateway = None
    if structure_api_key:
        structure_gateway = DeepSeekStructureGateway(
            DeepSeekClient(
                base_url=settings.deepseek_api_base_url,
                api_key=structure_api_key,
                model=settings.deepseek_model,
                timeout_seconds=settings.deepseek_timeout_seconds,
            )
        )
    parser = LocalDocumentParser(
        ocr_gateway=ocr_gateway,
        structure_gateway=structure_gateway,
        ocr_max_pdf_pages=settings.ocr_max_pdf_pages,
    )
    scanner = LocalMaterialSecurityScanner(
        max_upload_bytes=settings.max_upload_bytes,
        virus_scan_mode=settings.virus_scan_mode,
        clamav_command=settings.clamav_command,
    )
    processor = ProcessMaterial(repository, object_store, scanner, parser, clock)
    register = RegisterMaterial(
        repository, clock, UuidGenerator(), Sha256Digest()
    )
    list_materials = ListMaterials(repository)
    get_material = GetMaterial(repository)
    retry_material = RetryMaterial(repository, object_store, processor)
    evaluation_read_repository = build_local_evaluation_read_repository_at(
        data_dir / "evaluation-read-model.sqlite3"
    )
    get_evaluation_run_reference = GetEvaluationRunReference(
        evaluation_read_repository
    )
    list_evaluation_objects = ListEvaluationObjects(
        evaluation_read_repository
    )
    get_evaluation_run = GetEvaluationRun(evaluation_read_repository)
    get_evaluation_preflight = GetEvaluationPreflight(
        evaluation_read_repository
    )
    create_evaluation_run = CreateEvaluationRun(
        evaluation_read_repository,
        evaluation_read_repository,
        UtcEvaluationRunClock(),
        UuidEvaluationRunIdGenerator(),
        DeterministicEvaluationRunEvaluator("evaluator 0.8.0"),
    )
    score_import_repository = SqliteScoreImportRepository(
        data_dir / "evaluation-read-model.sqlite3"
    )
    score_batch_capture_enabled = (
        settings.enable_pilot_score_batch_capture
        and settings.environment in ("development", "test")
    )
    create_score_import_batch = CreateScoreImportBatch(
        evaluation_read_repository,
        score_import_repository,
        UtcScoreImportClock(),
        UuidScoreImportIdGenerator(),
        DeterministicScoreImportBatchValidator("score-import-validator 0.1.0"),
        enabled=score_batch_capture_enabled,
    )
    get_score_import_batch = GetScoreImportBatch(
        score_import_repository,
        enabled=score_batch_capture_enabled,
    )
    get_graph_evaluation_sources = GetGraphEvaluationSources(
        TeachingGraphPublishedSnapshotRepository(graph_repository),
        PilotFileEvaluationPolicyRepository(),
    )
    system_status_use_case = GetSystemStatus(
        configuration=build_system_runtime_configuration(settings),
        clock=UtcClock(),
    )
    graph_clock = UtcGraphClock()
    graph_actor = "王老师"
    get_graph_workspace = GetGraphWorkspace(graph_repository)
    save_graph_draft = SaveGraphDraft(
        graph_repository,
        graph_clock,
        graph_actor,
    )
    publish_graph = PublishGraph(
        graph_repository,
        graph_clock,
        graph_actor,
    )
    start_graph_revision = StartGraphRevision(
        graph_repository,
        graph_clock,
        graph_actor,
    )
    list_graph_audit_events = ListGraphAuditEvents(graph_repository)
    import_course_package = ImportCoursePackage(
        graph_repository,
        graph_clock,
        graph_actor,
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
        create_evaluations_router(
            provide_list_objects=lambda: list_evaluation_objects,
            provide_get_run=lambda: get_evaluation_run,
            provide_get_reference=lambda: get_evaluation_run_reference,
            provide_get_preflight=lambda: get_evaluation_preflight,
            provide_create_run=lambda: create_evaluation_run,
            provide_create_score_batch=lambda: create_score_import_batch,
            provide_get_score_batch=lambda: get_score_import_batch,
            provide_graph_sources=lambda: get_graph_evaluation_sources,
        ),
        prefix=settings.api_v1_prefix,
    )
    application.include_router(
        create_system_router(provide_system_status_use_case),
        prefix=settings.api_v1_prefix,
    )
    application.include_router(
        create_materials_router(
            provide_register=lambda: register,
            provide_process=lambda: processor,
            provide_list=lambda: list_materials,
            provide_get=lambda: get_material,
            provide_retry=lambda: retry_material,
            max_upload_bytes=settings.max_upload_bytes,
        ),
        prefix=settings.api_v1_prefix,
    )
    application.include_router(
        create_teaching_graph_router(
            provide_get=lambda: get_graph_workspace,
            provide_save=lambda: save_graph_draft,
            provide_publish=lambda: publish_graph,
            provide_start_revision=lambda: start_graph_revision,
            provide_audit=lambda: list_graph_audit_events,
            provide_import_package=lambda: import_course_package,
        ),
        prefix=settings.api_v1_prefix,
    )
    return application
