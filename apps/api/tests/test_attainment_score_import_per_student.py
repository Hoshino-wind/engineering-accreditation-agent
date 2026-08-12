"""逐生逐项评分导入。

这组测试守住本次改造的目的：把缺失值口径和舍入时机从表格里搬进服务端，
并让原始分本身参与内容摘要，从而使汇总值可以被复核者重新推导。
"""

import sqlite3
from decimal import Decimal
from pathlib import Path

import pytest
from app.modules.evaluations.domain import (
    PER_STUDENT_PROFILE,
    PerStudentScoreItem,
    StudentScoreEntry,
    build_per_student_score_import_batch,
    derive_per_student_item,
    per_student_payload,
)
from app.modules.evaluations.infra.score_import_sqlite_codec import (
    ScoreImportRepositorySchemaError,
)
from fastapi.testclient import TestClient
from pytest import raises
from tests.test_attainment_score_import_batches import (  # noqa: F401
    SCORE_BATCH_PATH,
    enabled_client,
    post_batch,
)

# 与 golden-sample/samples/sensor-lab-demo 中 RC-0201 完全一致的一组分数：
# 12 人花名册，S04 缺席实验二。金标准独立复算的得分率是 0.782（三位定标）。
SENSOR_RC0201 = (
    ("S01", "16"), ("S02", "15"), ("S03", "17"), ("S04", None),
    ("S05", "16"), ("S06", "18"), ("S07", "15"), ("S08", "12"),
    ("S09", "17"), ("S10", "16"), ("S11", "14"), ("S12", "16"),
)


def sensor_item(input_id: str = "RC-0201") -> PerStudentScoreItem:
    return PerStudentScoreItem(
        input_id=input_id,
        max_score=Decimal("20"),
        entries=tuple(
            StudentScoreEntry(
                student_ref=ref,
                raw_score=None if raw is None else Decimal(raw),
            )
            for ref, raw in SENSOR_RC0201
        ),
    )


def per_student_payload_body(
    *,
    policy: str = "exclude",
    scale: int | None = 3,
    items: list[dict[str, object]] | None = None,
) -> dict[str, object]:
    body: dict[str, object] = {
        "evaluationObjectId": "evaluation-ct5",
        "baseRunId": "eval-2026-068",
        "profile": PER_STUDENT_PROFILE,
        "missingScorePolicy": policy,
        "studentItems": items if items is not None else default_student_items(),
    }
    if scale is not None:
        body["scoreRateScale"] = scale
    return body


def default_student_items() -> list[dict[str, object]]:
    """覆盖 eval-2026-068 的两个评分输入，各 36 人满员。"""
    return [
        {
            "inputId": input_id,
            "maxScore": "100",
            "entries": [
                {"studentRef": f"S{index:02d}", "rawScore": raw}
                for index in range(1, 37)
            ],
        }
        for input_id, raw in (("input-teamwork", "80"), ("input-communication", "79"))
    ]


# --------------------------------------------------------------------------
# 派生逻辑：口径决定分母
# --------------------------------------------------------------------------


def test_exclude_policy_matches_golden_sample_recomputation() -> None:
    """exclude 口径下的派生结果必须与金标准的独立复算一致。"""
    derivation = derive_per_student_item(sensor_item(), "exclude")

    assert derivation.roster_count == 12
    assert derivation.valid_count == 11
    assert derivation.missing_count == 1
    # 金标准：分数合计 172，分母按有效样本 11 × 满分 20。
    assert derivation.candidate.earned_points_total == Decimal("172")
    assert derivation.candidate.possible_points_total == Decimal("220")
    assert derivation.candidate.observed_student_count == 11
    assert (Decimal("172") / Decimal("220")).quantize(Decimal("0.001")) == Decimal("0.782")


def test_zero_policy_keeps_absentees_in_the_denominator() -> None:
    derivation = derive_per_student_item(sensor_item(), "zero")

    assert derivation.candidate.earned_points_total == Decimal("172")
    assert derivation.candidate.possible_points_total == Decimal("240")
    assert derivation.candidate.observed_student_count == 12
    # 同一批原始分，仅口径不同即相差 0.065——这正是口径必须显式声明的原因。
    assert (Decimal("172") / Decimal("240")).quantize(Decimal("0.001")) == Decimal("0.717")


def test_block_policy_refuses_to_assume_anything() -> None:
    derivation = derive_per_student_item(sensor_item(), "block")

    assert derivation.candidate.earned_points_total is None
    assert derivation.blockers
    assert "缺考" in derivation.blockers[0]


