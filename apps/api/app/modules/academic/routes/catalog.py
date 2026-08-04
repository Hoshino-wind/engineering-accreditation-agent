from collections.abc import Callable
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.modules.academic.application import (
    CreateCompetencyIndicator,
    CreateCourse,
    CreateCourseObjective,
    CreateExperimentProject,
    CreateGraduationRequirement,
    CreateRubricItem,
    GetAcademicCatalog,
    UpdateAcademicProgram,
    UpdateCompetencyIndicator,
    UpdateCourse,
    UpdateCourseObjective,
    UpdateExperimentProject,
    UpdateGraduationRequirement,
    UpdateRubricItem,
)
from app.modules.academic.contracts import (
    AcademicCatalogResponse,
    AcademicProgramResponse,
    AcademicProgramUpsertRequest,
    CompetencyIndicatorResponse,
    CompetencyIndicatorUpsertRequest,
    CourseObjectiveResponse,
    CourseObjectiveUpsertRequest,
    CourseResponse,
    CourseUpsertRequest,
    ExperimentProjectResponse,
    ExperimentProjectUpsertRequest,
    GraduationRequirementResponse,
    GraduationRequirementUpsertRequest,
    RubricItemResponse,
    RubricItemUpsertRequest,
)


def create_academic_router(
    get_catalog_use_case: Callable[[], GetAcademicCatalog],
    update_program_use_case: Callable[[], UpdateAcademicProgram],
    create_course_use_case: Callable[[], CreateCourse],
    update_course_use_case: Callable[[], UpdateCourse],
    create_requirement_use_case: Callable[[], CreateGraduationRequirement],
    update_requirement_use_case: Callable[[], UpdateGraduationRequirement],
    create_indicator_use_case: Callable[[], CreateCompetencyIndicator],
    update_indicator_use_case: Callable[[], UpdateCompetencyIndicator],
    create_objective_use_case: Callable[[], CreateCourseObjective],
    update_objective_use_case: Callable[[], UpdateCourseObjective],
    create_experiment_use_case: Callable[[], CreateExperimentProject],
    update_experiment_use_case: Callable[[], UpdateExperimentProject],
    create_rubric_item_use_case: Callable[[], CreateRubricItem],
    update_rubric_item_use_case: Callable[[], UpdateRubricItem],
) -> APIRouter:
    router = APIRouter(prefix="/academic", tags=["academic"])

    @router.get(
        "/catalog",
        response_model=AcademicCatalogResponse,
        summary="Get academic master data catalog",
    )
    async def get_catalog(
        use_case: Annotated[GetAcademicCatalog, Depends(get_catalog_use_case)],
    ) -> AcademicCatalogResponse:
        catalog = await use_case.execute()
        return AcademicCatalogResponse.from_domain(catalog)

    @router.patch(
        "/program",
        response_model=AcademicProgramResponse,
        summary="Update current academic program",
    )
    async def update_program(
        body: AcademicProgramUpsertRequest,
        use_case: Annotated[UpdateAcademicProgram, Depends(update_program_use_case)],
    ) -> AcademicProgramResponse:
        program = await use_case.execute(
            code=body.code,
            name=body.name,
            discipline=body.discipline,
            degree=body.degree,
            owner=body.owner,
            evaluation_cycle=body.evaluation_cycle,
            status=body.status,
        )
        return AcademicProgramResponse.from_domain(program)

    @router.post(
        "/courses",
        response_model=CourseResponse,
        status_code=status.HTTP_201_CREATED,
        summary="Create one course",
    )
    async def create_course(
        body: CourseUpsertRequest,
        use_case: Annotated[CreateCourse, Depends(create_course_use_case)],
    ) -> CourseResponse:
        course = await use_case.execute(
            program_id=body.program_id,
            code=body.code,
            name=body.name,
            category=body.category,
            term=body.term,
            credit_hours=body.credit_hours,
            owner=body.owner,
            status=body.status,
        )
        return CourseResponse.from_domain(course)

    @router.patch(
        "/courses/{course_id}",
        response_model=CourseResponse,
        summary="Update one course",
    )
    async def update_course(
        course_id: str,
        body: CourseUpsertRequest,
        use_case: Annotated[UpdateCourse, Depends(update_course_use_case)],
    ) -> CourseResponse:
        course = await use_case.execute(
            course_id,
            program_id=body.program_id,
            code=body.code,
            name=body.name,
            category=body.category,
            term=body.term,
            credit_hours=body.credit_hours,
            owner=body.owner,
            status=body.status,
        )
        if course is None:
            raise HTTPException(status_code=404, detail="Course not found")
        return CourseResponse.from_domain(course)

    @router.post(
        "/graduation-requirements",
        response_model=GraduationRequirementResponse,
        status_code=status.HTTP_201_CREATED,
        summary="Create one graduation requirement",
    )
    async def create_requirement(
        body: GraduationRequirementUpsertRequest,
        use_case: Annotated[
            CreateGraduationRequirement,
            Depends(create_requirement_use_case),
        ],
    ) -> GraduationRequirementResponse:
        requirement = await use_case.execute(
            program_id=body.program_id,
            code=body.code,
            title=body.title,
            description=body.description,
        )
        return GraduationRequirementResponse.from_domain(requirement)

    @router.patch(
        "/graduation-requirements/{requirement_id}",
        response_model=GraduationRequirementResponse,
        summary="Update one graduation requirement",
    )
    async def update_requirement(
        requirement_id: str,
        body: GraduationRequirementUpsertRequest,
        use_case: Annotated[
            UpdateGraduationRequirement,
            Depends(update_requirement_use_case),
        ],
    ) -> GraduationRequirementResponse:
        requirement = await use_case.execute(
            requirement_id,
            program_id=body.program_id,
            code=body.code,
            title=body.title,
            description=body.description,
        )
        if requirement is None:
            raise HTTPException(status_code=404, detail="Graduation requirement not found")
        return GraduationRequirementResponse.from_domain(requirement)

    @router.post(
        "/indicators",
        response_model=CompetencyIndicatorResponse,
        status_code=status.HTTP_201_CREATED,
        summary="Create one competency indicator",
    )
    async def create_indicator(
        body: CompetencyIndicatorUpsertRequest,
        use_case: Annotated[
            CreateCompetencyIndicator,
            Depends(create_indicator_use_case),
        ],
    ) -> CompetencyIndicatorResponse:
        indicator = await use_case.execute(
            requirement_id=body.requirement_id,
            code=body.code,
            title=body.title,
            description=body.description,
        )
        return CompetencyIndicatorResponse.from_domain(indicator)

    @router.patch(
        "/indicators/{indicator_id}",
        response_model=CompetencyIndicatorResponse,
        summary="Update one competency indicator",
    )
    async def update_indicator(
        indicator_id: str,
        body: CompetencyIndicatorUpsertRequest,
        use_case: Annotated[
            UpdateCompetencyIndicator,
            Depends(update_indicator_use_case),
        ],
    ) -> CompetencyIndicatorResponse:
        indicator = await use_case.execute(
            indicator_id,
            requirement_id=body.requirement_id,
            code=body.code,
            title=body.title,
            description=body.description,
        )
        if indicator is None:
            raise HTTPException(status_code=404, detail="Competency indicator not found")
        return CompetencyIndicatorResponse.from_domain(indicator)

    @router.post(
        "/objectives",
        response_model=CourseObjectiveResponse,
        status_code=status.HTTP_201_CREATED,
        summary="Create one course objective",
    )
    async def create_objective(
        body: CourseObjectiveUpsertRequest,
        use_case: Annotated[CreateCourseObjective, Depends(create_objective_use_case)],
    ) -> CourseObjectiveResponse:
        objective = await use_case.execute(
            course_id=body.course_id,
            code=body.code,
            title=body.title,
            description=body.description,
        )
        return CourseObjectiveResponse.from_domain(objective)

    @router.patch(
        "/objectives/{objective_id}",
        response_model=CourseObjectiveResponse,
        summary="Update one course objective",
    )
    async def update_objective(
        objective_id: str,
        body: CourseObjectiveUpsertRequest,
        use_case: Annotated[UpdateCourseObjective, Depends(update_objective_use_case)],
    ) -> CourseObjectiveResponse:
        objective = await use_case.execute(
            objective_id,
            course_id=body.course_id,
            code=body.code,
            title=body.title,
            description=body.description,
        )
        if objective is None:
            raise HTTPException(status_code=404, detail="Course objective not found")
        return CourseObjectiveResponse.from_domain(objective)

    @router.post(
        "/experiments",
        response_model=ExperimentProjectResponse,
        status_code=status.HTTP_201_CREATED,
        summary="Create one experiment project",
    )
    async def create_experiment(
        body: ExperimentProjectUpsertRequest,
        use_case: Annotated[CreateExperimentProject, Depends(create_experiment_use_case)],
    ) -> ExperimentProjectResponse:
        experiment = await use_case.execute(
            course_id=body.course_id,
            code=body.code,
            title=body.title,
            description=body.description,
            environment=body.environment,
            source_material_id=body.source_material_id,
        )
        return ExperimentProjectResponse.from_domain(experiment)

    @router.patch(
        "/experiments/{experiment_id}",
        response_model=ExperimentProjectResponse,
        summary="Update one experiment project",
    )
    async def update_experiment(
        experiment_id: str,
        body: ExperimentProjectUpsertRequest,
        use_case: Annotated[UpdateExperimentProject, Depends(update_experiment_use_case)],
    ) -> ExperimentProjectResponse:
        experiment = await use_case.execute(
            experiment_id,
            course_id=body.course_id,
            code=body.code,
            title=body.title,
            description=body.description,
            environment=body.environment,
            source_material_id=body.source_material_id,
        )
        if experiment is None:
            raise HTTPException(status_code=404, detail="Experiment project not found")
        return ExperimentProjectResponse.from_domain(experiment)

    @router.post(
        "/rubric-items",
        response_model=RubricItemResponse,
        status_code=status.HTTP_201_CREATED,
        summary="Create one rubric item",
    )
    async def create_rubric_item(
        body: RubricItemUpsertRequest,
        use_case: Annotated[CreateRubricItem, Depends(create_rubric_item_use_case)],
    ) -> RubricItemResponse:
        item = await use_case.execute(
            course_id=body.course_id,
            experiment_id=body.experiment_id,
            indicator_id=body.indicator_id,
            code=body.code,
            title=body.title,
            points=body.points,
        )
        return RubricItemResponse.from_domain(item)

    @router.patch(
        "/rubric-items/{item_id}",
        response_model=RubricItemResponse,
        summary="Update one rubric item",
    )
    async def update_rubric_item(
        item_id: str,
        body: RubricItemUpsertRequest,
        use_case: Annotated[UpdateRubricItem, Depends(update_rubric_item_use_case)],
    ) -> RubricItemResponse:
        item = await use_case.execute(
            item_id,
            course_id=body.course_id,
            experiment_id=body.experiment_id,
            indicator_id=body.indicator_id,
            code=body.code,
            title=body.title,
            points=body.points,
        )
        if item is None:
            raise HTTPException(status_code=404, detail="Rubric item not found")
        return RubricItemResponse.from_domain(item)

    return router
