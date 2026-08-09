"""材料批量导入演示脚本（第 5 步补缺：真实材料试点）。

用法：
    1. 启动 API（make api），确保公开登录可用（EA_ALLOW_PUBLIC_REGISTRATION=true）
       或使用种子账号 admin/admin123。
    2. 准备目录：目录下的 .pdf/.docx/.txt 文件会被逐个上传。
    3. python scripts/import_materials_demo.py <材料目录> [--course 课程名] [--base http://127.0.0.1:8000]

说明：
    - 只上传教学大纲、实验指导书、项目清单等非学生隐私材料；
      学生报告、成绩表涉及隐私，请先按脱敏流程处理。
    - 上传后系统自动触发异步解析与智能体 pipeline（停在人工审核网关）。
"""
from __future__ import annotations

import argparse
import mimetypes
import sys
from pathlib import Path

import httpx

API_PREFIX = "/api/v1"


def login(base: str, username: str, password: str) -> str:
    resp = httpx.post(
        f"{base}{API_PREFIX}/auth/login",
        json={"username": username, "password": password},
        timeout=30,
    )
    resp.raise_for_status()
    return resp.json()["access_token"]


def upload(base: str, token: str, path: Path, course: str) -> None:
    content_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
    with path.open("rb") as fh:
        resp = httpx.post(
            f"{base}{API_PREFIX}/resources/upload",
            headers={"Authorization": f"Bearer {token}"},
            data={"course": course, "name": path.stem, "category": "实验指导书"}
            if "指导书" in path.name or "实验" in path.name
            else {"course": course, "name": path.stem, "category": "课程大纲"},
            files={"file": (path.name, fh, content_type)},
            timeout=120,
        )
    if resp.status_code in (200, 201):
        print(f"  ✓ {path.name} → {resp.json().get('id', '')}")
    else:
        print(f"  ✗ {path.name} → {resp.status_code} {resp.text[:120]}")


def main() -> int:
    parser = argparse.ArgumentParser(description="批量导入教学材料（试点）")
    parser.add_argument("directory", type=Path, help="材料目录")
    parser.add_argument("--course", default="未分类", help="课程名")
    parser.add_argument("--base", default="http://127.0.0.1:8000", help="API 地址")
    parser.add_argument("--username", default="admin", help="登录账号")
    parser.add_argument("--password", default="admin123", help="登录密码")
    parser.add_argument(
        "--extensions",
        default=".pdf,.docx,.doc,.txt",
        help="处理的扩展名（逗号分隔）",
    )
    args = parser.parse_args()

    if not args.directory.is_dir():
        print(f"目录不存在: {args.directory}")
        return 2

    files = [
        p
        for p in sorted(args.directory.iterdir())
        if p.is_file()
        and p.suffix.lower() in {e.strip().lower() for e in args.extensions.split(",")}
    ]
    if not files:
        print("目录中没有匹配的文件")
        return 1

    print(f"登录 {args.base} ...")
    token = login(args.base, args.username, args.password)
    print(f"开始导入 {len(files)} 个文件（课程：{args.course}）")
    for path in files:
        upload(args.base, token, path, args.course)
    print("完成。材料状态可到管理端「教学资源」页查看。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
