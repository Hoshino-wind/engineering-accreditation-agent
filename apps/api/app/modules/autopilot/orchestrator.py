# -*- coding: utf-8 -*-
"""Autopilot 编排器：一键触发真实多智能体 pipeline。

委托 LangGraph pipeline 完成全链路：
start_run（plan→extract→infer→停在审核网关）
→ 自动审核（置信度 ≥ 阈值批准，其余驳回，保留真实缺口供诊断）
→ resume_review（coverage→diagnose→improve→report）。

提取的节点真实并入能力图谱，审核后的关系、诊断发现真实落库，
"AI 自动分析"按钮的每一步产物都可在图谱 / 识别 / 诊断页面看到。
"""
from __future__ import annotations

import asyncio
import logging
import time
from datetime import datetime, timezone

from app.core.task_registry import TaskCancelledError
from app.modules.diagnostics.domain.finding import (
    DiagnosticEvidenceRef,
    DiagnosticFinding,
    DiagnosticFindingRisk,
    DiagnosticFindingType,
    FindingDecisionStatus,
)
from app.modules.llm.application.rag_port import RAGSearchPort
from app.modules.orchestration.application.ports import AgentOrchestratorPort
from app.modules.orchestration.domain.models import AgentRun, RunStatus
from app.modules.recognition.domain.candidate import (
    CandidateEvidence,
    CandidateReviewStatus,
    RecognitionCandidate,
    RecognitionCandidateRisk,
    RecognitionCandidateType,
)
from app.modules.resources.application.ports import ResourceRepository

logger = logging.getLogger(__name__)

# 自动审核置信度阈值：≥ 阈值批准入图，< 阈值驳回（保留缺口给诊断）
CONFIDENCE_APPROVE_THRESHOLD = 0.7

# 覆盖度强度权重（与 orchestration.domain.coverage 保持一致）：covered 需累计 ≥ 3
_STRENGTH_WEIGHT = {"strong": 3, "medium": 2, "weak": 1}
_COVERED_STRENGTH = 3

# pipeline 阶段 → Autopilot 步骤名（前端抽屉 stepLabelMap 可识别）
_PHASE_STEP_MAP = {
    "plan": "plan",
    "extract": "extract",
    "infer": "infer-relations",
    "review": "review",
    "coverage": "coverage",
    "diagnose": "explain",
    "improve": "suggest",
    "report": "report",
}

_STATUS_MAP = {"completed": "success", "failed": "failed", "skipped": "skipped"}


