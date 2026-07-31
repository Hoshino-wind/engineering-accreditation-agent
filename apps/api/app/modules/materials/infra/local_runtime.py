import asyncio
import hashlib
import os
from datetime import UTC, datetime
from pathlib import Path
from uuid import uuid4


class SystemClock:
    def now(self) -> datetime:
        return datetime.now(UTC)


class UuidGenerator:
    def next(self) -> str:
        return f"material-{uuid4()}"


class Sha256Digest:
    def digest(self, content: bytes) -> str:
        return calculate_sha256(content)


def calculate_sha256(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


class LocalObjectStore:
    def __init__(self, root: Path) -> None:
        self._root = root.resolve()
        self._root.mkdir(parents=True, exist_ok=True)

    async def put(self, content: bytes, file_name: str, sha256: str) -> str:
        suffix = Path(file_name).suffix.lower()
        destination = self._root / sha256[:2] / sha256 / f"original{suffix}"
        await asyncio.to_thread(self._write_atomic, destination, content)
        return str(destination)

    @staticmethod
    def _write_atomic(destination: Path, content: bytes) -> None:
        destination.parent.mkdir(parents=True, exist_ok=True)
        temporary = destination.with_suffix(f"{destination.suffix}.tmp-{uuid4()}")
        try:
            temporary.write_bytes(content)
            os.replace(temporary, destination)
        finally:
            temporary.unlink(missing_ok=True)

    async def read(self, object_path: str) -> bytes:
        path = Path(object_path).resolve()
        if not path.is_relative_to(self._root):
            raise ValueError("对象路径超出本地存储目录")
        return await asyncio.to_thread(path.read_bytes)
