from pydantic import BaseModel, ConfigDict

from app.modules.evaluations.contracts.evaluation_run_reference import to_camel


class ScoreImportContract(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        extra="forbid",
        populate_by_name=True,
    )


__all__ = ["ScoreImportContract"]
