from collections.abc import Sequence
from datetime import datetime
from typing import Protocol

from app.modules.materials.domain import EvidenceFragment, MaterialRecord


class MaterialRepository(Protocol):
    async def save(self, material: MaterialRecord) -> None: ...

    async def get(self, material_id: str) -> MaterialRecord | None: ...

    async def list(self) -> Sequence[MaterialRecord]: ...


class ObjectStore(Protocol):
    async def put(self, content: bytes, file_name: str, sha256: str) -> str: ...

    async def read(self, object_path: str) -> bytes: ...


class SecurityScanError(Exception):
    def __init__(self, message: str, *, quarantined: bool = False) -> None:
        super().__init__(message)
        self.quarantined = quarantined


class MaterialSecurityScanner(Protocol):
    async def scan(
        self, content: bytes, file_name: str, media_type: str
    ) -> str: ...


class DocumentParseError(Exception):
    pass


class ParseResult:
    def __init__(
        self,
        *,
        fragments: Sequence[EvidenceFragment],
        page_count: int | None,
        parser_detail: str,
    ) -> None:
        self.fragments = tuple(fragments)
        self.page_count = page_count
        self.parser_detail = parser_detail


class DocumentParser(Protocol):
    async def parse(
        self,
        *,
        content: bytes,
        file_name: str,
        media_type: str,
    ) -> ParseResult: ...


class OcrGateway(Protocol):
    async def recognize(self, image: bytes, media_type: str) -> str: ...


class StructureGateway(Protocol):
    async def structure(
        self, text: str, source_name: str
    ) -> Sequence[EvidenceFragment]: ...


class Clock(Protocol):
    def now(self) -> datetime: ...


class IdGenerator(Protocol):
    def next(self) -> str: ...


class Sha256(Protocol):
    def digest(self, content: bytes) -> str: ...
