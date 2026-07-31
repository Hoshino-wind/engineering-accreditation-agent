import asyncio
import json
import sqlite3
from datetime import datetime
from pathlib import Path
from uuid import uuid4

from app.modules.teaching_graph.application import GraphRevisionConflictError
from app.modules.teaching_graph.domain import GraphAuditEvent, GraphWorkspace


class SqliteGraphWorkspaceRepository:
    WORKSPACE_ID = "default"

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
            connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS graph_workspaces (
                    id TEXT PRIMARY KEY,
                    revision INTEGER NOT NULL,
                    updated_at TEXT NOT NULL,
                    updated_by TEXT NOT NULL,
                    state TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS graph_snapshots (
                    version TEXT PRIMARY KEY,
                    published_at TEXT NOT NULL,
                    payload TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS graph_audit_events (
                    id TEXT PRIMARY KEY,
                    action TEXT NOT NULL,
                    actor TEXT NOT NULL,
                    graph_version TEXT NOT NULL,
                    revision INTEGER NOT NULL,
                    summary TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS graph_audit_created_at
                ON graph_audit_events(created_at DESC);
                """
            )

    async def get(self) -> GraphWorkspace | None:
        return await asyncio.to_thread(self._get_sync)

    def _get_sync(self) -> GraphWorkspace | None:
        with self._connect() as connection:
            row = connection.execute(
                """
                SELECT revision, updated_at, updated_by, state
                FROM graph_workspaces
                WHERE id = ?
                """,
                (self.WORKSPACE_ID,),
            ).fetchone()
        if row is None:
            return None
        return GraphWorkspace(
            revision=int(row["revision"]),
            state=json.loads(row["state"]),
            updated_at=datetime.fromisoformat(row["updated_at"]),
            updated_by=str(row["updated_by"]),
        )

    async def save(
        self,
        workspace: GraphWorkspace,
        *,
        expected_revision: int,
        action: str,
        summary: str,
        snapshot: dict[str, object] | None = None,
    ) -> GraphWorkspace:
        return await asyncio.to_thread(
            self._save_sync,
            workspace,
            expected_revision,
            action,
            summary,
            snapshot,
        )

    def _save_sync(
        self,
        workspace: GraphWorkspace,
        expected_revision: int,
        action: str,
        summary: str,
        snapshot: dict[str, object] | None,
    ) -> GraphWorkspace:
        state_payload = json.dumps(workspace.state, ensure_ascii=False)
        with self._connect() as connection:
            connection.execute("BEGIN IMMEDIATE")
            current = connection.execute(
                "SELECT revision FROM graph_workspaces WHERE id = ?",
                (self.WORKSPACE_ID,),
            ).fetchone()
            current_revision = 0 if current is None else int(current["revision"])
            if current_revision != expected_revision:
                raise GraphRevisionConflictError(
                    f"图谱已从修订 {expected_revision} 更新到 {current_revision}"
                )

            next_revision = expected_revision + 1
            if snapshot is not None:
                try:
                    connection.execute(
                        """
                        INSERT INTO graph_snapshots(version, published_at, payload)
                        VALUES (?, ?, ?)
                        """,
                        (
                            snapshot["version"],
                            snapshot["publishedAt"],
                            json.dumps(snapshot, ensure_ascii=False),
                        ),
                    )
                except sqlite3.IntegrityError as error:
                    raise GraphRevisionConflictError(
                        f"正式快照 {snapshot['version']} 已存在"
                    ) from error

            connection.execute(
                """
                INSERT INTO graph_workspaces(id, revision, updated_at, updated_by, state)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                    revision = excluded.revision,
                    updated_at = excluded.updated_at,
                    updated_by = excluded.updated_by,
                    state = excluded.state
                """,
                (
                    self.WORKSPACE_ID,
                    next_revision,
                    workspace.updated_at.isoformat(),
                    workspace.updated_by,
                    state_payload,
                ),
            )
            connection.execute(
                """
                INSERT INTO graph_audit_events(
                    id, action, actor, graph_version, revision, summary, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    str(uuid4()),
                    action,
                    workspace.updated_by,
                    workspace.state["version"]["name"],
                    next_revision,
                    summary,
                    workspace.updated_at.isoformat(),
                ),
            )
        return GraphWorkspace(
            revision=next_revision,
            state=workspace.state,
            updated_at=workspace.updated_at,
            updated_by=workspace.updated_by,
        )

    async def list_audit_events(self, limit: int) -> list[GraphAuditEvent]:
        return await asyncio.to_thread(self._list_audit_events_sync, limit)

    def _list_audit_events_sync(self, limit: int) -> list[GraphAuditEvent]:
        with self._connect() as connection:
            rows = connection.execute(
                """
                SELECT id, action, actor, graph_version, revision, summary, created_at
                FROM graph_audit_events
                ORDER BY created_at DESC, rowid DESC
                LIMIT ?
                """,
                (limit,),
            ).fetchall()
        return [
            GraphAuditEvent(
                id=str(row["id"]),
                action=str(row["action"]),
                actor=str(row["actor"]),
                graph_version=str(row["graph_version"]),
                revision=int(row["revision"]),
                summary=str(row["summary"]),
                created_at=datetime.fromisoformat(row["created_at"]),
            )
            for row in rows
        ]
