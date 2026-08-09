"""按用户懒装载 + 克隆 seed 的业务仓储管理器。

每个用户独立一份仓储快照，持久化到 data/<repo>_<user_id>.json，
后端重启后从文件恢复，不再丢失。

当 EA_DATABASE_URL 已配置时，resources / candidates / findings /
improvements / courses / majors 全部核心仓储切换为 PostgreSQL 主读取源
（从 accreditation_entity_snapshots 重建），未配置时回退到 JSON/内存。
"""
from dataclasses import dataclass

from app.infrastructure.accreditation_store import AccreditationStore
from app.modules.courses.infra.memory_store import InMemoryCourseRepository
from app.modules.diagnostics.infra.memory_store import InMemoryFindingRepository
from app.modules.improvements.infra.memory_store import InMemoryImprovementRepository
from app.modules.llm.infra.rag_inmemory import InMemoryRAGRepository
from app.modules.majors.infra.memory_store import InMemoryMajorRepository
from app.modules.recognition.infra.memory_store import InMemoryCandidateRepository
from app.modules.resources.infra.memory_store import InMemoryResourceRepository


@dataclass
class PerUserRepositories:
    resources: InMemoryResourceRepository
    candidates: InMemoryCandidateRepository
    findings: InMemoryFindingRepository
    improvements: InMemoryImprovementRepository
    rag: InMemoryRAGRepository
    courses: InMemoryCourseRepository
    majors: InMemoryMajorRepository


class PerUserRepositoryManager:
    def __init__(self, persistence: AccreditationStore | None = None) -> None:
        self._repos: dict[str, PerUserRepositories] = {}
        self._persistence = persistence
        self._use_pg = persistence is not None

        if self._use_pg:
            from app.infrastructure.postgres_repos import (
                PostgresCandidateRepository,
                PostgresCourseRepository,
                PostgresFindingRepository,
                PostgresImprovementRepository,
                PostgresMajorRepository,
                PostgresResourceRepository,
            )

            self._pg_resource_cls = PostgresResourceRepository
            self._pg_candidate_cls = PostgresCandidateRepository
            self._pg_finding_cls = PostgresFindingRepository
            self._pg_improvement_cls = PostgresImprovementRepository
            self._pg_course_cls = PostgresCourseRepository
            self._pg_major_cls = PostgresMajorRepository
        else:
            self._pg_resource_cls = None
            self._pg_candidate_cls = None
            self._pg_finding_cls = None
            self._pg_improvement_cls = None
            self._pg_course_cls = None
            self._pg_major_cls = None

        # 模板仓储：加载 seed 数据（JSON 空则用代码里的 seed）
        self._template = PerUserRepositories(
            resources=self._make_resource_repo("template"),
            candidates=self._make_candidate_repo("template"),
            findings=self._make_finding_repo("template"),
            improvements=self._make_improvement_repo("template"),
            rag=InMemoryRAGRepository(),
            courses=self._make_course_repo("template"),
            majors=self._make_major_repo("template"),
        )

    # ------------------------------------------------------------------
    # 工厂方法：根据是否配置数据库选择 PG 或 JSON 仓储
    # ------------------------------------------------------------------

    def _make_resource_repo(self, user_id: str) -> InMemoryResourceRepository:
        if self._use_pg:
            return self._pg_resource_cls(
                with_seed=False, user_id=user_id, persistence=self._persistence
            )
        return InMemoryResourceRepository(
            with_seed=True, user_id=user_id, persistence=self._persistence
        )

    def _make_candidate_repo(self, user_id: str) -> InMemoryCandidateRepository:
        if self._use_pg:
            return self._pg_candidate_cls(
                with_seed=False, user_id=user_id, persistence=self._persistence
            )
        return InMemoryCandidateRepository(
            with_seed=True, user_id=user_id, persistence=self._persistence
        )

    def _make_finding_repo(self, user_id: str) -> InMemoryFindingRepository:
        if self._use_pg:
            return self._pg_finding_cls(
                with_seed=False, user_id=user_id, persistence=self._persistence
            )
        return InMemoryFindingRepository(
            with_seed=True, user_id=user_id, persistence=self._persistence
        )

    def _make_improvement_repo(self, user_id: str) -> InMemoryImprovementRepository:
        if self._use_pg:
            return self._pg_improvement_cls(
                with_seed=False, user_id=user_id, persistence=self._persistence
            )
        return InMemoryImprovementRepository(with_seed=False, user_id=user_id)

    def _make_course_repo(self, user_id: str) -> InMemoryCourseRepository:
        if self._use_pg:
            return self._pg_course_cls(
                with_seed=False, user_id=user_id, persistence=self._persistence
            )
        return InMemoryCourseRepository(with_seed=True, user_id=user_id)

    def _make_major_repo(self, user_id: str) -> InMemoryMajorRepository:
        if self._use_pg:
            return self._pg_major_cls(
                with_seed=False, user_id=user_id, persistence=self._persistence
            )
        return InMemoryMajorRepository(with_seed=True, user_id=user_id)

    # ------------------------------------------------------------------
    # 用户级仓储供应
    # ------------------------------------------------------------------

    def provision_user(self, user_id: str) -> PerUserRepositories:
        if user_id not in self._repos:
            if self._use_pg:
                # PG 模式：每个用户独立仓储实例，懒加载从 DB 读取
                self._repos[user_id] = PerUserRepositories(
                    resources=self._make_resource_repo(user_id),
                    candidates=self._make_candidate_repo(user_id),
                    findings=self._make_finding_repo(user_id),
                    improvements=self._make_improvement_repo(user_id),
                    rag=InMemoryRAGRepository(),
                    courses=self._make_course_repo(user_id),
                    majors=self._make_major_repo(user_id),
                )
            else:
                # JSON 模式：从模板克隆
                self._repos[user_id] = PerUserRepositories(
                    resources=self._template.resources.clone_for_user(user_id),
                    candidates=self._template.candidates.clone_for_user(user_id),
                    findings=self._template.findings.clone_for_user(user_id),
                    improvements=self._template.improvements.clone_for_user(user_id),
                    rag=self._template.rag.clone(),
                    courses=self._template.courses.clone_for_user(user_id),
                    majors=self._template.majors.clone_for_user(user_id),
                )
        return self._repos[user_id]

    def get(self, user_id: str) -> PerUserRepositories:
        return self.provision_user(user_id)
