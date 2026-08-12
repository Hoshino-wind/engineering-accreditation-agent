"""金标准与服务端派生逻辑的一致性。

这是标尺真正量到东西的地方：金标准里的得分率是人工先算出来的，
本测试用服务端的派生逻辑重算同一批原始分，两边必须逐项相等。

刻意直接读取金标准的数据文件，而不导入 ``golden-sample/verifier`` 包：
校验器是独立实现的尺子，服务端测试只与它的**产出数据**比对，不共享它的代码。
"""

import csv
import json
from decimal import ROUND_HALF_UP, Decimal
from pathlib import Path

import pytest
from app.modules.evaluations.domain import (
    PerStudentScoreItem,
    StudentScoreEntry,
    derive_per_student_item,
)

SAMPLE_DIR = Path(__file__).resolve().parents[3] / "golden-sample" / "samples"
SENSOR_DIR = SAMPLE_DIR / "sensor-lab-demo"


def load_golden(directory: Path) -> tuple[dict, dict[str, list[tuple[str, str | None]]]]:
    sample = json.loads((directory / "sample.json").read_text(encoding="utf-8"))
    scores: dict[str, list[tuple[str, str | None]]] = {}
    with (directory / "scores.csv").open(encoding="utf-8-sig", newline="") as handle:
        for row in csv.DictReader(handle):
            raw = (row["raw_score"] or "").strip()
            scores.setdefault(row["criterion_id"].strip(), []).append(
                (row["student_ref"].strip(), raw or None)
            )
    return sample, scores


def golden_criteria() -> list[tuple[str, dict, dict, dict]]:
    """展开为 (评分项 ID, 评分项定义, 人工中间值, 口径) 四元组。"""
    sample, scores = load_golden(SENSOR_DIR)
    rows = []
    for target in sample["targets"]:
        definitions = {item["criterion_id"]: item for item in target["criteria"]}
        for expected in target["expected"]["criteria"]:
            criterion_id = expected["criterion_id"]
            if criterion_id not in scores:
                continue  # 阻断项没有评分数据，由 test_blocked_criteria 覆盖
            rows.append(
                (criterion_id, definitions[criterion_id], expected, sample["policy"])
            )
    return rows


@pytest.mark.parametrize(
    ("criterion_id", "definition", "expected", "policy"),
    golden_criteria(),
    ids=[row[0] for row in golden_criteria()],
)
def test_server_derivation_matches_hand_calculation(
    criterion_id: str,
    definition: dict,
    expected: dict,
    policy: dict,
) -> None:
    sample, scores = load_golden(SENSOR_DIR)
    item = PerStudentScoreItem(
        input_id=criterion_id,
        max_score=Decimal(definition["max_score"]),
        entries=tuple(
            StudentScoreEntry(ref, None if raw is None else Decimal(raw))
            for ref, raw in scores[criterion_id]
        ),
    )

    derivation = derive_per_student_item(item, policy["missing_score"])

    assert derivation.blockers == ()
    assert derivation.valid_count == expected["valid_sample_count"]
    assert derivation.missing_count == expected["missing_sample_count"]
    assert derivation.candidate.earned_points_total == Decimal(expected["score_sum"])

    assert derivation.candidate.possible_points_total is not None
    derived_rate = (
        derivation.candidate.earned_points_total / derivation.candidate.possible_points_total
    ).quantize(
        Decimal(1).scaleb(-int(policy["score_rate_dp"])),
        rounding=ROUND_HALF_UP,
    )
    assert derived_rate == Decimal(expected["score_rate"])


def test_blocked_criteria_have_no_score_data() -> None:
    """金标准里的阻断项确实没有评分数据，服务端也必须据此阻断。"""
    sample, scores = load_golden(SENSOR_DIR)
    blocked = [
        (target, item)
        for target in sample["targets"]
        if not target["expected"]["ready"]
        for item in target["criteria"]
    ]

    assert blocked, "示例应包含至少一个阻断评价对象"
    for target, definition in blocked:
        criterion_id = definition["criterion_id"]
        assert criterion_id not in scores
        derivation = derive_per_student_item(
            PerStudentScoreItem(
                input_id=criterion_id,
                max_score=Decimal(definition["max_score"]),
                entries=(),
            ),
            sample["policy"]["missing_score"],
        )
        assert derivation.blockers
        assert derivation.candidate.earned_points_total is None
        assert target["expected"]["attainment"] is None
        assert target["expected"]["outcome"] is None


def test_graph_derived_structure_matches_the_golden_sample_grouping() -> None:
    """课程包导入后派生的评价结构，必须与人工编制的金标准分组完全一致。

    这一条把三段链路接成一条：结构化录入 → 正式图谱 → 评价结构。
    人工先写下"哪些评分项归集到哪个课程目标"，服务端从图谱关系独立推导出同一答案。
    """
    import json

    from app.modules.evaluations.domain import derive_evaluation_structure
    from app.modules.teaching_graph.contracts import ImportCoursePackageRequest
    from app.modules.teaching_graph.domain import build_course_package_objects

    package = json.loads((SENSOR_DIR / "course-package.json").read_text(encoding="utf-8"))
    nodes, edges = build_course_package_objects(
        ImportCoursePackageRequest.model_validate(package).to_domain()
    )
    # 发布会把草稿对象置为 effective / approved；此处取发布后的等价快照。
    snapshot = {
        "version": "v0.2",
        "schemaVersionId": "teaching-graph-schema@2",
        "publishedAt": "2026-08-04T00:00:00Z",
        "nodes": [{**item, "status": "effective"} for item in nodes],
        "edges": [
            {**item, "status": "effective", "reviewStatus": "approved"} for item in edges
        ],
    }

    derived = {
        target.objective_code: sorted(item.criterion_code for item in target.criteria)
        for target in derive_evaluation_structure(snapshot).targets
    }
    sample, _ = load_golden(SENSOR_DIR)
    expected = {
        target["course_outcome_id"]: sorted(
            item["criterion_id"] for item in target["criteria"]
        )
        for target in sample["targets"]
    }

    assert derived == expected


def test_golden_policy_is_expressible_by_the_server_contract() -> None:
    """金标准声明的口径必须落在服务端支持的取值范围内。

    若金标准换用服务端尚未实现的口径（例如达标人数比例法），
    本测试会先失败，而不是等到试点现场才发现算不出来。
    """
    sample, _ = load_golden(SENSOR_DIR)
    policy = sample["policy"]

    assert policy["method"] == "mean_score_ratio"
    assert policy["missing_score"] in {"exclude", "zero", "block"}
    assert policy["rounding"] == "half_up"
    assert 1 <= int(policy["score_rate_dp"]) <= 6
