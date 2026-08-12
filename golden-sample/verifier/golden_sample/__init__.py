"""达成度金标准样例：数据结构、载入与独立复算。"""

from .convert import ConversionError, convert_wide_scores, write_long_scores
from .loader import GoldenSampleError, load_sample, load_scores
from .model import SCHEMA_VERSION, GoldenSample
from .recompute import compare_with_expected, compute_sample, compute_target
from .report import render_mismatches, render_sample_report

__all__ = [
    "SCHEMA_VERSION",
    "ConversionError",
    "GoldenSample",
    "GoldenSampleError",
    "compare_with_expected",
    "compute_sample",
    "compute_target",
    "convert_wide_scores",
    "load_sample",
    "load_scores",
    "render_mismatches",
    "render_sample_report",
    "write_long_scores",
]
