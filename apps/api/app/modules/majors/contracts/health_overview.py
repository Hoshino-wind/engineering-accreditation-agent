from pydantic import BaseModel

from app.modules.majors.application.health_overview import MajorHealthOverview


class MajorHealthSummaryResponse(BaseModel):
    majorId: str
    majorName: str
    healthScore: int
    totalResources: int
    riskCount: int


class MajorHealthOverviewResponse(BaseModel):
    majorCount: int
    totalResources: int
    totalRisks: int
    averageHealthScore: int
    majors: list[MajorHealthSummaryResponse]

    @classmethod
    def from_domain(cls, result: MajorHealthOverview) -> "MajorHealthOverviewResponse":
        return cls(
            majorCount=result.major_count,
            totalResources=result.total_resources,
            totalRisks=result.total_risks,
            averageHealthScore=result.average_health_score,
            majors=[
                MajorHealthSummaryResponse(
                    majorId=item.major_id,
                    majorName=item.major_name,
                    healthScore=item.health_score,
                    totalResources=item.total_resources,
                    riskCount=item.risk_count,
                )
                for item in result.majors
            ],
        )