def test_out_of_range_raw_score_blocks_derivation() -> None:
    item = PerStudentScoreItem(
        input_id="RC-0201",
        max_score=Decimal("20"),
        entries=(StudentScoreEntry("S01", Decimal("21")),),
    )

    assert derive_per_student_item(item, "exclude").blockers


def test_duplicate_student_blocks_derivation() -> None:
    item = PerStudentScoreItem(
        input_id="RC-0201",
        max_score=Decimal("20"),
        entries=(
            StudentScoreEntry("S01", Decimal("18")),
            StudentScoreEntry("S01", Decimal("12")),
        ),
    )

    assert derive_per_student_item(item, "exclude").blockers


# --------------------------------------------------------------------------
# 摘要：原始分与口径都必须影响内容摘要
# --------------------------------------------------------------------------


def test_same_totals_from_different_rosters_hash_differently() -> None:
    """两批总分相同但花名册不同的数据，摘要必须不同。

    这是汇总口径做不到的：它只看见 172/220，看不见这 172 分来自谁。
    """
    twelve = sensor_item()
    six = PerStudentScoreItem(
        input_id="RC-0201",
        max_score=Decimal("20"),
        entries=(
            StudentScoreEntry("S01", Decimal("20")),
            StudentScoreEntry("S02", Decimal("20")),
            StudentScoreEntry("S03", Decimal("20")),
            StudentScoreEntry("S04", Decimal("20")),
            StudentScoreEntry("S05", Decimal("20")),
            StudentScoreEntry("S06", Decimal("20")),
            StudentScoreEntry("S07", Decimal("20")),
            StudentScoreEntry("S08", Decimal("20")),
            StudentScoreEntry("S09", Decimal("12")),
            StudentScoreEntry("S10", Decimal("0")),
            StudentScoreEntry("S11", Decimal("0")),
        ),
    )

    assert derive_per_student_item(twelve, "exclude").candidate.earned_points_total == (
        derive_per_student_item(six, "exclude").candidate.earned_points_total
    )
    assert per_student_payload(
        items=(twelve,), missing_score_policy="exclude", score_rate_scale=3
    ) != per_student_payload(
        items=(six,), missing_score_policy="exclude", score_rate_scale=3
    )


def test_missing_policy_changes_the_digest_payload() -> None:
    exclude = per_student_payload(
        items=(sensor_item(),), missing_score_policy="exclude", score_rate_scale=3
    )
    zero = per_student_payload(
        items=(sensor_item(),), missing_score_policy="zero", score_rate_scale=3
    )

    assert exclude != zero


def test_score_rate_scale_changes_the_digest_payload() -> None:
    three = per_student_payload(
        items=(sensor_item(),), missing_score_policy="exclude", score_rate_scale=3
    )
    six = per_student_payload(
        items=(sensor_item(),), missing_score_policy="exclude", score_rate_scale=6
    )

    assert three != six


# --------------------------------------------------------------------------
# 批次构建
# --------------------------------------------------------------------------


def build_sensor_batch(policy: str = "exclude", scale: int = 3):
    from app.modules.evaluations.infra.pilot_seed import load_pilot_evaluation_seed

    seed = load_pilot_evaluation_seed()
    base = next(run for run in seed.runs if run.run.run_id == "eval-2026-068")
    items = tuple(
        PerStudentScoreItem(
            input_id=input_id,
            max_score=Decimal("100"),
            entries=tuple(
                StudentScoreEntry(f"S{index:02d}", Decimal(raw))
                for index in range(1, 37)
            ),
        )
        for input_id, raw in (("input-teamwork", "80"), ("input-communication", "79"))
    )
    return build_per_student_score_import_batch(
        batch_id="score-batch-test",
        report_id="score-report-test",
        created_at="2026-08-04T00:00:00Z",
        validator_version="score-import-validator 0.1.0",
        base_run=base.run,
        items=items,
        missing_score_policy=policy,  # type: ignore[arg-type]
        score_rate_scale=scale,
    )


def test_batch_retains_raw_scores_for_reviewers() -> None:
    """摘要之外还必须能读回原始分，否则复核者无法独立重算。"""
    batch = build_sensor_batch()

    assert batch.profile == PER_STUDENT_PROFILE
    assert batch.per_student_source is not None
    assert batch.per_student_source.missing_score_policy == "exclude"
    assert batch.per_student_source.score_rate_scale == 3
    assert len(batch.per_student_source.items) == 2
    assert len(batch.per_student_source.items[0].entries) == 36


