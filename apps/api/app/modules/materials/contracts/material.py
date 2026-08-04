from typing import Any

from pydantic import BaseModel, Field

from app.modules.materials.domain import MaterialVersionRecord, UploadedMaterialRecord
from app.modules.recognition.contracts import RecognitionCandidateResponse


class MaterialUploadRequest(BaseModel):
    file_name: str = Field(alias="fileName")
    category: str
    content_base64: str = Field(alias="contentBase64")
    content_type: str = Field(default="application/octet-stream", alias="contentType")
    course: str | None = None


class UploadedMaterialResponse(BaseModel):
    id: str
    fileName: str
    fileType: str
    category: str
    uploadTime: str
    uploadedBy: str
    status: str
    fileSize: str
    fileUrl: str
    course: str | None = None
    extractedNodeCount: int | None = None
    candidatesCreated: int = 0
    failureReason: str | None = None
    parserVersion: str | None = None
    parseStrategy: str | None = None

    @classmethod
    def from_domain(cls, record: UploadedMaterialRecord) -> "UploadedMaterialResponse":
        return cls(
            id=record.id,
            fileName=record.file_name,
            fileType=record.file_type,
            category=record.category,
            uploadTime=record.created_at,
            uploadedBy=record.uploaded_by,
            status=record.status,
            fileSize=_format_size(record.size_bytes),
            fileUrl=f"/api/v1/materials/{record.id}/file",
            course=record.course,
            extractedNodeCount=record.extracted_node_count or None,
            candidatesCreated=record.candidates_created,
            failureReason=record.failure_reason,
            parserVersion=record.parser_version,
            parseStrategy=record.parse_strategy,
        )


class ExtractedNodeResponse(BaseModel):
    id: str
    kind: str
    code: str
    name: str
    description: str
    confidence: float
    sourceExcerpt: str


class MaterialParseResponse(BaseModel):
    material: UploadedMaterialResponse
    extractedNodes: list[ExtractedNodeResponse]
    candidatesCreated: int
    candidates: list[RecognitionCandidateResponse]
    parseArtifacts: dict[str, Any] = Field(default_factory=dict)


class MaterialVersionResponse(BaseModel):
    id: str
    materialId: str
    versionNo: int
    fileName: str
    fileType: str
    fileSize: str
    storageUri: str
    checksum: str
    parserVersion: str | None = None
    parseStrategy: str | None = None
    createdAt: str
    parseArtifacts: dict[str, Any] = Field(default_factory=dict)

    @classmethod
    def from_domain(cls, record: MaterialVersionRecord) -> "MaterialVersionResponse":
        return cls(
            id=record.id,
            materialId=record.material_id,
            versionNo=record.version_no,
            fileName=record.file_name,
            fileType=record.file_type,
            fileSize=_format_size(record.size_bytes),
            storageUri=record.storage_uri,
            checksum=record.checksum,
            parserVersion=record.parser_version,
            parseStrategy=record.parse_strategy,
            createdAt=record.created_at,
            parseArtifacts=_parse_json_object(record.parsed_artifact_json),
        )


class OcrRuntimeStatusResponse(BaseModel):
    available: bool
    status: str
    engine: str
    version: str | None = None
    languages: list[str] = Field(default_factory=list)
    message: str


def _format_size(size_bytes: int) -> str:
    if size_bytes < 1024:
        return f"{size_bytes} B"
    if size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.1f} KB"
    return f"{size_bytes / 1024 / 1024:.1f} MB"


def _parse_json_object(value: str) -> dict[str, Any]:
    if not value:
        return {}
    try:
        import json

        parsed = json.loads(value)
    except Exception:  # noqa: BLE001
        return {}
    return parsed if isinstance(parsed, dict) else {}
