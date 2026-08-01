# -*- coding: utf-8 -*-
"""Generate memory_store.py files with correct UTF-8 encoding."""
import pathlib

RECOGNITION_STORE = '''\
# -*- coding: utf-8 -*-
from dataclasses import replace

from app.modules.recognition.domain.candidate import (
    CandidateEvidence,
    CandidateReviewStatus,
    RecognitionCandidate,
    RecognitionCandidateRisk,
    RecognitionCandidateType,
)

_SEED_CANDIDATES: list[RecognitionCandidate] = [
    RecognitionCandidate(
        id="candidate-ds-tree-ct3",
        title="\u300c\u4e8c\u53c9\u6811\u904d\u5386\u300d\u5b9e\u9a8c\u652f\u6491\u8bfe\u7a0b\u76ee\u6807 CT-3",
        course="\u6570\u636e\u7ed3\u6784",
        candidate_type=RecognitionCandidateType.RELATION,
        confidence=78,
        risk=RecognitionCandidateRisk.HIGH_IMPACT,
        source_node="\u4e8c\u53c9\u6811\u904d\u5386\u5b9e\u9a8c",
        relation="\u652f\u6491",
        target_node="\u8bfe\u7a0b\u76ee\u6807 CT-3",
        explanation="\u5b9e\u9a8c\u5185\u5bb9\u6d89\u53ca\u4e8c\u53c9\u6811\u7684\u9012\u5f52\u4e0e\u975e\u9012\u5f52\u904d\u5386\u5b9e\u73b0\uff0c\u53ef\u76f4\u63a5\u652f\u6491\u5b66\u751f\u5bf9\u6811\u7ed3\u6784\u7b97\u6cd5\u8bbe\u8ba1\u4e0e\u5b9e\u73b0\u80fd\u529b\u7684\u57f9\u517b\u3002",
        processor_version="recognition-pipeline v3.2",
        generated_at="2026-07-28 10:26",
        impact_course_objectives=1,
        impact_ability_nodes=1,
        impact_rubric_items=2,
        conflict_message="\u4e0e\u5019\u9009\u300c\u6392\u5e8f\u7b97\u6cd5\u5b9e\u9a8c\u652f\u6491 CT-2\u300d\u5b58\u5728\u6f5c\u5728\u76ee\u6807\u805a\u5408\u51b2\u7a81\uff0c\u9700\u786e\u8ba4\u8bfe\u7a0b\u76ee\u6807\u8fb9\u754c\u3002",
        evidence=(
            CandidateEvidence(
                id="evidence-tree-01",
                resource_name="\u6570\u636e\u7ed3\u6784\u5b9e\u9a8c\u6307\u5bfc\u4e66",
                resource_version="v2",
                coordinate="\u7b2c 41 \u9875 \u00b7 \u8868 5-1",
                excerpt="\u5b9e\u9a8c\u4e94\u8981\u6c42\u5b8c\u6210\u4e8c\u53c9\u6811\u7684\u521b\u5efa\u3001\u9012\u5f52\u4e0e\u975e\u9012\u5f52\u904d\u5386\uff0c\u5e76\u5206\u6790\u4e0d\u540c\u904d\u5386\u7b97\u6cd5\u7684\u9002\u7528\u573a\u666f\u548c\u590d\u6742\u5ea6\u3002",
                hash="SHA256 8304\u2026b719",
            ),
            CandidateEvidence(
                id="evidence-tree-02",
                resource_name="\u300a\u6570\u636e\u7ed3\u6784\u300b\u8bfe\u7a0b\u6559\u5b66\u5927\u7eb2",
                resource_version="v3",
                coordinate="\u7b2c 12 \u9875 \u00b7 \u8868 3-2 \u00b7 \u7b2c 4 \u884c",
                excerpt="\u8bfe\u7a0b\u76ee\u6807 CT-3\uff1a\u80fd\u591f\u9488\u5bf9\u590d\u6742\u6570\u636e\u7ec4\u7ec7\u95ee\u9898\u8bbe\u8ba1\u5e76\u5b9e\u73b0\u9002\u5f53\u7684\u6570\u636e\u7ed3\u6784\u4e0e\u7b97\u6cd5\u3002",
                hash="SHA256 d204\u202691c6",
            ),
        ),
    ),
    RecognitionCandidate(
        id="candidate-ds-backtracking-ct4",
        title="\u300c\u56de\u6eaf\u8def\u5f84\u300d\u5b9e\u9a8c\u652f\u6491\u8bfe\u7a0b\u76ee\u6807 CT-4",
        course="\u6570\u636e\u7ed3\u6784",
        candidate_type=RecognitionCandidateType.RELATION,
        confidence=66,
        risk=RecognitionCandidateRisk.LOW_CONFIDENCE,
        source_node="\u56de\u6eaf\u8def\u5f84\u5b9e\u9a8c",
        relation="\u652f\u6491",
        target_node="\u8bfe\u7a0b\u76ee\u6807 CT-4",
        explanation="\u6750\u6599\u63cf\u8ff0\u4e86\u8def\u5f84\u641c\u7d22\u4e0e\u56de\u6eaf\uff0c\u4f46\u672a\u660e\u786e\u5bf9\u5e94\u8bfe\u7a0b\u76ee\u6807\uff0c\u9700\u8981\u6559\u5e08\u8865\u5145\u76ee\u6807\u5b9a\u4f4d\u3002",
        processor_version="recognition-pipeline v3.2",
        generated_at="2026-07-28 10:26",
        impact_course_objectives=1,
        impact_ability_nodes=0,
        impact_rubric_items=1,
        evidence=(
            CandidateEvidence(
                id="evidence-backtracking-01",
                resource_name="\u6570\u636e\u7ed3\u6784\u5b9e\u9a8c\u6307\u5bfc\u4e66",
                resource_version="v2",
                coordinate="\u7b2c 27 \u9875 \u00b7 \u5b9e\u9a8c\u4e09 \u00b7 \u4efb\u52a1 2",
                excerpt="\u4f7f\u7528\u6808\u5b9e\u73b0\u8ff7\u5bab\u8def\u5f84\u641c\u7d22\uff0c\u8bb0\u5f55\u56de\u6eaf\u8fc7\u7a0b\u5e76\u6bd4\u8f83\u4e0d\u540c\u641c\u7d22\u7b56\u7565\u3002",
                hash="SHA256 7a33\u20262bc1",
            ),
        ),
    ),
    RecognitionCandidate(
        id="candidate-ds-sort-conflict",
        title="\u300c\u6392\u5e8f\u7b97\u6cd5\u300d\u5b9e\u9a8c\u4e0e\u8bfe\u7a0b\u76ee\u6807 CT-2 \u51b2\u7a81",
        course="\u6570\u636e\u7ed3\u6784",
        candidate_type=RecognitionCandidateType.RELATION,
        confidence=82,
        risk=RecognitionCandidateRisk.CONFLICT,
        source_node="\u6392\u5e8f\u7b97\u6cd5\u7efc\u5408\u5b9e\u9a8c",
        relation="\u652f\u6491",
        target_node="\u8bfe\u7a0b\u76ee\u6807 CT-2",
        explanation="\u5b9e\u9a8c\u4efb\u52a1\u4e0e CT-2 \u76f8\u5173\uff0c\u4f46\u73b0\u6709\u56fe\u8c31\u5df2\u5c06\u540c\u540d\u5b9e\u9a8c\u5173\u8054\u5230 CT-3\uff0c\u9700\u8981\u786e\u8ba4\u5b9e\u9a8c\u7248\u672c\u548c\u76ee\u6807\u5b9a\u4e49\u3002",
        processor_version="recognition-pipeline v3.2",
        generated_at="2026-07-28 10:27",
        impact_course_objectives=2,
        impact_ability_nodes=1,
        impact_rubric_items=2,
        conflict_message="\u6b63\u5f0f\u56fe\u8c31\u4e2d\u5b58\u5728\u300c\u6392\u5e8f\u7b97\u6cd5\u7efc\u5408\u5b9e\u9a8c -> CT-3\u300d\u5173\u7cfb\uff0c\u6765\u6e90\u7248\u672c\u4e3a\u6307\u5bfc\u4e66 v1\u3002",
        evidence=(
            CandidateEvidence(
                id="evidence-sort-01",
                resource_name="\u6570\u636e\u7ed3\u6784\u5b9e\u9a8c\u6307\u5bfc\u4e66",
                resource_version="v2",
                coordinate="\u7b2c 63 \u9875 \u00b7 \u5b9e\u9a8c\u4e03",
                excerpt="\u5b9e\u73b0\u5e76\u6bd4\u8f83\u5feb\u901f\u6392\u5e8f\u3001\u5f52\u5e76\u6392\u5e8f\u548c\u5806\u6392\u5e8f\uff0c\u5b8c\u6210\u590d\u6742\u5ea6\u5206\u6790\u4e0e\u5b9e\u9a8c\u9a8c\u8bc1\u3002",
                hash="SHA256 641a\u2026ec72",
            ),
        ),
    ),
    RecognitionCandidate(
        id="candidate-ds-hash-ct1",
        title="\u300c\u54c8\u5e0c\u8868\u5b9e\u73b0\u300d\u5b9e\u9a8c\u652f\u6491\u8bfe\u7a0b\u76ee\u6807 CT-1",
        course="\u6570\u636e\u7ed3\u6784",
        candidate_type=RecognitionCandidateType.RELATION,
        confidence=90,
        risk=RecognitionCandidateRisk.HIGH_IMPACT,
        source_node="\u54c8\u5e0c\u8868\u5b9e\u73b0\u5b9e\u9a8c",
        relation="\u652f\u6491",
        target_node="\u8bfe\u7a0b\u76ee\u6807 CT-1",
        explanation="\u5b9e\u9a8c\u76ee\u6807\u3001\u4efb\u52a1\u4e0e\u8bfe\u7a0b\u76ee\u6807\u8868\u8ff0\u9ad8\u5ea6\u4e00\u81f4\uff0c\u4e14\u5177\u6709\u4e24\u4e2a\u72ec\u7acb\u6765\u6e90\u3002",
        processor_version="recognition-pipeline v3.2",
        generated_at="2026-07-28 10:28",
        impact_course_objectives=1,
        impact_ability_nodes=1,
        impact_rubric_items=1,
        evidence=(
            CandidateEvidence(
                id="evidence-hash-01",
                resource_name="\u6570\u636e\u7ed3\u6784\u5b9e\u9a8c\u6307\u5bfc\u4e66",
                resource_version="v2",
                coordinate="\u7b2c 72 \u9875 \u00b7 \u5b9e\u9a8c\u516b",
                excerpt="\u8bbe\u8ba1\u6563\u5217\u8868\u5e76\u6bd4\u8f83\u4e0d\u540c\u51b2\u7a81\u5904\u7406\u65b9\u6cd5\uff0c\u5206\u6790\u88c5\u8f7d\u56e0\u5b50\u5bf9\u67e5\u627e\u6027\u80fd\u7684\u5f71\u54cd\u3002",
                hash="SHA256 4f71\u2026910e",
            ),
            CandidateEvidence(
                id="evidence-hash-02",
                resource_name="\u300a\u6570\u636e\u7ed3\u6784\u300b\u8bfe\u7a0b\u6559\u5b66\u5927\u7eb2",
                resource_version="v3",
                coordinate="\u7b2c 13 \u9875 \u00b7 \u8868 3-2 \u00b7 \u7b2c 7 \u884c",
                excerpt="\u8bfe\u7a0b\u76ee\u6807 CT-1 \u8981\u6c42\u5b66\u751f\u638c\u63e1\u5178\u578b\u6570\u636e\u7ed3\u6784\u7684\u7ec4\u7ec7\u3001\u5b58\u50a8\u4e0e\u57fa\u672c\u64cd\u4f5c\u3002",
                hash="SHA256 097b\u20264a16",
            ),
        ),
    ),
]


class InMemoryCandidateRepository:
    def __init__(self) -> None:
        self._store: dict[str, RecognitionCandidate] = {
            c.id: c for c in _SEED_CANDIDATES
        }

    async def list_all(
        self,
        *,
        course: str | None = None,
        risk: str | None = None,
        candidate_type: str | None = None,
    ) -> list[RecognitionCandidate]:
        results = list(self._store.values())
        if course:
            results = [c for c in results if c.course == course]
        if risk:
            results = [c for c in results if c.risk == risk]
        if candidate_type:
            results = [c for c in results if c.candidate_type == candidate_type]
        return results

    async def get_by_id(self, candidate_id: str) -> RecognitionCandidate | None:
        return self._store.get(candidate_id)

    async def update_review_status(
        self,
        candidate_id: str,
        status: CandidateReviewStatus,
    ) -> RecognitionCandidate | None:
        existing = self._store.get(candidate_id)
        if existing is None:
            return None
        updated = replace(existing, review_status=status)
        self._store[candidate_id] = updated
        return updated
'''

base = pathlib.Path(__file__).parent
target = base / "app" / "modules" / "recognition" / "infra" / "memory_store.py"
target.write_text(RECOGNITION_STORE, encoding="utf-8")
print(f"OK: {target} ({target.stat().st_size} bytes)")
