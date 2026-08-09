import asyncio

from app.modules.resources.application.upload_resource import UploadResource
from app.modules.resources.domain.resource import TeachingResource


class CapturingResourceRepository:
    def __init__(self) -> None:
        self.resource: TeachingResource | None = None

    async def add(self, resource: TeachingResource) -> TeachingResource:
        self.resource = resource
        return resource


class CapturingObjectStorage:
    def __init__(self) -> None:
        self.calls: list[tuple[str, bytes, str | None]] = []

    async def put(self, *, key: str, content: bytes, content_type: str | None) -> None:
        self.calls.append((key, content, content_type))


def test_upload_creates_file_evidence_from_content_hash() -> None:
    repository = CapturingResourceRepository()
    resource = asyncio.run(
        UploadResource(repository).execute(
            file_name="syllabus.pdf",
            file_size_bytes=18,
            content_hash="a" * 64,
        )
    )

    assert resource.hash == f"SHA256 {'a' * 64}"
    assert len(resource.evidence_fragments) == 1
    fragment = resource.evidence_fragments[0]
    assert fragment.coordinate == "file"
    assert fragment.type == "source-file"
    assert fragment.hash == "a" * 64


def test_upload_stores_original_bytes_in_tenant_scoped_object_key() -> None:
    storage = CapturingObjectStorage()
    resource = asyncio.run(
        UploadResource(
            CapturingResourceRepository(),
            object_storage=storage,
            owner="user-42",
        ).execute(
            file_name="syllabus.pdf",
            file_size_bytes=3,
            content=b"pdf",
            content_type="application/pdf",
        )
    )

    assert resource.object_key is not None
    assert resource.object_key.startswith("tenants/user-42/resources/")
    assert storage.calls == [(resource.object_key, b"pdf", "application/pdf")]
