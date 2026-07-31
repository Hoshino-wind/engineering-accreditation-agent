from collections.abc import Sequence

from app.modules.materials.application.material_use_cases import ProcessMaterial
from app.modules.materials.application.ports import MaterialRepository, ObjectStore
from app.modules.materials.domain import MaterialRecord


class ListMaterials:
    def __init__(self, repository: MaterialRepository) -> None:
        self._repository = repository

    async def run(self) -> Sequence[MaterialRecord]:
        return await self._repository.list()


class GetMaterial:
    def __init__(self, repository: MaterialRepository) -> None:
        self._repository = repository

    async def run(self, material_id: str) -> MaterialRecord | None:
        return await self._repository.get(material_id)


class RetryMaterial:
    def __init__(
        self,
        repository: MaterialRepository,
        object_store: ObjectStore,
        processor: ProcessMaterial,
    ) -> None:
        self._repository = repository
        self._object_store = object_store
        self._processor = processor

    async def run(self, material_id: str) -> MaterialRecord | None:
        material = await self._repository.get(material_id)
        if material is None:
            return None
        if material.object_path is None:
            raise ValueError("原始文件未通过安全扫描，无法重试；请重新上传")
        content = await self._object_store.read(material.object_path)
        await self._processor.run(material_id, content)
        return await self._repository.get(material_id)
