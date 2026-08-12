"""把教师习惯的宽表成绩记录转换成金标准要求的长表。

教师在 Excel 里填的是「一行一个学生、一列一个评分项」的宽表，
而校验器需要「一行一条评分记录」的长表。要求教师改填写习惯是不现实的，
因此转换必须由工具承担，并在同一步完成学号脱敏。
"""

import csv
import re
from dataclasses import dataclass
from pathlib import Path

CRITERION_PATTERN = re.compile(r"^(RC-[0-9A-Za-z_-]+)")
ABSENCE_MARKERS = frozenset({"缺考", "缺席", "缺", "-", "—", "/", "N/A", "NA"})


class ConversionError(ValueError):
    """宽表结构不符合预期。"""


@dataclass(frozen=True, slots=True)
class ConversionResult:
    rows: tuple[tuple[str, str, str], ...]
    criterion_ids: tuple[str, ...]
    student_count: int
    missing_count: int
    identifier_map: tuple[tuple[str, str], ...]


def _criterion_id(header: str) -> str | None:
    """从「RC-0101(满分15)」这类表头里取出评分项编号。"""
    match = CRITERION_PATTERN.match(header.strip())
    return match.group(1) if match else None


def convert_wide_scores(
    source: Path,
    *,
    anonymize: bool = True,
    prefix: str = "S",
) -> ConversionResult:
    with source.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.reader(handle)
        try:
            header = next(reader)
        except StopIteration as error:
            raise ConversionError(f"{source.name} 是空文件") from error

        columns = [(index, _criterion_id(name)) for index, name in enumerate(header)]
        criterion_columns = [(index, cid) for index, cid in columns if cid is not None]
        if not criterion_columns:
            raise ConversionError(
                f"{source.name} 的表头里找不到评分项列；"
                "列名需要以评分项编号开头，例如「RC-0101(满分15)」"
            )
        duplicates = {
            cid for _, cid in criterion_columns
            if [item for _, item in criterion_columns].count(cid) > 1
        }
        if duplicates:
            raise ConversionError(
                f"{source.name} 存在重复的评分项列：{'、'.join(sorted(duplicates))}"
            )

        rows: list[tuple[str, str, str]] = []
        identifier_map: list[tuple[str, str]] = []
        missing_count = 0

        for line_number, record in enumerate(reader, start=2):
            if not record or not record[0].strip():
                continue
            original = record[0].strip()
            student_ref = f"{prefix}{len(identifier_map) + 1:02d}" if anonymize else original
            identifier_map.append((original, student_ref))

            for index, criterion_id in criterion_columns:
                raw = record[index].strip() if index < len(record) else ""
                if raw in ABSENCE_MARKERS:
                    raw = ""
                if raw:
                    try:
                        float(raw)
                    except ValueError as error:
                        raise ConversionError(
                            f"{source.name} 第 {line_number} 行 {criterion_id} 列的值"
                            f" {raw!r} 不是数字；缺考请留空或填「缺考」"
                        ) from error
                else:
                    missing_count += 1
                rows.append((student_ref, criterion_id, raw))

    if not identifier_map:
        raise ConversionError(f"{source.name} 没有任何学生行")

    return ConversionResult(
        rows=tuple(rows),
        criterion_ids=tuple(cid for _, cid in criterion_columns),
        student_count=len(identifier_map),
        missing_count=missing_count,
        identifier_map=tuple(identifier_map),
    )


def write_long_scores(result: ConversionResult, target: Path) -> None:
    with target.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(["student_ref", "criterion_id", "raw_score"])
        writer.writerows(result.rows)
