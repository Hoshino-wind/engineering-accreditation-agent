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
        title="「二叉树遍历」实验支撑课程目标 CT-3",
        course="数据结构",
        candidate_type=RecognitionCandidateType.RELATION,
        confidence=78,
        risk=RecognitionCandidateRisk.HIGH_IMPACT,
        source_node="二叉树遍历实验",
        relation="支撑",
        target_node="课程目标 CT-3",
        explanation="实验内容涉及二叉树的递归与非递归遍历实现，可直接支撑学生对树结构算法设计与实现能力的培养。",
        processor_version="recognition-pipeline v3.2",
        generated_at="2026-07-28 10:26",
        impact_course_objectives=1,
        impact_ability_nodes=1,
        impact_rubric_items=2,
        conflict_message="与候选「排序算法实验支撑 CT-2」存在潜在目标聚合冲突，需确认课程目标边界。",
        evidence=(
            CandidateEvidence(
                id="evidence-tree-01",
                resource_name="数据结构实验指导书",
                resource_version="v2",
                coordinate="第 41 页 · 表 5-1",
                excerpt="实验五要求完成二叉树的创建、递归与非递归遍历，并分析不同遍历算法的适用场景和复杂度。",
                hash="SHA256 8304…b719",
            ),
            CandidateEvidence(
                id="evidence-tree-02",
                resource_name="《数据结构》课程教学大纲",
                resource_version="v3",
                coordinate="第 12 页 · 表 3-2 · 第 4 行",
                excerpt="课程目标 CT-3：能够针对复杂数据组织问题设计并实现适当的数据结构与算法。",
                hash="SHA256 d204…91c6",
            ),
        ),
    ),
    RecognitionCandidate(
        id="candidate-ds-backtracking-ct4",
        title="「回溯路径」实验支撑课程目标 CT-4",
        course="数据结构",
        candidate_type=RecognitionCandidateType.RELATION,
        confidence=66,
        risk=RecognitionCandidateRisk.LOW_CONFIDENCE,
        source_node="回溯路径实验",
        relation="支撑",
        target_node="课程目标 CT-4",
        explanation="材料描述了路径搜索与回溯，但未明确对应课程目标，需要教师补充目标定位。",
        processor_version="recognition-pipeline v3.2",
        generated_at="2026-07-28 10:26",
        impact_course_objectives=1,
        impact_ability_nodes=0,
        impact_rubric_items=1,
        evidence=(
            CandidateEvidence(
                id="evidence-backtracking-01",
                resource_name="数据结构实验指导书",
                resource_version="v2",
                coordinate="第 27 页 · 实验三 · 任务 2",
                excerpt="使用栈实现迷宫路径搜索，记录回溯过程并比较不同搜索策略。",
                hash="SHA256 7a33…2bc1",
            ),
        ),
    ),
    RecognitionCandidate(
        id="candidate-ds-sort-conflict",
        title="「排序算法」实验与课程目标 CT-2 冲突",
        course="数据结构",
        candidate_type=RecognitionCandidateType.RELATION,
        confidence=82,
        risk=RecognitionCandidateRisk.CONFLICT,
        source_node="排序算法综合实验",
        relation="支撑",
        target_node="课程目标 CT-2",
        explanation="实验任务与 CT-2 相关，但现有图谱已将同名实验关联到 CT-3，需要确认实验版本和目标定义。",
        processor_version="recognition-pipeline v3.2",
        generated_at="2026-07-28 10:27",
        impact_course_objectives=2,
        impact_ability_nodes=1,
        impact_rubric_items=2,
        conflict_message="正式图谱中存在「排序算法综合实验 -> CT-3」关系，来源版本为指导书 v1。",
        evidence=(
            CandidateEvidence(
                id="evidence-sort-01",
                resource_name="数据结构实验指导书",
                resource_version="v2",
                coordinate="第 63 页 · 实验七",
                excerpt="实现并比较快速排序、归并排序和堆排序，完成复杂度分析与实验验证。",
                hash="SHA256 641a…ec72",
            ),
        ),
    ),
    RecognitionCandidate(
        id="candidate-ds-hash-ct1",
        title="「哈希表实现」实验支撑课程目标 CT-1",
        course="数据结构",
        candidate_type=RecognitionCandidateType.RELATION,
        confidence=90,
        risk=RecognitionCandidateRisk.HIGH_IMPACT,
        source_node="哈希表实现实验",
        relation="支撑",
        target_node="课程目标 CT-1",
        explanation="实验目标、任务与课程目标表述高度一致，且具有两个独立来源。",
        processor_version="recognition-pipeline v3.2",
        generated_at="2026-07-28 10:28",
        impact_course_objectives=1,
        impact_ability_nodes=1,
        impact_rubric_items=1,
        evidence=(
            CandidateEvidence(
                id="evidence-hash-01",
                resource_name="数据结构实验指导书",
                resource_version="v2",
                coordinate="第 72 页 · 实验八",
                excerpt="设计散列表并比较不同冲突处理方法，分析装载因子对查找性能的影响。",
                hash="SHA256 4f71…910e",
            ),
            CandidateEvidence(
                id="evidence-hash-02",
                resource_name="《数据结构》课程教学大纲",
                resource_version="v3",
                coordinate="第 13 页 · 表 3-2 · 第 7 行",
                excerpt="课程目标 CT-1 要求学生掌握典型数据结构的组织、存储与基本操作。",
                hash="SHA256 097b…4a16",
            ),
        ),
    ),
]


class InMemoryCandidateRepository:
    def __init__(self, with_seed: bool = True) -> None:
        if with_seed:
            self._store: dict[str, RecognitionCandidate] = {
                c.id: c for c in _SEED_CANDIDATES
            }
        else:
            self._store: dict[str, RecognitionCandidate] = {}

    def clone(self) -> "InMemoryCandidateRepository":
        new_repo = InMemoryCandidateRepository(with_seed=False)
        new_repo._store = {
            cid: replace(candidate) for cid, candidate in self._store.items()
        }
        return new_repo

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

    async def add(self, candidate: RecognitionCandidate) -> RecognitionCandidate:
        self._store[candidate.id] = candidate
        return candidate

    async def add_many(self, candidates: list[RecognitionCandidate]) -> list[RecognitionCandidate]:
        for c in candidates:
            self._store[c.id] = c
        return candidates

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
