# -*- coding: utf-8 -*-
"""Autopilot 编排器：串联 extract → infer → explain → suggest 全链路。"""
from __future__ import annotations

import logging
import time
from datetime import datetime, timezone

from app.modules.diagnostics.domain.finding import (
    DiagnosticEvidenceRef,
    DiagnosticFinding,
    DiagnosticFindingRisk,
    DiagnosticFindingType,
    FindingDecisionStatus,
)
from app.modules.llm.application.ports import LLMClientPort
from app.modules.llm.application.rag_port import RAGSearchPort
from app.modules.recognition.domain.candidate import (
    CandidateEvidence,
    CandidateReviewStatus,
    RecognitionCandidate,
    RecognitionCandidateRisk,
    RecognitionCandidateType,
)
from app.modules.resources.application.ports import ResourceRepository

logger = logging.getLogger(__name__)

# 预置的认证标准指标（mock 数据，正式版从标准库加载）
_STANDARD_NODES: list[dict] = [
    {"id": "GR-1", "code": "GR-1", "name": "工程知识", "description": "能够将数学、自然科学、工程基础和专业知识用于解决复杂工程问题。"},
    {"id": "GR-2", "code": "GR-2", "name": "问题分析", "description": "能够应用数学、自然科学和工程科学的基本原理，识别、表达并通过文献研究分析复杂工程问题。"},
    {"id": "GR-3", "code": "GR-3", "name": "设计/开发解决方案", "description": "能够设计针对复杂工程问题的解决方案，设计满足特定需求的系统、单元或部件。"},
    {"id": "GR-4", "code": "GR-4", "name": "研究", "description": "能够基于科学原理并采用科学方法对复杂工程问题进行研究，包括设计实验、分析与解释数据。"},
    {"id": "GR-5", "code": "GR-5", "name": "使用现代工具", "description": "能够针对复杂工程问题，开发、选择与使用恰当的技术、资源、现代工程工具和信息技术工具。"},
]


