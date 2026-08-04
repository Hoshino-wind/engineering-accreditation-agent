from uuid import uuid4

from app.modules.academic.application.ports import AcademicCatalogRepository
from app.modules.academic.domain import (
    AcademicCatalog,
    AcademicProgram,
    CompetencyIndicator,
    Course,
    CourseObjective,
    ExperimentProject,
    GraduationRequirement,
    RubricItem,
)


class GetAcademicCatalog:
    def __init__(self, repository: AcademicCatalogRepository) -> None:
        self._repository = repository

    async def execute(self) -> AcademicCatalog:
        return await self._repository.get_catalog()


class UpdateAcademicProgram:
    def __init__(self, repository: AcademicCatalogRepository) -> None:
        self._repository = repository

    async def execute(
        self,
        *,
        code: str,
        name: str,
        discipline: str,
        degree: str,
        owner: str,
        evaluation_cycle: str,
        status: str,
    ) -> AcademicProgram:
        catalog = await self._repository.get_catalog()
        program_id = catalog.program.id if catalog.program is not None else _new_id("program")
        program = AcademicProgram(
            id=program_id,
            code=code,
            name=name,
            discipline=discipline,
            degree=degree,
            owner=owner,
            evaluation_cycle=evaluation_cycle,
            status=status,
        )
        return await self._repository.upsert_program(program)


class CreateCourse:
    def __init__(self, repository: AcademicCatalogRepository) -> None:
        self._repository = repository

    async def execute(
        self,
        *,
        program_id: str | None,
        code: str,
        name: str,
        category: str,
        term: str,
        credit_hours: float,
        owner: str,
        status: str,
    ) -> Course:
        catalog = await self._repository.get_catalog()
        resolved_program_id = program_id or (
            catalog.program.id if catalog.program is not None else "program-default"
        )
        course = Course(
            id=_new_id("course"),
            program_id=resolved_program_id,
            code=code,
            name=name,
            category=category,
            term=term,
            credit_hours=credit_hours,
            owner=owner,
            status=status,
        )
        return await self._repository.upsert_course(course)


class UpdateCourse:
    def __init__(self, repository: AcademicCatalogRepository) -> None:
        self._repository = repository

    async def execute(
        self,
        course_id: str,
        *,
        program_id: str | None,
        code: str,
        name: str,
        category: str,
        term: str,
        credit_hours: float,
        owner: str,
        status: str,
    ) -> Course | None:
        existing = await self._repository.get_course(course_id)
        if existing is None:
            return None
        course = Course(
            id=course_id,
            program_id=program_id or existing.program_id,
            code=code,
            name=name,
            category=category,
            term=term,
            credit_hours=credit_hours,
            owner=owner,
            status=status,
        )
        return await self._repository.upsert_course(course)


class CreateGraduationRequirement:
    def __init__(self, repository: AcademicCatalogRepository) -> None:
        self._repository = repository

    async def execute(
        self,
        *,
        program_id: str | None,
        code: str,
        title: str,
        description: str,
    ) -> GraduationRequirement:
        catalog = await self._repository.get_catalog()
        resolved_program_id = program_id or (
            catalog.program.id if catalog.program is not None else "program-default"
        )
        requirement = GraduationRequirement(
            id=_new_id("requirement"),
            program_id=resolved_program_id,
            code=code,
            title=title,
            description=description,
        )
        return await self._repository.upsert_requirement(requirement)


class UpdateGraduationRequirement:
    def __init__(self, repository: AcademicCatalogRepository) -> None:
        self._repository = repository

    async def execute(
        self,
        requirement_id: str,
        *,
        program_id: str | None,
        code: str,
        title: str,
        description: str,
    ) -> GraduationRequirement | None:
        existing = await self._repository.get_requirement(requirement_id)
        if existing is None:
            return None
        requirement = GraduationRequirement(
            id=requirement_id,
            program_id=program_id or existing.program_id,
            code=code,
            title=title,
            description=description,
        )
        return await self._repository.upsert_requirement(requirement)


class CreateCompetencyIndicator:
    def __init__(self, repository: AcademicCatalogRepository) -> None:
        self._repository = repository

    async def execute(
        self,
        *,
        requirement_id: str,
        code: str,
        title: str,
        description: str,
    ) -> CompetencyIndicator:
        indicator = CompetencyIndicator(
            id=_new_id("indicator"),
            requirement_id=requirement_id,
            code=code,
            title=title,
            description=description,
        )
        return await self._repository.upsert_indicator(indicator)


