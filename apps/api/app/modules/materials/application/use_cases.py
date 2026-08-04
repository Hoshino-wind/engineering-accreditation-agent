import json
from dataclasses import dataclass

from app.modules.academic.application.ports import AcademicCatalogRepository
from app.modules.llm.application.ports import LLMClientPort
from app.modules.materials.application.material_parser import (
    ParsedNode,
    get_ocr_runtime_status,
    merge_llm_parse_result,
    parse_material_to_candidates,
)
from app.modules.materials.application.ports import CandidateWriter, MaterialStore
from app.modules.materials.domain import MaterialVersionRecord, UploadedMaterialRecord
from app.modules.recognition.domain.candidate import RecognitionCandidate


class ListUploadedMaterials:
    def __init__(self, store: MaterialStore, user_id: str) -> None:
        self._store = store
        self._user_id = user_id

    async def execute(self) -> list[UploadedMaterialRecord]:
        return self._store.list_by_user(self._user_id)


class ListMaterialVersions:
    def __init__(self, store: MaterialStore, user_id: str) -> None:
        self._store = store
        self._user_id = user_id

    async def execute(self, material_id: str) -> list[MaterialVersionRecord]:
        if self._store.get(self._user_id, material_id) is None:
            return []
        return self._store.list_versions(self._user_id, material_id)


class GetOcrRuntimeStatus:
    async def execute(self) -> dict:
        return get_ocr_runtime_status()


class UploadMaterial:
    def __init__(
        self,
        store: MaterialStore,
        *,
        user_id: str,
        uploaded_by: str,
    ) -> None:
        self._store = store
        self._user_id = user_id
        self._uploaded_by = uploaded_by

    async def execute(
        self,
        *,
        file_name: str,
        category: str,
        content_base64: str,
        content_type: str,
        course: str | None,
    ) -> UploadedMaterialRecord:
        return self._store.create_from_base64(
            user_id=self._user_id,
            uploaded_by=self._uploaded_by,
            file_name=file_name,
            category=category,
            content_base64=content_base64,
            content_type=content_type,
            course=course,
        )


class GetMaterialFile:
    def __init__(self, store: MaterialStore, user_id: str) -> None:
        self._store = store
        self._user_id = user_id

    async def execute(self, material_id: str) -> UploadedMaterialRecord | None:
        return self._store.get(self._user_id, material_id)


@dataclass(frozen=True, slots=True)
class ParseMaterialResult:
    material: UploadedMaterialRecord
    nodes: list[ParsedNode]
    candidates: list[RecognitionCandidate]
    structured_artifact: dict


class ParseMaterial:
    def __init__(
        self,
        store: MaterialStore,
        candidates: CandidateWriter,
        user_id: str,
        catalog: AcademicCatalogRepository | None = None,
        llm: LLMClientPort | None = None,
    ) -> None:
        self._store = store
        self._candidates = candidates
        self._user_id = user_id
        self._catalog = catalog
        self._llm = llm

    async def execute(self, material_id: str) -> ParseMaterialResult | None:
        record = self._store.get(self._user_id, material_id)
        if record is None:
            return None

        try:
            catalog = await self._catalog.get_catalog() if self._catalog else None
            parsed = parse_material_to_candidates(record, catalog)
            if self._llm is not None:
                parsed = await self._augment_with_llm(record, parsed, catalog)
            candidates = await self._candidates.add_many(parsed.candidates)
            updated = self._store.mark_parsed(
                user_id=self._user_id,
                material_id=material_id,
                extracted_text=parsed.text,
                extracted_node_count=len(parsed.nodes),
                candidates_created=len(candidates),
                parser_version=parsed.parser_version,
                parse_strategy=parsed.parse_strategy,
                parsed_artifact_json=json.dumps(
                    parsed.structured_artifact,
                    ensure_ascii=False,
                ),
            )
            if updated is None:
                return None
            return ParseMaterialResult(
                material=updated,
                nodes=parsed.nodes,
                candidates=candidates,
                structured_artifact=parsed.structured_artifact,
            )
        except Exception as exc:
            self._store.mark_failed(
                user_id=self._user_id,
                material_id=material_id,
                failure_reason=str(exc),
            )
            raise

    async def _augment_with_llm(
        self,
        record: UploadedMaterialRecord,
        parsed,
        catalog,
    ):
        try:
            extraction = await self._llm.extract_nodes(
                parsed.text,
                record.category,
                record.file_name,
            )
            school_nodes = [
                {
                    "id": item.code,
                    "code": item.code,
                    "name": item.name,
                    "kind": item.kind,
                    "description": item.description,
                }
                for item in extraction.data
            ]
            standard_nodes = [
                {
                    "id": indicator.id,
                    "code": indicator.code,
                    "name": indicator.title,
                    "description": indicator.description,
                }
                for indicator in (catalog.indicators if catalog else [])
            ]
            relations = (
                await self._llm.infer_relations(school_nodes, standard_nodes)
                if standard_nodes
                else None
            )
            return merge_llm_parse_result(
                record=record,
                base=parsed,
                catalog=catalog,
                extracted_items=extraction.data,
                relation_items=relations.data if relations is not None else [],
                llm_model=extraction.model,
            )
        except Exception as exc:  # noqa: BLE001
            parsed.structured_artifact.setdefault("parser", {})["llm"] = {
                "error": str(exc),
                "fallback": "rules+catalog",
            }
            return parsed