class AutopilotOrchestrator:
    """一键编排：材料 → 节点提取 → 关系推断 → 诊断 → 建议。"""

    def __init__(
        self,
        llm_client: LLMClientPort,
        rag_repo: RAGSearchPort,
        resources_repo: ResourceRepository,
        candidates_repo,  # InMemoryCandidateRepository
        findings_repo,   # InMemoryFindingRepository
    ) -> None:
        self._llm = llm_client
        self._rag = rag_repo
        self._resources = resources_repo
        self._candidates = candidates_repo
        self._findings = findings_repo

    async def run(self, resource_id: str, course: str | None = None) -> dict:
        started = time.time()
        started_at = datetime.now(timezone.utc).isoformat()
        steps: list[dict] = []

        # ── Step 0: 获取资源 ──
        resource = await self._resources.get_by_id(resource_id)
        if resource is None:
            raise ValueError(f"资源不存在: {resource_id}")

        course_name = course or resource.course
        material_name = resource.name

        # 用证据片段 + 描述组成"材料文本"（正式版接文件解析）
        fragments_text = "\n".join(
            f"[{f.coordinate}] {f.preview}" for f in resource.evidence_fragments
        )
        material_text = f"材料名称：{material_name}\n课程：{course_name}\n\n{fragments_text}"

        # ── Step 1: 节点提取 ──
        t1 = time.time()
        try:
            extraction = await self._llm.extract_nodes(
                material_text=material_text,
                material_category=resource.resource_type,
                material_name=material_name,
            )
            nodes = extraction.data
            steps.append({
                "step": "extract",
                "status": "success",
                "latency_ms": extraction.latency,
                "summary": f"提取到 {len(nodes)} 个教学节点",
                "items_count": len(nodes),
            })
        except Exception as e:
            logger.error("Autopilot extract 失败: %s", e)
            nodes = []
            steps.append({
                "step": "extract",
                "status": "failed",
                "latency_ms": int((time.time() - t1) * 1000),
                "summary": f"提取失败: {e}",
                "items_count": 0,
            })

        # ── Step 2: 关系推断 ──
        t2 = time.time()
        relations = []
        try:
            school_nodes = [
                {"id": n.code, "code": n.code, "name": n.name, "kind": n.kind}
                for n in nodes
            ]
            infer_resp = await self._llm.infer_relations(
                school_nodes=school_nodes,
                standard_nodes=_STANDARD_NODES,
            )
            relations = infer_resp.data
            steps.append({
                "step": "infer-relations",
                "status": "success",
                "latency_ms": infer_resp.latency,
                "summary": f"推断出 {len(relations)} 条支撑关系",
                "items_count": len(relations),
            })

            # 写入 candidates 仓储
            new_candidates = [
                self._build_candidate(rel, resource, course_name)
                for rel in relations
            ]
            if new_candidates:
                await self._candidates.add_many(new_candidates)
        except Exception as e:
            logger.error("Autopilot infer 失败: %s", e)
            steps.append({
                "step": "infer-relations",
                "status": "failed",
                "latency_ms": int((time.time() - t2) * 1000),
                "summary": f"关系推断失败: {e}",
                "items_count": 0,
            })

        # ── Step 3: RAG ingest + 诊断叙述 ──
        t3 = time.time()
        findings_data: list[dict] = []
        try:
            # 把材料文本灌入 RAG
            await self._rag.ingest(
                text=material_text,
                source=material_name,
                page=None,
                metadata={"resource_id": resource_id},
            )

            # 构建缺口事实：从标准节点中找出没有被任何关系覆盖的
            covered_targets = {r.target_id for r in relations}
            gap_facts = [
                {
                    "code": std["code"],
                    "name": std["name"],
                    "description": std["description"],
                    "gap_type": "coverage",
                    "rule_based_explanation": f"{std['name']}（{std['code']}）当前无教学材料节点支撑，达成度评价将缺少输入。",
                }
                for std in _STANDARD_NODES
                if std["id"] not in covered_targets
            ]
            if not gap_facts:
                gap_facts = [
                    {
                        "code": std["code"],
                        "name": std["name"],
                        "description": std["description"],
                        "gap_type": "weak",
                        "rule_based_explanation": f"{std['name']}（{std['code']}）支撑较弱，建议补充证据。",
                    }
                    for std in _STANDARD_NODES[:2]
                ]

            # RAG 检索证据
            rag_context: list[str] = []
            for fact in gap_facts:
                query = f"{fact.get('name', '')} {fact.get('code', '')}"
                result = await self._rag.search(query, top_k=2)
                for chunk in result.chunks:
                    rag_context.append(f"[{chunk.source}] {chunk.text}")

            explain_resp = await self._llm.generate_explanation(
                gap_facts=gap_facts,
                rag_context=rag_context,
            )

            findings_data = [
                {
                    "target_code": item.target_code,
                    "target_name": item.target_name,
                    "narrative": item.narrative,
                    "evidence_refs": item.evidence_refs or [],
                }
                for item in explain_resp.data
            ]
            steps.append({
                "step": "explain",
                "status": "success",
                "latency_ms": explain_resp.latency,
                "summary": f"生成 {len(findings_data)} 条诊断叙述",
                "items_count": len(findings_data),
            })

            # 写入 findings 仓储
            new_findings = [
                self._build_finding(f, resource, course_name)
                for f in findings_data
            ]
            if new_findings:
                await self._findings.add_many(new_findings)
        except Exception as e:
            logger.error("Autopilot explain 失败: %s", e)
            steps.append({
                "step": "explain",
                "status": "failed",
                "latency_ms": int((time.time() - t3) * 1000),
                "summary": f"诊断失败: {e}",
                "items_count": 0,
            })

        # ── Step 4: 改进建议 ──
        t4 = time.time()
        suggestions_data: list[dict] = []
        try:
            gaps_for_suggest = [
                {
                    "code": f["target_code"],
                    "name": f["target_name"],
                    "narrative": f["narrative"],
                }
                for f in findings_data
            ] or gap_facts

            suggest_resp = await self._llm.generate_suggestions(gaps=gaps_for_suggest)
            suggestions_data = [
                {
                    "target_code": item.target_code,
                    "target_name": item.target_name,
                    "root_cause": item.root_cause,
                    "suggestion": item.suggestion,
                    "expected_effect": item.expected_effect,
                }
                for item in suggest_resp.data
            ]
            steps.append({
                "step": "suggest",
                "status": "success",
                "latency_ms": suggest_resp.latency,
                "summary": f"生成 {len(suggestions_data)} 条改进建议",
                "items_count": len(suggestions_data),
            })
        except Exception as e:
            logger.error("Autopilot suggest 失败: %s", e)
            steps.append({
                "step": "suggest",
                "status": "failed",
                "latency_ms": int((time.time() - t4) * 1000),
                "summary": f"建议生成失败: {e}",
                "items_count": 0,
            })

        finished_at = datetime.now(timezone.utc).isoformat()
        total_ms = int((time.time() - started) * 1000)

        return {
            "resource_id": resource_id,
            "resource_name": material_name,
            "course": course_name,
            "model": extraction.model if nodes else "unknown",
            "started_at": started_at,
            "finished_at": finished_at,
            "total_latency_ms": total_ms,
            "steps": steps,
            "nodes": [
                {
                    "code": n.code,
                    "name": n.name,
                    "kind": n.kind,
                    "confidence": n.confidence,
                    "source_excerpt": n.source_excerpt,
                }
                for n in nodes
            ],
            "relations": [
                {
                    "source_id": r.source_id,
                    "target_id": r.target_id,
                    "relation_type": r.relation_type,
                    "strength": r.strength,
                    "confidence": r.confidence,
                    "reasoning": r.reasoning,
                }
                for r in relations
            ],
            "findings": findings_data,
            "suggestions": suggestions_data,
            "candidates_created": len(relations),
            "findings_created": len(findings_data),
        }

    def _build_candidate(
        self, relation, resource, course_name: str
    ) -> RecognitionCandidate:
        now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M")
        return RecognitionCandidate(
            id=f"candidate-auto-{relation.source_id}-{relation.target_id}-{int(time.time()*1000) % 10000}",
            title=f"{relation.source_id} 支撑 {relation.target_id}",
            course=course_name,
            candidate_type=RecognitionCandidateType.RELATION,
            confidence=int(relation.confidence * 100),
            risk=RecognitionCandidateRisk.NORMAL,
            source_node=relation.source_id,
            relation="支撑",
            target_node=relation.target_id,
            explanation=relation.reasoning,
            processor_version="autopilot-v1.0",
            generated_at=now,
            review_status=CandidateReviewStatus.PENDING,
            evidence=(
                CandidateEvidence(
                    id=f"ev-auto-{int(time.time()*1000)}",
                    resource_name=resource.name,
                    resource_version=resource.version,
                    coordinate="autopilot",
                    excerpt=relation.reasoning[:200],
                    hash="auto",
                ),
            ),
        )

    def _build_finding(
        self, finding_data: dict, resource, course_name: str
    ) -> DiagnosticFinding:
        now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M")
        return DiagnosticFinding(
            id=f"finding-auto-{finding_data['target_code']}-{int(time.time()*1000) % 10000}",
            title=f"{finding_data['target_name']}（{finding_data['target_code']}）支撑不足",
            course=course_name,
            type=DiagnosticFindingType.COVERAGE_GAP,
            risk=DiagnosticFindingRisk.MEDIUM,
            source_node=finding_data["target_code"],
            target_node="（待补充教学材料）",
            relation_label="支撑",
            graph_version="autopilot-v1.0",
            rule_id="RULE-AUTO-001",
            rule_version="v1.0",
            rule_kind="ai-semantic",
            rule_basis="Autopilot 自动诊断：该指标缺乏足够的教学材料支撑",
            rule_rationale=finding_data.get("narrative", ""),
            rule_run_at=now,
            decision_status=FindingDecisionStatus.PENDING,
            suggested_destination="M7",
            evidence=(
                DiagnosticEvidenceRef(
                    id=f"diag-ev-auto-{int(time.time()*1000)}",
                    object_name=resource.name,
                    object_version=resource.version,
                    coordinate="autopilot",
                    excerpt=finding_data.get("narrative", "")[:200],
                    hash="auto",
                ),
            ),
        )