class UpdateCompetencyIndicator:
    def __init__(self, repository: AcademicCatalogRepository) -> None:
        self._repository = repository

    async def execute(
        self,
        indicator_id: str,
        *,
        requirement_id: str,
        code: str,
        title: str,
        description: str,
    ) -> CompetencyIndicator | None:
        if await self._repository.get_indicator(indicator_id) is None:
            return None
        indicator = CompetencyIndicator(
            id=indicator_id,
            requirement_id=requirement_id,
            code=code,
            title=title,
            description=description,
        )
        return await self._repository.upsert_indicator(indicator)


class CreateCourseObjective:
    def __init__(self, repository: AcademicCatalogRepository) -> None:
        self._repository = repository

    async def execute(
        self,
        *,
        course_id: str,
        code: str,
        title: str,
        description: str,
    ) -> CourseObjective:
        objective = CourseObjective(
            id=_new_id("objective"),
            course_id=course_id,
            code=code,
            title=title,
            description=description,
        )
        return await self._repository.upsert_objective(objective)


class UpdateCourseObjective:
    def __init__(self, repository: AcademicCatalogRepository) -> None:
        self._repository = repository

    async def execute(
        self,
        objective_id: str,
        *,
        course_id: str,
        code: str,
        title: str,
        description: str,
    ) -> CourseObjective | None:
        if await self._repository.get_objective(objective_id) is None:
            return None
        objective = CourseObjective(
            id=objective_id,
            course_id=course_id,
            code=code,
            title=title,
            description=description,
        )
        return await self._repository.upsert_objective(objective)


class CreateExperimentProject:
    def __init__(self, repository: AcademicCatalogRepository) -> None:
        self._repository = repository

    async def execute(
        self,
        *,
        course_id: str,
        code: str,
        title: str,
        description: str,
        environment: str,
        source_material_id: str | None,
    ) -> ExperimentProject:
        experiment = ExperimentProject(
            id=_new_id("experiment"),
            course_id=course_id,
            code=code,
            title=title,
            description=description,
            environment=environment,
            source_material_id=source_material_id or "",
        )
        return await self._repository.upsert_experiment(experiment)


class UpdateExperimentProject:
    def __init__(self, repository: AcademicCatalogRepository) -> None:
        self._repository = repository

    async def execute(
        self,
        experiment_id: str,
        *,
        course_id: str,
        code: str,
        title: str,
        description: str,
        environment: str,
        source_material_id: str | None,
    ) -> ExperimentProject | None:
        if await self._repository.get_experiment(experiment_id) is None:
            return None
        experiment = ExperimentProject(
            id=experiment_id,
            course_id=course_id,
            code=code,
            title=title,
            description=description,
            environment=environment,
            source_material_id=source_material_id or "",
        )
        return await self._repository.upsert_experiment(experiment)


class CreateRubricItem:
    def __init__(self, repository: AcademicCatalogRepository) -> None:
        self._repository = repository

    async def execute(
        self,
        *,
        course_id: str,
        experiment_id: str | None,
        indicator_id: str,
        code: str,
        title: str,
        points: float,
    ) -> RubricItem:
        item = RubricItem(
            id=_new_id("rubric"),
            course_id=course_id,
            experiment_id=experiment_id,
            indicator_id=indicator_id,
            code=code,
            title=title,
            points=points,
        )
        return await self._repository.upsert_rubric_item(item)


class UpdateRubricItem:
    def __init__(self, repository: AcademicCatalogRepository) -> None:
        self._repository = repository

    async def execute(
        self,
        item_id: str,
        *,
        course_id: str,
        experiment_id: str | None,
        indicator_id: str,
        code: str,
        title: str,
        points: float,
    ) -> RubricItem | None:
        if await self._repository.get_rubric_item(item_id) is None:
            return None
        item = RubricItem(
            id=item_id,
            course_id=course_id,
            experiment_id=experiment_id,
            indicator_id=indicator_id,
            code=code,
            title=title,
            points=points,
        )
        return await self._repository.upsert_rubric_item(item)


def _new_id(prefix: str) -> str:
    return f"{prefix}-{uuid4().hex[:12]}"
