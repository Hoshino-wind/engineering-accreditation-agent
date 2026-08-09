from collections.abc import Callable
import hashlib
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, Query, UploadFile

from app.modules.resources.application import (
    ClassifyResource,
    ConfirmMaterialHealthAction,
    ConfirmSuggestedCourse,
    DeleteResource,
    GetResource,
    GetMaterialHealth,
    PlanMaterialHealthActions,
    ListResources,
    ResourceNotFoundError,
    MaterialHealthActionNotFoundError,
    UploadResource,
)
from app.modules.resources.contracts import (
    ClassifyResourceResponse,
    ConfirmCourseRequest,
    ConfirmCourseResponse,
    RESOURCE_CATEGORIES,
    TeachingResourceResponse,
    MaterialHealthResponse,
    MaterialHealthActionResponse,
    ConfirmMaterialHealthActionRequest,
    ConfirmMaterialHealthActionResponse,
)


def create_resources_router(
    list_resources_use_case: Callable[[], ListResources],
    get_resource_use_case: Callable[[], GetResource],
    upload_resource_use_case: Callable[[], UploadResource],
    classify_resource_use_case: Callable[[], ClassifyResource],
    confirm_suggested_course_use_case: Callable[[], ConfirmSuggestedCourse],
    delete_resource_use_case: Callable[[], DeleteResource],
    material_health_use_case: Callable[[], GetMaterialHealth],
    material_health_actions_use_case: Callable[[], PlanMaterialHealthActions],
    confirm_material_health_action_use_case: Callable[[], ConfirmMaterialHealthAction],
    process_resource_background: Callable[[str, str, bytes], None] | None = None,
) -> APIRouter:
    router = APIRouter(prefix="/resources", tags=["resources"])

    @router.get(
        "",
        response_model=list[TeachingResourceResponse],
        summary="获取教学资源列表",
    )
    async def list_resources(
        use_case: Annotated[ListResources, Depends(list_resources_use_case)],
        course: Annotated[str | None, Query(description="按课程筛选")] = None,
        status: Annotated[str | None, Query(description="按状态筛选")] = None,
        resource_type: Annotated[str | None, Query(description="按材料类型筛选")] = None,
    ) -> list[TeachingResourceResponse]:
        resources = await use_case.execute(
            course=course,
            status=status,
            resource_type=resource_type,
        )
        return [TeachingResourceResponse.from_domain(r) for r in resources]

    @router.get("/health", response_model=MaterialHealthResponse)
    async def get_material_health(
        use_case: Annotated[GetMaterialHealth, Depends(material_health_use_case)],
    ) -> MaterialHealthResponse:
        return MaterialHealthResponse.from_domain(await use_case.execute())

    @router.get("/health/actions", response_model=list[MaterialHealthActionResponse])
    async def get_material_health_actions(
        use_case: Annotated[
            PlanMaterialHealthActions, Depends(material_health_actions_use_case)
        ],
    ) -> list[MaterialHealthActionResponse]:
        return [
            MaterialHealthActionResponse.from_domain(item)
            for item in await use_case.execute()
        ]

    @router.post(
        "/health/actions/confirm", response_model=ConfirmMaterialHealthActionResponse
    )
    async def confirm_material_health_action(
        payload: ConfirmMaterialHealthActionRequest,
        use_case: Annotated[
            ConfirmMaterialHealthAction,
            Depends(confirm_material_health_action_use_case),
        ],
    ) -> ConfirmMaterialHealthActionResponse:
        try:
            result = await use_case.execute(
                risk_code=payload.riskCode, resource_id=payload.resourceId
            )
        except MaterialHealthActionNotFoundError as error:
            raise HTTPException(status_code=409, detail=str(error)) from error
        return ConfirmMaterialHealthActionResponse.from_domain(result)

    # ⚠️ /classify 必须放在 /{resource_id} 之前声明，
    # 否则 FastAPI 路由匹配时 /{resource_id} 会先吃掉 classify 这个字面路径
    @router.post(
        "/classify",
        response_model=ClassifyResourceResponse,
        summary="AI 预判材料类型（上传前调用，老师确认后再正式上传）",
    )
    async def classify_resource(
        file: Annotated[UploadFile, File(description="待分类的材料文件")],
        use_case: Annotated[ClassifyResource, Depends(classify_resource_use_case)],
    ) -> ClassifyResourceResponse:
        content = await file.read()
        file_name = file.filename or "unnamed.pdf"
        resp = await use_case.execute(
            file_name=file_name,
            course="未分类",
            category="其他",
            content=content,
        )
        result = resp.data
        return ClassifyResourceResponse(
            category=result.category,
            confidence=result.confidence,
            reason=result.reason,
            isEvaluationEvidence=result.is_evaluation_evidence,
            model=resp.model,
            latencyMs=resp.latency,
        )

    @router.get(
        "/{resource_id}",
        response_model=TeachingResourceResponse,
        summary="获取教学资源详情",
    )
    async def get_resource(
        resource_id: str,
        use_case: Annotated[GetResource, Depends(get_resource_use_case)],
    ) -> TeachingResourceResponse:
        resource = await use_case.execute(resource_id)
        if resource is None:
            raise HTTPException(status_code=404, detail="教学资源不存在")
        return TeachingResourceResponse.from_domain(resource)

    @router.post(
        "/upload",
        response_model=TeachingResourceResponse,
        summary="上传教学资源文件",
    )
    async def upload_resource(
        background_tasks: BackgroundTasks,
        use_case: Annotated[UploadResource, Depends(upload_resource_use_case)],
        file: Annotated[UploadFile, File(description="教学材料文件")],
        course: Annotated[str, Form(description="所属课程")] = "未分类",
        category: Annotated[str, Form(description="材料分类")] = "其他",
    ) -> TeachingResourceResponse:
        # 校验 category 在白名单内（与 LLM 分类口径一致）
        if category not in RESOURCE_CATEGORIES:
            raise HTTPException(
                status_code=422,
                detail=f"非法的材料分类：{category}，合法值：{list(RESOURCE_CATEGORIES)}",
            )
        content = await file.read()
        resource = await use_case.execute(
            file_name=file.filename or "unnamed.pdf",
            file_size_bytes=len(content),
            course=course,
            category=category,
            content_hash=hashlib.sha256(content).hexdigest(),
            content=content,
            content_type=file.content_type,
        )
        # B1: 上传后异步触发提取 pipeline（带上文件内容，供真实文本解析）
        if process_resource_background is not None:
            background_tasks.add_task(process_resource_background, resource.id, category, content)
        return TeachingResourceResponse.from_domain(resource)

    @router.post(
        "/{resource_id}/confirm-course",
        response_model=ConfirmCourseResponse,
        summary="确认 AI 识别的候选课程：创建课程（同名复用）并回写材料归属",
    )
    async def confirm_suggested_course(
        resource_id: str,
        payload: ConfirmCourseRequest,
        use_case: Annotated[ConfirmSuggestedCourse, Depends(confirm_suggested_course_use_case)],
    ) -> ConfirmCourseResponse:
        try:
            _, course = await use_case.execute(
                resource_id=resource_id,
                name=payload.name,
                code=payload.code,
                credits=payload.credits,
                semester=payload.semester,
                description=payload.description,
            )
        except ResourceNotFoundError as e:
            raise HTTPException(status_code=404, detail=str(e))
        except ValueError as e:
            raise HTTPException(status_code=422, detail=str(e))
        return ConfirmCourseResponse(
            resourceId=resource_id,
            courseId=course.id,
            courseName=course.name,
        )

    @router.delete(
        "/{resource_id}",
        status_code=204,
        summary="删除教学资源",
    )
    async def delete_resource(
        resource_id: str,
        use_case: Annotated[DeleteResource, Depends(delete_resource_use_case)],
    ) -> None:
        deleted = await use_case.execute(resource_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="教学资源不存在")

    return router
