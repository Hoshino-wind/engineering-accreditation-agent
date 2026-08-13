"""识别中心审核决策 → 能力图谱投影（领域层，纯函数）。

设计原则：**图谱是审核决策的投影，不是复制品。**

对外提供的能力图谱 = 运行图谱状态（LangGraph）⊕ 识别中心审核决策投影：

- ``accepted``（采纳）的关系候选 → 对应 SUPPORTS 边标记 approved；
  若该边不存在（如教师采纳了运行之外的候选），按置信度派生强度新建一条
  sourceType=manual 的 approved 边；
- ``rejected``（驳回）的关系候选 → 对应 SUPPORTS 边降级为 rejected，
  不再计入覆盖度；
- ``pending`` / ``modified`` 候选只留审核记录，不改变图谱。

节点引用按 id → code → name 的顺序解析；任一端点解析失败时该决策仅保留
审核留档，不产生投影（避免把不存在的节点凭空写入图谱）。

候选按 generated_at 升序处理，后发生的决策覆盖先发生的，保证教师复核可以
推翻此前（包括自动审核）的结论。
"""

from __future__ import annotations

from typing import Any

from app.modules.recognition.domain.candidate import (
    CandidateReviewStatus,
    RecognitionCandidateType,
)

# 置信度 → 支撑强度的确定性映射（与审核界面的置信度展示同口径）
_STRONG_CONFIDENCE = 85
_MEDIUM_CONFIDENCE = 70


def strength_from_confidence(confidence: int) -> str:
    """候选置信度（0-100）派生支撑边强度。"""
    if confidence >= _STRONG_CONFIDENCE:
        return "strong"
    if confidence >= _MEDIUM_CONFIDENCE:
        return "medium"
    return "weak"


def _resolve_node(ref: str, nodes: list[dict[str, Any]]) -> dict[str, Any] | None:
    """把候选里的节点引用（可能是 id / code / name）解析为图谱节点。

    第一遍精确匹配，第二遍忽略大小写：LLM 返回的引用可能与节点 id/code
    大小写不一致（如 'co-ds' vs 'CO-DS'），避免有效审核决策被静默丢弃。
    """
    if not ref:
        return None
    ref_lower = ref.lower()
    for node in nodes:
        if node.get("id") == ref or str(node.get("id") or "").lower() == ref_lower:
            return node
    for node in nodes:
        if node.get("code") == ref or str(node.get("code") or "").lower() == ref_lower:
            return node
    for node in nodes:
        if node.get("name") == ref or str(node.get("name") or "").lower() == ref_lower:
            return node
    return None


def _find_supports_edges(
    edges: list[dict[str, Any]], source_id: str, target_id: str
) -> list[dict[str, Any]]:
    matches: list[dict[str, Any]] = []
    for edge in edges:
        if (
            edge.get("kind") == "SUPPORTS"
            and edge.get("source") == source_id
            and edge.get("target") == target_id
        ):
            matches.append(edge)
    return matches


def apply_review_decisions(
    nodes: list[dict[str, Any]],
    edges: list[dict[str, Any]],
    candidates: list[Any],
) -> dict[str, list[dict[str, Any]]]:
    """把关系候选的审核决策投影到图谱上，返回新的 {nodes, edges}。

    candidates 为 RecognitionCandidate 列表（按字段鸭子类型读取，便于测试）。
    输入不被修改；返回浅拷贝后的新边列表。
    """
    relation_candidates = [
        c
        for c in candidates
        if getattr(c, "candidate_type", None) == RecognitionCandidateType.RELATION
    ]
    # generated_at 升序：后发生的决策覆盖先发生的
    relation_candidates.sort(key=lambda c: getattr(c, "generated_at", "") or "")

    projected: list[dict[str, Any]] = [dict(e) for e in edges]

    for candidate in relation_candidates:
        status = getattr(candidate, "review_status", CandidateReviewStatus.PENDING)
        if status not in (
            CandidateReviewStatus.ACCEPTED,
            CandidateReviewStatus.REJECTED,
        ):
            continue

        source_node = _resolve_node(
            getattr(candidate, "source_node", "") or "", nodes
        )
        target_node = _resolve_node(
            getattr(candidate, "target_node", "") or "", nodes
        )
        if source_node is None or target_node is None:
            # 端点不在当前图谱中：保留审核留档，不投影
            continue

        source_id = str(source_node["id"])
        target_id = str(target_node["id"])
        existing_edges = list(_find_supports_edges(projected, source_id, target_id))

        if status == CandidateReviewStatus.ACCEPTED:
            confidence = int(getattr(candidate, "confidence", 0) or 0)
            strength = strength_from_confidence(confidence)
            evidence_items = tuple(getattr(candidate, "evidence", ()) or ())
            primary_evidence = evidence_items[0] if evidence_items else None
            material_metadata = {
                "materialResourceId": getattr(primary_evidence, "resource_id", "") or "",
                "materialVersion": getattr(primary_evidence, "resource_version", "") or "",
                "materialName": getattr(primary_evidence, "resource_name", "") or "",
            }
            if existing_edges:
                for existing in existing_edges:
                    existing["reviewStatus"] = "approved"
                    existing["strength"] = strength
                    existing["confidence"] = confidence / 100
                    for key, value in material_metadata.items():
                        if value and not existing.get(key):
                            existing[key] = value
            else:
                projected.append(
                    {
                        "id": f"proj-{source_id}-{target_id}",
                        "source": source_id,
                        "target": target_id,
                        "kind": "SUPPORTS",
                        "sourceType": "manual",
                        "reviewStatus": "approved",
                        "strength": strength,
                        "confidence": confidence / 100,
                        "reasoning": (
                            f"教师在识别中心采纳候选「{getattr(candidate, 'title', '')}」"
                        ),
                        **material_metadata,
                    }
                )
        else:  # REJECTED
            for existing in existing_edges:
                existing["reviewStatus"] = "rejected"

    return {"nodes": list(nodes), "edges": projected}
