from pydantic import BaseModel, Field

from app.modules.academic.domain import (
    AcademicCatalog,
    AcademicProgram,
    CompetencyIndicator,
    Course,
    CourseObjective,
    ExperimentProject,
    GraduationRequirement,
    RubricItem,
    SourceMaterial,
    SupportLink,
)


class AcademicProgramResponse(BaseModel):
    id: str
    code: str
    name: str
    discipline: str
    degree: str
    owner: str
    evaluationCycle: str
    status: str

    @classmethod
    def from_domain(cls, program: AcademicProgram) -> "AcademicProgramResponse":
        return cls(
            id=program.id,
            code=program.code,
            name=program.name,
            discipline=program.discipline,
            degree=program.degree,
            owner=program.owner,
            evaluationCycle=program.evaluation_cycle,
            status=program.status,
        )


class CourseResponse(BaseModel):
    id: str
    programId: str
    code: str
    name: str
    category: str
    term: str
    creditHours: float
    owner: str
    status: str

    @classmethod
    def from_domain(cls, course: Course) -> "CourseResponse":
        return cls(
            id=course.id,
            programId=course.program_id,
            code=course.code,
            name=course.name,
            category=course.category,
            term=course.term,
            creditHours=course.credit_hours,
            owner=course.owner,
            status=course.status,
        )


class GraduationRequirementResponse(BaseModel):
    id: str
    programId: str
    code: str
    title: str
    description: str

    @classmethod
    def from_domain(
        cls,
        requirement: GraduationRequirement,
    ) -> "GraduationRequirementResponse":
        return cls(
            id=requirement.id,
            programId=requirement.program_id,
            code=requirement.code,
            title=requirement.title,
            description=requirement.description,
        )


class CompetencyIndicatorResponse(BaseModel):
    id: str
    requirementId: str
    code: str
    title: str
    description: str

    @classmethod
    def from_domain(cls, indicator: CompetencyIndicator) -> "CompetencyIndicatorResponse":
        return cls(
            id=indicator.id,
            requirementId=indicator.requirement_id,
            code=indicator.code,
            title=indicator.title,
            description=indicator.description,
        )


class CourseObjectiveResponse(BaseModel):
    id: str
    courseId: str
    code: str
    title: str
    description: str

    @classmethod
    def from_domain(cls, objective: CourseObjective) -> "CourseObjectiveResponse":
        return cls(
            id=objective.id,
            courseId=objective.course_id,
            code=objective.code,
            title=objective.title,
            description=objective.description,
        )


class ExperimentProjectResponse(BaseModel):
    id: str
    courseId: str
    code: str
    title: str
    description: str
    environment: str
    sourceMaterialId: str

    @classmethod
    def from_domain(cls, experiment: ExperimentProject) -> "ExperimentProjectResponse":
        return cls(
            id=experiment.id,
            courseId=experiment.course_id,
            code=experiment.code,
            title=experiment.title,
            description=experiment.description,
            environment=experiment.environment,
            sourceMaterialId=experiment.source_material_id,
        )


class RubricItemResponse(BaseModel):
    id: str
    courseId: str
    experimentId: str | None
    indicatorId: str
    code: str
    title: str
    points: float

    @classmethod
    def from_domain(cls, item: RubricItem) -> "RubricItemResponse":
        return cls(
            id=item.id,
            courseId=item.course_id,
            experimentId=item.experiment_id,
            indicatorId=item.indicator_id,
            code=item.code,
            title=item.title,
            points=item.points,
        )


class SourceMaterialResponse(BaseModel):
    id: str
    courseId: str
    fileName: str
    materialType: str
    sourcePath: str
    checksum: str
    status: str

    @classmethod
    def from_domain(cls, material: SourceMaterial) -> "SourceMaterialResponse":
        return cls(
            id=material.id,
            courseId=material.course_id,
            fileName=material.file_name,
            materialType=material.material_type,
            sourcePath=material.source_path,
            checksum=material.checksum,
            status=material.status,
        )


class SupportLinkResponse(BaseModel):
    id: str
    sourceType: str
    sourceId: str
    targetIndicatorId: str
    relation: str
    strength: str
    evidence: str
    status: str

    @classmethod
    def from_domain(cls, link: SupportLink) -> "SupportLinkResponse":
        return cls(
            id=link.id,
            sourceType=link.source_type,
            sourceId=link.source_id,
            targetIndicatorId=link.target_indicator_id,
            relation=link.relation,
            strength=link.strength,
            evidence=link.evidence,
            status=link.status,
        )


class AcademicCatalogResponse(BaseModel):
    program: AcademicProgramResponse | None
    courses: list[CourseResponse]
    graduationRequirements: list[GraduationRequirementResponse]
    indicators: list[CompetencyIndicatorResponse]
    objectives: list[CourseObjectiveResponse]
    experiments: list[ExperimentProjectResponse]
    rubricItems: list[RubricItemResponse]
    sourceMaterials: list[SourceMaterialResponse]
    supportLinks: list[SupportLinkResponse]

    @classmethod
    def from_domain(cls, catalog: AcademicCatalog) -> "AcademicCatalogResponse":
        return cls(
            program=(
                AcademicProgramResponse.from_domain(catalog.program)
                if catalog.program is not None
                else None
            ),
            courses=[CourseResponse.from_domain(course) for course in catalog.courses],
            graduationRequirements=[
                GraduationRequirementResponse.from_domain(requirement)
                for requirement in catalog.graduation_requirements
            ],
            indicators=[
                CompetencyIndicatorResponse.from_domain(indicator)
                for indicator in catalog.indicators
            ],
            objectives=[
                CourseObjectiveResponse.from_domain(objective)
                for objective in catalog.objectives
            ],
            experiments=[
                ExperimentProjectResponse.from_domain(experiment)
                for experiment in catalog.experiments
            ],
            rubricItems=[RubricItemResponse.from_domain(item) for item in catalog.rubric_items],
            sourceMaterials=[
                SourceMaterialResponse.from_domain(material)
                for material in catalog.source_materials
            ],
            supportLinks=[SupportLinkResponse.from_domain(link) for link in catalog.support_links],
        )


class AcademicProgramUpsertRequest(BaseModel):
    code: str
    name: str
    discipline: str
    degree: str
    owner: str
    evaluation_cycle: str = Field(alias="evaluationCycle")
    status: str


class CourseUpsertRequest(BaseModel):
    program_id: str | None = Field(default=None, alias="programId")
    code: str
    name: str
    category: str
    term: str
    credit_hours: float = Field(alias="creditHours")
    owner: str
    status: str


class GraduationRequirementUpsertRequest(BaseModel):
    program_id: str | None = Field(default=None, alias="programId")
    code: str
    title: str
    description: str


class CompetencyIndicatorUpsertRequest(BaseModel):
    requirement_id: str = Field(alias="requirementId")
    code: str
    title: str
    description: str


class CourseObjectiveUpsertRequest(BaseModel):
    course_id: str = Field(alias="courseId")
    code: str
    title: str
    description: str


class ExperimentProjectUpsertRequest(BaseModel):
    course_id: str = Field(alias="courseId")
    code: str
    title: str
    description: str
    environment: str
    source_material_id: str | None = Field(default=None, alias="sourceMaterialId")


class RubricItemUpsertRequest(BaseModel):
    course_id: str = Field(alias="courseId")
    experiment_id: str | None = Field(default=None, alias="experimentId")
    indicator_id: str = Field(alias="indicatorId")
    code: str
    title: str
    points: float
