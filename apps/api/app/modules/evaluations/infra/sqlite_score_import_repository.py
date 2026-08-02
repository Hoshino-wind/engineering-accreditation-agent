import asyncio
import os
import sqlite3
from pathlib import Path

from app.modules.evaluations.application.score_import_ports import (
    ScoreImportRepositoryConflictError,
    StoredScoreImportBatch,
)
from app.modules.evaluations.domain import ScoreImportBatch
from app.modules.evaluations.infra.score_import_sqlite_codec import (
    ScoreImportRepositorySchemaError,
    validate_base_context,
)
from app.modules.evaluations.infra.score_import_sqlite_reader import (
    load_created_score_import_batch,
    load_score_import_batch,
)
from app.modules.evaluations.infra.score_import_sqlite_schema import (
    initialize_score_import_schema,
)
from app.modules.evaluations.infra.score_import_sqlite_writer import (
    insert_score_import_batch,
)


class SqliteScoreImportRepository:
    def __init__(self, database_path: Path) -> None:
        self._database_path = database_path
        database_path.parent.mkdir(parents=True, exist_ok=True)
        if os.name == "posix":
            database_path.parent.chmod(0o700)
        with self._connect() as connection:
            initialize_score_import_schema(connection)
        if os.name == "posix":
            database_path.chmod(0o600)

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(
            self._database_path,
            timeout=10,
            isolation_level=None,
        )
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        return connection

    async def get_created_batch(
        self,
        *,
        idempotency_key: str,
        request_hash: str,
    ) -> StoredScoreImportBatch | None:
        return await asyncio.to_thread(
            self._get_created_batch_sync,
            idempotency_key,
            request_hash,
        )

    async def create_batch(
        self,
        *,
        idempotency_key: str,
        request_hash: str,
        batch: ScoreImportBatch,
    ) -> StoredScoreImportBatch:
        return await asyncio.to_thread(
            self._create_batch_sync,
            idempotency_key,
            request_hash,
            batch,
        )

    async def get_batch(self, batch_id: str) -> ScoreImportBatch | None:
        return await asyncio.to_thread(self._get_batch_sync, batch_id)

    def _create_batch_sync(
        self,
        idempotency_key: str,
        request_hash: str,
        batch: ScoreImportBatch,
    ) -> StoredScoreImportBatch:
        connection = self._connect()
        try:
            connection.execute("BEGIN IMMEDIATE")
            replay = load_created_score_import_batch(
                connection,
                idempotency_key=idempotency_key,
                request_hash=request_hash,
            )
            if replay is not None:
                connection.commit()
                return replay
            try:
                validate_base_context(connection, batch)
            except ValueError as error:
                raise ScoreImportRepositoryConflictError(str(error)) from error
            if connection.execute(
                "SELECT 1 FROM evaluation_score_import_batches WHERE batch_id = ?",
                (batch.batch_id,),
            ).fetchone():
                raise ScoreImportRepositoryConflictError(
                    f"评分批次 {batch.batch_id} 已存在"
                )
            insert_score_import_batch(
                connection,
                idempotency_key=idempotency_key,
                request_hash=request_hash,
                batch=batch,
            )
            connection.commit()
            return StoredScoreImportBatch(batch=batch, idempotent_replay=False)
        except Exception:
            connection.rollback()
            raise
        finally:
            connection.close()

    def _get_created_batch_sync(
        self,
        idempotency_key: str,
        request_hash: str,
    ) -> StoredScoreImportBatch | None:
        with self._connect() as connection:
            return load_created_score_import_batch(
                connection,
                idempotency_key=idempotency_key,
                request_hash=request_hash,
            )

    def _get_batch_sync(self, batch_id: str) -> ScoreImportBatch | None:
        with self._connect() as connection:
            return load_score_import_batch(connection, batch_id)


__all__ = [
    "ScoreImportRepositorySchemaError",
    "SqliteScoreImportRepository",
]
