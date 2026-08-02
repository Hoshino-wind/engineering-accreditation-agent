from typing import Annotated

from fastapi import Header, Path

IdempotencyKeyHeader = Annotated[
    str,
    Header(
        alias="Idempotency-Key",
        min_length=8,
        max_length=160,
        pattern=r"^[A-Za-z0-9][A-Za-z0-9._:-]{7,159}$",
    ),
]

EvaluationRunIdPath = Annotated[
    str,
    Path(
        min_length=1,
        max_length=160,
        pattern=r"^.*\S.*$",
    ),
]

ScoreImportBatchIdPath = Annotated[
    str,
    Path(
        min_length=1,
        max_length=160,
        pattern=r"^.*\S.*$",
    ),
]

__all__ = [
    "EvaluationRunIdPath",
    "IdempotencyKeyHeader",
    "ScoreImportBatchIdPath",
]
