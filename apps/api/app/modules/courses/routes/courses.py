"""课程路由：列表/新建/删除，供前端课程切换器/管理使用。"""

from collections.abc import Callable
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.modules.courses.application import (
    CourseAlreadyExistsError,
    CourseNotFoundError,
    CreateCourse,
    DeleteCourse,
    ListCourses,
)
from app.modules.courses.contracts import CourseResponse, CreateCourseRequest


def create_courses_router(
    list_courses_use_case: Callable[[], ListCourses],
    create_courses_use_case: Callable[[], CreateCourse],
    delete_courses_use_case: Callable[[], DeleteCourse],
) -> APIRouter:
    router = APIRouter(prefix="/courses", tags=["courses"])

    @router.get(
        "",
        response_model=list[CourseResponse],
        summary="获取课程列表（课程切换器数据源）",
    )
    async def list_courses(
        use_case: Annotated[ListCourses, Depends(list_courses_use_case)],
    ) -> list[CourseResponse]:
        courses = await use_case.execute()
        return [CourseResponse.from_domain(c) for c in courses]

    @router.post(
        "",
        response_model=CourseResponse,
        status_code=status.HTTP_201_CREATED,
        summary="新建课程",
    )
    async def create_course(
        req: CreateCourseRequest,
        use_case: Annotated[CreateCourse, Depends(create_courses_use_case)],
    ) -> CourseResponse:
        try:
            created = await use_case.execute(
                name=req.name,
                code=req.code,
                credits=req.credits,
                semester=req.semester,
                description=req.description,
                major_id=req.majorId,
            )
        except CourseAlreadyExistsError as e:
            raise HTTPException(status.HTTP_409_CONFLICT, str(e)) from e
        except ValueError as e:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e)) from e
        return CourseResponse.from_domain(created)

    @router.delete(
        "/{course_id}",
        status_code=status.HTTP_204_NO_CONTENT,
        summary="删除课程",
    )
    async def delete_course(
        course_id: str,
        use_case: Annotated[DeleteCourse, Depends(delete_courses_use_case)],
    ) -> None:
        try:
            await use_case.execute(course_id)
        except CourseNotFoundError as e:
            raise HTTPException(status.HTTP_404_NOT_FOUND, str(e)) from e

    return router
