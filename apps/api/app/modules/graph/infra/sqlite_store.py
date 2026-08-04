import json
import re
import sqlite3
from pathlib import Path
from uuid import NAMESPACE_URL, uuid5

from app.modules.graph.domain import AbilityGraph, AbilityGraphEdge, AbilityGraphNode
from app.modules.recognition.domain.candidate import (
    CandidateReviewStatus,
    RecognitionCandidate,
)

STANDARD_NODES: list[AbilityGraphNode] = [
    AbilityGraphNode(
        id="std-gr-01",
        kind="GraduationRequirement",
        code="GR-01",
        name="工程知识",
        description="能够将数学、自然科学、工程基础和专业知识用于解决复杂工程问题。",
        origin="standard",
        properties={"sortOrder": 1},
    ),
    AbilityGraphNode(
        id="std-gr-03",
        kind="GraduationRequirement",
        code="GR-03",
        name="设计/开发解决方案",
        description="能够设计针对复杂工程问题的解决方案，设计满足特定需求的系统、单元或工艺流程。",
        origin="standard",
        properties={"sortOrder": 3},
    ),
    AbilityGraphNode(
        id="std-gr-05",
        kind="GraduationRequirement",
        code="GR-05",
        name="使用现代工具",
        description="能够选择与使用恰当的技术、资源、现代工程工具和信息技术工具。",
        origin="standard",
        properties={"sortOrder": 5},
    ),
    AbilityGraphNode(
        id="std-c-01-01",
        kind="Competency",
        code="C-01-01",
        name="工程知识应用",
        description="能够运用工程基础和专业知识表达、分析复杂工程问题。",
        origin="standard",
        properties={"parent": "GR-01"},
    ),
    AbilityGraphNode(
        id="std-c-01-02",
        kind="Competency",
        code="C-01-02",
        name="问题推演与分析",
        description="能够对复杂工程问题进行抽象、推演和分析。",
        origin="standard",
        properties={"parent": "GR-01"},
    ),
    AbilityGraphNode(
        id="std-c-03-01",
        kind="Competency",
        code="C-03-01",
        name="系统设计方法",
        description="能够针对工程需求完成系统或单元设计。",
        origin="standard",
        properties={"parent": "GR-03"},
    ),
    AbilityGraphNode(
        id="std-c-05-01",
        kind="Competency",
        code="C-05-01",
        name="现代工具选择与使用",
        description="能够选择并使用主流工程工具、开发平台和测试工具。",
        origin="standard",
        properties={"parent": "GR-05"},
    ),
]

STANDARD_EDGES: list[AbilityGraphEdge] = [
    AbilityGraphEdge(
        id="std-e-gr01-c0101",
        source="std-gr-01",
        target="std-c-01-01",
        kind="CONTAINS",
        source_type="rule",
        review_status="approved",
    ),
    AbilityGraphEdge(
        id="std-e-gr01-c0102",
        source="std-gr-01",
        target="std-c-01-02",
        kind="CONTAINS",
        source_type="rule",
        review_status="approved",
    ),
    AbilityGraphEdge(
        id="std-e-gr03-c0301",
        source="std-gr-03",
        target="std-c-03-01",
        kind="CONTAINS",
        source_type="rule",
        review_status="approved",
    ),
    AbilityGraphEdge(
        id="std-e-gr05-c0501",
        source="std-gr-05",
        target="std-c-05-01",
        kind="CONTAINS",
        source_type="rule",
        review_status="approved",
    ),
]


