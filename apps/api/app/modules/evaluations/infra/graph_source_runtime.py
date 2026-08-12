"""评价侧读取正式图谱与评价策略的适配器。

这是唯一允许知道 ``teaching_graph`` 存在的评价代码：它把图谱工作区里
"当前生效的已发布快照"解析出来，交给评价领域派生结构。
"""

import json
from decimal import Decimal
from pathlib import Path
from typing import Any, cast

from app.modules.evaluations.domain import (
    AttainmentMethod,
    EvaluationPolicyBinding,
    EvaluationPolicyVersion,
    MissingScorePolicy,
)
from app.modules.teaching_graph.application.ports import GraphWorkspaceRepository

PILOT_POLICY_FILENAME = "pilot_evaluation_policy.json"
PILOT_POLICY_SCHEMA_VERSION = 1


def resolve_published_snapshot(state: dict[str, Any]) -> dict[str, Any] | None:
    """取出当前生效的已发布快照。

    草稿状态下生效的是它的基线版本；草稿本身尚未发布，不能用于评价。
    """
    version = state.get("version") or {}
    target = (
        version.get("name")
        if version.get("status") == "published"
        else version.get("baseVersion")
    )
    if not target:
        return None
    return next(
        (
            snapshot
            for snapshot in state.get("publishedSnapshots", [])
            if snapshot.get("version") == target
        ),
        None,
    )


class TeachingGraphPublishedSnapshotRepository:
    def __init__(self, repository: GraphWorkspaceRepository) -> None:
        self._repository = repository

    async def get_published_snapshot(self) -> dict[str, Any] | None:
        workspace = await self._repository.get()
        if workspace is None:
            return None
        return resolve_published_snapshot(workspace.state)


def _policy_from_payload(payload: dict[str, Any]) -> EvaluationPolicyVersion:
    return EvaluationPolicyVersion(
        policy_version=str(payload["policy_version"]),
        method=cast(AttainmentMethod, payload["method"]),
        missing_score=cast(MissingScorePolicy, payload["missing_score"]),
        score_rate_scale=int(payload["score_rate_scale"]),
        threshold=Decimal(str(payload["threshold"])),
        bindings=tuple(
            EvaluationPolicyBinding(
                course_outcome_id=str(item["course_outcome_id"]),
                criterion_id=str(item["criterion_id"]),
                edge_version_id=str(item["edge_version_id"]),
                weight=Decimal(str(item["weight"])),
            )
            for item in payload.get("bindings", ())
        ),
    )


class PilotFileEvaluationPolicyRepository:
    """试点期的策略来源：随代码发布的 JSON 文件。

    策略是有版本的业务配置而不是代码常量，因此单独成文件；
    正式化时替换为数据库仓储即可，端口和领域模型不变。
    """

    def __init__(self, policy_path: Path | None = None) -> None:
        self._policy_path = policy_path or Path(__file__).with_name(PILOT_POLICY_FILENAME)

    async def get_active_policy(self) -> EvaluationPolicyVersion | None:
        if not self._policy_path.is_file():
            return None
        payload = json.loads(self._policy_path.read_text(encoding="utf-8"))
        if payload.get("schema_version") != PILOT_POLICY_SCHEMA_VERSION:
            raise ValueError("不支持的试点评价策略版本")
        return _policy_from_payload(payload)


__all__ = [
    "PILOT_POLICY_FILENAME",
    "PilotFileEvaluationPolicyRepository",
    "TeachingGraphPublishedSnapshotRepository",
    "resolve_published_snapshot",
]
