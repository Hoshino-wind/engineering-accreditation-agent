from typing import Protocol

from app.modules.materials.domain import MaterialVersionRecord, UploadedMaterialRecord
from app.modules.recognition.domain.candidate import RecognitionCandidate


class MaterialStore(Protocol):
    def create_from_base64(
        self,
        *,
        user_id: str,
        uploaded_by: str,
        file_name: str,
        category: str,
        content_base64: str,
        content_type: str,
        course: str | None,
    ) -> UploadedMaterialRecord: ...

    def list_by_user(self, user_id: str) -> list[UploadedMaterialRecord]: ...

    def get(self, user_id: str, material_id: str) -> UploadedMaterialRecord | None: ...

    def list_versions(
        self,
        user_id: str,
        material_id: str,
    ) -> list[MaterialVersionRecord]: ...

    def mark_parsed(
        self,
        *,
        user_id: str,
        material_id: str,
        extracted_text: str,
        extracted_node_count: int,
        candidates_created: int,
        parser_version: str | None = None,
        parse_strategy: str | None = None,
        parsed_artifact_json: str = "{}",
    ) -> UploadedMaterialRecord | None: ...

    def mark_failed(
        self,
        *,
        user_id: str,
        material_id: str,
        failure_reason: str,
    ) -> UploadedMaterialRecord | None: ...


class CandidateWriter(Protocol):
    async def add_many(self, candidates: list[RecognitionCandidate]) -> list[RecognitionCandidate]: ...
