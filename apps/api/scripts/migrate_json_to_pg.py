# -*- coding: utf-8 -*-
"""一次性迁移：data/ 目录 JSON 数据 → PostgreSQL 快照表（部署时运行）。

用法（在配置了 EA_DATABASE_URL 的环境）：
    python scripts/migrate_json_to_pg.py [--data-dir apps/api/data] [--tenant 用户ID]

说明：
    - 只迁移已存在的实体类型（resources/candidates/findings/improvements/
      courses/majors/grade_batches/rubrics）
    - 幂等：PG 中已有快照的实体跳过（以 tenant+type+id 为准）
    - 迁移后建议保留 JSON 文件作为备份，确认无误后再归档
"""
from __future__ import annotations

import argparse
import asyncio
import json
import sys
from pathlib import Path

from sqlalchemy.ext.asyncio import create_async_engine

from app.core.config import get_settings
from app.infrastructure.accreditation_store import AccreditationStore

_ENTITY_TYPE = {
    "resources": "resource",
    "candidates": "recognition-candidate",
    "findings": "diagnostic-finding",
    "improvements": "improvement",
    "courses": "course",
    "majors": "major",
}


async def migrate(data_dir: Path, tenant: str, persistence: AccreditationStore) -> int:
    migrated = 0
    skipped = 0
    for repo_name, entity_type in _ENTITY_TYPE.items():
        files = sorted(data_dir.glob(f"{repo_name}_{tenant}.json")) + sorted(
            data_dir.glob(f"{repo_name}_template.json")
        )
        for file in files:
            try:
                payload = json.loads(file.read_text(encoding="utf-8"))
            except (json.JSONDecodeError, OSError) as exc:
                print(f"  ! {file.name} 读取失败: {exc}")
                continue
            for entity_id, data in payload.items():
                existing = await persistence.get_snapshot(
                    tenant_id=tenant, entity_type=entity_type, entity_id=entity_id
                )
                if existing is not None:
                    skipped += 1
                    continue
                await persistence.snapshot(
                    tenant_id=tenant,
                    entity_type=entity_type,
                    entity=data,
                    version=data.get("version", "") if isinstance(data, dict) else "",
                )
                migrated += 1
    return migrated, skipped


def main() -> int:
    parser = argparse.ArgumentParser(description="JSON → PG 一次性迁移")
    parser.add_argument("--data-dir", default=None, help="data 目录（默认 apps/api/data）")
    parser.add_argument("--tenant", default="template", help="目标租户用户 ID")
    args = parser.parse_args()

    settings = get_settings()
    if not settings.database_url:
        print("未配置 EA_DATABASE_URL，无法迁移")
        return 2
    data_dir = Path(args.data_dir) if args.data_dir else Path(__file__).resolve().parent.parent / "data"

    engine = create_async_engine(settings.database_url, pool_pre_ping=True)
    persistence = AccreditationStore(engine)

    async def _run() -> None:
        await persistence.create_schema()
        migrated, skipped = await migrate(data_dir, args.tenant, persistence)
        print(f"迁移完成：新增 {migrated} 条，跳过（已存在）{skipped} 条")
        await persistence.dispose()

    asyncio.run(_run())
    return 0


if __name__ == "__main__":
    sys.exit(main())
