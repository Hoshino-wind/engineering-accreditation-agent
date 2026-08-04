import base64
import re
import sqlite3
from datetime import datetime
from hashlib import sha256
from pathlib import Path
from typing import Any
from uuid import uuid4

from app.modules.materials.domain import MaterialVersionRecord, UploadedMaterialRecord


class MaterialSQLiteStore:
    def __init__(self, base_dir: Path | None = None) -> None:
        api_root = Path(__file__).resolve().parents[4]
        self._base_dir = base_dir or api_root / "var"
        self._db_path = self._base_dir / "ea_mvp.sqlite3"
        self._upload_dir = self._base_dir / "uploads"
        self._base_dir.mkdir(parents=True, exist_ok=True)
        self._upload_dir.mkdir(parents=True, exist_ok=True)
        self._ensure_schema()

    def create_from_base64(
        self,
        *,
        user_id: str,
        uploaded_by: str,
        file_name: str,
        category: str,
        content_base64: str,
        content_type: str,
        course: str | None,
    ) -> UploadedMaterialRecord:
        content = base64.b64decode(content_base64)
        checksum = sha256(content).hexdigest()
        material_id = f"material-{uuid4().hex[:12]}"
        safe_name = _safe_filename(file_name)
        user_dir = self._upload_dir / user_id
        user_dir.mkdir(parents=True, exist_ok=True)
        stored_path = user_dir / f"{material_id}-{safe_name}"
        stored_path.write_bytes(content)

        now = _now()
        record = UploadedMaterialRecord(
            id=material_id,
            user_id=user_id,
            file_name=file_name,
            category=category,
            content_type=content_type,
            file_type=_file_type(file_name),
            size_bytes=len(content),
            stored_path=str(stored_path),
            status="pending",
            uploaded_by=uploaded_by,
            created_at=now,
            updated_at=now,
            course=course or _guess_course(file_name),
        )
        with self._connect() as conn:
            conn.execute(
                """
                insert into uploaded_materials (
                    id, user_id, file_name, category, content_type, file_type,
                    size_bytes, stored_path, status, uploaded_by, created_at, updated_at,
                    course, extracted_text, extracted_node_count, candidates_created,
                    failure_reason, parser_version, parse_strategy, parsed_artifact_json
                ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                _record_to_row(record),
            )
            _insert_material_version(
                conn,
                record=record,
                checksum=checksum,
                version_no=1,
                parsed_artifact_json="{}",
            )
        return record

    def list_by_user(self, user_id: str) -> list[UploadedMaterialRecord]:
        with self._connect() as conn:
            rows = conn.execute(
                """
                select * from uploaded_materials
                where user_id = ?
                order by created_at desc
                """,
                (user_id,),
            ).fetchall()
        return [_row_to_record(row) for row in rows]

    def get(self, user_id: str, material_id: str) -> UploadedMaterialRecord | None:
        with self._connect() as conn:
            row = conn.execute(
                """
                select * from uploaded_materials
                where user_id = ? and id = ?
                """,
                (user_id, material_id),
            ).fetchone()
        return _row_to_record(row) if row else None

    def list_versions(self, user_id: str, material_id: str) -> list[MaterialVersionRecord]:
        with self._connect() as conn:
            rows = conn.execute(
                """
                select * from material_versions
                where user_id = ? and material_id = ?
                order by version_no desc
                """,
                (user_id, material_id),
            ).fetchall()
        return [_row_to_version(row) for row in rows]

    def mark_parsed(
        self,
        *,
        user_id: str,
        material_id: str,
        extracted_text: str,
        extracted_node_count: int,
        candidates_created: int,
        parser_version: str | None = None,
        parse_strategy: str | None = None,
        parsed_artifact_json: str = "{}",
    ) -> UploadedMaterialRecord | None:
        now = _now()
        with self._connect() as conn:
            conn.execute(
                """
                update uploaded_materials
                set status = 'extracted',
                    updated_at = ?,
                    extracted_text = ?,
                    extracted_node_count = ?,
                    candidates_created = ?,
                    parser_version = ?,
                    parse_strategy = ?,
                    parsed_artifact_json = ?,
                    failure_reason = null
                where user_id = ? and id = ?
                """,
                (
                    now,
                    extracted_text,
                    extracted_node_count,
                    candidates_created,
                    parser_version,
                    parse_strategy,
                    parsed_artifact_json,
                    user_id,
                    material_id,
                ),
            )
            conn.execute(
                """
                update material_versions
                set parser_version = ?,
                    parse_strategy = ?,
                    parsed_artifact_json = ?
                where user_id = ?
                  and material_id = ?
                  and version_no = (
                    select max(version_no)
                    from material_versions
                    where user_id = ? and material_id = ?
                  )
                """,
                (
                    parser_version,
                    parse_strategy,
                    parsed_artifact_json,
                    user_id,
                    material_id,
                    user_id,
                    material_id,
                ),
            )
        return self.get(user_id, material_id)

    def mark_failed(
        self,
        *,
        user_id: str,
        material_id: str,
        failure_reason: str,
    ) -> UploadedMaterialRecord | None:
        now = _now()
        with self._connect() as conn:
            conn.execute(
                """
                update uploaded_materials
                set status = 'failed',
                    updated_at = ?,
                    failure_reason = ?
                where user_id = ? and id = ?
                """,
                (now, failure_reason, user_id, material_id),
            )
        return self.get(user_id, material_id)

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _ensure_schema(self) -> None:
        with self._connect() as conn:
            conn.execute(
                """
                create table if not exists uploaded_materials (
                    id text primary key,
                    user_id text not null,
                    file_name text not null,
                    category text not null,
                    content_type text not null,
                    file_type text not null,
                    size_bytes integer not null,
                    stored_path text not null,
                    status text not null,
                    uploaded_by text not null,
                    created_at text not null,
                    updated_at text not null,
                    course text,
                    extracted_text text not null default '',
                    extracted_node_count integer not null default 0,
                    candidates_created integer not null default 0,
                    failure_reason text,
                    parser_version text,
                    parse_strategy text,
                    parsed_artifact_json text not null default '{}'
                )
                """
            )
            _ensure_column(conn, "uploaded_materials", "parser_version", "text")
            _ensure_column(conn, "uploaded_materials", "parse_strategy", "text")
            _ensure_column(
                conn,
                "uploaded_materials",
                "parsed_artifact_json",
                "text not null default '{}'",
            )
            conn.execute(
                """
                create index if not exists idx_uploaded_materials_user_created
                on uploaded_materials(user_id, created_at desc)
                """
            )
            conn.execute(
                """
                create table if not exists material_versions (
                    id text primary key,
                    material_id text not null,
                    user_id text not null,
                    version_no integer not null,
                    file_name text not null,
                    file_type text not null,
                    size_bytes integer not null,
                    storage_uri text not null,
                    checksum text not null,
                    parser_version text,
                    parse_strategy text,
                    parsed_artifact_json text not null default '{}',
                    created_at text not null,
                    unique(user_id, material_id, version_no)
                )
                """
            )
            conn.execute(
                """
                create index if not exists idx_material_versions_material
                on material_versions(user_id, material_id, version_no desc)
                """
            )


def _insert_material_version(
    conn: sqlite3.Connection,
    *,
    record: UploadedMaterialRecord,
    checksum: str,
    version_no: int,
    parsed_artifact_json: str,
) -> None:
    conn.execute(
        """
        insert into material_versions (
            id, material_id, user_id, version_no, file_name, file_type,
            size_bytes, storage_uri, checksum, parser_version, parse_strategy,
            parsed_artifact_json, created_at
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            f"{record.id}-v{version_no}",
            record.id,
            record.user_id,
            version_no,
            record.file_name,
            record.file_type,
            record.size_bytes,
            record.stored_path,
            checksum,
            record.parser_version,
            record.parse_strategy,
            parsed_artifact_json,
            record.created_at,
        ),
    )


