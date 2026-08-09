from pydantic import BaseModel

from app.modules.evaluations.rule_engine import EvaluationRun


class EvaluationItemResponse(BaseModel):
    competencyCode: str
    attainment: float
    status: str
    totalStrength: int


class EvaluationRunResponse(BaseModel):
    id: str
    ruleVersion: str
    inputSnapshotHash: str
    graphVersion: str
    startedAt: str
    items: list[EvaluationItemResponse]

    @classmethod
    def from_domain(cls, run: EvaluationRun) -> "EvaluationRunResponse":
        return cls(
            id=run.id,
            ruleVersion=run.rule_version,
            inputSnapshotHash=run.input_snapshot_hash,
            graphVersion=run.graph_version,
            startedAt=run.started_at,
            items=[
                EvaluationItemResponse(
                    competencyCode=item.competency_code,
                    attainment=item.attainment,
                    status=item.status,
                    totalStrength=item.total_strength,
                )
                for item in run.items
            ],
        )

