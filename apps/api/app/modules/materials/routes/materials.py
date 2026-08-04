from collections.abc import Callable
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse

from app.modules.materials.application import (
    GetMaterialFile,
    GetOcrRuntimeStatus,
    ListMaterialVersions,
    ListUploadedMaterials,
    ParseMaterial,
    UploadMaterial,
)
from app.modules.materials.contracts import (
    ExtractedNodeResponse,
    MaterialParseResponse,
    MaterialUploadRequest,
    MaterialVersionResponse,
    OcrRuntimeStatusResponse,
    UploadedMaterialResponse,
)
from app.modules.recognition.contracts import RecognitionCandidateResponse


def create_materials_router(
    list_materials_use_case: Callable[[], ListUploadedMaterials],
    upload_material_use_case: Callable[[], UploadMaterial],
    parse_material_use_case: Callable[[], ParseMaterial],
    get_material_file_use_case: Callable[[], GetMaterialFile],
    list_material_versions_use_case: Callable[[], ListMaterialVersions],
    get_ocr_status_use_case: Callable[[], GetOcrRuntimeStatus],
) -> APIRouter:
    router = APIRouter(prefix="/materials", tags=["materials"])

    @router.get(
        "",
        response_model=list[UploadedMaterialResponse],
        summary="List uploaded teaching materials",
    )
    async def list_materials(
        use_case: Annotated[ListUploadedMaterials, Depends(list_materials_use_case)],
    ) -> list[UploadedMaterialResponse]:
        records = await use_case.execute()
        return [UploadedMaterialResponse.from_domain(record) for record in records]

    @router.post(
        "/upload",
        response_model=UploadedMaterialResponse,
        summary="Upload one teaching material",
    )
    async def upload_material(
        body: MaterialUploadRequest,
        use_case: Annotated[UploadMaterial, Depends(upload_material_use_case)],
    ) -> UploadedMaterialResponse:
        record = await use_case.execute(
            file_name=body.file_name,
            category=body.category,
            content_base64=body.content_base64,
            content_type=body.content_type,
            course=body.course,
        )
        return UploadedMaterialResponse.from_domain(record)

    @router.get(
        "/ocr/status",
        response_model=OcrRuntimeStatusResponse,
        summary="Check OCR runtime availability",
    )
    async def get_ocr_status(
        use_case: Annotated[GetOcrRuntimeStatus, Depends(get_ocr_status_use_case)],
    ) -> OcrRuntimeStatusResponse:
        status = await use_case.execute()
        return OcrRuntimeStatusResponse(**status)

    @router.get(
        "/{material_id}/versions",
        response_model=list[MaterialVersionResponse],
        summary="List uploaded material versions",
    )
    async def list_material_versions(
        material_id: str,
        use_case: Annotated[
            ListMaterialVersions,
            Depends(list_material_versions_use_case),
        ],
    ) -> list[MaterialVersionResponse]:
        versions = await use_case.execute(material_id)
        if not versions:
            raise HTTPException(status_code=404, detail="Material not found")
        return [MaterialVersionResponse.from_domain(version) for version in versions]

    @router.post(
        "/{material_id}/parse",
        response_model=MaterialParseResponse,
        summary="Parse material and generate recognition candidates",
    )
    async def parse_material(
        material_id: str,
        use_case: Annotated[ParseMaterial, Depends(parse_material_use_case)],
    ) -> MaterialParseResponse:
        try:
            result = await use_case.execute(material_id)
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Parse failed: {exc}") from exc

        if result is None:
            raise HTTPException(status_code=404, detail="Material not found")

        return MaterialParseResponse(
            material=UploadedMaterialResponse.from_domain(result.material),
            extractedNodes=[
                ExtractedNodeResponse(
                    id=node.id,
                    kind=node.kind,
                    code=node.code,
                    name=node.name,
                    description=node.description,
                    confidence=node.confidence,
                    sourceExcerpt=node.source_excerpt,
                )
                for node in result.nodes
            ],
            candidatesCreated=len(result.candidates),
            candidates=[
                RecognitionCandidateResponse.from_domain(candidate)
                for candidate in result.candidates
            ],
            parseArtifacts=result.structured_artifact,
        )

    @router.get(
        "/{material_id}/file",
        summary="Download uploaded material",
    )
    async def get_material_file(
        material_id: str,
        use_case: Annotated[GetMaterialFile, Depends(get_material_file_use_case)],
    ) -> FileResponse:
        record = await use_case.execute(material_id)
        if record is None:
            raise HTTPException(status_code=404, detail="Material not found")
        path = Path(record.stored_path)
        if not path.exists():
            raise HTTPException(status_code=404, detail="Uploaded file missing")
        return FileResponse(path, media_type=record.content_type, filename=record.file_name)

    return router
