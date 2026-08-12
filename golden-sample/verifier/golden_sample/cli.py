"""金标准样例校验命令行入口。

用法：
    uv run --project golden-sample/verifier python -m golden_sample <样例目录>...

不带参数时校验仓库内的全部合成样例。
"""

import argparse
import sys
from pathlib import Path

from .loader import GoldenSampleError, load_sample
from .recompute import compare_with_expected
from .report import render_mismatches, render_sample_report

REPO_SAMPLES_DIR = Path(__file__).resolve().parents[2] / "samples"


def _discover_samples() -> list[Path]:
    if not REPO_SAMPLES_DIR.is_dir():
        return []
    return sorted(path for path in REPO_SAMPLES_DIR.iterdir() if (path / "sample.json").is_file())


def verify(directory: Path, *, quiet: bool) -> bool:
    try:
        sample = load_sample(directory)
    except GoldenSampleError as error:
        print(f"✗ {directory}：{error}", file=sys.stderr)
        return False

    mismatches = compare_with_expected(sample)

    if not quiet:
        print(render_sample_report(sample))

    if mismatches:
        print(render_mismatches(mismatches), file=sys.stderr)
        print(f"✗ {sample.sample_id}：金标准未自洽，暂不可用作验收基准。", file=sys.stderr)
        return False

    print(f"✓ {sample.sample_id}：人工结论与独立复算一致，可用作验收基准。")
    return True


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        prog="golden_sample",
        description="校验达成度金标准样例：结构、来源、最小本体与人工/复算一致性。",
    )
    parser.add_argument(
        "directories",
        nargs="*",
        type=Path,
        help="样例目录，需包含 sample.json 与 scores.csv；留空则校验仓库内合成样例",
    )
    parser.add_argument("--quiet", action="store_true", help="只输出结论，不打印复算核对单")
    args = parser.parse_args(argv)

    directories = args.directories or _discover_samples()
    if not directories:
        print("未找到任何金标准样例。", file=sys.stderr)
        return 1

    results = [verify(directory, quiet=args.quiet) for directory in directories]
    return 0 if all(results) else 1


if __name__ == "__main__":
    raise SystemExit(main())
