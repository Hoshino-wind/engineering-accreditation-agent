from __future__ import annotations

from collections.abc import Iterable
from typing import Any

import psycopg
from psycopg.rows import dict_row


class FlexibleRow(dict):
    def __getitem__(self, key: str | int) -> Any:
        if isinstance(key, int):
            return list(self.values())[key]
        return super().__getitem__(key)


class CursorAdapter:
    def __init__(self, cursor) -> None:
        self._cursor = cursor

    def fetchone(self) -> FlexibleRow | None:
        row = self._cursor.fetchone()
        return _to_row(row) if row is not None else None

    def fetchall(self) -> list[FlexibleRow]:
        return [_to_row(row) for row in self._cursor.fetchall()]


class PostgresConnectionAdapter:
    def __init__(self, database_url: str) -> None:
        self._database_url = to_psycopg_url(database_url)
        self._conn = None

    def __enter__(self) -> PostgresConnectionAdapter:
        self._conn = psycopg.connect(
            self._database_url,
            autocommit=True,
            row_factory=dict_row,
        )
        return self

    def __exit__(self, exc_type, exc, traceback) -> None:
        if self._conn is not None:
            self._conn.close()
            self._conn = None

    def execute(
        self,
        sql: str,
        params: Iterable[Any] | dict[str, Any] | None = None,
    ) -> CursorAdapter:
        if self._conn is None:
            raise RuntimeError("PostgreSQL connection is not open")
        cursor = self._conn.execute(_translate_sql(sql), params)
        return CursorAdapter(cursor)


def connect(database_url: str) -> PostgresConnectionAdapter:
    return PostgresConnectionAdapter(database_url)


def to_psycopg_url(database_url: str) -> str:
    return (
        database_url.replace("postgresql+asyncpg://", "postgresql://", 1)
        .replace("postgresql+psycopg://", "postgresql://", 1)
    )


def to_sqlalchemy_sync_url(database_url: str) -> str:
    if database_url.startswith("postgresql+psycopg://"):
        return database_url
    return to_psycopg_url(database_url).replace("postgresql://", "postgresql+psycopg://", 1)


def _translate_sql(sql: str) -> str:
    return sql.replace("?", "%s")


def _to_row(row: dict[str, Any]) -> FlexibleRow:
    return FlexibleRow(row)