def test_batch_records_use_the_declared_score_rate_scale() -> None:
    batch = build_sensor_batch(scale=3)

    assert batch.validation_report.validation_status == "pilot_ready"
    for record in batch.records:
        assert record.score_rate_scale == 3
        assert record.score_rate == record.score_rate.quantize(Decimal("0.001"))


def test_per_student_checks_are_reported() -> None:
    codes = {check.code for check in build_sensor_batch().validation_report.checks}

    assert {
        "score_student.roster_consistent",
        "score_student.duplicates",
        "score_student.raw_score_range",
        "score_student.missing_policy",
    } <= codes


# --------------------------------------------------------------------------
# HTTP 契约
# --------------------------------------------------------------------------


def test_per_student_batch_round_trips_over_http(
    enabled_client: tuple[TestClient, Path],  # noqa: F811
) -> None:
    client, _ = enabled_client

    created = post_batch(client, key="per-student-1", payload=per_student_payload_body())

    assert created.status_code == 201
    batch = created.json()["batch"]
    assert batch["profile"] == PER_STUDENT_PROFILE
    assert batch["scope"] == "local_pilot_per_student"
    assert batch["recordGranularity"] == "per_student"
    assert batch["perStudentSource"]["missingScorePolicy"] == "exclude"
    assert batch["perStudentSource"]["scoreRateScale"] == 3

    fetched = client.get(f"{SCORE_BATCH_PATH}/{batch['batchId']}")

    assert fetched.status_code == 200
    assert fetched.json() == batch


def test_stored_raw_scores_are_covered_by_the_content_digest(
    enabled_client: tuple[TestClient, Path],  # noqa: F811
) -> None:
    """篡改任意一格原始分，读取时必须失败。

    汇总口径下改一个学生的分数根本无从察觉——因为它压根没被存下来。
    """
    client, data_dir = enabled_client
    batch_id = post_batch(
        client, key="per-student-2", payload=per_student_payload_body()
    ).json()["batch"]["batchId"]

    with sqlite3.connect(data_dir / "evaluation-read-model.sqlite3") as connection:
        connection.execute(
            "DROP TRIGGER prevent_evaluation_score_import_student_entries_update"
        )
        connection.execute(
            """
            UPDATE evaluation_score_import_student_entries
            SET raw_score = '99' WHERE batch_id = ? AND entry_order = 0
            """,
            (batch_id,),
        )

    with raises(ScoreImportRepositorySchemaError, match="内容摘要不一致"):
        client.get(f"{SCORE_BATCH_PATH}/{batch_id}")


def test_aggregate_fields_are_rejected_under_per_student_profile(
    enabled_client: tuple[TestClient, Path],  # noqa: F811
) -> None:
    client, _ = enabled_client
    payload = per_student_payload_body()
    payload["items"] = [
        {
            "inputId": "input-teamwork",
            "earnedPointsTotal": "2880",
            "possiblePointsTotal": "3600",
            "observedStudentCount": 36,
        }
    ]

    assert post_batch(client, key="per-student-3", payload=payload).status_code == 422


def test_missing_policy_is_mandatory_under_per_student_profile(
    enabled_client: tuple[TestClient, Path],  # noqa: F811
) -> None:
    client, _ = enabled_client
    payload = per_student_payload_body()
    del payload["missingScorePolicy"]

    assert post_batch(client, key="per-student-4", payload=payload).status_code == 422


def test_per_student_fields_are_rejected_under_aggregate_profile(
    enabled_client: tuple[TestClient, Path],  # noqa: F811
) -> None:
    client, _ = enabled_client
    payload = {
        "evaluationObjectId": "evaluation-ct5",
        "baseRunId": "eval-2026-068",
        "profile": "local-pilot-aggregate:v1",
        "items": [
            {
                "inputId": "input-teamwork",
                "earnedPointsTotal": "2880",
                "possiblePointsTotal": "3600",
                "observedStudentCount": 36,
            }
        ],
        "missingScorePolicy": "exclude",
    }

    assert post_batch(client, key="per-student-5", payload=payload).status_code == 422


@pytest.mark.parametrize("scale", [0, 7])
def test_score_rate_scale_is_bounded(
    enabled_client: tuple[TestClient, Path],  # noqa: F811
    scale: int,
) -> None:
    client, _ = enabled_client
    payload = per_student_payload_body(scale=scale)

    assert post_batch(client, key=f"per-student-scale-{scale}", payload=payload).status_code == 422
