import json
import sqlite3
from dataclasses import asdict, replace
from hashlib import sha256
from pathlib import Path

from app.modules.recognition.domain.candidate import (
    CandidateEvidence,
    CandidateReviewStatus,
    RecognitionCandidate,
    RecognitionCandidateRisk,
    RecognitionCandidateType,
)
from app.modules.recognition.infra.memory_store import _SEED_CANDIDATES


class SQLiteCandidateRepository:
    def __init__(self, user_id: str, base_dir: Path | None = None) -> None:
        api_root = Path(__file__).resolve().parents[4]
        self._base_dir = base_dir or api_root / "var"
        self._db_path = self._base_dir / "ea_mvp.sqlite3"
        self._user_id = user_id
        self._base_dir.mkdir(parents=True, exist_ok=True)
        self._ensure_schema()
        self._ensure_seed()

    async def list_all(
        self,
        *,
        course: str | None = None,
        risk: str | None = None,
        candidate_type: str | None = None,
    ) -> list[RecognitionCandidate]:
        clauses = ["user_id = ?"]
        params: list[str] = [self._user_id]
        if course:
            clauses.append("course = ?")
            params.append(course)
        if risk:
            clauses.append("risk = ?")
            params.append(risk)
        if candidate_type:
            clauses.append("candidate_type = ?")
            params.append(candidate_type)
        with self._connect() as conn:
            rows = conn.execute(
                f"""
                select payload_json from recognition_candidates
                where {' and '.join(clauses)}
                order by generated_at desc, id
                """,
                params,
            ).fetchall()
        return [_payload_to_candidate(row["payload_json"]) for row in rows]

    async def get_by_id(self, candidate_id: str) -> RecognitionCandidate | None:
        with self._connect() as conn:
            row = conn.execute(
                """
                select payload_json from recognition_candidates
                where user_id = ? and id = ?
                """,
                (self._user_id, candidate_id),
            ).fetchone()
        return _payload_to_candidate(row["payload_json"]) if row else None

    async def add(self, candidate: RecognitionCandidate) -> RecognitionCandidate:
        self._upsert(candidate)
        return candidate

    async def add_many(self, candidates: list[RecognitionCandidate]) -> list[RecognitionCandidate]:
        with self._connect() as conn:
            for candidate in candidates:
                _upsert_candidate(conn, self._user_id, candidate)
        return candidates

    async def update_review_status(
        self,
        candidate_id: str,
        status: CandidateReviewStatus,
        *,
        reviewed_by: str | None = None,
        reviewed_at: str | None = None,
        review_comment: str | None = None,
        source_node: str | None = None,
        target_node: str | None = None,
        relation: str | None = None,
        confidence: int | None = None,
        strength: str | None = None,
        evidence_excerpt: str | None = None,
    ) -> RecognitionCandidate | None:
        existing = await self.get_by_id(candidate_id)
        if existing is None:
            return None
        evidence = _update_evidence_excerpt(existing.evidence, evidence_excerpt)
        updated = RecognitionCandidate(
            **{
                **asdict(existing),
                "review_status": status,
                "source_node": source_node or existing.source_node,
                "target_node": target_node or existing.target_node,
                "relation": relation or existing.relation,
                "confidence": confidence if confidence is not None else existing.confidence,
                "support_strength": strength or existing.support_strength,
                "reviewed_by": reviewed_by or existing.reviewed_by,
                "reviewed_at": reviewed_at or existing.reviewed_at,
                "review_comment": review_comment,
                "evidence": evidence,
            }
        )
        self._upsert(updated)
        return updated

    def _upsert(self, candidate: RecognitionCandidate) -> None:
        with self._connect() as conn:
            _upsert_candidate(conn, self._user_id, candidate)

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _ensure_schema(self) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                create table if not exists recognition_candidates (
                    id text not null,
                    user_id text not null,
                    course text not null,
                    risk text not null,
                    candidate_type text not null,
                    review_status text not null,
                    generated_at text not null,
                    payload_json text not null,
                    primary key(user_id, id)
                )
                """
            )
            conn.execute(
                """
                create index if not exists idx_recognition_candidates_user_review
                on recognition_candidates(user_id, review_status, generated_at desc)
                """
            )

    def _ensure_seed(self) -> None:
        with self._connect() as conn:
            existing = conn.execute(
                "select count(*) from recognition_candidates where user_id = ?",
                (self._user_id,),
            ).fetchone()[0]
            if existing:
                return
            for candidate in _SEED_CANDIDATES:
                _upsert_candidate(conn, self._user_id, candidate)


def _upsert_candidate(
    conn: sqlite3.Connection,
    user_id: str,
    candidate: RecognitionCandidate,
) -> None:
    conn.execute(
        """
        insert into recognition_candidates (
            id, user_id, course, risk, candidate_type, review_status,
            generated_at, payload_json
        ) values (?, ?, ?, ?, ?, ?, ?, ?)
        on conflict(user_id, id) do update set
            course = excluded.course,
            risk = excluded.risk,
            candidate_type = excluded.candidate_type,
            review_status = excluded.review_status,
            generated_at = excluded.generated_at,
            payload_json = excluded.payload_json
        """,
        (
            candidate.id,
            user_id,
            candidate.course,
            candidate.risk,
            candidate.candidate_type,
            candidate.review_status,
            candidate.generated_at,
            _candidate_to_payload(candidate),
        ),
    )


def _candidate_to_payload(candidate: RecognitionCandidate) -> str:
    return json.dumps(asdict(candidate), ensure_ascii=False)


def _payload_to_candidate(payload: str) -> RecognitionCandidate:
    data = json.loads(payload)
    return RecognitionCandidate(
        id=data["id"],
        title=data["title"],
        course=data["course"],
        candidate_type=RecognitionCandidateType(data["candidate_type"]),
        confidence=data["confidence"],
        risk=RecognitionCandidateRisk(data["risk"]),
        source_node=data["source_node"],
        relation=data["relation"],
        target_node=data["target_node"],
        explanation=data["explanation"],
        processor_version=data["processor_version"],
        generated_at=data["generated_at"],
        review_status=CandidateReviewStatus(data.get("review_status", "pending")),
        impact_course_objectives=data.get("impact_course_objectives", 0),
        impact_ability_nodes=data.get("impact_ability_nodes", 0),
        impact_rubric_items=data.get("impact_rubric_items", 0),
        support_strength=data.get("support_strength"),
        conflict_message=data.get("conflict_message"),
        reviewed_by=data.get("reviewed_by"),
        reviewed_at=data.get("reviewed_at"),
        review_comment=data.get("review_comment"),
        evidence=tuple(
            CandidateEvidence(
                id=e["id"],
                resource_name=e["resource_name"],
                resource_version=e["resource_version"],
                coordinate=e["coordinate"],
                excerpt=e["excerpt"],
                hash=e["hash"],
            )
            for e in data.get("evidence", [])
        ),
    )


def _update_evidence_excerpt(
    evidence: tuple[CandidateEvidence, ...],
    excerpt: str | None,
) -> tuple[CandidateEvidence, ...]:
    if not excerpt:
        return evidence
    if not evidence:
        digest = sha256(excerpt.encode("utf-8")).hexdigest()[:12]
        return (
            CandidateEvidence(
                id="evidence-review-edited",
                resource_name="teacher-review",
                resource_version="review",
                coordinate="teacher-edited-evidence",
                excerpt=excerpt,
                hash=f"SHA256 {digest}",
            ),
        )
    first = evidence[0]
    digest = sha256(excerpt.encode("utf-8")).hexdigest()[:12]
    return (
        replace(first, excerpt=excerpt, hash=f"SHA256 {digest}"),
        *evidence[1:],
    )
