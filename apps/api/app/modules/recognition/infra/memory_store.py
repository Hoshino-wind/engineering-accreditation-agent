from dataclasses import replace

from app.core.json_persistence import JsonPersistenceMixin
from app.infrastructure.accreditation_store import AccreditationStore
from app.modules.recognition.domain.candidate import (
    CandidateEvidence,
    CandidateReviewStatus,
    RecognitionCandidate,
    RecognitionCandidateRisk,
    RecognitionCandidateType,
)

# 无预置推断关系
_SEED_CANDIDATES: list[RecognitionCandidate] = []


class InMemoryCandidateRepository(JsonPersistenceMixin):
    _repo_name = "candidates"

    def __init__(
        self,
        with_seed: bool = True,
        user_id: str | None = None,
        persistence: AccreditationStore | None = None,
    ) -> None:
        self._user_id = user_id or "template"
        self._persistence = persistence
        if with_seed:
            self._store: dict[str, RecognitionCandidate] = {
                c.id: c for c in _SEED_CANDIDATES
            }
        else:
            self._store = {}
        self._load()

    def clone(self) -> "InMemoryCandidateRepository":
        new_repo = InMemoryCandidateRepository(
            with_seed=False, user_id=self._user_id, persistence=self._persistence
        )
        new_repo._store = {
            cid: replace(candidate) for cid, candidate in self._store.items()
        }
        return new_repo

    def clone_for_user(self, user_id: str) -> "InMemoryCandidateRepository":
        new_repo = InMemoryCandidateRepository(
            with_seed=False, user_id=user_id, persistence=self._persistence
        )
        if not new_repo._store:
            new_repo._store = {
                cid: replace(candidate) for cid, candidate in self._store.items()
            }
        return new_repo

    def _from_dict(self, data: dict) -> RecognitionCandidate | None:
        try:
            kwargs = dict(data)
            kwargs["candidate_type"] = RecognitionCandidateType(kwargs["candidate_type"])
            kwargs["risk"] = RecognitionCandidateRisk(kwargs["risk"])
            kwargs["review_status"] = CandidateReviewStatus(kwargs["review_status"])
            kwargs["evidence"] = tuple(
                CandidateEvidence(**e) for e in kwargs.get("evidence", [])
            )
            return RecognitionCandidate(**kwargs)
        except (TypeError, KeyError, ValueError):
            return None

    async def list_all(
        self,
        *,
        course: str | None = None,
        risk: str | None = None,
        candidate_type: str | None = None,
        review_status: str | None = None,
        major_id: str | None = None,
    ) -> list[RecognitionCandidate]:
        results = list(self._store.values())
        if course:
            results = [c for c in results if c.course == course]
        if risk:
            results = [c for c in results if c.risk == risk]
        if candidate_type:
            results = [c for c in results if c.candidate_type == candidate_type]
        if review_status:
            results = [c for c in results if c.review_status == review_status]
        if major_id is not None:
            results = [c for c in results if c.major_id == major_id]
        return results

    async def get_by_id(self, candidate_id: str) -> RecognitionCandidate | None:
        return self._store.get(candidate_id)

    async def add(self, candidate: RecognitionCandidate) -> RecognitionCandidate:
        self._store[candidate.id] = candidate
        self._schedule_save()
        await self._record(candidate, "candidate.created")
        return candidate

    async def add_many(self, candidates: list[RecognitionCandidate]) -> list[RecognitionCandidate]:
        for c in candidates:
            self._store[c.id] = c
        self._schedule_save()
        for candidate in candidates:
            await self._record(candidate, "candidate.created")
        return candidates

    async def update_review_status(
        self,
        candidate_id: str,
        status: CandidateReviewStatus,
    ) -> RecognitionCandidate | None:
        existing = self._store.get(candidate_id)
        if existing is None:
            return None
        updated = replace(existing, review_status=status)
        self._store[candidate_id] = updated
        self._schedule_save()
        await self._record(updated, "candidate.reviewed")
        return updated

    async def _record(self, candidate: RecognitionCandidate, action: str) -> None:
        if self._persistence is None:
            return
        await self._persistence.snapshot(
            tenant_id=self._user_id,
            entity_type="recognition-candidate",
            entity=candidate,
            version=candidate.processor_version,
        )
        for evidence in candidate.evidence:
            await self._persistence.evidence(
                tenant_id=self._user_id,
                evidence_id=evidence.id,
                subject_type="recognition-candidate",
                subject_id=candidate.id,
                source_name=evidence.resource_name,
                source_version=evidence.resource_version,
                coordinate=evidence.coordinate,
                fragment_type="candidate-evidence",
                excerpt=evidence.excerpt,
                content_hash=evidence.hash,
            )
        await self._persistence.audit(
            tenant_id=self._user_id,
            actor_id=self._user_id,
            action=action,
            entity_type="recognition-candidate",
            entity_id=candidate.id,
            detail={"review_status": candidate.review_status.value},
        )

    async def delete_by_course(self, course_name: str) -> int:
        """按 course 字段删除所有关联候选（支持删除课程时联动清理）。"""
        target = (course_name or "").strip()
        target_norm = target.lower()
        if not target_norm:
            return 0

        to_delete: list[str] = []
        for cid, c in self._store.items():
            c_name = (c.course or "").strip()
            if not c_name:
                continue
            if c_name == target:
                to_delete.append(cid)
                continue
            # 包含匹配：候选 course="电子电路" 或 "电子电路2" 都应命中删除课程「电子电路」
            if target_norm in c_name.lower():
                to_delete.append(cid)
                continue

        if not to_delete:
            return 0
        for cid in to_delete:
            self._store.pop(cid, None)
        self._schedule_save()
        return len(to_delete)

    async def delete_by_source_nodes(self, source_node_ids: set[str]) -> int:
        """按图谱节点 id 集合删除候选——删除图谱节点后，其对应的关系候选也应失效。"""
        if not source_node_ids:
            return 0
        to_delete: list[str] = []
        for cid, c in self._store.items():
            if (c.source_node or "") in source_node_ids:
                to_delete.append(cid)
        if not to_delete:
            return 0
        for cid in to_delete:
            self._store.pop(cid, None)
        self._schedule_save()
        return len(to_delete)


    async def delete_by_evidence_resource(self, resource_name: str) -> int:
        """删除证据引用指定材料名的识别候选（删除材料时联动清理）。"""
        target = (resource_name or "").strip()
        if not target:
            return 0
        to_delete = [
            cid
            for cid, c in self._store.items()
            if any(
                ev.resource_name == target and not ev.resource_id
                for ev in c.evidence
            )
        ]
        if not to_delete:
            return 0
        for cid in to_delete:
            self._store.pop(cid, None)
        self._schedule_save()
        return len(to_delete)

    async def delete_by_major(self, major_id: str) -> int:
        target = (major_id or "").strip()
        if not target:
            return 0
        to_delete = [
            cid for cid, candidate in self._store.items()
            if candidate.major_id == target
        ]
        for cid in to_delete:
            self._store.pop(cid, None)
        if to_delete:
            self._schedule_save()
        return len(to_delete)

    async def delete_by_evidence_resource_id(self, resource_id: str) -> int:
        """按稳定资源 ID 删除候选，避免同名不同版本互相误删。"""
        target = (resource_id or "").strip()
        if not target:
            return 0
        to_delete = [
            cid
            for cid, candidate in self._store.items()
            if any(evidence.resource_id == target for evidence in candidate.evidence)
        ]
        for cid in to_delete:
            self._store.pop(cid, None)
        if to_delete:
            self._schedule_save()
        return len(to_delete)
