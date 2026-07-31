from copy import deepcopy

from app.modules.teaching_graph.application.ports import (
    GraphClock,
    GraphPublishBlockedError,
    GraphSchemaUnsupportedError,
    GraphTransitionError,
    GraphWorkspaceRepository,
)
from app.modules.teaching_graph.domain import (
    GraphAuditEvent,
    GraphWorkspace,
    UnsupportedGraphSchemaVersionError,
    get_publish_blockers,
    migrate_legacy_graph_workspace,
    publish_graph_state,
    start_graph_revision,
    validate_draft_transition,
)
from app.modules.teaching_graph.domain.graph import GraphState


def _migrate_workspace(workspace: GraphWorkspace) -> GraphWorkspace:
    try:
        return migrate_legacy_graph_workspace(workspace)
    except UnsupportedGraphSchemaVersionError as error:
        raise GraphSchemaUnsupportedError(error.schema_version_id) from error


class GetGraphWorkspace:
    def __init__(self, repository: GraphWorkspaceRepository) -> None:
        self._repository = repository

    async def run(self) -> GraphWorkspace | None:
        workspace = await self._repository.get()
        if workspace is None:
            return None
        return _migrate_workspace(workspace)


class SaveGraphDraft:
    def __init__(
        self,
        repository: GraphWorkspaceRepository,
        clock: GraphClock,
        actor: str,
    ) -> None:
        self._repository = repository
        self._clock = clock
        self._actor = actor

    async def run(
        self, *, state: GraphState, expected_revision: int
    ) -> GraphWorkspace:
        current = await self._repository.get()
        if current is not None:
            current = _migrate_workspace(current)
        issues = validate_draft_transition(current, state)
        if issues:
            raise GraphTransitionError(issues)
        workspace = GraphWorkspace(
            revision=expected_revision + 1,
            state=deepcopy(state),
            updated_at=self._clock.now(),
            updated_by=self._actor,
        )
        action = "initialize_graph" if current is None else "save_graph_draft"
        summary = (
            f"初始化 {state['version']['name']} 图谱草稿"
            if current is None
            else f"保存 {state['version']['name']} 图谱草稿"
        )
        return await self._repository.save(
            workspace,
            expected_revision=expected_revision,
            action=action,
            summary=summary,
        )


class PublishGraph:
    def __init__(
        self,
        repository: GraphWorkspaceRepository,
        clock: GraphClock,
        actor: str,
    ) -> None:
        self._repository = repository
        self._clock = clock
        self._actor = actor

    async def run(self, *, expected_revision: int) -> GraphWorkspace | None:
        current = await self._repository.get()
        if current is None:
            return None
        current = _migrate_workspace(current)
        blockers = get_publish_blockers(current.state)
        if blockers:
            raise GraphPublishBlockedError(blockers)
        now = self._clock.now()
        state = publish_graph_state(current.state, now)
        snapshot = state["publishedSnapshots"][-1]
        workspace = GraphWorkspace(
            revision=expected_revision + 1,
            state=state,
            updated_at=now,
            updated_by=self._actor,
        )
        return await self._repository.save(
            workspace,
            expected_revision=expected_revision,
            action="publish_graph",
            summary=f"发布不可变图谱快照 {state['version']['name']}",
            snapshot=snapshot,
        )


class StartGraphRevision:
    def __init__(
        self,
        repository: GraphWorkspaceRepository,
        clock: GraphClock,
        actor: str,
    ) -> None:
        self._repository = repository
        self._clock = clock
        self._actor = actor

    async def run(self, *, expected_revision: int) -> GraphWorkspace | None:
        current = await self._repository.get()
        if current is None:
            return None
        current = _migrate_workspace(current)
        if current.state["version"]["status"] != "published":
            raise GraphTransitionError(["只有正式快照可以创建下一修订"])
        state = start_graph_revision(current.state)
        workspace = GraphWorkspace(
            revision=expected_revision + 1,
            state=state,
            updated_at=self._clock.now(),
            updated_by=self._actor,
        )
        return await self._repository.save(
            workspace,
            expected_revision=expected_revision,
            action="start_graph_revision",
            summary=(
                f"基于 {state['version']['baseVersion']} 创建 "
                f"{state['version']['name']} 草稿"
            ),
        )


class ListGraphAuditEvents:
    def __init__(self, repository: GraphWorkspaceRepository) -> None:
        self._repository = repository

    async def run(self, limit: int) -> list[GraphAuditEvent]:
        return await self._repository.list_audit_events(limit)
