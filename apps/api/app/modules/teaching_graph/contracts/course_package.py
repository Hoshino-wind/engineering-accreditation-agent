"""结构化课程包导入契约。

字段与《课程大纲》《实验指导书》《评分标准表》三份模板一一对应，
使用者从模板抄录即可，不需要理解图谱节点与关系的内部表示。
"""

from typing import Literal

from pydantic import Field

from app.modules.teaching_graph.contracts.graph import (
    GraphContract,
    GraphSourceContract,
)
from app.modules.teaching_graph.domain import (
    CoursePackage,
    PackageAbility,
    PackageAssessmentTask,
    PackageCourseOutcome,
    PackageCriterion,
    PackageEntity,
    PackageExperiment,
    PackageIndicator,
    PackageSource,
)

Code = Field(min_length=1, max_length=80)
Name = Field(min_length=1, max_length=240)
Definition = Field(min_length=1, max_length=2000)


def _source(contract: GraphSourceContract) -> PackageSource:
    return PackageSource(
        source_ref_id=contract.source_ref_id,
        material_id=contract.material_id,
        material_version_id=contract.material_version_id,
        evidence_fragment_id=contract.evidence_fragment_id,
        material=contract.material,
        version=contract.version,
        coordinate=contract.coordinate,
    )


class PackageEntityContract(GraphContract):
    code: str = Code
    name: str = Name
    definition: str = Definition
    source: GraphSourceContract

    def to_domain(self) -> PackageEntity:
        return PackageEntity(
            code=self.code,
            name=self.name,
            definition=self.definition,
            source=_source(self.source),
        )


class PackageAbilityContract(GraphContract):
    code: str = Code
    name: str = Name
    definition: str = Definition
    domain: str = Field(min_length=1, max_length=160)
    cognitive_level: Literal["understand", "apply", "analyze", "evaluate", "create"]
    observable_behaviors: list[str] = Field(min_length=1, max_length=8)
    source: GraphSourceContract

    def to_domain(self) -> PackageAbility:
        return PackageAbility(
            code=self.code,
            name=self.name,
            definition=self.definition,
            domain=self.domain,
            cognitive_level=self.cognitive_level,
            observable_behaviors=tuple(self.observable_behaviors),
            source=_source(self.source),
        )


class PackageIndicatorContract(GraphContract):
    code: str = Code
    name: str = Name
    definition: str = Definition
    graduate_outcome_code: str = Code
    ability_codes: list[str] = Field(min_length=1, max_length=16)
    source: GraphSourceContract

    def to_domain(self) -> PackageIndicator:
        return PackageIndicator(
            code=self.code,
            name=self.name,
            definition=self.definition,
            graduate_outcome_code=self.graduate_outcome_code,
            ability_codes=tuple(self.ability_codes),
            source=_source(self.source),
        )


class PackageCourseOutcomeContract(GraphContract):
    """课程大纲表B + 表C：课程目标及其支撑的指标点。

    ``rationale`` 与 ``targetBehaviors`` 是支撑关系的能力映射，
    行为必须取自该指标点期望的能力的可观察行为。
    """

    code: str = Code
    name: str = Name
    definition: str = Definition
    indicator_code: str = Code
    rationale: str = Field(min_length=1, max_length=1000)
    target_behaviors: list[str] = Field(min_length=1, max_length=8)
    source: GraphSourceContract

    def to_domain(self) -> PackageCourseOutcome:
        return PackageCourseOutcome(
            code=self.code,
            name=self.name,
            definition=self.definition,
            indicator_code=self.indicator_code,
            rationale=self.rationale,
            target_behaviors=tuple(self.target_behaviors),
            source=_source(self.source),
        )


class PackageExperimentContract(GraphContract):
    """实验指导书 §1 §2：实验项目及其对应课程目标与培养能力。"""

    code: str = Code
    name: str = Name
    definition: str = Definition
    course_outcome_codes: list[str] = Field(min_length=1, max_length=16)
    ability_codes: list[str] = Field(min_length=1, max_length=16)
    source: GraphSourceContract

    def to_domain(self) -> PackageExperiment:
        return PackageExperiment(
            code=self.code,
            name=self.name,
            definition=self.definition,
            course_outcome_codes=tuple(self.course_outcome_codes),
            ability_codes=tuple(self.ability_codes),
            source=_source(self.source),
        )


class PackageAssessmentTaskContract(GraphContract):
    code: str = Code
    name: str = Name
    definition: str = Definition
    experiment_code: str = Code
    source: GraphSourceContract

    def to_domain(self) -> PackageAssessmentTask:
        return PackageAssessmentTask(
            code=self.code,
            name=self.name,
            definition=self.definition,
            experiment_code=self.experiment_code,
            source=_source(self.source),
        )


class PackageCriterionContract(GraphContract):
    """评分标准表：评分项、所属考核任务、直接评价的能力与汇总的课程目标。

    ``abilityCode`` 产生 ``assesses``（评价效度），``courseOutcomeCode``
    产生 ``contributes-to``（聚合路径）。两者独立，不可互相替代。
    权重不在此声明——权重属于 M6 评价策略版本。
    """

    code: str = Code
    name: str = Name
    definition: str = Definition
    task_code: str = Code
    course_outcome_code: str = Code
    ability_code: str = Code
    source: GraphSourceContract

    def to_domain(self) -> PackageCriterion:
        return PackageCriterion(
            code=self.code,
            name=self.name,
            definition=self.definition,
            task_code=self.task_code,
            course_outcome_code=self.course_outcome_code,
            ability_code=self.ability_code,
            source=_source(self.source),
        )


class ImportCoursePackageRequest(GraphContract):
    package_version: Literal["course-package:v1"]
    expected_revision: int = Field(ge=0)
    effective_cycle: str = Field(min_length=1, max_length=80)
    owner: str = Field(min_length=1, max_length=120)
    course: PackageEntityContract
    graduate_outcomes: list[PackageEntityContract] = Field(min_length=1, max_length=64)
    indicators: list[PackageIndicatorContract] = Field(min_length=1, max_length=128)
    abilities: list[PackageAbilityContract] = Field(min_length=1, max_length=128)
    course_outcomes: list[PackageCourseOutcomeContract] = Field(min_length=1, max_length=64)
    experiments: list[PackageExperimentContract] = Field(min_length=1, max_length=128)
    assessment_tasks: list[PackageAssessmentTaskContract] = Field(min_length=1, max_length=256)
    criteria: list[PackageCriterionContract] = Field(min_length=1, max_length=512)

    def to_domain(self) -> CoursePackage:
        return CoursePackage(
            effective_cycle=self.effective_cycle,
            owner=self.owner,
            course=self.course.to_domain(),
            graduate_outcomes=tuple(item.to_domain() for item in self.graduate_outcomes),
            indicators=tuple(item.to_domain() for item in self.indicators),
            abilities=tuple(item.to_domain() for item in self.abilities),
            course_outcomes=tuple(item.to_domain() for item in self.course_outcomes),
            experiments=tuple(item.to_domain() for item in self.experiments),
            assessment_tasks=tuple(item.to_domain() for item in self.assessment_tasks),
            criteria=tuple(item.to_domain() for item in self.criteria),
        )


__all__ = [
    "ImportCoursePackageRequest",
    "PackageAbilityContract",
    "PackageAssessmentTaskContract",
    "PackageCourseOutcomeContract",
    "PackageCriterionContract",
    "PackageEntityContract",
    "PackageExperimentContract",
    "PackageIndicatorContract",
]
