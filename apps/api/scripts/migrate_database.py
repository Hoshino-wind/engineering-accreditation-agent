from __future__ import annotations

import asyncio

from app.core.config import get_settings
from app.core.database import is_postgres_url, run_database_migrations


async def main() -> None:
    settings = get_settings()
    if not is_postgres_url(settings.database_url):
        raise SystemExit(
            "EA_DATABASE_URL must be a PostgreSQL SQLAlchemy URL, for example "
            "postgresql+asyncpg://accreditation:accreditation@localhost:5432/accreditation"
        )
    await run_database_migrations(settings.database_url or "")


if __name__ == "__main__":
    asyncio.run(main())
