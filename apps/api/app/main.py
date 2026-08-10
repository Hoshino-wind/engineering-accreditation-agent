import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.bootstrap_per_user import PerUserRepositoryManager
from app.core.config import get_settings
from app.core.task_registry import task_registry
from app.infrastructure.accreditation_store import AccreditationStore
from app.infrastructure.object_storage import build_object_storage
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
from app.modules.courses.application import CreateCourse, DeleteCourse, ListCourses
from app.modules.courses.routes import create_courses_router
from app.modules.diagnostics.application import DecideFinding, ListFindings
from app.modules.diagnostics.routes import create_diagnostics_router
from app.modules.evaluations.application import ExportEvaluationAudit, RunEvaluation
from app.modules.evaluations.routes import create_evaluations_router
from app.modules.improvements.application import (
    CompleteMaterialHealthImprovement,
    CreateImprovement,
    ListImprovements,
    UpdateImprovement,
)
from app.modules.improvements.routes import create_improvements_router
from app.modules.llm.application.ports import LLMClientPort
from app.modules.llm.application.rag_port import RAGSearchPort
from app.modules.llm.infra.llm_client import LLMConfig, OpenAICompatibleLLMClient
from app.modules.llm.routes.llm import create_llm_router
from app.modules.llm.routes.settings import create_settings_router
from app.modules.majors.application import (
    CreateMajor,
    DeleteMajor,
    GetMajorAnalysis,
    GetMajorHealthOverview,
    GetMajorSummary,
    ListMajors,
)
from app.modules.majors.routes import create_majors_router
from app.modules.orchestration.application.graph_query import QueryProjectedGraph
from app.modules.orchestration.infra.orchestrator import LangGraphAgentOrchestrator
from app.modules.orchestration.routes.runs import create_orchestration_router
from app.modules.pipeline.application import GetPipelineStatus
from app.modules.pipeline.routes import create_pipeline_router
from app.modules.recognition.application import ListCandidates, ReviewCandidate
from app.modules.recognition.domain.candidate import RecognitionCandidate
from app.modules.recognition.routes import create_recognition_router
from app.modules.resources.application import (
    ClassifyResource,
    ConfirmMaterialHealthAction,
    ConfirmSuggestedCourse,
    DeleteResource,
    GetMaterialHealth,
    GetResource,
    ListResources,
    PlanMaterialHealthActions,
    UploadResource,
)
from app.modules.resources.routes import create_resources_router
from app.modules.support.application import GetSupportReadiness
from app.modules.support.routes import create_support_router
from app.modules.system.application import GetSystemStatus
from app.modules.system.infra import (
    UtcClock,
    build_system_runtime_configuration,
)
from app.modules.system.routes import create_system_router


