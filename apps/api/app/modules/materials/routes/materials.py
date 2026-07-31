from collections.abc import Callable
from typing import Annotated

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
    status,
)

from app.modules.materials.application import (
    GetMaterial,
    ListMaterials,
    ProcessMaterial,
    RegisterMaterial,
    RetryMaterial,
)
from app.modules.materials.contracts import MaterialListResponse, MaterialResponse

RESOURCE_TYPES = {
    "课程大纲",
    "实验指导书",
    "实验项目清单",
    "评分表",
    "学生报告",
    "评价结果",
    "改进记录",
}


def create_materials_router(
    *,
    provide_register: Callable[[], RegisterMaterial],
    provide_process: Callable[[], ProcessMaterial],
    provide_list: Callable[[], ListMaterials],
    provide_get: Callable[[], GetMaterial],
    provide_retry: Callable[[], RetryMaterial],
    max_upload_bytes: int,
) -> APIRouter:
    router = APIRouter(prefix="/materials", tags=["materials"])

    @router.post(
        "",
        response_model=MaterialResponse,
        status_code=status.HTTP_202_ACCEPTED,
        summary="上传教学材料并进入本地处理流水线",
    )
    async def upload_material(
        background_tasks: BackgroundTasks,
        register: Annotated[RegisterMaterial, Depends(provide_register)],
        processor: Annotated[ProcessMaterial, Depends(provide_process)],
        file: Annotated[UploadFile, File(description="教学材料原始文件")],
        course: Annotated[str, Form(max_length=100)] = "待分类",
        resource_type: Annotated[str, Form(max_length=40)] = "实验项目清单",
    ) -> MaterialResponse:
        if resource_type not in RESOURCE_TYPES:
            raise HTTPException(status_code=422, detail="不支持的材料类型")
        content = await file.read(max_upload_bytes + 1)
        await file.close()
        if len(content) > max_upload_bytes:
            raise HTTPException(status_code=413, detail="上传文件超过大小限制")
        material = await register.run(
            file_name=file.filename or "unnamed",
            content=content,
            media_type=file.content_type or "application/octet-stream",
            course=course,
            resource_type=resource_type,
        )
        background_tasks.add_task(processor.run, material.id, content)
        return MaterialResponse.from_record(material)

    @router.get("", response_model=MaterialListResponse, summary="列出本地教学材料")
    async def list_materials(
        use_case: Annotated[ListMaterials, Depends(provide_list)],
    ) -> MaterialListResponse:
        records = await use_case.run()
        items = [MaterialResponse.from_record(item) for item in records]
        return MaterialListResponse(items=items, total=len(items))

    @router.get(
        "/{material_id}",
        response_model=MaterialResponse,
        summary="获取材料处理详情",
    )
    async def get_material(
        material_id: str,
        use_case: Annotated[GetMaterial, Depends(provide_get)],
    ) -> MaterialResponse:
        material = await use_case.run(material_id)
        if material is None:
            raise HTTPException(status_code=404, detail="材料不存在")
        return MaterialResponse.from_record(material)

    @router.post(
        "/{material_id}/retry",
        response_model=MaterialResponse,
        summary="重试材料解析流水线",
    )
    async def retry_material(
        material_id: str,
        use_case: Annotated[RetryMaterial, Depends(provide_retry)],
    ) -> MaterialResponse:
        try:
            material = await use_case.run(material_id)
        except ValueError as error:
            raise HTTPException(status_code=409, detail=str(error)) from error
        if material is None:
            raise HTTPException(status_code=404, detail="材料不存在")
        return MaterialResponse.from_record(material)

    return router
