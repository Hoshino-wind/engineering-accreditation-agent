# -*- coding: utf-8 -*-
"""图谱清理：删除学校侧残留节点 + 重复边去重 + 清空关联候选（2026-08-10）。

场景：课程实体已全部删除，但图谱中 Course/Experiment/KnowledgePoint 学校节点
与对应候选仍残留。本脚本将图谱还原为纯标准库（毕业要求 + 能力指标），
并清空引用这些节点的候选。
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

from app.modules.orchestration.infra.graph_state_store import JsonGraphStateStore
from app.modules.recognition.infra.memory_store import InMemoryCandidateRepository

_DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def cleanup(user_id: str, apply: bool) -> dict:
    base_user = user_id.split("__")[0]
    store = JsonGraphStateStore(user_id)
    state = store.load()
    if not state:
        return {"user": user_id, "skipped": "无图谱数据"}

    nodes = state.get("nodes", [])
    edges = state.get("edges", [])

    # 1. 学校侧节点（origin=school）：课程/实验/知识点
    school_nodes = [n for n in nodes if n.get("origin") == "school"]
    school_ids = {n["id"] for n in school_nodes}
    keep_nodes = [n for n in nodes if n.get("origin") != "school"]

    # 2. 删除端点落在学校节点的边
    keep_edges = [
        e for e in edges
        if e.get("source") not in school_ids and e.get("target") not in school_ids
    ]

    # 3. 重复边去重（kind+source+target 相同保留一条，优先保留已审核的）
    seen: dict[tuple, dict] = {}
    dedup_removed = 0
    for e in keep_edges:
        key = (e.get("kind"), e.get("source"), e.get("target"))
        if key in seen:
            # 保留 review_status 更优（approved > pending > 空）
            cur = seen[key]
            cur_status = cur.get("review_status") or ""
            new_status = e.get("review_status") or ""
            if new_status == "approved" and cur_status != "approved":
                seen[key] = e
            dedup_removed += 1
        else:
            seen[key] = e
    dedup_edges = list(seen.values())

    # 4. 候选：清空引用学校节点的候选
    candidates = InMemoryCandidateRepository(with_seed=False, user_id=base_user)
    orphan_candidates = [
        cid
        for cid, c in candidates._store.items()
        if c.source_node in {n.get("name") for n in school_nodes}
        or c.course in {n.get("name") for n in school_nodes if n.get("kind") == "Course"}
    ]

    result = {
        "user": user_id,
        "school_nodes_removed": len(school_nodes),
        "edges_removed_by_nodes": len(edges) - len(keep_edges),
        "duplicate_edges_removed": dedup_removed,
        "nodes_after": len(keep_nodes),
        "edges_after": len(dedup_edges),
        "candidates_removed": len(orphan_candidates),
    }

    if apply:
        store._write(keep_nodes, dedup_edges)  # 直接覆盖（save 是合并式，无法删除节点）
        for cid in orphan_candidates:
            candidates._store.pop(cid, None)
        if orphan_candidates:
            candidates._schedule_save()
            import time

            time.sleep(0.3)
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description="图谱学校侧残留清理 + 去重")
    parser.add_argument("--user", default=None)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()

    if args.user:
        users = [args.user]
        if not args.user.startswith("user-") and "__" not in args.user:
            users = ["user-" + args.user]
    else:
        files = sorted(_DATA_DIR.glob("graph_state_*.json"))
        users = [f.name[len("graph_state_"):-len(".json")] for f in files]

    print(f"模式: {'APPLY' if args.apply else 'DRY-RUN'}")
    for user_id in users:
        print(cleanup(user_id, args.apply))
    return 0


if __name__ == "__main__":
    sys.exit(main())
