from pathlib import Path

from app.core.database import run_database_migrations_sync
from app.core.postgres import connect
from app.modules.materials.infra.sqlite_store import MaterialSQLiteStore


class MaterialPostgresStore(MaterialSQLiteStore):
    def __init__(self, database_url: str, base_dir: Path | None = None) -> None:
        api_root = Path(__file__).resolve().parents[4]
        self._base_dir = base_dir or api_root / "var"
        self._upload_dir = self._base_dir / "uploads"
        self._database_url = database_url
        self._base_dir.mkdir(parents=True, exist_ok=True)
        self._upload_dir.mkdir(parents=True, exist_ok=True)
        run_database_migrations_sync(database_url)

    def _connect(self):
        return connect(self._database_url)

    def _ensure_schema(self) -> None:
        run_database_migrations_sync(self._database_url)
