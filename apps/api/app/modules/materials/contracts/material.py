from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

from app.modules.materials.domain import MaterialRecord

MaterialStatusValue = Literal[
    "uploaded",
    "scanning",
    "processing",
    "ready",
    "failed",
    "quarantined",
]
StageStatusValue = Literal["finish", "process", "wait", "error"]


class ProcessingStageResponse(BaseModel):
    label: str
    detail: str
    status: StageStatusValue


class EvidenceFragmentResponse(BaseModel):
    id: str
    coordinate: str
    type: Literal["段落", "表格", "扫描页"]
    preview: str
    hash: str


class MaterialResponse(BaseModel):
    id: str
    name: str
    file_name: str
    course: str
    resource_type: str
    format: str
    media_type: str
    size_bytes: int = Field(ge=0)
    hash: str
    status: MaterialStatusValue
    sensitivity: Literal["internal", "restricted"]
    owner: str
    version: str
    version_id: str
    source_coverage: int = Field(ge=0, le=100)
    page_count: int | None
    failure_reason: str | None
    next_action: str
    created_at: datetime
    updated_at: datetime
    processing_stages: list[ProcessingStageResponse]
    evidence_fragments: list[EvidenceFragmentResponse]

    @classmethod
    def from_record(cls, record: MaterialRecord) -> "MaterialResponse":
        next_action = {
            "uploaded": "等待本地扫描",
            "scanning": "正在执行对象与病毒扫描",
            "processing": "正在解析并生成证据片段",
            "ready": "可进入 M4 智能识别",
            "failed": "检查失败原因后重试",
            "quarantined": "确认安全风险后重新上传",
        }[record.status.value]
        return cls(
            id=record.id,
            name=record.display_name,
            file_name=record.file_name,
            course=record.course,
            resource_type=record.resource_type,
            format=record.extension.upper(),
            media_type=record.media_type,
            size_bytes=record.size_bytes,
            hash=f"SHA256 {record.sha256}",
            status=record.status.value,
            sensitivity=record.sensitivity,
            owner=record.owner,
            version=record.version,
            version_id=f"material-version:{record.id}:{record.version}",
            source_coverage=record.source_coverage,
            page_count=record.page_count,
            failure_reason=record.failure_reason,
            next_action=next_action,
            created_at=record.created_at,
            updated_at=record.updated_at,
            processing_stages=[
                ProcessingStageResponse(
                    label=stage.label,
                    detail=stage.detail,
                    status=stage.status.value,
                )
                for stage in record.stages
            ],
            evidence_fragments=[
                EvidenceFragmentResponse(
                    id=fragment.id,
                    coordinate=fragment.coordinate,
                    type=fragment.kind,
                    preview=fragment.preview,
                    hash=fragment.sha256,
                )
                for fragment in record.fragments
            ],
        )


class MaterialListResponse(BaseModel):
    items: list[MaterialResponse]
    total: int = Field(ge=0)
