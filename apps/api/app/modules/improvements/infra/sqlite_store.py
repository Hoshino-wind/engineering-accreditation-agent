from __future__ import annotations

import json
import sqlite3
from dataclasses import replace
from datetime import UTC, datetime, timedelta
from pathlib import Path
from uuid import NAMESPACE_URL, uuid5

from app.modules.diagnostics.domain.finding import (
    DiagnosticFinding,
    DiagnosticFindingRisk,
)
from app.modules.improvements.domain import (
    ImprovementPriority,
    ImprovementStatus,
    ImprovementTask,
)


class SQLiteImprovementTaskRepository:
    def __init__(self, user_id: str, base_dir: Path | None = None) -> None:
        api_root = Path(__file__).resolve().parents[4]
        self._base_dir = base_dir or api_root / "var"
        self._db_path = self._base_dir / "ea_mvp.sqlite3"
        self._user_id = user_id
        self._base_dir.mkdir(parents=True, exist_ok=True)
        self._ensure_schema()

    async def list_all(
        self,
        *,
        status: str | None = None,
        priority: str | None = None,
    ) -> list[ImprovementTask]:
        where = ["user_id = ?"]
        params: list[str] = [self._user_id]
        if status:
            where.append("status = ?")
            params.append(status)
        if priority:
            where.append("priority = ?")
            params.append(priority)

        with self._connect() as conn:
            rows = conn.execute(
                f"""
                select * from improvement_tasks
                where {" and ".join(where)}
                order by
                    case status
                        when 'in-progress' then 0
                        when 'planned' then 1
                        when 'awaiting-reevaluation' then 2
                        else 3
                    end,
                    case priority
                        when 'high' then 0
                        when 'medium' then 1
                        else 2
                    end,
                    due_at,
                    updated_at desc
                """,
                params,
            ).fetchall()
        return [_row_to_task(row) for row in rows]

    async def get_by_id(self, task_id: str) -> ImprovementTask | None:
        with self._connect() as conn:
            row = conn.execute(
                """
                select * from improvement_tasks
                where user_id = ? and id = ?
                """,
                (self._user_id, task_id),
            ).fetchone()
        return _row_to_task(row) if row else None

    async def update(
        self,
        task_id: str,
        changes: dict,
    ) -> ImprovementTask | None:
        existing = await self.get_by_id(task_id)
        if existing is None:
            return None

        now = datetime.now(UTC).isoformat()
        status = changes.get("status", existing.status)
        if isinstance(status, ImprovementStatus):
            status_value = status.value
        else:
            status_value = str(status)
        closed_at = existing.closed_at
        if status_value == ImprovementStatus.CLOSED.value and not closed_at:
            closed_at = now
        if status_value != ImprovementStatus.CLOSED.value:
            closed_at = None

        updated = replace(
            existing,
            title=_coalesce(changes.get("title"), existing.title),
            course=_coalesce(changes.get("course"), existing.course),
            target_node=_coalesce(changes.get("targetNode"), existing.target_node),
            priority=ImprovementPriority(
                _coalesce(changes.get("priority"), existing.priority.value)
            ),
            status=ImprovementStatus(status_value),
            owner=_coalesce(changes.get("owner"), existing.owner),
            due_at=_coalesce(changes.get("dueAt"), existing.due_at),
            action_title=_coalesce(changes.get("actionTitle"), existing.action_title),
            action_detail=_coalesce(changes.get("actionDetail"), existing.action_detail),
            verification_method=_coalesce(
                changes.get("verificationMethod"),
                existing.verification_method,
            ),
            baseline=_coalesce_nullable(changes.get("baseline"), existing.baseline),
            target_value=_coalesce_nullable(
                changes.get("targetValue"),
                existing.target_value,
            ),
            completion_summary=_coalesce(
                changes.get("completionSummary"),
                existing.completion_summary,
            ),
            evidence_uri=_coalesce(changes.get("evidenceUri"), existing.evidence_uri),
            reevaluation_result=_coalesce_nullable(
                changes.get("reevaluationResult"),
                existing.reevaluation_result,
            ),
            updated_at=now,
            closed_at=closed_at,
        )

        with self._connect() as conn:
            _upsert_task(conn, self._user_id, updated)
        return updated

    async def upsert_from_finding(self, finding: DiagnosticFinding) -> ImprovementTask:
        now = datetime.now(UTC)
        task_id = f"task-{finding.id}"
        existing = await self.get_by_id(task_id)
        draft = _task_from_finding(self._user_id, finding, now)
        if existing is not None:
            draft = replace(
                draft,
                status=existing.status,
                owner=existing.owner,
                due_at=existing.due_at,
                completion_summary=existing.completion_summary,
                evidence_uri=existing.evidence_uri,
                reevaluation_result=existing.reevaluation_result,
                created_at=existing.created_at,
                closed_at=existing.closed_at,
            )
        with self._connect() as conn:
            _upsert_task(conn, self._user_id, draft)
        return draft

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _ensure_schema(self) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                create table if not exists improvement_tasks (
                    id text not null,
                    user_id text not null,
                    display_id text not null,
                    source_module text not null,
                    source_finding_id text,
                    source_label text not null,
                    title text not null,
                    course text not null,
                    target_node text not null,
                    priority text not null,
                    status text not null,
                    owner text not null,
                    due_at text not null,
                    action_title text not null,
                    action_detail text not null,
                    verification_method text not null,
                    baseline real,
                    target_value real,
                    completion_summary text not null,
                    evidence_uri text not null,
                    reevaluation_result real,
                    created_at text not null,
                    updated_at text not null,
                    closed_at text,
                    source_payload_json text not null,
                    primary key (user_id, id)
                )
                """
            )
            conn.execute(
                """
                create index if not exists idx_improvement_tasks_status
                on improvement_tasks(user_id, status)
                """
            )
            conn.execute(
                """
                create index if not exists idx_improvement_tasks_source
                on improvement_tasks(user_id, source_finding_id)
                """
            )


def _task_from_finding(
    user_id: str,
    finding: DiagnosticFinding,
    now: datetime,
) -> ImprovementTask:
    priority = {
        DiagnosticFindingRisk.HIGH: ImprovementPriority.HIGH,
        DiagnosticFindingRisk.MEDIUM: ImprovementPriority.MEDIUM,
        DiagnosticFindingRisk.LOW: ImprovementPriority.LOW,
    }.get(finding.risk, ImprovementPriority.MEDIUM)
    action_title = _action_title(finding.suggested_destination)
    due_at = (now + timedelta(days=14 if priority == ImprovementPriority.HIGH else 21)).date().isoformat()
    return ImprovementTask(
        id=f"task-{finding.id}",
        user_id=user_id,
        display_id=f"QI-{now.year}-{_stable_suffix(finding.id)}",
        source_module="M5",
        source_finding_id=finding.id,
        source_label=f"M5 图谱诊断 {finding.id}",
        title=finding.title,
        course=finding.course,
        target_node=finding.target_node,
        priority=priority,
        status=ImprovementStatus.PLANNED,
        owner="待分配",
        due_at=due_at,
        action_title=action_title,
        action_detail=finding.rule_rationale,
        verification_method="完成材料补充、关系审核或图谱修正后，回到 M5 重新诊断，确认该问题不再出现。",
        baseline=None,
        target_value=1.0,
        completion_summary="",
        evidence_uri="",
        reevaluation_result=None,
        created_at=now.isoformat(),
        updated_at=now.isoformat(),
        closed_at=None,
        source_payload={
            "findingType": finding.type.value,
            "risk": finding.risk.value,
            "sourceNode": finding.source_node,
            "targetNode": finding.target_node,
            "ruleId": finding.rule_id,
            "graphVersion": finding.graph_version,
            "suggestedDestination": finding.suggested_destination,
        },
    )


def _action_title(destination: str) -> str:
    destination = destination.upper()
    if destination == "M3":
        return "补充或重新解析支撑材料"
    if destination == "M4":
        return "审核并修正支撑关系"
    if destination == "M2":
        return "修正图谱节点和支撑路径"
    return "制定教学改进措施并复查"


def _upsert_task(
    conn: sqlite3.Connection,
    user_id: str,
    task: ImprovementTask,
) -> None:
    conn.execute(
        """
        insert into improvement_tasks (
            id, user_id, display_id, source_module, source_finding_id,
            source_label, title, course, target_node, priority, status, owner,
            due_at, action_title, action_detail, verification_method,
            baseline, target_value, completion_summary, evidence_uri,
            reevaluation_result, created_at, updated_at, closed_at,
            source_payload_json
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        on conflict(user_id, id) do update set
            display_id = excluded.display_id,
            source_module = excluded.source_module,
            source_finding_id = excluded.source_finding_id,
            source_label = excluded.source_label,
            title = excluded.title,
            course = excluded.course,
            target_node = excluded.target_node,
            priority = excluded.priority,
            status = excluded.status,
            owner = excluded.owner,
            due_at = excluded.due_at,
            action_title = excluded.action_title,
            action_detail = excluded.action_detail,
            verification_method = excluded.verification_method,
            baseline = excluded.baseline,
            target_value = excluded.target_value,
            completion_summary = excluded.completion_summary,
            evidence_uri = excluded.evidence_uri,
            reevaluation_result = excluded.reevaluation_result,
            updated_at = excluded.updated_at,
            closed_at = excluded.closed_at,
            source_payload_json = excluded.source_payload_json
        """,
        (
            task.id,
            user_id,
            task.display_id,
            task.source_module,
            task.source_finding_id,
            task.source_label,
            task.title,
            task.course,
            task.target_node,
            task.priority.value,
            task.status.value,
            task.owner,
            task.due_at,
            task.action_title,
            task.action_detail,
            task.verification_method,
            task.baseline,
            task.target_value,
            task.completion_summary,
            task.evidence_uri,
            task.reevaluation_result,
            task.created_at,
            task.updated_at,
            task.closed_at,
            json.dumps(task.source_payload or {}, ensure_ascii=False),
        ),
    )


def _row_to_task(row) -> ImprovementTask:
    return ImprovementTask(
        id=row["id"],
        user_id=row["user_id"],
        display_id=row["display_id"],
        source_module=row["source_module"],
        source_finding_id=row["source_finding_id"],
        source_label=row["source_label"],
        title=row["title"],
        course=row["course"],
        target_node=row["target_node"],
        priority=ImprovementPriority(row["priority"]),
        status=ImprovementStatus(row["status"]),
        owner=row["owner"],
        due_at=row["due_at"],
        action_title=row["action_title"],
        action_detail=row["action_detail"],
        verification_method=row["verification_method"],
        baseline=row["baseline"],
        target_value=row["target_value"],
        completion_summary=row["completion_summary"],
        evidence_uri=row["evidence_uri"],
        reevaluation_result=row["reevaluation_result"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
        closed_at=row["closed_at"],
        source_payload=json.loads(row["source_payload_json"] or "{}"),
    )


def _coalesce[T](value: T | None, fallback: T) -> T:
    return fallback if value is None else value


def _coalesce_nullable[T](value: T | None, fallback: T | None) -> T | None:
    return fallback if value is None else value


def _stable_suffix(text: str) -> str:
    return uuid5(NAMESPACE_URL, text).hex[:6].upper()