def _record_to_row(record: UploadedMaterialRecord) -> tuple[Any, ...]:
    return (
        record.id,
        record.user_id,
        record.file_name,
        record.category,
        record.content_type,
        record.file_type,
        record.size_bytes,
        record.stored_path,
        record.status,
        record.uploaded_by,
        record.created_at,
        record.updated_at,
        record.course,
        record.extracted_text,
        record.extracted_node_count,
        record.candidates_created,
        record.failure_reason,
        record.parser_version,
        record.parse_strategy,
        record.parsed_artifact_json,
    )


def _row_to_record(row: sqlite3.Row) -> UploadedMaterialRecord:
    return UploadedMaterialRecord(
        id=row["id"],
        user_id=row["user_id"],
        file_name=row["file_name"],
        category=row["category"],
        content_type=row["content_type"],
        file_type=row["file_type"],
        size_bytes=row["size_bytes"],
        stored_path=row["stored_path"],
        status=row["status"],
        uploaded_by=row["uploaded_by"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
        course=row["course"],
        extracted_text=row["extracted_text"],
        extracted_node_count=row["extracted_node_count"],
        candidates_created=row["candidates_created"],
        failure_reason=row["failure_reason"],
        parser_version=_optional_row_value(row, "parser_version"),
        parse_strategy=_optional_row_value(row, "parse_strategy"),
        parsed_artifact_json=_optional_row_value(row, "parsed_artifact_json") or "{}",
    )


def _row_to_version(row: sqlite3.Row) -> MaterialVersionRecord:
    return MaterialVersionRecord(
        id=row["id"],
        material_id=row["material_id"],
        user_id=row["user_id"],
        version_no=int(row["version_no"]),
        file_name=row["file_name"],
        file_type=row["file_type"],
        size_bytes=int(row["size_bytes"]),
        storage_uri=row["storage_uri"],
        checksum=row["checksum"],
        parser_version=_optional_row_value(row, "parser_version"),
        parse_strategy=_optional_row_value(row, "parse_strategy"),
        parsed_artifact_json=_optional_row_value(row, "parsed_artifact_json") or "{}",
        created_at=row["created_at"],
    )


def _ensure_column(
    conn: sqlite3.Connection,
    table_name: str,
    column_name: str,
    column_type: str,
) -> None:
    columns = {row["name"] for row in conn.execute(f"pragma table_info({table_name})")}
    if column_name in columns:
        return
    conn.execute(f"alter table {table_name} add column {column_name} {column_type}")


def _optional_row_value(row: sqlite3.Row, key: str) -> str | None:
    if key not in tuple(row.keys()):
        return None
    return row[key]


def _safe_filename(file_name: str) -> str:
    cleaned = re.sub(r"[^\w.\-()\u4e00-\u9fff]+", "_", file_name).strip("._")
    return cleaned or "material.bin"


def _file_type(file_name: str) -> str:
    suffix = Path(file_name).suffix.lower().lstrip(".")
    return suffix if suffix in {"pdf", "docx", "xlsx", "txt", "md"} else "txt"


def _guess_course(file_name: str) -> str | None:
    stem = Path(file_name).stem
    for marker in ("课程", "大纲", "实验", "指导书", "试卷"):
        if marker in stem:
            return stem.split(marker)[0].strip(" -_（）()") or None
    return None


def _now() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M")
