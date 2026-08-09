"""上传教学资源用例。"""

import hashlib
import uuid
from datetime import UTC, datetime

from app.modules.resources.application.ports import (
    ObjectStoragePort,
    ResourceRepository,
    resource_object_key,
)
from app.modules.resources.domain.resource import (
    EvidenceFragment,
    ProcessingStage,
    TeachingResource,
    TeachingResourceSensitivity,
    TeachingResourceStatus,
    TeachingResourceType,
)

# 文件扩展名 → 材料类型映射
_EXT_TYPE_MAP: dict[str, TeachingResourceType] = {
    "pdf": TeachingResourceType.SYLLABUS,
    "docx": TeachingResourceType.LAB_GUIDE,
    "xlsx": TeachingResourceType.RUBRIC,
}

# 分类字符串 → 材料类型
_CATEGORY_TYPE_MAP: dict[str, TeachingResourceType] = {
    "培养方案": TeachingResourceType.SYLLABUS,
    "课程大纲": TeachingResourceType.SYLLABUS,
    "实验指导书": TeachingResourceType.LAB_GUIDE,
    "实验项目清单": TeachingResourceType.PROJECT_LIST,
    "评分表": TeachingResourceType.RUBRIC,
    "学生报告": TeachingResourceType.STUDENT_REPORT,
    "评价结果": TeachingResourceType.EVALUATION_RESULT,
    "试卷": TeachingResourceType.EVALUATION_RESULT,
}


class UploadResource:
    def __init__(
        self,
        repository: ResourceRepository,
        object_storage: ObjectStoragePort | None = None,
        owner: str = "current-user",
    ) -> None:
        self._repository = repository
        self._object_storage = object_storage
        self._owner = owner

    async def execute(
        self,
        *,
        file_name: str,
        file_size_bytes: int,
        course: str = "未分类",
        category: str = "其他",
        owner: str = "当前用户",
        content_hash: str | None = None,
        content: bytes | None = None,
        content_type: str | None = None,
    ) -> TeachingResource:
        ext = file_name.rsplit(".", 1)[-1].lower() if "." in file_name else "pdf"
        fmt = ext.upper()
        resource_type = _CATEGORY_TYPE_MAP.get(
            category,
            _EXT_TYPE_MAP.get(ext, TeachingResourceType.SYLLABUS),
        )

        # 格式化文件大小
        if file_size_bytes >= 1024 * 1024:
            size_str = f"{file_size_bytes / (1024 * 1024):.1f} MB"
        elif file_size_bytes >= 1024:
            size_str = f"{file_size_bytes / 1024:.0f} KB"
        else:
            size_str = f"{file_size_bytes} B"

        resource_id = f"resource-{uuid.uuid4().hex[:12]}"
        now_str = datetime.now(UTC).strftime("%Y-%m-%d %H:%M")
        fake_hash = content_hash or hashlib.sha256(f"{resource_id}{file_name}".encode()).hexdigest()
        object_key: str | None = None
        if self._object_storage is not None:
            if content is None:
                raise ValueError("content is required when object storage is enabled")
            object_key = resource_object_key(self._owner, resource_id, file_name)
            await self._object_storage.put(
                key=object_key,
                content=content,
                content_type=content_type,
            )

        resource = TeachingResource(
            id=resource_id,
            name=file_name.rsplit(".", 1)[0] if "." in file_name else file_name,
            file_name=file_name,
            course=course,
            resource_type=resource_type,
            version="v1",
            format=fmt,
            status=TeachingResourceStatus.PROCESSING,
            size=size_str,
            sensitivity=TeachingResourceSensitivity.INTERNAL,
            updated_at=now_str,
            owner=owner,
            hash=f"SHA256 {fake_hash}",
            next_action="等待内容解析",
            source_coverage=0,
            object_key=object_key,
            evidence_fragments=(
                EvidenceFragment(
                    id=f"evidence-file-{resource_id}",
                    coordinate="file",
                    type="source-file",
                    preview=file_name,
                    hash=fake_hash,
                ),
            ),
            processing_stages=(
                ProcessingStage(label="安全校验", detail="文件已接收，校验中", status="process"),
                ProcessingStage(label="内容解析", detail="等待安全校验完成", status="wait"),
                ProcessingStage(label="敏感检测", detail="等待内容解析完成", status="wait"),
                ProcessingStage(label="分类确认", detail="等待处理完成", status="wait"),
            ),
        )
        return await self._repository.add(resource)
