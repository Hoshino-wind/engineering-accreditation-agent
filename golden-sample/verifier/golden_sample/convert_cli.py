"""宽表成绩记录转换命令行入口。

用法：
    uv run --project golden-sample/verifier python -m golden_sample.convert_cli \\
        <宽表.csv> <输出 scores.csv> [--keep-identifiers]
"""

import argparse
import sys
from pathlib import Path

from .convert import ConversionError, convert_wide_scores, write_long_scores


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="golden_sample.convert_cli",
        description="把教师填写的宽表成绩记录转换成金标准的 scores.csv，并默认脱敏学号。",
    )
    parser.add_argument("source", type=Path, help="宽表 CSV，首列为学号或姓名")
    parser.add_argument("target", type=Path, help="输出的 scores.csv")
    parser.add_argument(
        "--keep-identifiers",
        action="store_true",
        help="保留原始学号（默认脱敏为 S01、S02…；仅在受控环境下使用）",
    )
    parser.add_argument(
        "--map-output",
        type=Path,
        default=None,
        help="可选：把「原始标识 → 脱敏代号」对照表写到此文件。该文件含个人信息，切勿提交仓库。",
    )
    args = parser.parse_args(argv)

    try:
        result = convert_wide_scores(args.source, anonymize=not args.keep_identifiers)
    except (ConversionError, OSError) as error:
        print(f"✗ {error}", file=sys.stderr)
        return 1

    write_long_scores(result, args.target)

    if args.map_output is not None:
        lines = ["original,student_ref"]
        lines.extend(f"{original},{ref}" for original, ref in result.identifier_map)
        args.map_output.write_text("\n".join(lines) + "\n", encoding="utf-8")
        print(f"⚠ 对照表已写入 {args.map_output}，其中含个人信息，请勿提交仓库。")

    print(
        f"✓ {args.source.name} → {args.target.name}："
        f"{result.student_count} 名学生 × {len(result.criterion_ids)} 个评分项 = "
        f"{len(result.rows)} 条记录，其中缺考 {result.missing_count} 条。"
    )
    if not args.keep_identifiers:
        print("  学号已脱敏为 S01、S02… 顺序按宽表行序。")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
