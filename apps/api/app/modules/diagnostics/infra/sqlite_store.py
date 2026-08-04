from __future__ import annotations

import json
import sqlite3
from dataclasses import replace
from pathlib import Path

from app.modules.diagnostics.domain.finding import (
    DiagnosticEvidenceRef,
    DiagnosticFinding,
    DiagnosticFindingRisk,
    DiagnosticFindingType,
    FindingDecisionStatus,
)


class SQLiteFindingRepository:
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
        course: str | None = None,
        risk: str | None = None,
        finding_type: str | None = None,
    ) -> list[DiagnosticFinding]:
        where = ["user_id = ?"]
        params: list[str] = [self._user_id]
        if course:
            where.append("course = ?")
            params.append(course)
        if risk:
            where.append("risk = ?")
            params.append(risk)
        if finding_type:
            where.append("finding_type = ?")
            params.append(finding_type)

        with self._connect() as conn:
            rows = conn.execute(
                f"""
                select * from diagnostic_findings
                where {" and ".join(where)}
                order by
                    case decision_status
                        when 'pending' then 0
                        when 'confirmed' then 1
                        when 'converted' then 2
                        else 3
                    end,
                    case risk
                        when 'high' then 0
                        when 'medium' then 1
                        else 2
                    end,
                    target_node,
                    id
                """,
                params,
            ).fetchall()
        return [_row_to_finding(row) for row in rows]

    async def get_by_id(self, finding_id: str) -> DiagnosticFinding | None:
        with self._connect() as conn:
            row = conn.execute(
                """
                select * from diagnostic_findings
                where user_id = ? and id = ?
                """,
                (self._user_id, finding_id),
            ).fetchone()
        return _row_to_finding(row) if row else None

    async def update_decision(
        self,
        finding_id: str,
        status: FindingDecisionStatus,
    ) -> DiagnosticFinding | None:
        with self._connect() as conn:
            conn.execute(
                """
                update diagnostic_findings
                set decision_status = ?
                where user_id = ? and id = ?
                """,
                (status.value, self._user_id, finding_id),
            )
            row = conn.execute(
                """
                select * from diagnostic_findings
                where user_id = ? and id = ?
                """,
                (self._user_id, finding_id),
            ).fetchone()
        return _row_to_finding(row) if row else None

    async def replace_graph_findings(
        self,
        findings: list[DiagnosticFinding],
    ) -> list[DiagnosticFinding]:
        with self._connect() as conn:
            existing_rows = conn.execute(
                """
                select id, decision_status from diagnostic_findings
                where user_id = ? and rule_id like 'GRAPH-DIAG-%'
                """,
                (self._user_id,),
            ).fetchall()
            existing_status = {
                row["id"]: FindingDecisionStatus(row["decision_status"])
                for row in existing_rows
            }
            conn.execute(
                """
                delete from diagnostic_findings
                where user_id = ? and rule_id like 'GRAPH-DIAG-%'
                """,
                (self._user_id,),
            )
            updated = [
                replace(
                    finding,
                    decision_status=existing_status.get(
                        finding.id,
                        finding.decision_status,
                    ),
                )
                for finding in findings
            ]
            for finding in updated:
                _upsert_finding(conn, self._user_id, finding)
        return updated

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _ensure_schema(self) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                create table if not exists diagnostic_findings (
                    id text not null,
                    user_id text not null,
                    title text not null,
                    course text not null,
                    finding_type text not null,
                    risk text not null,
                    source_node text not null,
                    target_node text not null,
                    relation_label text not null,
                    graph_version text not null,
                    rule_id text not null,
                    rule_version text not null,
                    rule_kind text not null,
                    rule_basis text not null,
                    rule_rationale text not null,
                    rule_run_at text not null,
                    decision_status text not null,
                    impact_course_objectives integer not null,
                    impact_ability_nodes integer not null,
                    impact_evaluation_inputs integer not null,
                    suggested_destination text not null,
                    evidence_json text not null,
                    primary key (user_id, id)
                )
                """
            )
            conn.execute(
                """
                create index if not exists idx_diagnostic_findings_decision
                on diagnostic_findings(user_id, decision_status)
                """
            )
            conn.execute(
                """
                create index if not exists idx_diagnostic_findings_rule
                on diagnostic_findings(user_id, rule_id)
                """
            )


def _upsert_finding(
    conn: sqlite3.Connection,
    user_id: str,
    finding: DiagnosticFinding,
) -> None:
    conn.execute(
        """
        insert into diagnostic_findings (
            id, user_id, title, course, finding_type, risk, source_node,
            target_node, relation_label, graph_version, rule_id, rule_version,
            rule_kind, rule_basis, rule_rationale, rule_run_at, decision_status,
            impact_course_objectives, impact_ability_nodes, impact_evaluation_inputs,
            suggested_destination, evidence_json
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        on conflict(user_id, id) do update set
            title = excluded.title,
            course = excluded.course,
            finding_type = excluded.finding_type,
            risk = excluded.risk,
            source_node = excluded.source_node,
            target_node = excluded.target_node,
            relation_label = excluded.relation_label,
            graph_version = excluded.graph_version,
            rule_id = excluded.rule_id,
            rule_version = excluded.rule_version,
            rule_kind = excluded.rule_kind,
            rule_basis = excluded.rule_basis,
            rule_rationale = excluded.rule_rationale,
            rule_run_at = excluded.rule_run_at,
            decision_status = excluded.decision_status,
            impact_course_objectives = excluded.impact_course_objectives,
            impact_ability_nodes = excluded.impact_ability_nodes,
            impact_evaluation_inputs = excluded.impact_evaluation_inputs,
            suggested_destination = excluded.suggested_destination,
            evidence_json = excluded.evidence_json
        """,
        (
            finding.id,
            user_id,
            finding.title,
            finding.course,
            finding.type.value,
            finding.risk.value,
            finding.source_node,
            finding.target_node,
            finding.relation_label,
            finding.graph_version,
            finding.rule_id,
            finding.rule_version,
            finding.rule_kind,
            finding.rule_basis,
            finding.rule_rationale,
            finding.rule_run_at,
            finding.decision_status.value,
            finding.impact_course_objectives,
            finding.impact_ability_nodes,
            finding.impact_evaluation_inputs,
            finding.suggested_destination,
            json.dumps([_evidence_to_dict(item) for item in finding.evidence], ensure_ascii=False),
        ),
    )


def _row_to_finding(row) -> DiagnosticFinding:
    evidence_payload = json.loads(row["evidence_json"] or "[]")
    return DiagnosticFinding(
        id=row["id"],
        title=row["title"],
        course=row["course"],
        type=DiagnosticFindingType(row["finding_type"]),
        risk=DiagnosticFindingRisk(row["risk"]),
        source_node=row["source_node"],
        target_node=row["target_node"],
        relation_label=row["relation_label"],
        graph_version=row["graph_version"],
        rule_id=row["rule_id"],
        rule_version=row["rule_version"],
        rule_kind=row["rule_kind"],
        rule_basis=row["rule_basis"],
        rule_rationale=row["rule_rationale"],
        rule_run_at=row["rule_run_at"],
        decision_status=FindingDecisionStatus(row["decision_status"]),
        impact_course_objectives=int(row["impact_course_objectives"]),
        impact_ability_nodes=int(row["impact_ability_nodes"]),
        impact_evaluation_inputs=int(row["impact_evaluation_inputs"]),
        suggested_destination=row["suggested_destination"],
        evidence=tuple(
            DiagnosticEvidenceRef(
                id=item.get("id", ""),
                object_name=item.get("object_name", ""),
                object_version=item.get("object_version", ""),
                coordinate=item.get("coordinate", ""),
                excerpt=item.get("excerpt", ""),
                hash=item.get("hash", ""),
            )
            for item in evidence_payload
        ),
    )


def _evidence_to_dict(item: DiagnosticEvidenceRef) -> dict[str, str]:
    return {
        "id": item.id,
        "object_name": item.object_name,
        "object_version": item.object_version,
        "coordinate": item.coordinate,
        "excerpt": item.excerpt,
        "hash": item.hash,
    }
