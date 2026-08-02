from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class EvaluationRunReference:
    run_id: str
    evaluation_object_id: str

    def __post_init__(self) -> None:
        if not self.run_id or self.run_id != self.run_id.strip():
            raise ValueError("评价运行 ID 不能为空")
        if (
            not self.evaluation_object_id
            or self.evaluation_object_id
            != self.evaluation_object_id.strip()
        ):
            raise ValueError("评价对象 ID 不能为空")
