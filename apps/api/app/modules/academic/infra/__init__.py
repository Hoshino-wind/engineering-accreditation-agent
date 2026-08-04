from app.modules.academic.infra.postgres_store import PostgresAcademicCatalogRepository
from app.modules.academic.infra.sqlite_store import SQLiteAcademicCatalogRepository

__all__ = ["PostgresAcademicCatalogRepository", "SQLiteAcademicCatalogRepository"]
