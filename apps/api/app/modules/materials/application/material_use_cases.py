from pathlib import Path

from app.modules.materials.application.ports import (
    Clock,
    DocumentParseError,
    DocumentParser,
    IdGenerator,
    MaterialRepository,
    MaterialSecurityScanner,
    ObjectStore,
    SecurityScanError,
    Sha256,
)
from app.modules.materials.domain import (
    MaterialRecord,
    MaterialStatus,
    ProcessingStage,
    StageStatus,
)


def initial_stages() -> tuple[ProcessingStage, ...]:
    return (
        ProcessingStage("对象扫描", "等待校验文件结构、类型与大小", StageStatus.WAIT),
        ProcessingStage("病毒扫描", "等待本地安全扫描", StageStatus.WAIT),
        ProcessingStage("内容解析", "等待文本提取或 OCR", StageStatus.WAIT),
        ProcessingStage("证据结构化", "等待生成可定位证据片段", StageStatus.WAIT),
    )


class RegisterMaterial:
    def __init__(
        self,
        repository: MaterialRepository,
        clock: Clock,
        id_generator: IdGenerator,
        sha256: Sha256,
    ) -> None:
        self._repository = repository
        self._clock = clock
        self._id_generator = id_generator
        self._sha256 = sha256

    async def run(
        self,
        *,
        file_name: str,
        content: bytes,
        media_type: str,
        course: str,
        resource_type: str,
    ) -> MaterialRecord:
        now = self._clock.now()
        material = MaterialRecord(
            id=self._id_generator.next(),
            file_name=file_name,
            display_name=Path(file_name).stem,
            course=course.strip() or "待分类",
            resource_type=resource_type,
            media_type=media_type,
            extension=Path(file_name).suffix.lower().lstrip("."),
            size_bytes=len(content),
            sha256=self._sha256.digest(content),
            status=MaterialStatus.UPLOADED,
            sensitivity="internal",
            created_at=now,
            updated_at=now,
            owner="当前用户",
            version="v1",
            stages=initial_stages(),
        )
        await self._repository.save(material)
        return material


class ProcessMaterial:
    def __init__(
        self,
        repository: MaterialRepository,
        object_store: ObjectStore,
        scanner: MaterialSecurityScanner,
        parser: DocumentParser,
        clock: Clock,
    ) -> None:
        self._repository = repository
        self._object_store = object_store
        self._scanner = scanner
        self._parser = parser
        self._clock = clock

    async def run(self, material_id: str, content: bytes) -> None:
        material = await self._repository.get(material_id)
        if material is None:
            return
        await self._save_status(
            material,
            MaterialStatus.SCANNING,
            self._stages(0, "正在校验文件结构、类型与大小"),
        )
        try:
            scan_detail = await self._scanner.scan(
                content, material.file_name, material.media_type
            )
            object_path = await self._object_store.put(
                content, material.file_name, material.sha256
            )
            processing = material.evolve(
                status=MaterialStatus.PROCESSING,
                object_path=object_path,
                stages=self._stages(2, scan_detail),
                updated_at=self._clock.now(),
                failure_reason=None,
            )
            await self._repository.save(processing)
            result = await self._parser.parse(
                content=content,
                file_name=material.file_name,
                media_type=material.media_type,
            )
            ready = processing.evolve(
                status=MaterialStatus.READY,
                stages=(
                    ProcessingStage("对象扫描", "文件结构与类型校验通过", StageStatus.FINISH),
                    ProcessingStage("病毒扫描", scan_detail, StageStatus.FINISH),
                    ProcessingStage("内容解析", result.parser_detail, StageStatus.FINISH),
                    ProcessingStage(
                        "证据结构化",
                        f"已生成 {len(result.fragments)} 个可定位片段",
                        StageStatus.FINISH,
                    ),
                ),
                fragments=result.fragments,
                source_coverage=100 if result.fragments else 0,
                page_count=result.page_count,
                updated_at=self._clock.now(),
            )
            await self._repository.save(ready)
        except SecurityScanError as error:
            await self._fail(
                material,
                str(error),
                (
                    MaterialStatus.QUARANTINED
                    if error.quarantined
                    else MaterialStatus.FAILED
                ),
                1 if error.quarantined else 0,
            )
        except (DocumentParseError, OSError, ValueError) as error:
            current = await self._repository.get(material.id) or material
            await self._fail(current, str(error), MaterialStatus.FAILED, 2)

    async def _save_status(
        self,
        material: MaterialRecord,
        status: MaterialStatus,
        stages: tuple[ProcessingStage, ...],
    ) -> None:
        await self._repository.save(
            material.evolve(status=status, stages=stages, updated_at=self._clock.now())
        )

    async def _fail(
        self,
        material: MaterialRecord,
        reason: str,
        status: MaterialStatus,
        stage_index: int,
    ) -> None:
        stages = list(material.stages)
        for index, stage in enumerate(stages):
            if index < stage_index:
                stages[index] = ProcessingStage(
                    stage.label, stage.detail, StageStatus.FINISH
                )
            elif index == stage_index:
                stages[index] = ProcessingStage(stage.label, reason, StageStatus.ERROR)
            else:
                stages[index] = ProcessingStage(
                    stage.label, "前置步骤失败，尚未执行", StageStatus.WAIT
                )
        await self._repository.save(
            material.evolve(
                status=status,
                failure_reason=reason,
                stages=tuple(stages),
                updated_at=self._clock.now(),
            )
        )

    @staticmethod
    def _stages(
        active_index: int, detail: str
    ) -> tuple[ProcessingStage, ...]:
        labels = ("对象扫描", "病毒扫描", "内容解析", "证据结构化")
        return tuple(
            ProcessingStage(
                label,
                (
                    detail
                    if index == active_index
                    else "已完成"
                    if index < active_index
                    else "等待前置步骤"
                ),
                (
                    StageStatus.PROCESS
                    if index == active_index
                    else StageStatus.FINISH
                    if index < active_index
                    else StageStatus.WAIT
                ),
            )
            for index, label in enumerate(labels)
        )
