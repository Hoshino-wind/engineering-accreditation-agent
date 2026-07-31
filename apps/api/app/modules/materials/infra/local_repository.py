import asyncio
import json
import sqlite3
from collections.abc import Sequence
from datetime import datetime
from pathlib import Path
from typing import Any

from app.modules.materials.domain import (
    EvidenceFragment,
    MaterialRecord,
    MaterialStatus,
    ProcessingStage,
    StageStatus,
)


class SqliteMaterialRepository:
    def __init__(self, database_path: Path) -> None:
        self._database_path = database_path
        database_path.parent.mkdir(parents=True, exist_ok=True)
        self._initialize()

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self._database_path, timeout=10)
        connection.row_factory = sqlite3.Row
        return connection

    def _initialize(self) -> None:
        with self._connect() as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS materials (
                    id TEXT PRIMARY KEY,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    status TEXT NOT NULL,
                    payload TEXT NOT NULL
                )
                """
            )
            connection.execute(
                "CREATE INDEX IF NOT EXISTS materials_updated_at "
                "ON materials(updated_at DESC)"
            )

    async def save(self, material: MaterialRecord) -> None:
        await asyncio.to_thread(self._save_sync, material)

    def _save_sync(self, material: MaterialRecord) -> None:
        payload = json.dumps(self._to_dict(material), ensure_ascii=False)
        with self._connect() as connection:
            connection.execute(
                """
                INSERT INTO materials(id, created_at, updated_at, status, payload)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    updated_at = excluded.updated_at,
                    status = excluded.status,
                    payload = excluded.payload
                """,
                (
                    material.id,
                    material.created_at.isoformat(),
                    material.updated_at.isoformat(),
                    material.status,
                    payload,
                ),
            )

    async def get(self, material_id: str) -> MaterialRecord | None:
        return await asyncio.to_thread(self._get_sync, material_id)

    def _get_sync(self, material_id: str) -> MaterialRecord | None:
        with self._connect() as connection:
            row = connection.execute(
                "SELECT payload FROM materials WHERE id = ?", (material_id,)
            ).fetchone()
        return None if row is None else self._from_dict(json.loads(row["payload"]))

    async def list(self) -> Sequence[MaterialRecord]:
        return await asyncio.to_thread(self._list_sync)

    def _list_sync(self) -> Sequence[MaterialRecord]:
        with self._connect() as connection:
            rows = connection.execute(
                "SELECT payload FROM materials ORDER BY updated_at DESC"
            ).fetchall()
        return [self._from_dict(json.loads(row["payload"])) for row in rows]

    @staticmethod
    def _to_dict(material: MaterialRecord) -> dict[str, Any]:
        return {
            **material.__dict__,
            "status": material.status.value,
            "created_at": material.created_at.isoformat(),
            "updated_at": material.updated_at.isoformat(),
            "stages": [
                {**stage.__dict__, "status": stage.status.value}
                for stage in material.stages
            ],
            "fragments": [fragment.__dict__ for fragment in material.fragments],
        }

    @staticmethod
    def _from_dict(payload: dict[str, Any]) -> MaterialRecord:
        payload["status"] = MaterialStatus(payload["status"])
        payload["created_at"] = datetime.fromisoformat(payload["created_at"])
        payload["updated_at"] = datetime.fromisoformat(payload["updated_at"])
        payload["stages"] = tuple(
            ProcessingStage(
                label=item["label"],
                detail=item["detail"],
                status=StageStatus(item["status"]),
            )
            for item in payload["stages"]
        )
        payload["fragments"] = tuple(
            EvidenceFragment(**item) for item in payload["fragments"]
        )
        return MaterialRecord(**payload)