class AutopilotOrchestrator:
    """一键编排：材料 → 真实多智能体 pipeline → 图谱增长 + 诊断 + 建议。"""

    def __init__(
        self,
        pipeline: AgentOrchestratorPort,
        resources_repo: ResourceRepository,
        candidates_repo,  # InMemoryCandidateRepository
        findings_repo,   # InMemoryFindingRepository
        rag_repo: RAGSearchPort | None = None,
        task_registry=None,  # TaskCancellationRegistry
    ) -> None:
        self._pipeline = pipeline
        self._resources = resources_repo
        self._candidates = candidates_repo
        self._findings = findings_repo
        self._rag = rag_repo
        self._task_registry = task_registry

    async def run(self, resource_id: str, course: str | None = None) -> dict:
        started = time.time()
        started_at = datetime.now(timezone.utc).isoformat()

        # 注册取消令牌，删除资源时会触发取消
        token = None
        if self._task_registry is not None:
            token = await self._task_registry.register(resource_id)

        try:
            return await self._do_run(resource_id, course, started, started_at)
        finally:
            if self._task_registry is not None:
                await self._task_registry.unregister(resource_id)

    async def _do_run(
        self,
        resource_id: str,
        course: str | None,
        started: float,
        started_at: str,
    ) -> dict:
        # ── Step 0: 获取资源 ──
        resource = await self._resources.get_by_id(resource_id)
        if resource is None:
            raise ValueError(f"资源不存在: {resource_id}")
        course_name = course or resource.course

        # 取消检查点 1
        if self._task_registry is not None and await self._task_registry.is_cancelled(resource_id):
            logger.info("Autopilot 在获取资源后发现已取消: %s", resource_id)
            raise TaskCancelledError(resource_id)

        # ── Step 1: 拿到真实 pipeline 运行 ──
        # 优先复用上传后台触发的运行（避免同一材料双运行、双份 LLM 调用）；
        # 材料仍在解析中时，等待该运行到达人工审核网关后接管。
        run = await self._find_awaiting_run(resource.name)
        if run is None and not resource.extracted_text and resource.status.value == "processing":
            run = await self._wait_for_awaiting_run(resource.name)
        if run is None:
            # 手动点击旧材料（无上传运行）：等后台把解析文本落库，再自行启动运行
            resource = await self._wait_for_extracted_text(resource)
            material_text = resource.extracted_text or self._fallback_text(resource)
            goal = (
                f"一键分析教学材料「{resource.name}」（课程：{course_name}）："
                "提取能力节点、推断对毕业要求指标点的支撑关系、诊断覆盖缺口并给出改进建议"
            )
            run = await self._pipeline.start_run(
                goal=goal,
                material_category=str(resource.resource_type.value),
                material_name=resource.name,
                material_text=material_text,
            )
            if run.status == RunStatus.FAILED:
                raise RuntimeError(f"多智能体 pipeline 运行失败: {run.error}")
        else:
            logger.info("Autopilot 复用上传触发的运行 %s", run.run_id)

        # 取消检查点 2：pipeline 主阶段完成后、落库前
        if self._task_registry is not None and await self._task_registry.is_cancelled(resource_id):
            logger.info("Autopilot 在 pipeline 完成后发现已取消，跳过落库: %s", resource_id)
            raise TaskCancelledError(resource_id)

        # RAG 留档（尽力而为，失败不影响主链路）
        latest = await self._resources.get_by_id(resource_id)
        rag_text = (latest.extracted_text if latest else "") or ""
        if self._rag is not None and rag_text:
            try:
                await self._rag.ingest(
                    text=rag_text,
                    source=resource.name,
                    page=None,
                    metadata={"resource_id": resource_id},
                )
            except Exception as e:  # noqa: BLE001
                logger.warning("Autopilot RAG ingest 失败: %s", e)

        # ── Step 2: 自动审核并恢复（coverage→diagnose→improve→report）──
        review_total = len(run.pending_review)
        decided: dict[str, tuple[str, str]] = {}  # rel_id -> (decision, reason)
        if run.status == RunStatus.AWAITING_REVIEW:
            if run.pending_review:
                decided = self._auto_review(run.pending_review)
            decisions = [
                {"relation_id": rel_id, "decision": decision}
                for rel_id, (decision, _) in decided.items()
            ]
            resumed = await self._pipeline.resume_review(run.run_id, decisions)
            if resumed is not None:
                run = resumed
            if run.status == RunStatus.FAILED:
                raise RuntimeError(f"多智能体 pipeline 审核后恢复失败: {run.error}")

        # ── Step 3: 汇总产物并落库 ──
        result = run.result or {}
        extracted: list[dict] = result.get("extracted", [])
        relations: list[dict] = result.get("relations", [])
        explanations: list[dict] = result.get("explanations", [])
        suggestions: list[dict] = result.get("suggestions", [])

        candidates_created = await self._persist_candidates(
            relations, decided, resource, course_name
        )
        findings_created = await self._persist_findings(explanations, resource, course_name)

        finished_at = datetime.now(timezone.utc).isoformat()
        total_ms = int((time.time() - started) * 1000)

        return {
            "resource_id": resource_id,
            "resource_name": resource.name,
            "course": course_name,
            "model": self._extract_model(run),
            "started_at": started_at,
            "finished_at": finished_at,
            "total_latency_ms": total_ms,
            "steps": self._map_steps(
                run, extracted, relations, explanations, suggestions, review_total
            ),
            "nodes": [
                {
                    "code": n.get("code", ""),
                    "name": n.get("name", ""),
                    "kind": n.get("kind", "knowledge"),
                    "confidence": float(n.get("confidence") or 0.0),
                    "source_excerpt": n.get("sourceExcerpt"),
                }
                for n in extracted
            ],
            "relations": [
                {
                    "source_id": r.get("source", ""),
                    "target_id": r.get("target", ""),
                    "relation_type": "支撑",
                    "strength": r.get("strength") or "medium",
                    "confidence": float(r.get("confidence") or 0.0),
                    "reasoning": r.get("reasoning") or "",
                }
                for r in relations
            ],
            "findings": [
                {
                    "target_code": e.get("targetCode", ""),
                    "target_name": e.get("targetName", ""),
                    "narrative": e.get("narrative", ""),
                    "evidence_refs": e.get("evidenceRefs") or [],
                }
                for e in explanations
            ],
            "suggestions": [
                {
                    "target_code": s.get("targetCode", ""),
                    "target_name": s.get("targetName", ""),
                    "root_cause": s.get("rootCause", ""),
                    "suggestion": s.get("suggestion", ""),
                    "expected_effect": s.get("expectedEffect", ""),
                }
                for s in suggestions
            ],
            "candidates_created": candidates_created,
            "findings_created": findings_created,
        }

    # ── 私有辅助 ──────────────────────────────────────────

    async def _find_awaiting_run(self, material_name: str) -> AgentRun | None:
        """在现有运行中查找与该材料匹配、正停在审核网关的运行。"""
        for run in await self._pipeline.list_runs():
            if material_name and material_name in (run.goal or ""):
                if run.status == RunStatus.AWAITING_REVIEW:
                    return run
        return None

    async def _wait_for_awaiting_run(
        self, material_name: str, timeout: float = 90.0
    ) -> AgentRun | None:
        """等待上传后台触发的运行到达审核网关（或失败则提前退出）。"""
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            failed = False
            for run in await self._pipeline.list_runs():
                if material_name not in (run.goal or ""):
                    continue
                if run.status == RunStatus.AWAITING_REVIEW:
                    return run
                if run.status == RunStatus.FAILED:
                    failed = True
            if failed:
                return None
            await asyncio.sleep(2)
        return None

    async def _wait_for_extracted_text(self, resource, timeout: float = 15.0):
        """上传后台解析是异步的：短暂轮询等待 extracted_text 落库。"""
        deadline = time.monotonic() + timeout
        current = resource
        while time.monotonic() < deadline and not current.extracted_text:
            await asyncio.sleep(0.5)
            refreshed = await self._resources.get_by_id(current.id)
            if refreshed is None:
                break
            current = refreshed
        return current

    @staticmethod
    def _fallback_text(resource) -> str:
        """旧种子资源没有 extracted_text 时，用证据片段兜底。"""
        fragments = "\n".join(
            f"[{f.coordinate}] {f.preview}" for f in resource.evidence_fragments
        )
        base = f"材料名称：{resource.name}\n课程：{resource.course}"
        return f"{base}\n\n{fragments}" if fragments else base

    @staticmethod
    def _extract_model(run: AgentRun) -> str:
        for step in run.steps:
            for tool in step.tool_calls:
                if tool.summary.startswith("model="):
                    return tool.summary.split("=", 1)[1].strip()
        return "unknown"

    def _auto_review(self, pending_review: list[dict]) -> dict[str, tuple[str, str]]:
        """保守自动审核，返回 {relation_id: (decision, reason)}。

        策略：
        1. 每个指标点（target）只自动批准置信度最高且 ≥ 阈值的一条，其余驳回留档；
        2. 兜底保证至少一个指标点未被完全覆盖（累计强度 < 3），
           让诊断/改进智能体始终有真实缺口可分析——若按上一步所有指标点都会被
           完全覆盖，则把其中置信度最低的指标点的批准改为驳回。
        """
        by_target: dict[str, list[dict]] = {}
        for rel in pending_review:
            by_target.setdefault(str(rel.get("target", "")), []).append(rel)

        decided: dict[str, tuple[str, str]] = {}
        for rels in by_target.values():
            rels.sort(key=lambda r: float(r.get("confidence") or 0.0), reverse=True)
            for idx, rel in enumerate(rels):
                rel_id = str(rel.get("id", ""))
                conf = float(rel.get("confidence") or 0.0)
                if idx == 0 and conf >= CONFIDENCE_APPROVE_THRESHOLD:
                    decided[rel_id] = (
                        "approved",
                        f"置信度 {conf:.0%} ≥ {CONFIDENCE_APPROVE_THRESHOLD:.0%}，"
                        "且为该指标点置信度最高，自动批准入图",
                    )
                elif conf < CONFIDENCE_APPROVE_THRESHOLD:
                    decided[rel_id] = (
                        "rejected",
                        f"置信度 {conf:.0%} 低于阈值 "
                        f"{CONFIDENCE_APPROVE_THRESHOLD:.0%}，自动驳回",
                    )
                else:
                    decided[rel_id] = (
                        "rejected",
                        "同一指标点已有更高置信度关系被自动批准，本条保守驳回，可在识别中心人工复核",
                    )

        # 兜底：模拟覆盖强度，若所有指标点都会被完全覆盖，则降级置信度最低的一组
        strength: dict[str, int] = {t: 0 for t in by_target}
        best_conf: dict[str, float] = {}
        for rel in pending_review:
            target = str(rel.get("target", ""))
            rel_id = str(rel.get("id", ""))
            if decided.get(rel_id, ("",))[0] == "approved":
                weight = _STRENGTH_WEIGHT.get(str(rel.get("strength") or "").lower(), 0)
                strength[target] += weight
            best_conf[target] = max(
                best_conf.get(target, 0.0), float(rel.get("confidence") or 0.0)
            )
        if by_target and all(s >= _COVERED_STRENGTH for s in strength.values()):
            weakest = min(best_conf, key=lambda t: best_conf[t])
            for rel in by_target[weakest]:
                rel_id = str(rel.get("id", ""))
                if decided.get(rel_id, ("",))[0] == "approved":
                    decided[rel_id] = (
                        "rejected",
                        "该指标点证据强度足以覆盖，但其为全部指标点中置信度最低的一组，"
                        "自动审核保守起见改判驳回，留待教师人工复核",
                    )
        return decided

    def _map_steps(
        self,
        run: AgentRun,
        extracted: list[dict],
        relations: list[dict],
        explanations: list[dict],
        suggestions: list[dict],
        review_total: int,
    ) -> list[dict]:
        counts = {
            "plan": len(run.plan),
            "extract": len(extracted),
            "infer-relations": len(relations),
            "review": review_total,
            "coverage": int((run.result or {}).get("coverage", {}).get("gapCount", 0)),
            "explain": len(explanations),
            "suggest": len(suggestions),
            "report": len((run.result or {}).get("reportChapters", [])),
        }
        steps: list[dict] = []
        for step in run.steps:
            name = _PHASE_STEP_MAP.get(step.phase.value, step.phase.value)
            steps.append({
                "step": name,
                "status": _STATUS_MAP.get(step.status.value, "skipped"),
                "latency_ms": sum(t.latency_ms for t in step.tool_calls),
                "summary": step.summary,
                "items_count": counts.get(name, 0),
            })
        return steps

    async def _persist_candidates(
        self,
        relations: list[dict],
        decided: dict[str, tuple[str, str]],
        resource,
        course_name: str,
    ) -> int:
        now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M")
        seq = int(time.time() * 1000)
        candidates: list[RecognitionCandidate] = []
        for i, rel in enumerate(relations):
            rel_id = rel.get("id", f"rel-{i}")
            decision, verdict = decided.get(rel_id, ("rejected", "未参与本轮自动审核"))
            approved = decision == "approved"
            confidence = float(rel.get("confidence") or 0.0)
            reasoning = rel.get("reasoning") or ""
            candidates.append(RecognitionCandidate(
                id=f"candidate-auto-{seq % 100000}-{i}",
                title=f"{rel.get('source', '')} 支撑 {rel.get('target', '')}",
                course=course_name,
                candidate_type=RecognitionCandidateType.RELATION,
                confidence=int(confidence * 100),
                risk=RecognitionCandidateRisk.NORMAL,
                source_node=rel.get("source", ""),
                relation="支撑",
                target_node=rel.get("target", ""),
                explanation=f"{reasoning}\n【自动审核】{verdict}".strip(),
                processor_version="autopilot-v2.0",
                generated_at=now,
                review_status=(
                    CandidateReviewStatus.ACCEPTED
                    if approved
                    else CandidateReviewStatus.REJECTED
                ),
                evidence=(
                    CandidateEvidence(
                        id=f"ev-auto-{seq}-{i}",
                        resource_name=resource.name,
                        resource_version=resource.version,
                        coordinate="autopilot",
                        excerpt=(reasoning or verdict)[:200],
                        hash="auto",
                    ),
                ),
            ))
        if candidates:
            await self._candidates.add_many(candidates)
        return len(candidates)

    async def _persist_findings(
        self, explanations: list[dict], resource, course_name: str
    ) -> int:
        now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M")
        seq = int(time.time() * 1000)
        findings: list[DiagnosticFinding] = []
        for i, item in enumerate(explanations):
            target_code = item.get("targetCode", "")
            target_name = item.get("targetName", "")
            narrative = item.get("narrative", "")
            findings.append(DiagnosticFinding(
                id=f"finding-auto-{target_code}-{seq % 100000}-{i}",
                title=f"{target_name}（{target_code}）支撑不足",
                course=course_name,
                type=DiagnosticFindingType.COVERAGE_GAP,
                risk=DiagnosticFindingRisk.MEDIUM,
                source_node=target_code,
                target_node="（待补充教学材料）",
                relation_label="支撑",
                graph_version="autopilot-v2.0",
                rule_id="RULE-AUTO-001",
                rule_version="v2.0",
                rule_kind="ai-semantic",
                rule_basis="Autopilot 自动诊断：该指标缺乏足够的教学材料支撑",
                rule_rationale=narrative,
                rule_run_at=now,
                decision_status=FindingDecisionStatus.PENDING,
                suggested_destination="M7",
                evidence=(
                    DiagnosticEvidenceRef(
                        id=f"diag-ev-auto-{seq}-{i}",
                        object_name=resource.name,
                        object_version=resource.version,
                        coordinate="autopilot",
                        excerpt=narrative[:200],
                        hash="auto",
                    ),
                ),
            ))
        if findings:
            await self._findings.add_many(findings)
        return len(findings)
