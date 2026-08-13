from dataclasses import replace
from typing import Any, Protocol

from app.modules.recognition.application.ports import CandidateRepository
from app.modules.recognition.domain.candidate import RecognitionCandidate


class ResourceReader(Protocol):
    async def list_all(
        self,
        *,
        course: str | None = None,
        status: str | None = None,
        resource_type: str | None = None,
        major_id: str | None = None,
    ) -> list[Any]: ...


class ListCandidates:
    def __init__(
        self,
        repository: CandidateRepository,
        active_major_id: str | None = None,
        resources: ResourceReader | None = None,
    ) -> None:
        self._repository = repository
        self._active_major_id = active_major_id
        self._resources = resources

    async def _course_by_resource_id(self, major_id: str | None) -> dict[str, str]:
        if self._resources is None:
            return {}
        resources = await self._resources.list_all(major_id=major_id)
        return {
            str(resource.id): str(resource.course or "")
            for resource in resources
            if getattr(resource, "id", None)
        }

    @staticmethod
    def _reconcile_course(
        candidate: RecognitionCandidate,
        course_by_resource_id: dict[str, str],
    ) -> RecognitionCandidate:
        for evidence in candidate.evidence:
            resource_id = str(evidence.resource_id or "")
            material_course = course_by_resource_id.get(resource_id)
            if material_course and material_course != candidate.course:
                return replace(candidate, course=material_course)
        return candidate

    async def execute(
        self,
        *,
        course: str | None = None,
        risk: str | None = None,
        candidate_type: str | None = None,
        review_status: str | None = None,
        major_id: str | None = None,
    ) -> list[RecognitionCandidate]:
        effective_major_id = (
            major_id if major_id is not None else self._active_major_id
        )
        candidates = await self._repository.list_all(
            course=None,
            risk=risk,
            candidate_type=candidate_type,
            review_status=review_status,
            major_id=effective_major_id,
        )
        course_by_resource_id = await self._course_by_resource_id(effective_major_id)
        candidates = [
            self._reconcile_course(candidate, course_by_resource_id)
            for candidate in candidates
        ]
        if course:
            candidates = [candidate for candidate in candidates if candidate.course == course]
        return candidates
