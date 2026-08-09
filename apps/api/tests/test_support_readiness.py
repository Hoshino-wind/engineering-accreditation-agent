import asyncio

from app.modules.resources.application.upload_resource import UploadResource
from app.modules.support.application import GetSupportReadiness


class Repository:
    def __init__(self, items):
        self.items = items

    async def list_all(self, **_kwargs):
        return self.items


class ResourceRepository:
    async def add(self, resource):
        return resource


def test_readiness_blocks_pending_work_and_missing_evidence():
    result = asyncio.run(
        GetSupportReadiness(
            Repository([]), Repository([]), Repository([]), Repository([]), None
        ).execute()
    )
    assert result.ready is False
    assert result.checks[0].code == "materials"
    assert result.checks[0].passed is False


def test_readiness_passes_when_material_has_evidence_and_no_work_is_pending():
    resource = asyncio.run(
        UploadResource(ResourceRepository()).execute(
            file_name="syllabus.pdf",
            file_size_bytes=18,
            content_hash="b" * 64,
        )
    )
    result = asyncio.run(
        GetSupportReadiness(
            Repository([resource]),
            Repository([]),
            Repository([]),
            Repository([]),
            None,
        ).execute()
    )

    assert result.ready is True
    assert result.evidence_count == 1
