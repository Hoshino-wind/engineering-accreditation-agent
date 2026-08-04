from app.modules.recognition.infra.memory_store import InMemoryCandidateRepository
from app.modules.recognition.infra.postgres_store import PostgresCandidateRepository
from app.modules.recognition.infra.sqlite_store import SQLiteCandidateRepository

__all__ = [
    "InMemoryCandidateRepository",
    "PostgresCandidateRepository",
    "SQLiteCandidateRepository",
]
