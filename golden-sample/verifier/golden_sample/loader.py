"""从 ``sample.json`` 与 ``scores.csv`` 载入金标准样例。

拆成两个文件是刻意的：口径、图谱和来源由专业负责人维护，
逐生逐项原始分由任课教师在表格软件里录入并导出 CSV，两者的填写人和更新节奏不同。
"""

import csv
import json
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any, cast

from .model import (
    Criterion,
    EvaluationTarget,
    ExpectedCriterionResult,
    ExpectedResult,
    FormulaPolicy,
    GoldenSample,
    GraphEdge,
    GraphNode,
    SampleContext,
    ScoreRecord,
    SourceRef,
)

SAMPLE_FILENAME = "sample.json"
SCORES_FILENAME = "scores.csv"
SCORE_COLUMNS = ("student_ref", "criterion_id", "raw_score")


class GoldenSampleError(ValueError):
    """金标准样例载入或校验失败。"""


def _context(payload: dict[str, Any]) -> SampleContext:
    # 以下划线开头的键是模板里的填写说明，载入时一律忽略。
    fields = {key: str(value) for key, value in payload.items() if not key.startswith("_")}
    try:
        return SampleContext(**fields)
    except TypeError as error:
        raise GoldenSampleError(f"context 字段不匹配：{error}") from error


def _decimal(value: object, label: str) -> Decimal:
    try:
        return Decimal(str(value))
    except (InvalidOperation, ArithmeticError) as error:
        raise GoldenSampleError(f"{label}不是合法数值：{value!r}") from error


def _optional_decimal(value: object, label: str) -> Decimal | None:
    if value is None:
        return None
    return _decimal(value, label)


def _source_ref(payload: dict[str, Any], label: str) -> SourceRef:
    try:
        return SourceRef(
            material=str(payload["material"]),
            material_version=str(payload["material_version"]),
            locator=str(payload["locator"]),
            digest=str(payload["digest"]),
        )
    except KeyError as error:
        raise GoldenSampleError(f"{label}的来源引用缺少字段 {error}") from error


def _policy(payload: dict[str, Any]) -> FormulaPolicy:
    return FormulaPolicy(
        policy_version=str(payload["policy_version"]),
        method=payload["method"],
        missing_score=payload["missing_score"],
        sample_basis=payload["sample_basis"],
        rounding=payload["rounding"],
        score_rate_dp=int(payload["score_rate_dp"]),
        contribution_dp=int(payload["contribution_dp"]),
        attainment_dp=int(payload["attainment_dp"]),
        weight_tolerance=_decimal(payload["weight_tolerance"], "权重闭合容差"),
        passing_score_ratio=_optional_decimal(
            payload.get("passing_score_ratio"), "单项达标线"
        ),
    )


def _expected(payload: dict[str, Any], target_id: str) -> ExpectedResult:
    return ExpectedResult(
        ready=bool(payload["ready"]),
        blockers=tuple(str(item) for item in payload.get("blockers", ())),
        attainment=_optional_decimal(payload.get("attainment"), f"{target_id} 的人工达成度"),
        outcome=payload.get("outcome"),
        weight_total=_decimal(payload["weight_total"], f"{target_id} 的权重合计"),
        criteria=tuple(
            ExpectedCriterionResult(
                criterion_id=str(item["criterion_id"]),
                valid_sample_count=int(item["valid_sample_count"]),
                missing_sample_count=int(item["missing_sample_count"]),
                score_sum=_decimal(item["score_sum"], "人工分数合计"),
                score_rate=_optional_decimal(item.get("score_rate"), "人工得分率"),
                contribution=_optional_decimal(item.get("contribution"), "人工贡献值"),
            )
            for item in payload.get("criteria", ())
        ),
    )


def _target(payload: dict[str, Any]) -> EvaluationTarget:
    target_id = str(payload["target_id"])
    return EvaluationTarget(
        target_id=target_id,
        course_outcome_id=str(payload["course_outcome_id"]),
        performance_indicator_id=str(payload["performance_indicator_id"]),
        threshold=_decimal(payload["threshold"], f"{target_id} 的达成阈值"),
        criteria=tuple(
            Criterion(
                criterion_id=str(item["criterion_id"]),
                label=str(item["label"]),
                max_score=_decimal(item["max_score"], "评分项满分"),
                weight=_decimal(item["weight"], "评分项权重"),
                source=_source_ref(item["source"], f"评分项 {item['criterion_id']}"),
            )
            for item in payload["criteria"]
        ),
        expected=_expected(payload["expected"], target_id),
        note=str(payload.get("note", "")),
    )


def load_scores(path: Path) -> tuple[ScoreRecord, ...]:
    with path.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames is None:
            raise GoldenSampleError(f"{path.name} 缺少表头行")
        missing_columns = [name for name in SCORE_COLUMNS if name not in reader.fieldnames]
        if missing_columns:
            raise GoldenSampleError(
                f"{path.name} 缺少列：{'、'.join(missing_columns)}；"
                f"要求的列为 {'、'.join(SCORE_COLUMNS)}"
            )

        records: list[ScoreRecord] = []
        for line_number, row in enumerate(reader, start=2):
            student_ref = (row.get("student_ref") or "").strip()
            criterion_id = (row.get("criterion_id") or "").strip()
            raw_value = (row.get("raw_score") or "").strip()
            if not student_ref and not criterion_id and not raw_value:
                continue
            try:
                records.append(
                    ScoreRecord(
                        student_ref=student_ref,
                        criterion_id=criterion_id,
                        raw_score=_decimal(raw_value, "原始分") if raw_value else None,
                    )
                )
            except ValueError as error:
                raise GoldenSampleError(f"{path.name} 第 {line_number} 行：{error}") from error
    return tuple(records)


def load_sample(directory: Path) -> GoldenSample:
    """载入一个金标准样例目录。

    目录需要包含 ``sample.json`` 与 ``scores.csv``。
    """
    sample_path = directory / SAMPLE_FILENAME
    scores_path = directory / SCORES_FILENAME
    for path in (sample_path, scores_path):
        if not path.is_file():
            raise GoldenSampleError(f"缺少文件：{path}")

    payload = cast(dict[str, Any], json.loads(sample_path.read_text(encoding="utf-8")))

    try:
        return GoldenSample(
            sample_id=str(payload["sample_id"]),
            schema_version=int(payload["schema_version"]),
            synthetic=bool(payload["synthetic"]),
            context=_context(payload["context"]),
            policy=_policy(payload["policy"]),
            nodes=tuple(
                GraphNode(
                    node_id=str(item["node_id"]),
                    node_type=str(item["node_type"]),
                    label=str(item["label"]),
                    source=_source_ref(item["source"], f"节点 {item['node_id']}"),
                )
                for item in payload["nodes"]
            ),
            edges=tuple(
                GraphEdge(
                    relation=str(item["relation"]),
                    from_node=str(item["from_node"]),
                    to_node=str(item["to_node"]),
                    source=_source_ref(item["source"], "关系"),
                )
                for item in payload["edges"]
            ),
            targets=tuple(_target(item) for item in payload["targets"]),
            scores=load_scores(scores_path),
        )
    except KeyError as error:
        raise GoldenSampleError(f"{SAMPLE_FILENAME} 缺少字段 {error}") from error
    except ValueError as error:
        if isinstance(error, GoldenSampleError):
            raise
        raise GoldenSampleError(str(error)) from error