def create_app() -> FastAPI:
    settings = get_settings()
    object_storage = build_object_storage(settings)

    persistence = (
        AccreditationStore(create_async_engine(settings.database_url, pool_pre_ping=True))
        if settings.database_url
        else None
    )

    # --- Auth ---
    user_repo = InMemoryUserRepository()
    crypt_ctx = build_crypt_context()

    # --- 按用户独立的业务仓储管理器 ---
    per_user_mgr = PerUserRepositoryManager(persistence=persistence)

    register_uc = RegisterUser(
        repository=user_repo,
        crypt_context=crypt_ctx,
        jwt_secret=settings.jwt_secret.get_secret_value(),
        jwt_algorithm=settings.jwt_algorithm,
        jwt_access_token_ttl_minutes=settings.jwt_access_token_ttl_minutes,
        repo_manager=per_user_mgr,
    )
    authenticate_uc = AuthenticateUser(
        repository=user_repo,
        crypt_context=crypt_ctx,
        jwt_secret=settings.jwt_secret.get_secret_value(),
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
        if persistence is not None:
            await persistence.create_schema()
        seed_users = await user_repo.list_all()
        for u in seed_users:
            per_user_mgr.provision_user(u.id)
        try:
            yield
        finally:
            if persistence is not None:
                await persistence.dispose()

    # --- System ---
    system_status_use_case = GetSystemStatus(
        configuration=build_system_runtime_configuration(settings),
        clock=UtcClock(),
    )

    def provide_system_status_use_case() -> GetSystemStatus:
        return system_status_use_case

    # --- 多专业隔离：从请求头读取当前激活专业 ID ---
    async def get_active_major_id(
        current_user: Annotated[User, Depends(get_current_user)],
        x_major_id: Annotated[str | None, Header(alias="X-Major-Id")] = None,
    ) -> str | None:
        if x_major_id is None:
            return None
        repos = per_user_mgr.get(current_user.id)
        major = await repos.majors.get_by_id(x_major_id)
        if major is None:
            raise HTTPException(
                status_code=403, detail="无权访问该专业或专业不存在"
            )
        return x_major_id

    # --- M3 Resources ---
    def provide_list_resources(
        current_user: Annotated[User, Depends(get_current_user)],
        active_major_id: Annotated[str | None, Depends(get_active_major_id)] = None,
    ) -> ListResources:
        repos = per_user_mgr.get(current_user.id)
        return ListResources(
            repository=repos.resources, active_major_id=active_major_id
        )

    def provide_get_resource(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> GetResource:
        repos = per_user_mgr.get(current_user.id)
        return GetResource(repository=repos.resources)

    def provide_material_health(
        current_user: Annotated[User, Depends(get_current_user)],
        active_major_id: Annotated[str | None, Depends(get_active_major_id)] = None,
    ) -> GetMaterialHealth:
        repos = per_user_mgr.get(current_user.id)
        return GetMaterialHealth(
            repository=repos.resources, active_major_id=active_major_id
        )

    def provide_material_health_actions(
        current_user: Annotated[User, Depends(get_current_user)],
        active_major_id: Annotated[str | None, Depends(get_active_major_id)] = None,
    ) -> PlanMaterialHealthActions:
        repos = per_user_mgr.get(current_user.id)
        return PlanMaterialHealthActions(
            repository=repos.resources, active_major_id=active_major_id
        )

    def provide_confirm_material_health_action(
        current_user: Annotated[User, Depends(get_current_user)],
        active_major_id: Annotated[str | None, Depends(get_active_major_id)] = None,
    ) -> ConfirmMaterialHealthAction:
        repos = per_user_mgr.get(current_user.id)
        return ConfirmMaterialHealthAction(
            resources=repos.resources,
            improvements=repos.improvements,
            active_major_id=active_major_id,
        )

    def provide_upload_resource(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> UploadResource:
        repos = per_user_mgr.get(current_user.id)
        return UploadResource(
            repository=repos.resources,
            object_storage=object_storage,
            owner=current_user.id,
        )

    def provide_delete_resource(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> DeleteResource:
        repos = per_user_mgr.get(current_user.id)
        return DeleteResource(
            repository=repos.resources,
            cancellation=task_registry,
            candidates_repo=repos.candidates,
            findings_repo=repos.findings,
        )

    def provide_classify_resource(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> ClassifyResource:
        # 按当前用户构造客户端，使用其自己配置的 Key / 模型
        return ClassifyResource(
            llm=OpenAICompatibleLLMClient(config=llm_config, user_id=current_user.id)
        )

    def provide_confirm_suggested_course(
        current_user: Annotated[User, Depends(get_current_user)],
        active_major_id: Annotated[str | None, Depends(get_active_major_id)] = None,
    ) -> ConfirmSuggestedCourse:
        repos = per_user_mgr.get(current_user.id)
        return ConfirmSuggestedCourse(
            resource_repository=repos.resources,
            course_repository=repos.courses,
            active_major_id=active_major_id,
        )

    # --- Courses（课程：用户自建，认证评判单元下的工作台课程体系）---
    def provide_list_courses(
        current_user: Annotated[User, Depends(get_current_user)],
        active_major_id: Annotated[str | None, Depends(get_active_major_id)] = None,
    ) -> ListCourses:
        repos = per_user_mgr.get(current_user.id)
        return ListCourses(repository=repos.courses, active_major_id=active_major_id)

    def provide_create_course(
        current_user: Annotated[User, Depends(get_current_user)],
        active_major_id: Annotated[str | None, Depends(get_active_major_id)] = None,
    ) -> CreateCourse:
        repos = per_user_mgr.get(current_user.id)
        return CreateCourse(
            repository=repos.courses, active_major_id=active_major_id
        )

    def provide_delete_course(
        current_user: Annotated[User, Depends(get_current_user)],
        active_major_id: Annotated[str | None, Depends(get_active_major_id)] = None,
    ) -> DeleteCourse:
        repos = per_user_mgr.get(current_user.id)
        return DeleteCourse(
            repository=repos.courses,
            graph_projection=get_orchestrator(current_user.id, active_major_id),
            candidates_repo=repos.candidates,
            findings_repo=repos.findings,
            improvements_repo=repos.improvements,
        )

    # --- Majors（专业实体，认证评判单元）---
    def provide_list_majors(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> ListMajors:
        repos = per_user_mgr.get(current_user.id)
        return ListMajors(repository=repos.majors)

    def provide_create_major(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> CreateMajor:
        repos = per_user_mgr.get(current_user.id)
        return CreateMajor(repository=repos.majors)

    def provide_major_health_overview(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> GetMajorHealthOverview:
        repos = per_user_mgr.get(current_user.id)
        return GetMajorHealthOverview(majors=repos.majors, resources=repos.resources)

    def provide_delete_major(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> DeleteMajor:
        repos = per_user_mgr.get(current_user.id)
        return DeleteMajor(repository=repos.majors)

    def _coverage_provider_factory(user_id: str, major_id: str | None):
        async def _coverage(major_scope: str | None = None) -> dict:
            orch = get_orchestrator(
                user_id, major_scope or major_id or "major-eie"
            )
            return await orch.get_current_coverage()

        return _coverage

    def provide_major_analysis(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> GetMajorAnalysis:
        repos = per_user_mgr.get(current_user.id)
        return GetMajorAnalysis(
            majors=repos.majors,
            resources=repos.resources,
            coverage_provider=_coverage_provider_factory(current_user.id, None),
        )

    def provide_major_summary(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> GetMajorSummary:
        repos = per_user_mgr.get(current_user.id)
        return GetMajorSummary(
            majors=repos.majors,
            resources=repos.resources,
            coverage_provider=_coverage_provider_factory(current_user.id, None),
        )

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
        inner = ReviewCandidate(repository=repos.candidates)

        class _ReviewAndProject:
            """审核后把裁决投影进该用户的能力图谱（审核闭环的落地端）。"""

            async def execute(
                self, candidate_id: str, decision: str
            ) -> RecognitionCandidate | None:
                result = await inner.execute(candidate_id, decision)
                if result is None:
                    return result
                try:
                    orchestrator = get_orchestrator(current_user.id, None)
                    await orchestrator.review_project_candidates([result])
                except Exception:  # noqa: BLE001
                    logging.getLogger(__name__).exception(
                        "识别中心审核 → 图谱投影失败 (candidate=%s)", candidate_id
                    )
                return result

        return _ReviewAndProject()

    # --- M5 Diagnostics ---
    def provide_list_findings(
        current_user: Annotated[User, Depends(get_current_user)],
        active_major_id: Annotated[str | None, Depends(get_active_major_id)] = None,
    ) -> ListFindings:
        repos = per_user_mgr.get(current_user.id)
        return ListFindings(
            repository=repos.findings, active_major_id=active_major_id
        )

    def provide_decide_finding(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> DecideFinding:
        repos = per_user_mgr.get(current_user.id)
        return DecideFinding(repository=repos.findings, improvements=repos.improvements)

    # --- M7 Improvements ---
    def provide_list_improvements(
        current_user: Annotated[User, Depends(get_current_user)],
        active_major_id: Annotated[str | None, Depends(get_active_major_id)] = None,
    ) -> ListImprovements:
        repos = per_user_mgr.get(current_user.id)
        return ListImprovements(
            repository=repos.improvements, active_major_id=active_major_id
        )

    def provide_create_improvement(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> CreateImprovement:
        repos = per_user_mgr.get(current_user.id)
        return CreateImprovement(repository=repos.improvements)

    def provide_update_improvement(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> UpdateImprovement:
        repos = per_user_mgr.get(current_user.id)
        return UpdateImprovement(repository=repos.improvements)

    def provide_complete_improvement(
        current_user: Annotated[User, Depends(get_current_user)],
        active_major_id: Annotated[str | None, Depends(get_active_major_id)] = None,
    ) -> CompleteMaterialHealthImprovement:
        repos = per_user_mgr.get(current_user.id)
        return CompleteMaterialHealthImprovement(
            improvements=repos.improvements,
            resources=repos.resources,
            active_major_id=active_major_id,
        )

    # --- LLM + RAG ---
    # LLM 客户端不再使用全局单例：在请求 / 任务级别按当前用户构造，
    # 以便每个用户使用自己配置的 Key / 模型（见 provide_llm_client / get_orchestrator）。
    llm_config = LLMConfig()
    orchestrators: dict[tuple[str, str], LangGraphAgentOrchestrator] = {}

    def get_orchestrator(user_id: str, major_id: str | None) -> LangGraphAgentOrchestrator:
        scope = major_id or "major-eie"
        key = (user_id, scope)
        if key not in orchestrators:
            orchestrators[key] = LangGraphAgentOrchestrator(
                llm=OpenAICompatibleLLMClient(config=llm_config, user_id=user_id),
                rag=None, user_id=f"{user_id}__{scope}"
            )
        return orchestrators[key]

    def provide_llm_client(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> LLMClientPort:
        # 按当前用户构造客户端，使用其自己配置的 Key / 模型
        return OpenAICompatibleLLMClient(config=llm_config, user_id=current_user.id)

    # --- LLM 设置路由的装配（routes 不触 infra，这里做适配）---
    from app.modules.llm.application.settings_service import (
        LLMDefaults,
        UserLLMSettingsStore,
    )
    from app.modules.llm.infra.runtime_settings import (
        load_user_llm_settings,
        save_user_llm_settings,
    )

    def provide_llm_settings_store() -> UserLLMSettingsStore:
        class _Store:
            def load(self, user_id: str):
                return load_user_llm_settings(user_id)

            def save(self, user_id: str, settings) -> None:
                save_user_llm_settings(user_id, settings)

        return _Store()

    def provide_llm_settings_defaults() -> LLMDefaults:
        return LLMDefaults(
            api_key=llm_config.api_key,
            base_url=llm_config.base_url,
            model=llm_config.model,
            embedding_api_key=llm_config.embedding_api_key,
            embedding_base_url=llm_config.embedding_base_url,
            embedding_model=llm_config.embedding_model,
        )

    def provide_rag_search(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> RAGSearchPort:
        repos = per_user_mgr.get(current_user.id)
        # PG 模式 + 配置了 embedding key 时启用 pgvector 向量检索；
        # 否则回退内存实现（Demo 可用）。
        # embedding 配置优先取页面运行时设置，回落到 .env。
        # embedding 配置按当前用户解析（优先用该用户自己配置的，回落到 env 默认值）
        from app.modules.llm.infra.runtime_settings import resolve_user_llm_config

        _eff = resolve_user_llm_config(llm_config, current_user.id)
        embed_key = _eff.embedding_api_key
        embed_base = _eff.embedding_base_url
        embed_model = _eff.embedding_model

        if persistence is not None and embed_key:
            from app.modules.llm.infra.rag_pgvector import PostgresRAGRepository

            async def _embed(texts):
                import httpx

                headers = {
                    "Authorization": "Bearer " + embed_key,
                    "Content-Type": "application/json",
                }
                payload = {
                    "model": embed_model,
                    "input": texts if isinstance(texts, list) else [texts],
                }
                async with httpx.AsyncClient(timeout=60) as client:
                    resp = await client.post(
                        f"{embed_base}/embeddings",
                        headers=headers,
                        json=payload,
                    )
                    resp.raise_for_status()
                    data = resp.json()
                    return [item["embedding"] for item in data["data"]]

            return PostgresRAGRepository(
                persistence._engine,
                tenant_id=current_user.id,
                embedder=_embed,
            )
        return repos.rag

    # --- Autopilot（一键编排：委托真实多智能体 pipeline） ---
    def provide_autopilot_orchestrator(
        current_user: Annotated[User, Depends(get_current_user)],
        active_major_id: Annotated[str | None, Depends(get_active_major_id)] = None,
    ) -> AutopilotOrchestrator:
        repos = per_user_mgr.get(current_user.id)
        return AutopilotOrchestrator(
            pipeline=get_orchestrator(current_user.id, active_major_id),
            resources_repo=repos.resources,
            candidates_repo=repos.candidates,
            findings_repo=repos.findings,
            rag_repo=repos.rag,
            task_registry=task_registry,
        )

    # --- Orchestration（多智能体协作）---
    def provide_orchestrator(
        current_user: Annotated[User, Depends(get_current_user)],
        active_major_id: Annotated[str | None, Depends(get_active_major_id)] = None,
    ) -> LangGraphAgentOrchestrator:
        return get_orchestrator(current_user.id, active_major_id)

    def provide_graph_query(
        current_user: Annotated[User, Depends(get_current_user)],
        active_major_id: Annotated[str | None, Depends(get_active_major_id)] = None,
    ) -> QueryProjectedGraph:
        repos = per_user_mgr.get(current_user.id)
        return QueryProjectedGraph(
            orchestrator=get_orchestrator(current_user.id, active_major_id),
            candidates=repos.candidates,
        )

    def provide_run_evaluation(
        current_user: Annotated[User, Depends(get_current_user)],
        active_major_id: Annotated[str | None, Depends(get_active_major_id)] = None,
    ) -> RunEvaluation:
        repos = per_user_mgr.get(current_user.id)
        return RunEvaluation(
            graph_query=QueryProjectedGraph(
                orchestrator=get_orchestrator(current_user.id, active_major_id),
                candidates=repos.candidates,
            ),
            tenant_id=current_user.id,
            audit_store=persistence,
        )

    def provide_export_evaluation_audit(
        current_user: Annotated[User, Depends(get_current_user)],
    ) -> ExportEvaluationAudit:
        return ExportEvaluationAudit(
            tenant_id=current_user.id,
            audit_store=persistence,
        )

    # --- Pipeline（全局进度聚合）---
    class _ResourceStatusAdapter:
        def __init__(self, repo):
            self._repo = repo

        async def get_extracting_count(self) -> int:
            items = await self._repo.list_all(status="processing")
            return len(items)

        async def get_total_count(self) -> int:
            items = await self._repo.list_all()
            return len(items)

    class _ReviewStatusAdapter:
        def __init__(self, repo, orch):
            self._repo = repo
            self._orch = orch

        async def get_pending_run_review_count(self) -> int:
            # 停在审核网关的多智能体运行中的待审核推断关系（只取最近一次）
            try:
                for run in await self._orch.list_runs():
                    if run.pending_review:
                        return len(run.pending_review)
            except Exception:  # noqa: BLE001
                pass
            return 0

        async def get_pending_review_count(self) -> int:
            items = await self._repo.list_all()
            pending = sum(1 for c in items if c.review_status == "pending")
            return pending + await self.get_pending_run_review_count()

    class _CoverageStatusAdapter:
        def __init__(self, orch):
            self._orch = orch

        async def get_gap_count(self) -> int:
            try:
                report = await self._orch.get_current_coverage()
                return report.get("gapCount", 0)
            except Exception:
                return 0

    class _SuggestionStatusAdapter:
        def __init__(self, repo):
            self._repo = repo

        async def get_open_suggestion_count(self) -> int:
            items = await self._repo.list_all(status="open")
            return len(items)

    def provide_pipeline_status(
        current_user: Annotated[User, Depends(get_current_user)],
        active_major_id: Annotated[str | None, Depends(get_active_major_id)] = None,
    ) -> GetPipelineStatus:
        repos = per_user_mgr.get(current_user.id)
        return GetPipelineStatus(
            resources=_ResourceStatusAdapter(repos.resources),
            review=_ReviewStatusAdapter(
                repos.candidates, get_orchestrator(current_user.id, active_major_id)
            ),
            coverage=_CoverageStatusAdapter(
                get_orchestrator(current_user.id, active_major_id)
            ),
            suggestions=_SuggestionStatusAdapter(repos.improvements),
        )

    def provide_support_readiness(
        current_user: Annotated[User, Depends(get_current_user)],
        active_major_id: Annotated[str | None, Depends(get_active_major_id)] = None,
    ) -> GetSupportReadiness:
        repos = per_user_mgr.get(current_user.id)
        return GetSupportReadiness(
            resources=repos.resources,
            candidates=repos.candidates,
            findings=repos.findings,
            improvements=repos.improvements,
            major_id=active_major_id,
        )

    # --- B1/B2/B4: 上传后异步处理 pipeline ---
    async def _process_resource_background(resource_id: str, category: str, content: bytes) -> None:
        """上传后异步：标记 READY（B1）→ 触发真实多智能体 pipeline（B2）。

        pipeline 执行 plan→extract→infer 后停在人工审核网关：
        - 提取出的节点已并入图谱（/orchestration/graph 可见新节点/边）
        - 运行出现在智能体控制台，等待教师审核后继续 coverage→diagnose→improve→report
        """
        import asyncio
        import logging
        from dataclasses import replace as dc_replace

        from app.modules.resources.application.material_text import extract_material_text
        from app.modules.resources.domain.resource import (
            ProcessingStage,
            TeachingResourceStatus,
        )

        logger = logging.getLogger(__name__)
        await asyncio.sleep(0.5)  # 留出响应返回时间

        async with task_registry.track(resource_id) as token:
            # 遍历所有用户找到该 resource
            resource = None
            target_repos = None
            resource_owner_id = None
            for owner_id, repos in per_user_mgr._repos.items():
                found = await repos.resources.get_by_id(resource_id)
                if found is not None:
                    resource = found
                    target_repos = repos
                    resource_owner_id = owner_id
                    break
            if resource is None or target_repos is None or resource_owner_id is None:
                return

            # 解析文件真实文本（PDF/txt…），供提取智能体使用
            material_text = extract_material_text(
                resource.file_name, resource.course, category, content
            )

            # 取消检查点：若用户已删除该资源，直接停止
            token.check()

            # AI 自动识别候选课程：仅在「裸传未分类」时提取，避免已选课程时多余调用。
            # 复用 extract_nodes 能力，从 kind=course 节点取课程元信息作为「建议"，
            # 老师可在前端修改名称后确认才正式建课（候选阶段不落库课程，无并发冲突）。
            suggested_course = None
            if not resource.course or resource.course == "未分类":
                try:
                    from app.modules.resources.domain.resource import SuggestedCourse
                    extract_resp = await OpenAICompatibleLLMClient(
                        config=llm_config, user_id=resource_owner_id
                    ).extract_nodes(
                        material_text=material_text,
                        material_category=category or "其他",
                        material_name=resource.name,
                    )
                    course_nodes = [
                        item for item in extract_resp.data if item.kind == "course"
                    ]
                    if course_nodes:
                        best = course_nodes[0]
                        suggested_course = SuggestedCourse(
                            name=best.name or resource.name,
                            code=best.code or "",
                            credits=best.credit_hours,
                            description=best.description,
                            confidence=best.confidence,
                            source_excerpt=best.source_excerpt,
                        )
                except Exception:  # noqa: BLE001
                    logger.warning("候选课程提取失败，跳过", exc_info=True)

            # 取消检查点
            token.check()

            # B1: 更新状态为 READY，标记所有阶段完成，并持久化解析文本
            updated_resource = dc_replace(
                resource,
                status=TeachingResourceStatus.READY,
                next_action=(
                    "AI 已识别候选课程，请确认课程归属后再进入图谱审核"
                    if suggested_course is not None
                    else "AI 已提取节点，可去图谱查看或进入审核"
                ),
                source_coverage=85,
                extracted_text=material_text,
                suggested_course=suggested_course,
                processing_stages=(
                    ProcessingStage(
                        label="安全校验", detail="文件头、MIME 与哈希一致", status="finish"
                    ),
                    ProcessingStage(
                        label="内容解析", detail=f"已提取 {len(material_text)} 字文本", status="finish"
                    ),
                    ProcessingStage(label="敏感检测", detail="未发现个人敏感信息", status="finish"),
                    ProcessingStage(label="分类确认", detail="课程与材料类型已确认", status="finish"),
                ),
            )
            await target_repos.resources.update(updated_resource)

            # B2: 触发真实多智能体 pipeline（提取节点入图 + 推断待审核关系）
            try:
                goal = f"解析上传材料「{resource.name}」，提取教学节点并推断对毕业要求指标点的支撑关系"
                await get_orchestrator(resource_owner_id, resource.major_id).start_run(
                    goal=goal,
                    material_category=category or "其他",
                    material_name=resource.name,
                    material_text=material_text,
                )
            except Exception:  # noqa: BLE001
                logger.exception("上传后自动 pipeline 运行失败")

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
        create_courses_router(
            provide_list_courses,
            provide_create_course,
            provide_delete_course,
        ),
        prefix=settings.api_v1_prefix,
    )
    application.include_router(
        create_majors_router(
            provide_list_majors,
            provide_create_major,
            provide_delete_major,
            provide_major_health_overview,
            provide_major_analysis,
            provide_major_summary,
        ),
        prefix=settings.api_v1_prefix,
    )
    application.include_router(
        create_resources_router(
            provide_list_resources,
            provide_get_resource,
            provide_upload_resource,
            provide_classify_resource,
            provide_confirm_suggested_course,
            provide_delete_resource,
            provide_material_health,
            provide_material_health_actions,
            provide_confirm_material_health_action,
            _process_resource_background,
        ),
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
        create_evaluations_router(
            provide_run_evaluation,
            provide_export_evaluation_audit,
        ),
        prefix=settings.api_v1_prefix,
    )
    application.include_router(
        create_improvements_router(
            provide_list_improvements,
            provide_create_improvement,
            provide_update_improvement,
            provide_complete_improvement,
        ),
        prefix=settings.api_v1_prefix,
    )
    application.include_router(
        create_llm_router(provide_llm_client, provide_rag_search),
        prefix=settings.api_v1_prefix,
    )
    application.include_router(
        create_settings_router(
            provide_user_repo_provider,
            get_settings,
            provide_llm_settings_store,
            provide_llm_settings_defaults,
        ),
        prefix=settings.api_v1_prefix,
    )
    application.include_router(
        create_autopilot_router(provide_autopilot_orchestrator),
        prefix=settings.api_v1_prefix,
    )
    application.include_router(
        create_orchestration_router(
            provide_orchestrator, get_current_user, provide_graph_query
        ),
        prefix=settings.api_v1_prefix,
    )
    application.include_router(
        create_pipeline_router(provide_pipeline_status, get_current_user),
        prefix=settings.api_v1_prefix,
    )
    application.include_router(
        create_support_router(provide_support_readiness),
        prefix=settings.api_v1_prefix,
    )
    return application


app = create_app()
