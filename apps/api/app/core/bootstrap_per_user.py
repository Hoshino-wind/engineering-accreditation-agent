"""按用户懒装载 + 克隆 seed 的业务仓储管理器。MVP 用内存字典，正式版用数据库外键替代。"""
from dataclasses import dataclass

from app.modules.diagnostics.infra.memory_store import InMemoryFindingRepository
from app.modules.llm.infra.rag_inmemory import InMemoryRAGRepository
from app.modules.recognition.infra.memory_store import InMemoryCandidateRepository
from app.modules.resources.infra.memory_store import InMemoryResourceRepository


@dataclass
class PerUserRepositories:
    resources: InMemoryResourceRepository
    candidates: InMemoryCandidateRepository
    findings: InMemoryFindingRepository
    rag: InMemoryRAGRepository


class PerUserRepositoryManager:
    def __init__(self) -> None:
        self._repos: dict[str, PerUserRepositories] = {}
        self._template = PerUserRepositories(
            resources=InMemoryResourceRepository(with_seed=True),
            candidates=InMemoryCandidateRepository(with_seed=True),
            findings=InMemoryFindingRepository(with_seed=True),
            rag=InMemoryRAGRepository(),
        )

    def provision_user(self, user_id: str) -> PerUserRepositories:
        if user_id not in self._repos:
            self._repos[user_id] = PerUserRepositories(
                resources=self._template.resources.clone(),
                candidates=self._template.candidates.clone(),
                findings=self._template.findings.clone(),
                rag=self._template.rag.clone(),
            )
        return self._repos[user_id]

    def get(self, user_id: str) -> PerUserRepositories:
        return self.provision_user(user_id)
