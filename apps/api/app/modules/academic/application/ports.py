from typing import Protocol

from app.modules.academic.domain import (
    AcademicCatalog,
    AcademicProgram,
    CompetencyIndicator,
    Course,
    CourseObjective,
    ExperimentProject,
    GraduationRequirement,
    RubricItem,
    SupportLink,
)


class AcademicCatalogRepository(Protocol):
    async def get_catalog(self) -> AcademicCatalog: ...

    async def upsert_program(self, program: AcademicProgram) -> AcademicProgram: ...

    async def get_course(self, course_id: str) -> Course | None: ...

    async def upsert_course(self, course: Course) -> Course: ...

    async def get_requirement(
        self,
        requirement_id: str,
    ) -> GraduationRequirement | None: ...

    async def upsert_requirement(
        self,
        requirement: GraduationRequirement,
    ) -> GraduationRequirement: ...

    async def get_indicator(self, indicator_id: str) -> CompetencyIndicator | None: ...

    async def upsert_indicator(
        self,
        indicator: CompetencyIndicator,
    ) -> CompetencyIndicator: ...

    async def get_objective(self, objective_id: str) -> CourseObjective | None: ...

    async def upsert_objective(
        self,
        objective: CourseObjective,
    ) -> CourseObjective: ...

    async def get_experiment(self, experiment_id: str) -> ExperimentProject | None: ...

    async def upsert_experiment(
        self,
        experiment: ExperimentProject,
    ) -> ExperimentProject: ...

    async def get_rubric_item(self, item_id: str) -> RubricItem | None: ...

    async def upsert_rubric_item(self, item: RubricItem) -> RubricItem: ...

    async def upsert_support_link(self, link: SupportLink) -> SupportLink: ...
