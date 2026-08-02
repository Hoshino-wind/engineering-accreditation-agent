import asyncio
import hashlib
import json
import sqlite3
from collections.abc import Iterable
from dataclasses import asdict
from decimal import Decimal
from pathlib import Path
from typing import Any

from app.modules.evaluations.application import (
    EvaluationRunIdempotencyConflictError,
    StoredEvaluationRun,
)
from app.modules.evaluations.domain import (
    AttainmentCalculation,
    EvaluationObject,
    EvaluationRunReference,
    EvaluationRunSnapshot,
)
from app.modules.evaluations.infra.pilot_seed import (
    PILOT_SCHEMA_VERSION,
    evaluation_calculation_from_payload,
    evaluation_object_from_payload,
    evaluation_run_from_payload,
    load_pilot_evaluation_seed,
)


class EvaluationReadModelConflictError(RuntimeError):
    pass


class EvaluationRunReferenceConflictError(
    EvaluationReadModelConflictError
):
    pass


class EvaluationReadModelSchemaError(RuntimeError):
    pass


def _json_ready(value: object) -> object:
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, dict):
        return {key: _json_ready(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_ready(item) for item in value]
    return value


def _canonical_payload(value: object) -> str:
    return json.dumps(
        _json_ready(value),
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    )


def _payload_hash(payload: str) -> str:
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _calculation_payload(
    calculation: AttainmentCalculation,
) -> dict[str, object]:
    return {
        "blockers": calculation.blockers,
        "contributions": [
            {
                "input_id": contribution.evaluation_input.input_id,
                "value": contribution.value,
            }
            for contribution in calculation.contributions
        ],
        "ready": calculation.ready,
        "result": (
            None
            if calculation.result is None
            else {
                "score": calculation.result.score,
                "outcome": calculation.result.outcome,
            }
        ),
        "weight_total": calculation.weight_total,
    }


class SqliteEvaluationReadRepository:
    def __init__(
        self,
        database_path: Path,
        objects: Iterable[EvaluationObject],
        runs: Iterable[EvaluationRunSnapshot],
    ) -> None:
        self._database_path = database_path
        database_path.parent.mkdir(parents=True, exist_ok=True)
        self._initialize(tuple(objects), tuple(runs))

    async def list_objects(self) -> tuple[EvaluationObject, ...]:
        return await asyncio.to_thread(self._list_objects_sync)

    async def get_object(
        self,
        evaluation_object_id: str,
    ) -> EvaluationObject | None:
        return await asyncio.to_thread(
            self._get_object_sync,
            evaluation_object_id,
        )

    async def get_run(
        self,
        run_id: str,
    ) -> EvaluationRunSnapshot | None:
        return await asyncio.to_thread(self._get_run_sync, run_id)

    async def get_by_run_id(
        self,
        run_id: str,
    ) -> EvaluationRunReference | None:
        return await asyncio.to_thread(self._get_by_run_id_sync, run_id)

    async def get_source_run_id(self, run_id: str) -> str | None:
        return await asyncio.to_thread(
            self._get_source_run_id_sync,
            run_id,
        )

    async def get_created_run(
        self,
        *,
        idempotency_key: str,
        request_hash: str,
    ) -> StoredEvaluationRun | None:
        return await asyncio.to_thread(
            self._get_created_run_sync,
            idempotency_key,
            request_hash,
        )

    async def create_run(
        self,
        *,
        idempotency_key: str,
        request_hash: str,
        source_run_id: str,
        snapshot: EvaluationRunSnapshot,
    ) -> StoredEvaluationRun:
        return await asyncio.to_thread(
            self._create_run_sync,
            idempotency_key,
            request_hash,
            source_run_id,
            snapshot,
        )

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(
            self._database_path,
            timeout=10,
            isolation_level=None,
        )
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        return connection

    def _initialize(
        self,
        objects: tuple[EvaluationObject, ...],
        runs: tuple[EvaluationRunSnapshot, ...],
    ) -> None:
        self._validate_seed(objects, runs)
        connection = self._connect()
        try:
            connection.execute("BEGIN IMMEDIATE")
            self._create_tables(connection)
            self._validate_reference_table(connection)
            self._validate_command_table(connection)
            self._validate_lineage_table(connection)
            self._seed_objects(connection, objects)
            self._seed_runs(connection, runs)
            self._seed_calculations(connection, runs)
            self._seed_references(connection, runs)
            connection.commit()
        except Exception:
            connection.rollback()
            raise
        finally:
            connection.close()

    @staticmethod
    def _validate_seed(
        objects: tuple[EvaluationObject, ...],
        runs: tuple[EvaluationRunSnapshot, ...],
    ) -> None:
        object_ids = {
            item.evaluation_object_id for item in objects
        }
        run_by_id = {item.run.run_id: item.run for item in runs}
        if len(object_ids) != len(objects):
            raise EvaluationReadModelConflictError("评价对象 ID 不得重复")
        if len({item.display_order for item in objects}) != len(objects):
            raise EvaluationReadModelConflictError(
                "评价对象展示顺序不得重复"
            )
        if len(run_by_id) != len(runs):
            raise EvaluationReadModelConflictError("评价运行 ID 不得重复")
        for snapshot in runs:
            run = snapshot.run
            if run.evaluation_object_id not in object_ids:
                raise EvaluationReadModelConflictError(
                    "评价运行引用了不存在的评价对象"
                )
        for evaluation_object in objects:
            presented_run = run_by_id.get(
                evaluation_object.presented_run_id
            )
            if (
                presented_run is None
                or presented_run.evaluation_object_id
                != evaluation_object.evaluation_object_id
            ):
                raise EvaluationReadModelConflictError(
                    "评价对象展示运行不存在或归属不一致"
                )

    @staticmethod
    def _create_tables(connection: sqlite3.Connection) -> None:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS evaluation_run_references (
                run_id TEXT PRIMARY KEY,
                evaluation_object_id TEXT NOT NULL
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS evaluation_object_read_models (
                evaluation_object_id TEXT PRIMARY KEY,
                display_order INTEGER NOT NULL UNIQUE,
                presented_run_id TEXT NOT NULL,
                schema_version INTEGER NOT NULL,
                payload TEXT NOT NULL,
                payload_hash TEXT NOT NULL
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS evaluation_run_read_models (
                run_id TEXT PRIMARY KEY,
                evaluation_object_id TEXT NOT NULL,
                schema_version INTEGER NOT NULL,
                payload TEXT NOT NULL,
                payload_hash TEXT NOT NULL,
                FOREIGN KEY(evaluation_object_id)
                    REFERENCES evaluation_object_read_models(
                        evaluation_object_id
                    )
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS evaluation_run_calculation_snapshots (
                run_id TEXT PRIMARY KEY,
                schema_version INTEGER NOT NULL,
                payload TEXT NOT NULL,
                payload_hash TEXT NOT NULL,
                FOREIGN KEY(run_id)
                    REFERENCES evaluation_run_read_models(run_id)
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS evaluation_run_commands (
                idempotency_key TEXT PRIMARY KEY,
                request_hash TEXT NOT NULL,
                run_id TEXT NOT NULL UNIQUE,
                FOREIGN KEY(run_id)
                    REFERENCES evaluation_run_read_models(run_id)
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS evaluation_run_lineage (
                run_id TEXT PRIMARY KEY,
                source_run_id TEXT NOT NULL,
                FOREIGN KEY(run_id)
                    REFERENCES evaluation_run_read_models(run_id),
                FOREIGN KEY(source_run_id)
                    REFERENCES evaluation_run_read_models(run_id)
            )
            """
        )

    @staticmethod
    def _validate_reference_table(
        connection: sqlite3.Connection,
    ) -> None:
        columns = {
            str(row["name"])
            for row in connection.execute(
                "PRAGMA table_info(evaluation_run_references)"
            )
        }
        if columns != {"run_id", "evaluation_object_id"}:
            raise EvaluationReadModelSchemaError(
                "评价运行引用表结构不受支持"
            )

    @staticmethod
    def _validate_command_table(
        connection: sqlite3.Connection,
    ) -> None:
        columns = {
            str(row["name"])
            for row in connection.execute(
                "PRAGMA table_info(evaluation_run_commands)"
            )
        }
        if columns != {"idempotency_key", "request_hash", "run_id"}:
            raise EvaluationReadModelSchemaError(
                "评价运行幂等记录表结构不受支持"
            )

    @staticmethod
    def _validate_lineage_table(
        connection: sqlite3.Connection,
    ) -> None:
        columns = {
            str(row["name"])
            for row in connection.execute(
                "PRAGMA table_info(evaluation_run_lineage)"
            )
        }
        if columns != {"run_id", "source_run_id"}:
            raise EvaluationReadModelSchemaError(
                "评价运行来源表结构不受支持"
            )

    def _seed_objects(
        self,
        connection: sqlite3.Connection,
        objects: tuple[EvaluationObject, ...],
    ) -> None:
        for evaluation_object in objects:
            payload = _canonical_payload(asdict(evaluation_object))
            digest = _payload_hash(payload)
            current = connection.execute(
                """
                SELECT display_order, presented_run_id, schema_version,
                       payload, payload_hash
                FROM evaluation_object_read_models
                WHERE evaluation_object_id = ?
                """,
                (evaluation_object.evaluation_object_id,),
            ).fetchone()
            expected = (
                evaluation_object.display_order,
                evaluation_object.presented_run_id,
                PILOT_SCHEMA_VERSION,
                payload,
                digest,
            )
            if current is None:
                connection.execute(
                    """
                    INSERT INTO evaluation_object_read_models(
                        evaluation_object_id,
                        display_order,
                        presented_run_id,
                        schema_version,
                        payload,
                        payload_hash
                    ) VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (evaluation_object.evaluation_object_id, *expected),
                )
                continue
            if tuple(current) != expected:
                raise EvaluationReadModelConflictError(
                    f"评价对象 {evaluation_object.evaluation_object_id} "
                    "的试点读模型已发生变化"
                )

    def _seed_runs(
        self,
        connection: sqlite3.Connection,
        runs: tuple[EvaluationRunSnapshot, ...],
    ) -> None:
        for snapshot in runs:
            run = snapshot.run
            payload = _canonical_payload(asdict(run))
            digest = _payload_hash(payload)
            current = connection.execute(
                """
                SELECT evaluation_object_id, schema_version,
                       payload, payload_hash
                FROM evaluation_run_read_models
                WHERE run_id = ?
                """,
                (run.run_id,),
            ).fetchone()
            expected = (
                run.evaluation_object_id,
                PILOT_SCHEMA_VERSION,
                payload,
                digest,
            )
            if current is None:
                connection.execute(
                    """
                    INSERT INTO evaluation_run_read_models(
                        run_id,
                        evaluation_object_id,
                        schema_version,
                        payload,
                        payload_hash
                    ) VALUES (?, ?, ?, ?, ?)
                    """,
                    (run.run_id, *expected),
                )
                continue
            if tuple(current) != expected:
                raise EvaluationReadModelConflictError(
                    f"评价运行 {run.run_id} 的试点读模型已发生变化"
                )

    def _seed_calculations(
        self,
        connection: sqlite3.Connection,
        runs: tuple[EvaluationRunSnapshot, ...],
    ) -> None:
        for snapshot in runs:
            run_id = snapshot.run.run_id
            payload = _canonical_payload(
                _calculation_payload(snapshot.calculation)
            )
            digest = _payload_hash(payload)
            current = connection.execute(
                """
                SELECT schema_version, payload, payload_hash
                FROM evaluation_run_calculation_snapshots
                WHERE run_id = ?
                """,
                (run_id,),
            ).fetchone()
            expected = (
                PILOT_SCHEMA_VERSION,
                payload,
                digest,
            )
            if current is None:
                connection.execute(
                    """
                    INSERT INTO evaluation_run_calculation_snapshots(
                        run_id,
                        schema_version,
                        payload,
                        payload_hash
                    ) VALUES (?, ?, ?, ?)
                    """,
                    (run_id, *expected),
                )
                continue
            if tuple(current) != expected:
                raise EvaluationReadModelConflictError(
                    f"评价运行 {run_id} 的计算快照已发生变化"
                )

    @staticmethod
    def _seed_references(
        connection: sqlite3.Connection,
        runs: tuple[EvaluationRunSnapshot, ...],
    ) -> None:
        for snapshot in runs:
            run = snapshot.run
            current = connection.execute(
                """
                SELECT evaluation_object_id
                FROM evaluation_run_references
                WHERE run_id = ?
                """,
                (run.run_id,),
            ).fetchone()
            if current is None:
                connection.execute(
                    """
                    INSERT INTO evaluation_run_references(
                        run_id,
                        evaluation_object_id
                    ) VALUES (?, ?)
                    """,
                    (run.run_id, run.evaluation_object_id),
                )
                continue
            if str(current["evaluation_object_id"]) != (
                run.evaluation_object_id
            ):
                raise EvaluationRunReferenceConflictError(
                    f"评价运行 {run.run_id} 已绑定其他评价对象"
                )

    @staticmethod
    def _decode_payload(row: sqlite3.Row) -> dict[str, Any]:
        if int(row["schema_version"]) != PILOT_SCHEMA_VERSION:
            raise EvaluationReadModelSchemaError(
                "不支持的试点评价读模型版本"
            )
        payload = str(row["payload"])
        if _payload_hash(payload) != str(row["payload_hash"]):
            raise EvaluationReadModelSchemaError(
                "试点评价读模型内容哈希不一致"
            )
        decoded = json.loads(payload)
        if not isinstance(decoded, dict):
            raise EvaluationReadModelSchemaError(
                "试点评价读模型必须是对象结构"
            )
        return decoded

    def _list_objects_sync(self) -> tuple[EvaluationObject, ...]:
        with self._connect() as connection:
            rows = connection.execute(
                """
                SELECT schema_version, payload, payload_hash
                FROM evaluation_object_read_models
                ORDER BY display_order ASC
                """
            ).fetchall()
        return tuple(
            evaluation_object_from_payload(self._decode_payload(row))
            for row in rows
        )

    def _get_object_sync(
        self,
        evaluation_object_id: str,
    ) -> EvaluationObject | None:
        with self._connect() as connection:
            row = connection.execute(
                """
                SELECT schema_version, payload, payload_hash
                FROM evaluation_object_read_models
                WHERE evaluation_object_id = ?
                """,
                (evaluation_object_id,),
            ).fetchone()
        if row is None:
            return None
        return evaluation_object_from_payload(self._decode_payload(row))

    def _get_run_sync(
        self,
        run_id: str,
    ) -> EvaluationRunSnapshot | None:
        with self._connect() as connection:
            return self._get_run_from_connection(connection, run_id)

    def _get_run_from_connection(
        self,
        connection: sqlite3.Connection,
        run_id: str,
    ) -> EvaluationRunSnapshot | None:
        run_row = connection.execute(
            """
            SELECT schema_version, payload, payload_hash
            FROM evaluation_run_read_models
            WHERE run_id = ?
            """,
            (run_id,),
        ).fetchone()
        calculation_row = connection.execute(
            """
            SELECT schema_version, payload, payload_hash
            FROM evaluation_run_calculation_snapshots
            WHERE run_id = ?
            """,
            (run_id,),
        ).fetchone()
        if run_row is None:
            return None
        if calculation_row is None:
            raise EvaluationReadModelSchemaError(
                "评价运行缺少不可变计算快照"
            )
        run = evaluation_run_from_payload(
            self._decode_payload(run_row)
        )
        calculation = evaluation_calculation_from_payload(
            self._decode_payload(calculation_row),
            run,
        )
        return EvaluationRunSnapshot(
            run=run,
            calculation=calculation,
        )

    def _create_run_sync(
        self,
        idempotency_key: str,
        request_hash: str,
        source_run_id: str,
        snapshot: EvaluationRunSnapshot,
    ) -> StoredEvaluationRun:
        connection = self._connect()
        try:
            connection.execute("BEGIN IMMEDIATE")
            replay = self._get_created_run_from_connection(
                connection,
                idempotency_key,
                request_hash,
            )
            if replay is not None:
                connection.commit()
                return replay

            run = snapshot.run
            source_reference = connection.execute(
                """
                SELECT evaluation_object_id
                FROM evaluation_run_references
                WHERE run_id = ?
                """,
                (source_run_id,),
            ).fetchone()
            if (
                source_reference is None
                or str(source_reference["evaluation_object_id"])
                != run.evaluation_object_id
            ):
                raise EvaluationReadModelConflictError(
                    "来源运行与评价对象归属不一致"
                )
            if connection.execute(
                "SELECT 1 FROM evaluation_run_read_models WHERE run_id = ?",
                (run.run_id,),
            ).fetchone():
                raise EvaluationReadModelConflictError(
                    f"评价运行 {run.run_id} 已存在"
                )

            run_payload = _canonical_payload(asdict(run))
            calculation_payload = _canonical_payload(
                _calculation_payload(snapshot.calculation)
            )
            connection.execute(
                """
                INSERT INTO evaluation_run_read_models(
                    run_id,
                    evaluation_object_id,
                    schema_version,
                    payload,
                    payload_hash
                ) VALUES (?, ?, ?, ?, ?)
                """,
                (
                    run.run_id,
                    run.evaluation_object_id,
                    PILOT_SCHEMA_VERSION,
                    run_payload,
                    _payload_hash(run_payload),
                ),
            )
            connection.execute(
                """
                INSERT INTO evaluation_run_calculation_snapshots(
                    run_id,
                    schema_version,
                    payload,
                    payload_hash
                ) VALUES (?, ?, ?, ?)
                """,
                (
                    run.run_id,
                    PILOT_SCHEMA_VERSION,
                    calculation_payload,
                    _payload_hash(calculation_payload),
                ),
            )
            connection.execute(
                """
                INSERT INTO evaluation_run_references(
                    run_id,
                    evaluation_object_id
                ) VALUES (?, ?)
                """,
                (run.run_id, run.evaluation_object_id),
            )
            connection.execute(
                """
                INSERT INTO evaluation_run_lineage(
                    run_id,
                    source_run_id
                ) VALUES (?, ?)
                """,
                (run.run_id, source_run_id),
            )
            connection.execute(
                """
                INSERT INTO evaluation_run_commands(
                    idempotency_key,
                    request_hash,
                    run_id
                ) VALUES (?, ?, ?)
                """,
                (idempotency_key, request_hash, run.run_id),
            )
            connection.commit()
            return StoredEvaluationRun(
                snapshot=snapshot,
                source_run_id=source_run_id,
                idempotent_replay=False,
            )
        except Exception:
            connection.rollback()
            raise
        finally:
            connection.close()

    def _get_created_run_sync(
        self,
        idempotency_key: str,
        request_hash: str,
    ) -> StoredEvaluationRun | None:
        with self._connect() as connection:
            return self._get_created_run_from_connection(
                connection,
                idempotency_key,
                request_hash,
            )

    def _get_created_run_from_connection(
        self,
        connection: sqlite3.Connection,
        idempotency_key: str,
        request_hash: str,
    ) -> StoredEvaluationRun | None:
        command_row = connection.execute(
            """
            SELECT request_hash, run_id
            FROM evaluation_run_commands
            WHERE idempotency_key = ?
            """,
            (idempotency_key,),
        ).fetchone()
        if command_row is None:
            return None
        if str(command_row["request_hash"]) != request_hash:
            raise EvaluationRunIdempotencyConflictError(
                "幂等键已用于其他评价运行请求"
            )
        run_id = str(command_row["run_id"])
        snapshot = self._get_run_from_connection(connection, run_id)
        source_run_id = self._get_source_run_id_from_connection(
            connection,
            run_id,
        )
        if snapshot is None or source_run_id is None:
            raise EvaluationReadModelSchemaError(
                "评价运行幂等记录缺少运行或来源关系"
            )
        return StoredEvaluationRun(
            snapshot=snapshot,
            source_run_id=source_run_id,
            idempotent_replay=True,
        )

    @staticmethod
    def _get_source_run_id_from_connection(
        connection: sqlite3.Connection,
        run_id: str,
    ) -> str | None:
        row = connection.execute(
            """
            SELECT source_run_id
            FROM evaluation_run_lineage
            WHERE run_id = ?
            """,
            (run_id,),
        ).fetchone()
        return None if row is None else str(row["source_run_id"])

    def _get_source_run_id_sync(self, run_id: str) -> str | None:
        with self._connect() as connection:
            return self._get_source_run_id_from_connection(
                connection,
                run_id,
            )

    def _get_by_run_id_sync(
        self,
        run_id: str,
    ) -> EvaluationRunReference | None:
        with self._connect() as connection:
            row = connection.execute(
                """
                SELECT run_id, evaluation_object_id
                FROM evaluation_run_references
                WHERE run_id = ?
                """,
                (run_id,),
            ).fetchone()
        if row is None:
            return None
        return EvaluationRunReference(
            run_id=str(row["run_id"]),
            evaluation_object_id=str(row["evaluation_object_id"]),
        )


def build_local_evaluation_read_repository_at(
    database_path: Path,
) -> SqliteEvaluationReadRepository:
    seed = load_pilot_evaluation_seed()
    return SqliteEvaluationReadRepository(
        database_path,
        seed.objects,
        seed.runs,
    )
