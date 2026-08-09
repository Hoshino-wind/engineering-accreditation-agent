# -*- coding: utf-8 -*-
"""一次性孤儿数据清理脚本（2026-08-10）。

清理规则：删除「引用不存在的课程或图谱节点」的派生数据。
- 诊断发现（findings）：course 不匹配任何有效课程，或 source_node/target_node
  不在当前图谱节点集合（id/name/code 任一命中即视为有效）
- 改进建议（improvements）：course 不匹配任何有效课程
- 识别候选（candidates）：course 不匹配任何有效课程（候选可能未入图，不按节点判断）

用法（在 apps/api 目录、venv 环境）：
    python scripts/cleanup_orphans.py            # dry-run：只报告，不删除
    python scripts/cleanup_orphans.py --apply    # 实际删除（先自动 dry-run 预览）
    python scripts/cleanup_orphans.py --user user-xxx  # 只处理指定用户
"""
from __future__ import annotations

import argparse
import asyncio
import sys
from pathlib import Path

from app.modules.courses.infra.memory_store import InMemoryCourseRepository
from app.modules.diagnostics.infra.memory_store import InMemoryFindingRepository
from app.modules.improvements.infra.memory_store import InMemoryImprovementRepository
from app.modules.orchestration.infra.graph_state_store import JsonGraphStateStore
from app.modules.recognition.infra.memory_store import InMemoryCandidateRepository

_DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def _valid_course_names(courses) -> set[str]:
    names: set[str] = set()
    for c in courses:
        if c.name:
            names.add(c.name.strip())
        if c.code:
            names.add(c.code.strip())
    return names


def _graph_node_keys(nodes: list[dict]) -> set[str]:
    keys: set[str] = set()
    for node in nodes:
        for key in (node.get("id"), node.get("name"), node.get("code")):
            if key:
                keys.add(str(key))
    return keys


def _course_matches(course_field: str, valid_names: set[str]) -> bool:
    value = (course_field or "").strip()
    if not value:
        return True  # 无课程信息不判孤儿
    if value in valid_names:
        return True
    low = value.lower()
    return any(low in n.lower() or n.lower() in low for n in valid_names)


def _node_matches(node_field: str, node_keys: set[str]) -> bool:
    value = (node_field or "").strip()
    if not value:
        return True
    return value in node_keys


def _collect_users() -> list[str]:
    users = {"template"}
    for f in _DATA_DIR.glob("*_user-*.json"):
        # resources_user-xxx.json → user-xxx
        name = f.name
        marker = "_user-"
        idx = name.find(marker)
        if idx > 0:
            # 文件名 candidates_user-xxx.json → 用户 ID 为 user-xxx（保留前缀）
            users.add(name[idx + 1:].replace(".json", ""))
    return sorted(users)


def _cleanup_user(user_id: str, apply: bool) -> dict:
    courses = InMemoryCourseRepository(with_seed=True, user_id=user_id)
    valid_names = _valid_course_names(courses._store.values())

    # 图谱节点（运行态文件优先，无则 seed）
    store = JsonGraphStateStore(user_id)
    state = store.load()
    node_keys: set[str] = set()
    if state:
        node_keys = _graph_node_keys(state.get("nodes", []))
    if not node_keys:
        try:
            from app.modules.orchestration.infra.seed_graph import build_seed_graph
            from app.modules.orchestration.infra.tools import graph_to_state

            nodes_d, _ = graph_to_state(build_seed_graph())
            node_keys = _graph_node_keys(nodes_d)
        except Exception:  # noqa: BLE001
            pass

    findings = InMemoryFindingRepository(with_seed=False, user_id=user_id)
    improvements = InMemoryImprovementRepository(with_seed=False, user_id=user_id)
    candidates = InMemoryCandidateRepository(with_seed=False, user_id=user_id)

    orphan_findings = [
        fid
        for fid, f in findings._store.items()
        if not _course_matches(f.course, valid_names)
        or not _node_matches(f.source_node, node_keys)
        or not _node_matches(f.target_node, node_keys)
    ]
    orphan_improvements = [
        iid
        for iid, imp in improvements._store.items()
        if not _course_matches(imp.course, valid_names)
    ]
    orphan_candidates = [
        cid
        for cid, c in candidates._store.items()
        if not _course_matches(c.course, valid_names)
    ]

    result = {
        "user": user_id,
        "valid_courses": len(valid_names),
        "graph_nodes": len(node_keys),
        "findings": (len(orphan_findings), len(findings._store)),
        "improvements": (len(orphan_improvements), len(improvements._store)),
        "candidates": (len(orphan_candidates), len(candidates._store)),
        "samples": [
            {"type": "finding", "id": fid, "course": findings._store[fid].course,
             "source": findings._store[fid].source_node}
            for fid in orphan_findings[:3]
        ]
        + [
            {"type": "improvement", "id": iid, "course": improvements._store[iid].course}
            for iid in orphan_improvements[:3]
        ]
        + [
            {"type": "candidate", "id": cid, "course": candidates._store[cid].course}
            for cid in orphan_candidates[:3]
        ],
    }

    if apply:
        for fid in orphan_findings:
            findings._store.pop(fid, None)
        for iid in orphan_improvements:
            improvements._store.pop(iid, None)
        for cid in orphan_candidates:
            candidates._store.pop(cid, None)
        if orphan_findings:
            findings._schedule_save()
        if orphan_improvements:
            improvements._schedule_save()
        if orphan_candidates:
            candidates._schedule_save()
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description="孤儿数据清理（dry-run 默认）")
    parser.add_argument("--apply", action="store_true", help="实际删除（默认只预览）")
    parser.add_argument("--user", default=None, help="只处理指定用户 ID")
    args = parser.parse_args()

    if args.user and not args.user.startswith("user-"):
        args.user = "user-" + args.user
    users = [args.user] if args.user else _collect_users()
    total = {"findings": 0, "improvements": 0, "candidates": 0}

    print(f"模式: {'APPLY（实际删除）' if args.apply else 'DRY-RUN（仅预览）'}")
    print("=" * 70)
    for user_id in users:
        result = _cleanup_user(user_id, args.apply)
        f_orphan, f_total = result["findings"]
        i_orphan, i_total = result["improvements"]
        c_orphan, c_total = result["candidates"]
        total["findings"] += f_orphan
        total["improvements"] += i_orphan
        total["candidates"] += c_orphan
        if f_orphan or i_orphan or c_orphan:
            print(f"[{result['user']}] 有效课程 {result['valid_courses']} / 图谱节点 {result['graph_nodes']}")
            print(f"    发现: {f_orphan}/{f_total} 条孤儿 | 改进: {i_orphan}/{i_total} | 候选: {c_orphan}/{c_total}")
            for sample in result["samples"]:
                print(f"      - {sample['type']} {sample['id']} (course={sample.get('course')})")

    print("=" * 70)
    print(f"合计孤儿: 发现 {total['findings']} / 改进 {total['improvements']} / 候选 {total['candidates']}")
    if not args.apply:
        print("（dry-run 未删除任何数据；确认无误后加 --apply 执行）")
    return 0


if __name__ == "__main__":
    sys.exit(main())
