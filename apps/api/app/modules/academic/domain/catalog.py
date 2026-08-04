from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class AcademicProgram:
    id: str
    code: str
    name: str
    discipline: str
    degree: str
    owner: str
    evaluation_cycle: str
    status: str


@dataclass(frozen=True, slots=True)
class Course:
    id: str
    program_id: str
    code: str
    name: str
    category: str
    term: str
    credit_hours: float
    owner: str
    status: str


@dataclass(frozen=True, slots=True)
class GraduationRequirement:
    id: str
    program_id: str
    code: str
    title: str
    description: str


@dataclass(frozen=True, slots=True)
class CompetencyIndicator:
    id: str
    requirement_id: str
    code: str
    title: str
    description: str


@dataclass(frozen=True, slots=True)
class CourseObjective:
    id: str
    course_id: str
    code: str
    title: str
    description: str


@dataclass(frozen=True, slots=True)
class ExperimentProject:
    id: str
    course_id: str
    code: str
    title: str
    description: str
    environment: str
    source_material_id: str


@dataclass(frozen=True, slots=True)
class RubricItem:
    id: str
    course_id: str
    experiment_id: str | None
    indicator_id: str
    code: str
    title: str
    points: float


@dataclass(frozen=True, slots=True)
class SourceMaterial:
    id: str
    course_id: str
    file_name: str
    material_type: str
    source_path: str
    checksum: str
    status: str


@dataclass(frozen=True, slots=True)
class SupportLink:
    id: str
    source_type: str
    source_id: str
    target_indicator_id: str
    relation: str
    strength: str
    evidence: str
    status: str


@dataclass(frozen=True, slots=True)
class AcademicCatalog:
    program: AcademicProgram | None
    courses: list[Course]
    graduation_requirements: list[GraduationRequirement]
    indicators: list[CompetencyIndicator]
    objectives: list[CourseObjective]
    experiments: list[ExperimentProject]
    rubric_items: list[RubricItem]
    source_materials: list[SourceMaterial]
    support_links: list[SupportLink]