class SQLiteAbilityGraphRepository:
    def __init__(self, user_id: str, base_dir: Path | None = None) -> None:
        api_root = Path(__file__).resolve().parents[4]
        self._base_dir = base_dir or api_root / "var"
        self._db_path = self._base_dir / "ea_mvp.sqlite3"
        self._user_id = user_id
        self._base_dir.mkdir(parents=True, exist_ok=True)
        self._ensure_schema()
        self._ensure_standard_seed()

    async def get_graph(self) -> AbilityGraph:
        with self._connect() as conn:
            node_rows = conn.execute(
                """
                select * from graph_nodes
                where user_id = ?
                order by case origin when 'standard' then 0 else 1 end, kind, code
                """,
                (self._user_id,),
            ).fetchall()
            edge_rows = conn.execute(
                """
                select * from graph_edges
                where user_id = ?
                order by case review_status when 'pending' then 0 else 1 end, kind, id
                """,
                (self._user_id,),
            ).fetchall()
        return AbilityGraph(
            nodes=[_row_to_node(row) for row in node_rows],
            edges=[_row_to_edge(row) for row in edge_rows],
        )

    async def review_edge(
        self,
        edge_id: str,
        decision: str,
    ) -> AbilityGraphEdge | None:
        status = {
            "accept": "approved",
            "approve": "approved",
            "modify": "modified",
            "reject": "rejected",
        }.get(decision, "approved")
        with self._connect() as conn:
            conn.execute(
                """
                update graph_edges
                set review_status = ?
                where user_id = ? and id = ?
                """,
                (status, self._user_id, edge_id),
            )
            row = conn.execute(
                "select * from graph_edges where user_id = ? and id = ?",
                (self._user_id, edge_id),
            ).fetchone()
        return _row_to_edge(row) if row else None

    async def apply_candidate_review(
        self,
        candidate: RecognitionCandidate,
        status: CandidateReviewStatus,
    ) -> None:
        if status == CandidateReviewStatus.REJECTED:
            await self._mark_candidate_edge(candidate.id, "rejected")
            return
        if status not in {CandidateReviewStatus.ACCEPTED, CandidateReviewStatus.MODIFIED}:
            return

        source = _node_from_candidate_source(candidate)
        target = _node_from_candidate_target(candidate)
        edge = AbilityGraphEdge(
            id=f"edge-{candidate.id}",
            source=source.id,
            target=target.id,
            kind="SUPPORTS",
            source_type="ai",
            review_status="approved"
            if status == CandidateReviewStatus.ACCEPTED
            else "modified",
            strength=candidate.support_strength or _strength_from_confidence(candidate.confidence),
            confidence=round(candidate.confidence / 100, 4),
            ai_reasoning=_review_reasoning(candidate),
            candidate_id=candidate.id,
            reviewed_by=candidate.reviewed_by,
            reviewed_at=candidate.reviewed_at,
            evidence_summary=_evidence_summary(candidate),
        )

        with self._connect() as conn:
            _ensure_support_link_schema(conn)
            _upsert_node(conn, self._user_id, source)
            _upsert_node(conn, self._user_id, target)
            _upsert_edge(conn, self._user_id, edge)
            _upsert_support_link(conn, self._user_id, candidate, source, target, edge)

    async def _mark_candidate_edge(self, candidate_id: str, status: str) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                update graph_edges
                set review_status = ?
                where user_id = ? and candidate_id = ?
                """,
                (status, self._user_id, candidate_id),
            )

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _ensure_schema(self) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                create table if not exists graph_nodes (
                    id text not null,
                    user_id text not null,
                    kind text not null,
                    code text not null,
                    name text not null,
                    description text not null,
                    origin text not null,
                    properties_json text not null,
                    primary key (user_id, id)
                )
                """
            )
            conn.execute(
                """
                create table if not exists graph_edges (
                    id text not null,
                    user_id text not null,
                    source text not null,
                    target text not null,
                    kind text not null,
                    source_type text not null,
                    review_status text not null,
                    strength text,
                    confidence real,
                    ai_reasoning text,
                    candidate_id text,
                    reviewed_by text,
                    reviewed_at text,
                    evidence_summary text,
                    properties_json text not null default '{}',
                    primary key (user_id, id)
                )
                """
            )
            _ensure_column(conn, "graph_edges", "reviewed_by", "text")
            _ensure_column(conn, "graph_edges", "reviewed_at", "text")
            _ensure_column(conn, "graph_edges", "evidence_summary", "text")
            _ensure_column(conn, "graph_edges", "properties_json", "text not null default '{}'")
            conn.execute(
                """
                create index if not exists idx_graph_edges_user_candidate
                on graph_edges(user_id, candidate_id)
                """
            )

    def _ensure_standard_seed(self) -> None:
        with self._connect() as conn:
            existing = conn.execute(
                """
                select count(*) from graph_nodes
                where user_id = ? and origin = 'standard'
                """,
                (self._user_id,),
            ).fetchone()[0]
            if existing:
                return
            for node in STANDARD_NODES:
                _upsert_node(conn, self._user_id, node)
            for edge in STANDARD_EDGES:
                _upsert_edge(conn, self._user_id, edge)


