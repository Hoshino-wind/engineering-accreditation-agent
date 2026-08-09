# -*- coding: utf-8 -*-
"""图谱待审边 ↔ 候选记录 对账修复（2026-08-10）。

问题：图谱中存在 review_status 为空（或 pending）的 AI 推断 SUPPORTS 边，
但候选仓储中没有对应候选 → 前端「采纳/驳回」按约定 ID（c-{edgeId}）
调审核接口返回 404 → 「审核写入失败」。

修复：
1. 为每条来源为 AI、状态非 approved 的边补建 RecognitionCandidate
   （id = "c-" + edge.id，与前端约定一致；course 从边的 source 课程节点推断）
2. 空 review_status 归一化为 pending
3. 幂等：已存在候选的边跳过

用法：python scripts/reconcile_pending_candidates.py [--user user-xxx] [--apply]
"""
from __future__ import annotations

import argparse
import sys
from datetime import UTC, datetime
from pathlib import Path

from app.modules.orchestration.infra.graph_state_store import JsonGraphStateStore
from app.modules.recognition.domain.candidate import (
    RecognitionCandidate,
    RecognitionCandidateRisk,
    RecognitionCandidateType,
)
from app.modules.recognition.infra.memory_store import InMemoryCandidateRepository

_DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def _candidate_from_edge(edge: dict, nodes_by_id: dict, course_names: set[str]) -> dict:
    """按前端约定构造候选：id = c-{edge.id}"""
    source = nodes_by_id.get(edge["source"], {})
    target = nodes_by_id.get(edge["target"], {})
    # course：优先取 source 侧课程节点名，否则取 target 侧课程名，否则空
    course = ""
    for node in (source, target):
        if node.get("kind") == "Course":
            course = node.get("name", "")
            break
    strength = edge.get("strength") or "medium"
    risk_map = {"strong": "highImpact", "medium": "normal", "weak": "lowConfidence"}
    title = f"AI 推断：{source.get('name', edge['source'])} 支撑 {target.get('name', edge['target'])}"
    return {
        "id": "c-" + edge["id"],
        "title": title,
        "course": course,
        "candidate_type": RecognitionCandidateType.RELATION,
        "confidence": 85,
        "risk": risk_map.get(strength, "medium"),
        "source_node": source.get("name") or edge["source"],
        "relation": "支撑",
        "target_node": target.get("name") or edge["target"],
        "explanation": "由图谱待审边对账补建（reconcile_pending_candidates）",
        "processor_version": "reconcile-v1",
        "review_status": "pending",
        "generated_at": datetime.now(UTC).isoformat(timespec="seconds"),
    }


def reconcile(user_id: str, apply: bool) -> dict:
    store = JsonGraphStateStore(user_id)
    state = store.load()
    if not state:
        return {"user": user_id, "skipped": "无图谱数据"}

    nodes = state.get("nodes", [])
    edges = state.get("edges", [])
    nodes_by_id = {n["id"]: n for n in nodes}
    # 候选仓储使用不带图谱作用域后缀的用户 ID（与 per_user_mgr 一致）
    base_user = user_id.split("__")[0]
    candidates = InMemoryCandidateRepository(with_seed=False, user_id=base_user)
    existing_ids = set(candidates._store.keys())

    created = 0
    normalized = 0
    for edge in edges:
        if edge.get("kind") != "SUPPORTS":
            continue
        status = edge.get("review_status") or ""
        if status == "approved":
            continue
        # 空状态归一化为 pending
        if not status:
            edge["review_status"] = "pending"
            normalized += 1
        # 补建候选
        cand_id = "c-" + edge["id"]
        if cand_id in existing_ids:
            continue
        payload = _candidate_from_edge(edge, nodes_by_id, set())
        if apply:
            candidates._store[cand_id] = RecognitionCandidate(**payload)
        created += 1

    if apply:
        if normalized or created:
            store.save(nodes, edges)
        if created:
            candidates._schedule_save()
            import time

            time.sleep(0.3)  # 等待防抖 Timer 落盘（进程退出会中断）

    return {
        "user": user_id,
        "candidate_user": base_user,
        "edges_total": len(edges),
        "pending_edges": sum(1 for e in edges if e.get("review_status") == "pending"),
        "normalized_to_pending": normalized,
        "candidates_created": created,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="图谱待审边 ↔ 候选对账")
    parser.add_argument("--user", default=None)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()

    if args.user:
        users = [args.user]
        if not args.user.startswith("user-") and "__" not in args.user:
            users = ["user-" + args.user]
    else:
        # 按图谱运行态文件推导用户（文件名 graph_state_{user}.json）
        files = sorted(_DATA_DIR.glob("graph_state_*.json"))
        users = [f.name[len("graph_state_"):-len(".json")] for f in files]
        if not users:
            print("未找到图谱运行态文件，退出")
            return 1

    print(f"模式: {'APPLY' if args.apply else 'DRY-RUN'}")
    for user_id in users:
        result = reconcile(user_id, args.apply)
        print(result)
    return 0


if __name__ == "__main__":
    sys.exit(main())
