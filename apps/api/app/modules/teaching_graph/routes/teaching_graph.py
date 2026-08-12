from collections.abc import Callable
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query

from app.modules.teaching_graph.application import (
    CoursePackageConflictError,
    CoursePackageReferenceError,
    GetGraphWorkspace,
    GraphPublishBlockedError,
    GraphRevisionConflictError,
    GraphSchemaUnsupportedError,
    GraphTransitionError,
    GraphWorkspaceNotInitializedError,
    ImportCoursePackage,
    ListGraphAuditEvents,
    PublishGraph,
    SaveGraphDraft,
    StartGraphRevision,
)
from app.modules.teaching_graph.contracts import (
    GraphAuditEventListResponse,
    GraphAuditEventResponse,
    GraphRevisionCommandRequest,
    GraphWorkspaceResponse,
    ImportCoursePackageRequest,
    SaveGraphDraftRequest,
)


def _unsupported_schema_http_error(error: GraphSchemaUnsupportedError) -> HTTPException:
    detail = {
        "code": "unsupported_graph_schema",
        "schemaVersionId": error.schema_version_id,
    }
    return HTTPException(status_code=422, detail=detail)


def create_teaching_graph_router(
    *,
    provide_get: Callable[[], GetGraphWorkspace],
    provide_save: Callable[[], SaveGraphDraft],
    provide_publish: Callable[[], PublishGraph],
    provide_start_revision: Callable[[], StartGraphRevision],
    provide_audit: Callable[[], ListGraphAuditEvents],
    provide_import_package: Callable[[], ImportCoursePackage],
) -> APIRouter:
    router = APIRouter(prefix="/teaching-graph", tags=["teaching-graph"])

    @router.get(
        "/workspace",
        response_model=GraphWorkspaceResponse,
        summary="读取能力图谱权威工作区",
    )
    async def get_workspace(
        use_case: Annotated[GetGraphWorkspace, Depends(provide_get)],
    ) -> GraphWorkspaceResponse:
        try:
            workspace = await use_case.run()
        except GraphSchemaUnsupportedError as error:
            raise _unsupported_schema_http_error(error) from error
        if workspace is None:
            raise HTTPException(status_code=404, detail="能力图谱工作区尚未初始化")
        return GraphWorkspaceResponse.from_workspace(workspace)

    @router.put(
        "/workspace",
        response_model=GraphWorkspaceResponse,
        summary="初始化或保存能力图谱草稿",
    )
    async def save_workspace(
        request: SaveGraphDraftRequest,
        use_case: Annotated[SaveGraphDraft, Depends(provide_save)],
    ) -> GraphWorkspaceResponse:
        try:
            workspace = await use_case.run(
                state=request.state.model_dump(by_alias=True, mode="json"),
                expected_revision=request.expected_revision,
            )
        except GraphRevisionConflictError as error:
            raise HTTPException(status_code=409, detail=str(error)) from error
        except GraphTransitionError as error:
            raise HTTPException(
                status_code=409,
                detail={"code": "invalid_graph_transition", "issues": error.issues},
            ) from error
        except GraphSchemaUnsupportedError as error:
            raise _unsupported_schema_http_error(error) from error
        return GraphWorkspaceResponse.from_workspace(workspace)

    @router.post(
        "/imports/course-package",
        response_model=GraphWorkspaceResponse,
        responses={
            404: {"description": "图谱工作区尚未初始化"},
            409: {"description": "修订冲突、引用不完整或与现有对象冲突"},
        },
        summary="导入结构化课程包并合入图谱草稿",
    )
    async def import_course_package(
        request: ImportCoursePackageRequest,
        use_case: Annotated[ImportCoursePackage, Depends(provide_import_package)],
    ) -> GraphWorkspaceResponse:
        try:
            workspace = await use_case.run(
                package=request.to_domain(),
                expected_revision=request.expected_revision,
            )
        except GraphWorkspaceNotInitializedError as error:
            raise HTTPException(
                status_code=404,
                detail={
                    "code": "graph_workspace_not_initialized",
                    "message": "图谱工作区尚未初始化，导入不创建正式基线",
                },
            ) from error
        except CoursePackageReferenceError as error:
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "course_package_reference_incomplete",
                    "problems": list(error.problems),
                },
            ) from error
        except CoursePackageConflictError as error:
            raise HTTPException(
                status_code=409,
                detail={
                    "code": "course_package_conflict",
                    "conflicts": [
                        {
                            "entityKind": item.entity_kind,
                            "objectId": item.object_id,
                            "reason": item.reason,
                        }
                        for item in error.conflicts
                    ],
                },
            ) from error
        except GraphRevisionConflictError as error:
            raise HTTPException(status_code=409, detail=str(error)) from error
        except GraphTransitionError as error:
            raise HTTPException(
                status_code=409,
                detail={"code": "invalid_graph_transition", "issues": error.issues},
            ) from error
        return GraphWorkspaceResponse.from_workspace(workspace)

    @router.post(
        "/workspace/publish",
        response_model=GraphWorkspaceResponse,
        summary="校验并发布不可变能力图谱快照",
    )
    async def publish_workspace(
        request: GraphRevisionCommandRequest,
        use_case: Annotated[PublishGraph, Depends(provide_publish)],
    ) -> GraphWorkspaceResponse:
        try:
            workspace = await use_case.run(
                expected_revision=request.expected_revision
            )
        except GraphRevisionConflictError as error:
            raise HTTPException(status_code=409, detail=str(error)) from error
        except GraphPublishBlockedError as error:
            raise HTTPException(
                status_code=409,
                detail={"code": "graph_publish_blocked", "blockers": error.blockers},
            ) from error
        except GraphSchemaUnsupportedError as error:
            raise _unsupported_schema_http_error(error) from error
        if workspace is None:
            raise HTTPException(status_code=404, detail="能力图谱工作区尚未初始化")
        return GraphWorkspaceResponse.from_workspace(workspace)

    @router.post(
        "/workspace/revisions",
        response_model=GraphWorkspaceResponse,
        summary="基于正式快照创建下一能力图谱修订",
    )
    async def start_revision(
        request: GraphRevisionCommandRequest,
        use_case: Annotated[StartGraphRevision, Depends(provide_start_revision)],
    ) -> GraphWorkspaceResponse:
        try:
            workspace = await use_case.run(
                expected_revision=request.expected_revision
            )
        except GraphRevisionConflictError as error:
            raise HTTPException(status_code=409, detail=str(error)) from error
        except GraphTransitionError as error:
            raise HTTPException(
                status_code=409,
                detail={"code": "invalid_graph_transition", "issues": error.issues},
            ) from error
        except GraphSchemaUnsupportedError as error:
            raise _unsupported_schema_http_error(error) from error
        if workspace is None:
            raise HTTPException(status_code=404, detail="能力图谱工作区尚未初始化")
        return GraphWorkspaceResponse.from_workspace(workspace)

    @router.get(
        "/audit-events",
        response_model=GraphAuditEventListResponse,
        summary="列出能力图谱追加审计事件",
    )
    async def list_audit_events(
        use_case: Annotated[ListGraphAuditEvents, Depends(provide_audit)],
        limit: Annotated[int, Query(ge=1, le=100)] = 20,
    ) -> GraphAuditEventListResponse:
        events = await use_case.run(limit)
        items = [GraphAuditEventResponse.from_event(event) for event in events]
        return GraphAuditEventListResponse(items=items, total=len(items))
    return router
