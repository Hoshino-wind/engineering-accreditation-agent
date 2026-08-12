"""录入纪律的测试。

金标准最常见的失效方式不是算错，而是录漏、录假、或用省略摘要冒充来源。
这些校验必须在载入阶段就拦住。
"""

import csv
import json
from decimal import Decimal
from pathlib import Path

import pytest
from golden_sample import GoldenSampleError, load_sample, load_scores
from golden_sample.model import ScoreRecord, SourceRef

ROOT = Path(__file__).resolve().parents[2]
SYNTH_DIR = ROOT / "samples" / "synth-001"
TEMPLATES_DIR = ROOT / "templates"


def _write_scores(directory: Path, rows: list[tuple[str, str, str]]) -> None:
    with (directory / "scores.csv").open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(["student_ref", "criterion_id", "raw_score"])
        writer.writerows(rows)


def _copy_sample(tmp_path: Path) -> Path:
    (tmp_path / "sample.json").write_text(
        (SYNTH_DIR / "sample.json").read_text(encoding="utf-8"), encoding="utf-8"
    )
    (tmp_path / "scores.csv").write_text(
        (SYNTH_DIR / "scores.csv").read_text(encoding="utf-8"), encoding="utf-8"
    )
    return tmp_path


def test_truncated_digest_is_rejected() -> None:
    """省略号摘要无法用于复核，必须在录入时就拒绝。"""
    with pytest.raises(ValueError, match="完整的 64 位十六进制摘要"):
        SourceRef(
            material="某评分表",
            material_version="v1.0",
            locator="第 1 页",
            digest="sha256:2eb7…87c1",
        )


def test_real_looking_student_id_is_rejected() -> None:
    with pytest.raises(ValueError, match="脱敏代号"):
        ScoreRecord(student_ref="20230101", criterion_id="RC-1", raw_score=Decimal("18"))


def test_missing_score_row_is_rejected(tmp_path: Path) -> None:
    """缺考必须录空值；整行删除会让“缺考”与“漏录”无法区分。"""
    directory = _copy_sample(tmp_path)
    rows = [
        (student, criterion, "10")
        for student in ("S01", "S02")
        for criterion in ("RC-1", "RC-2", "RC-3")
    ]
    rows = [row for row in rows if row[:2] != ("S02", "RC-3")]
    _write_scores(directory, rows)

    with pytest.raises(GoldenSampleError, match="缺考请录入空值"):
        load_sample(directory)


def test_duplicate_score_row_is_rejected(tmp_path: Path) -> None:
    directory = _copy_sample(tmp_path)
    rows = [
        (student, criterion, "10")
        for student in ("S01",)
        for criterion in ("RC-1", "RC-2", "RC-3")
    ]
    rows.append(("S01", "RC-1", "12"))
    _write_scores(directory, rows)

    with pytest.raises(GoldenSampleError, match="重复评分记录"):
        load_sample(directory)


def test_unknown_criterion_in_scores_is_rejected(tmp_path: Path) -> None:
    directory = _copy_sample(tmp_path)
    rows = [
        (student, criterion, "10")
        for student in ("S01",)
        for criterion in ("RC-1", "RC-2", "RC-3")
    ]
    rows.append(("S01", "RC-999", "12"))
    _write_scores(directory, rows)

    with pytest.raises(GoldenSampleError, match="未定义的评分项"):
        load_sample(directory)


def test_scores_csv_requires_expected_columns(tmp_path: Path) -> None:
    path = tmp_path / "scores.csv"
    path.write_text("student,criterion,score\nS01,RC-1,18\n", encoding="utf-8")

    with pytest.raises(GoldenSampleError, match="缺少列"):
        load_scores(path)


def test_template_annotation_keys_are_ignored(tmp_path: Path) -> None:
    """模板用 ``_说明`` 键承载填写指引，载入时必须忽略而不是报错。"""
    directory = _copy_sample(tmp_path)
    payload = json.loads((directory / "sample.json").read_text(encoding="utf-8"))
    payload["_说明"] = ["顶层说明"]
    payload["context"]["_说明"] = "context 内说明"
    payload["policy"]["_说明"] = "policy 内说明"
    payload["nodes"][0]["_说明"] = "节点说明"
    payload["targets"][0]["expected"]["_说明"] = "人工结论说明"
    (directory / "sample.json").write_text(
        json.dumps(payload, ensure_ascii=False), encoding="utf-8"
    )

    assert load_sample(directory).sample_id == "GS-SYNTH-001"


def test_templates_are_present_for_entry() -> None:
    assert (TEMPLATES_DIR / "sample.template.json").is_file()
    assert (TEMPLATES_DIR / "scores.template.csv").is_file()
    # 模板本身必须是合法 JSON，否则复制出去就没法填。
    json.loads((TEMPLATES_DIR / "sample.template.json").read_text(encoding="utf-8"))


def test_blank_raw_score_becomes_none(tmp_path: Path) -> None:
    path = tmp_path / "scores.csv"
    path.write_text(
        "student_ref,criterion_id,raw_score\nS01,RC-1,18\nS02,RC-1,\n", encoding="utf-8"
    )

    records = load_scores(path)
    assert records[0].raw_score == Decimal("18")
    assert records[1].raw_score is None