def _ensure_column(
    conn: sqlite3.Connection,
    table_name: str,
    column_name: str,
    column_type: str,
) -> None:
    columns = {row["name"] for row in conn.execute(f"pragma table_info({table_name})")}
    if column_name in columns:
        return
    conn.execute(f"alter table {table_name} add column {column_name} {column_type}")


def _ensure_support_link_schema(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        create table if not exists academic_support_links (
            id text not null,
            user_id text not null,
            source_type text not null,
            source_id text not null,
            target_indicator_id text not null,
            relation text not null,
            strength text not null,
            evidence text not null,
            status text not null,
            primary key(user_id, id)
        )
        """
    )
    conn.execute(
        """
        create index if not exists idx_academic_links_user_target
        on academic_support_links(user_id, target_indicator_id)
        """
    )


def _upsert_node(
    conn: sqlite3.Connection,
    user_id: str,
    node: AbilityGraphNode,
) -> None:
    conn.execute(
        """
        insert into graph_nodes (
            id, user_id, kind, code, name, description, origin, properties_json
        ) values (?, ?, ?, ?, ?, ?, ?, ?)
        on conflict(user_id, id) do update set
            kind = excluded.kind,
            code = excluded.code,
            name = excluded.name,
            description = excluded.description,
            origin = excluded.origin,
            properties_json = excluded.properties_json
        """,
        (
            node.id,
            user_id,
            node.kind,
            node.code,
            node.name,
            node.description,
            node.origin,
            json.dumps(node.properties, ensure_ascii=False),
        ),
    )


def _upsert_edge(
    conn: sqlite3.Connection,
    user_id: str,
    edge: AbilityGraphEdge,
) -> None:
    conn.execute(
        """
        insert into graph_edges (
            id, user_id, source, target, kind, source_type, review_status,
            strength, confidence, ai_reasoning, candidate_id, reviewed_by,
            reviewed_at, evidence_summary, properties_json
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        on conflict(user_id, id) do update set
            source = excluded.source,
            target = excluded.target,
            kind = excluded.kind,
            source_type = excluded.source_type,
            review_status = excluded.review_status,
            strength = excluded.strength,
            confidence = excluded.confidence,
            ai_reasoning = excluded.ai_reasoning,
            candidate_id = excluded.candidate_id,
            reviewed_by = excluded.reviewed_by,
            reviewed_at = excluded.reviewed_at,
            evidence_summary = excluded.evidence_summary,
            properties_json = excluded.properties_json
        """,
        (
            edge.id,
            user_id,
            edge.source,
            edge.target,
            edge.kind,
            edge.source_type,
            edge.review_status,
            edge.strength,
            edge.confidence,
            edge.ai_reasoning,
            edge.candidate_id,
            edge.reviewed_by,
            edge.reviewed_at,
            edge.evidence_summary,
            "{}",
        ),
    )


def _upsert_support_link(
    conn: sqlite3.Connection,
    user_id: str,
    candidate: RecognitionCandidate,
    source: AbilityGraphNode,
    target: AbilityGraphNode,
    edge: AbilityGraphEdge,
) -> None:
    source_type = "experiment" if source.kind == "Experiment" else "course"
    conn.execute(
        """
        insert into academic_support_links (
            id, user_id, source_type, source_id, target_indicator_id,
            relation, strength, evidence, status
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?)
        on conflict(user_id, id) do update set
            source_type = excluded.source_type,
            source_id = excluded.source_id,
            target_indicator_id = excluded.target_indicator_id,
            relation = excluded.relation,
            strength = excluded.strength,
            evidence = excluded.evidence,
            status = excluded.status
        """,
        (
            f"link-{candidate.id}",
            user_id,
            source_type,
            source.id,
            target.code,
            candidate.relation,
            edge.strength or "medium",
            _evidence_summary(candidate) or candidate.explanation,
            edge.review_status,
        ),
    )


def _row_to_node(row: sqlite3.Row) -> AbilityGraphNode:
    return AbilityGraphNode(
        id=row["id"],
        kind=row["kind"],
        code=row["code"],
        name=row["name"],
        description=row["description"],
        origin=row["origin"],
        properties=json.loads(row["properties_json"] or "{}"),
    )


def _row_to_edge(row: sqlite3.Row) -> AbilityGraphEdge:
    return AbilityGraphEdge(
        id=row["id"],
        source=row["source"],
        target=row["target"],
        kind=row["kind"],
        source_type=row["source_type"],
        review_status=row["review_status"],
        strength=row["strength"],
        confidence=row["confidence"],
        ai_reasoning=row["ai_reasoning"],
        candidate_id=row["candidate_id"],
        reviewed_by=_optional_row_value(row, "reviewed_by"),
        reviewed_at=_optional_row_value(row, "reviewed_at"),
        evidence_summary=_optional_row_value(row, "evidence_summary"),
    )


def _optional_row_value(row: sqlite3.Row, key: str) -> str | None:
    if key not in tuple(row.keys()):
        return None
    return row[key]


def _node_from_candidate_source(candidate: RecognitionCandidate) -> AbilityGraphNode:
    name = candidate.source_node
    kind = "Experiment" if "实验" in name else "Course"
    code = _extract_code(name) or f"SRC-{_stable_suffix(name)}"
    return AbilityGraphNode(
        id=_stable_node_id("source", name),
        kind=kind,
        code=code,
        name=name,
        description=f"由候选关系 {candidate.id} 审核后进入正式图谱。",
        origin="school",
        properties={
            "course": candidate.course,
            "candidateId": candidate.id,
            "reviewedBy": candidate.reviewed_by or "",
            "reviewedAt": candidate.reviewed_at or "",
            "evidenceCount": len(candidate.evidence),
        },
    )


def _node_from_candidate_target(candidate: RecognitionCandidate) -> AbilityGraphNode:
    name = candidate.target_node
    code = _extract_code(name) or f"TGT-{_stable_suffix(name)}"
    standard_id = _standard_id_for_code(code)
    return AbilityGraphNode(
        id=standard_id or _stable_node_id("target", name),
        kind="Competency",
        code=code,
        name=name,
        description="由材料识别和教师审核确认的能力指标节点。",
        origin="standard" if standard_id else "school",
        properties={},
    )


def _extract_code(text: str) -> str | None:
    match = re.search(r"(C-\d{2}-\d{2}|GR-?\d{1,2}(?:-\d{1,2})?)", text, flags=re.I)
    if not match:
        return None
    code = match.group(1).upper().replace("GR", "GR-")
    code = code.replace("GR--", "GR-")
    return code


def _standard_id_for_code(code: str) -> str | None:
    normalized = code.lower()
    if normalized.startswith("c-"):
        return f"std-{normalized}"
    if normalized.startswith("gr-"):
        return f"std-{normalized}"
    return None


def _review_reasoning(candidate: RecognitionCandidate) -> str:
    parts = [candidate.explanation]
    if candidate.review_comment:
        parts.append(f"Teacher review comment: {candidate.review_comment}")
    if candidate.reviewed_by or candidate.reviewed_at:
        reviewer = candidate.reviewed_by or "unknown"
        reviewed_at = candidate.reviewed_at or "unknown time"
        parts.append(f"Reviewed by {reviewer} at {reviewed_at}.")
    return "\n".join(part for part in parts if part)


def _evidence_summary(candidate: RecognitionCandidate) -> str | None:
    if not candidate.evidence:
        return None
    first = candidate.evidence[0]
    return f"{first.resource_name} / {first.coordinate} / {first.hash}"


def _stable_node_id(prefix: str, text: str) -> str:
    return f"{prefix}-{uuid5(NAMESPACE_URL, text).hex[:12]}"


def _stable_suffix(text: str) -> str:
    return uuid5(NAMESPACE_URL, text).hex[:6].upper()


def _strength_from_confidence(confidence: int) -> str:
    if confidence >= 85:
        return "strong"
    if confidence >= 70:
        return "medium"
    return "weak"
