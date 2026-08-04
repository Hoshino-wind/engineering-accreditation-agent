from app.core.database import run_database_migrations_sync
from app.core.postgres import connect
from app.modules.recognition.infra.sqlite_store import SQLiteCandidateRepository


class PostgresCandidateRepository(SQLiteCandidateRepository):
    def __init__(self, user_id: str, database_url: str) -> None:
        self._user_id = user_id
        self._database_url = database_url
        run_database_migrations_sync(database_url)
        self._ensure_seed()

    def _connect(self):
        return connect(self._database_url)

    def _ensure_schema(self) -> None:
        run_database_migrations_sync(self._database_url)
