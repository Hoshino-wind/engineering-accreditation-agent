from app.modules.majors.application.create_major import (
    CreateMajor,
    MajorAlreadyExistsError,
)
from app.modules.majors.application.delete_major import (
    DeleteMajor,
    MajorNotFoundError,
)
from app.modules.majors.application.list_majors import ListMajors
from app.modules.majors.application.health_overview import GetMajorHealthOverview
from app.modules.majors.application.analysis import GetMajorAnalysis, GetMajorSummary
from app.modules.majors.application.ports import MajorRepository

__all__ = [
    "CreateMajor",
    "DeleteMajor",
    "ListMajors",
    "GetMajorHealthOverview",
    "GetMajorAnalysis",
    "GetMajorSummary",
    "MajorAlreadyExistsError",
    "MajorNotFoundError",
    "MajorRepository",
]
