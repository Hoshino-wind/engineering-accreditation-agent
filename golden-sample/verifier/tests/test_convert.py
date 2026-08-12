"""宽表 → 长表转换的测试。

转换是教师录入路径上的唯一一步自动化，它出错等于成绩数据错，
因此缺考识别、脱敏和结构校验都必须有测试守住。
"""

from pathlib import Path

import pytest
from golden_sample import ConversionError, convert_wide_scores, load_scores, write_long_scores

SENSOR_DIR = Path(__file__).resolve().parents[2] / "samples" / "sensor-lab-demo"

WIDE_HEADER = "学生代号,RC-0101(满分15),RC-0102(满分15),备注\n"


def _write(tmp_path: Path, body: str) -> Path:
    path = tmp_path / "wide.csv"
    path.write_text(WIDE_HEADER + body, encoding="utf-8")
    return path


def test_converted_sensor_sample_matches_committed_long_form(tmp_path: Path) -> None:
    """示例目录里的宽表转换结果，必须与已提交的 scores.csv 完全一致。"""
    result = convert_wide_scores(SENSOR_DIR / "04-成绩记录表.csv")
    target = tmp_path / "scores.csv"
    write_long_scores(result, target)

    assert load_scores(target) == load_scores(SENSOR_DIR / "scores.csv")


def test_sensor_sample_conversion_counts() -> None:
    result = convert_wide_scores(SENSOR_DIR / "04-成绩记录表.csv")

    assert result.student_count == 12
    assert len(result.criterion_ids) == 7
    assert len(result.rows) == 84
    # S04 缺席实验二，缺 RC-0201 与 RC-0202 两项。
    assert result.missing_count == 2


def test_identifiers_are_anonymized_by_default(tmp_path: Path) -> None:
    source = _write(tmp_path, "20230101,13,14,\n20230102,12,13,\n")
    result = convert_wide_scores(source)

    assert [ref for _, ref in result.identifier_map] == ["S01", "S02"]
    assert all(not row[0].isdigit() for row in result.rows)
    assert result.identifier_map[0][0] == "20230101"


def test_keep_identifiers_is_opt_in(tmp_path: Path) -> None:
    source = _write(tmp_path, "20230101,13,14,\n")
    result = convert_wide_scores(source, anonymize=False)

    assert result.rows[0][0] == "20230101"


@pytest.mark.parametrize("marker", ["缺考", "缺席", "-", "—", "/", "N/A", ""])
def test_absence_markers_become_empty(tmp_path: Path, marker: str) -> None:
    source = _write(tmp_path, f"S01,13,{marker},\n")
    result = convert_wide_scores(source)

    assert result.rows[1] == ("S01", "RC-0102", "")
    assert result.missing_count == 1


def test_non_numeric_score_is_rejected(tmp_path: Path) -> None:
    source = _write(tmp_path, "S01,13,优秀,\n")

    with pytest.raises(ConversionError, match="不是数字"):
        convert_wide_scores(source)


def test_header_without_criterion_columns_is_rejected(tmp_path: Path) -> None:
    path = tmp_path / "wide.csv"
    path.write_text("学号,第一项,第二项\n20230101,13,14\n", encoding="utf-8")

    with pytest.raises(ConversionError, match="找不到评分项列"):
        convert_wide_scores(path)


def test_duplicate_criterion_column_is_rejected(tmp_path: Path) -> None:
    path = tmp_path / "wide.csv"
    path.write_text("学生代号,RC-0101(满分15),RC-0101(重复)\nS01,13,14\n", encoding="utf-8")

    with pytest.raises(ConversionError, match="重复的评分项列"):
        convert_wide_scores(path)


def test_blank_rows_are_skipped(tmp_path: Path) -> None:
    source = _write(tmp_path, "S01,13,14,\n,,,\nS02,12,13,\n")
    result = convert_wide_scores(source)

    assert result.student_count == 2
