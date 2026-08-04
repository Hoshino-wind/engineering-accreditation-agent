from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import (
    Column,
    Float,
    Index,
    Integer,
    MetaData,
    String,
    Table,
    Text,
    UniqueConstraint,
    create_engine,
    insert,
    select,
    text,
)
from sqlalchemy.ext.asyncio import create_async_engine

from app.core.postgres import to_sqlalchemy_sync_url

PRODUCTION_SCHEMA_VERSION = "2026_08_03_001_core_postgres_schema"
TENANT_PRIMARY_KEY_SCHEMA_VERSION = "2026_08_04_001_tenant_scoped_primary_keys"

metadata = MetaData()

schema_migrations = Table(
    "schema_migrations",
    metadata,
    Column("version", String(120), primary_key=True),
    Column("applied_at", String(40), nullable=False),
)

users = Table(
    "users",
    metadata,
    Column("id", String(80), primary_key=True),
    Column("username", String(80), nullable=False, unique=True),
    Column("password_hash", Text, nullable=False),
    Column("display_name", String(120), nullable=False),
    Column("role", String(40), nullable=False),
    Column("avatar_url", Text),
    Column("status", String(40), nullable=False, default="active"),
    Column("created_at", String(40), nullable=False),
    Column("updated_at", String(40), nullable=False),
)

roles = Table(
    "roles",
    metadata,
    Column("id", String(80), primary_key=True),
    Column("code", String(80), nullable=False, unique=True),
    Column("name", String(120), nullable=False),
    Column("description", Text, nullable=False, default=""),
)

permissions = Table(
    "permissions",
    metadata,
    Column("id", String(80), primary_key=True),
    Column("code", String(120), nullable=False, unique=True),
    Column("name", String(120), nullable=False),
    Column("description", Text, nullable=False, default=""),
)

user_roles = Table(
    "user_roles",
    metadata,
    Column("user_id", String(80), primary_key=True),
    Column("role_id", String(80), primary_key=True),
)

role_permissions = Table(
    "role_permissions",
    metadata,
    Column("role_id", String(80), primary_key=True),
    Column("permission_id", String(80), primary_key=True),
)

academic_programs = Table(
    "academic_programs",
    metadata,
    Column("id", String(80), primary_key=True),
    Column("user_id", String(80), primary_key=True),
    Column("code", String(80), nullable=False),
    Column("name", String(160), nullable=False),
    Column("discipline", String(120), nullable=False),
    Column("degree", String(120), nullable=False),
    Column("owner", String(120), nullable=False),
    Column("evaluation_cycle", String(80), nullable=False),
    Column("status", String(40), nullable=False),
    UniqueConstraint("user_id", "id", name="uq_academic_programs_user_id"),
)

academic_courses = Table(
    "academic_courses",
    metadata,
    Column("id", String(80), primary_key=True),
    Column("user_id", String(80), primary_key=True),
    Column("program_id", String(80), nullable=False),
    Column("code", String(80), nullable=False),
    Column("name", String(160), nullable=False),
    Column("category", String(80), nullable=False),
    Column("term", String(80), nullable=False),
    Column("credit_hours", Float, nullable=False),
    Column("owner", String(120), nullable=False),
    Column("status", String(40), nullable=False),
    UniqueConstraint("user_id", "id", name="uq_academic_courses_user_id"),
)

graduation_requirements = Table(
    "graduation_requirements",
    metadata,
    Column("id", String(80), primary_key=True),
    Column("user_id", String(80), primary_key=True),
    Column("program_id", String(80), nullable=False),
    Column("code", String(80), nullable=False),
    Column("title", String(180), nullable=False),
    Column("description", Text, nullable=False),
    UniqueConstraint("user_id", "id", name="uq_graduation_requirements_user_id"),
)

competency_indicators = Table(
    "competency_indicators",
    metadata,
    Column("id", String(80), primary_key=True),
    Column("user_id", String(80), primary_key=True),
    Column("requirement_id", String(80), nullable=False),
    Column("code", String(80), nullable=False),
    Column("title", String(180), nullable=False),
    Column("description", Text, nullable=False),
    UniqueConstraint("user_id", "id", name="uq_competency_indicators_user_id"),
)

course_objectives = Table(
    "course_objectives",
    metadata,
    Column("id", String(80), primary_key=True),
    Column("user_id", String(80), primary_key=True),
    Column("course_id", String(80), nullable=False),
    Column("code", String(80), nullable=False),
    Column("title", String(180), nullable=False),
    Column("description", Text, nullable=False),
    UniqueConstraint("user_id", "id", name="uq_course_objectives_user_id"),
)

experiment_projects = Table(
    "experiment_projects",
    metadata,
    Column("id", String(80), primary_key=True),
    Column("user_id", String(80), primary_key=True),
    Column("course_id", String(80), nullable=False),
    Column("code", String(80), nullable=False),
    Column("title", String(180), nullable=False),
    Column("description", Text, nullable=False),
    Column("environment", Text, nullable=False),
    Column("source_material_id", String(80), nullable=False, default=""),
    UniqueConstraint("user_id", "id", name="uq_experiment_projects_user_id"),
)

rubric_items = Table(
    "rubric_items",
    metadata,
    Column("id", String(80), primary_key=True),
    Column("user_id", String(80), primary_key=True),
    Column("course_id", String(80), nullable=False),
    Column("experiment_id", String(80)),
    Column("indicator_id", String(80), nullable=False),
    Column("code", String(80), nullable=False),
    Column("title", String(180), nullable=False),
    Column("points", Float, nullable=False),
    UniqueConstraint("user_id", "id", name="uq_rubric_items_user_id"),
)

uploaded_materials = Table(
    "uploaded_materials",
    metadata,
    Column("id", String(80), primary_key=True),
    Column("user_id", String(80), primary_key=True),
    Column("file_name", Text, nullable=False),
    Column("category", String(120), nullable=False),
    Column("content_type", String(160), nullable=False),
    Column("file_type", String(40), nullable=False),
    Column("size_bytes", Integer, nullable=False),
    Column("stored_path", Text, nullable=False),
    Column("status", String(40), nullable=False),
    Column("uploaded_by", String(120), nullable=False),
    Column("created_at", String(40), nullable=False),
    Column("updated_at", String(40), nullable=False),
    Column("course", String(180)),
    Column("extracted_text", Text, nullable=False, default=""),
    Column("extracted_node_count", Integer, nullable=False, default=0),
    Column("candidates_created", Integer, nullable=False, default=0),
    Column("failure_reason", Text),
    Column("parser_version", String(120)),
    Column("parse_strategy", String(120)),
    Column("parsed_artifact_json", Text, nullable=False, default="{}"),
    UniqueConstraint("user_id", "id", name="uq_uploaded_materials_user_id"),
)

material_versions = Table(
    "material_versions",
    metadata,
    Column("id", String(100), primary_key=True),
    Column("material_id", String(80), nullable=False),
    Column("user_id", String(80), primary_key=True),
    Column("version_no", Integer, nullable=False),
    Column("file_name", Text, nullable=False),
    Column("file_type", String(40), nullable=False),
    Column("size_bytes", Integer, nullable=False),
    Column("storage_uri", Text, nullable=False),
    Column("checksum", String(80), nullable=False),
    Column("parser_version", String(120)),
    Column("parse_strategy", String(120)),
    Column("parsed_artifact_json", Text, nullable=False, default="{}"),
    Column("created_at", String(40), nullable=False),
    UniqueConstraint("user_id", "material_id", "version_no", name="uq_material_version_no"),
)

source_materials = Table(
    "source_materials",
    metadata,
    Column("id", String(80), primary_key=True),
    Column("user_id", String(80), primary_key=True),
    Column("course_id", String(80), nullable=False),
    Column("file_name", Text, nullable=False),
    Column("material_type", String(80), nullable=False),
    Column("source_path", Text, nullable=False),
    Column("checksum", String(80), nullable=False),
    Column("status", String(40), nullable=False),
    UniqueConstraint("user_id", "id", name="uq_source_materials_user_id"),
)

academic_support_links = Table(
    "academic_support_links",
    metadata,
    Column("id", String(120), primary_key=True),
    Column("user_id", String(80), primary_key=True),
    Column("source_type", String(80), nullable=False),
    Column("source_id", String(120), nullable=False),
    Column("target_indicator_id", String(120), nullable=False),
    Column("relation", String(80), nullable=False),
    Column("strength", String(40), nullable=False),
    Column("evidence", Text, nullable=False),
    Column("status", String(40), nullable=False),
    UniqueConstraint("user_id", "id", name="uq_academic_support_links_user_id"),
)

recognition_candidates = Table(
    "recognition_candidates",
    metadata,
    Column("id", String(120), primary_key=True),
    Column("user_id", String(80), primary_key=True),
    Column("course", String(180), nullable=False),
    Column("risk", String(80), nullable=False),
    Column("candidate_type", String(80), nullable=False),
    Column("review_status", String(80), nullable=False),
    Column("generated_at", String(40), nullable=False),
    Column("payload_json", Text, nullable=False),
    UniqueConstraint("user_id", "id", name="uq_recognition_candidates_user_id"),
)

graph_nodes = Table(
    "graph_nodes",
    metadata,
    Column("id", String(120), primary_key=True),
    Column("user_id", String(80), primary_key=True),
    Column("kind", String(80), nullable=False),
    Column("code", String(120), nullable=False),
    Column("name", String(180), nullable=False),
    Column("description", Text, nullable=False),
    Column("origin", String(80), nullable=False),
    Column("properties_json", Text, nullable=False, default="{}"),
    UniqueConstraint("user_id", "id", name="uq_graph_nodes_user_id"),
)

graph_edges = Table(
    "graph_edges",
    metadata,
    Column("id", String(120), primary_key=True),
    Column("user_id", String(80), primary_key=True),
    Column("source", String(120), nullable=False),
    Column("target", String(120), nullable=False),
    Column("kind", String(80), nullable=False),
    Column("source_type", String(80), nullable=False),
    Column("review_status", String(80), nullable=False),
    Column("strength", String(40)),
    Column("confidence", Float),
    Column("evidence_summary", Text),
    Column("ai_reasoning", Text),
    Column("reviewed_by", String(120)),
    Column("reviewed_at", String(40)),
    Column("candidate_id", String(120)),
    Column("properties_json", Text, nullable=False, default="{}"),
    UniqueConstraint("user_id", "id", name="uq_graph_edges_user_id"),
)

diagnostic_findings = Table(
    "diagnostic_findings",
    metadata,
    Column("id", String(120), primary_key=True),
    Column("user_id", String(80), primary_key=True),
    Column("title", Text, nullable=False),
    Column("course", String(180), nullable=False),
    Column("finding_type", String(80), nullable=False),
    Column("risk", String(40), nullable=False),
    Column("source_node", Text, nullable=False),
    Column("target_node", Text, nullable=False),
    Column("relation_label", String(80), nullable=False),
    Column("graph_version", String(120), nullable=False),
    Column("rule_id", String(120), nullable=False),
    Column("rule_version", String(80), nullable=False),
    Column("rule_kind", String(80), nullable=False),
    Column("rule_basis", Text, nullable=False),
    Column("rule_rationale", Text, nullable=False),
    Column("rule_run_at", String(40), nullable=False),
    Column("decision_status", String(40), nullable=False),
    Column("impact_course_objectives", Integer, nullable=False, default=0),
    Column("impact_ability_nodes", Integer, nullable=False, default=0),
    Column("impact_evaluation_inputs", Integer, nullable=False, default=0),
    Column("suggested_destination", String(40), nullable=False),
    Column("evidence_json", Text, nullable=False, default="[]"),
    UniqueConstraint("user_id", "id", name="uq_diagnostic_findings_user_id"),
)

improvement_tasks = Table(
    "improvement_tasks",
    metadata,
    Column("id", String(120), primary_key=True),
    Column("user_id", String(80), primary_key=True),
    Column("display_id", String(80), nullable=False),
    Column("source_module", String(40), nullable=False),
    Column("source_finding_id", String(120)),
    Column("source_label", Text, nullable=False),
    Column("title", Text, nullable=False),
    Column("course", String(180), nullable=False),
    Column("target_node", Text, nullable=False),
    Column("priority", String(40), nullable=False),
    Column("status", String(40), nullable=False),
    Column("owner", String(120), nullable=False),
    Column("due_at", String(40), nullable=False),
    Column("action_title", Text, nullable=False),
    Column("action_detail", Text, nullable=False),
    Column("verification_method", Text, nullable=False),
    Column("baseline", Float),
    Column("target_value", Float),
    Column("completion_summary", Text, nullable=False, default=""),
    Column("evidence_uri", Text, nullable=False, default=""),
    Column("reevaluation_result", Float),
    Column("created_at", String(40), nullable=False),
    Column("updated_at", String(40), nullable=False),
    Column("closed_at", String(40)),
    Column("source_payload_json", Text, nullable=False, default="{}"),
    UniqueConstraint("user_id", "id", name="uq_improvement_tasks_user_id"),
)

Index("idx_users_username", users.c.username)
Index(
    "idx_uploaded_materials_user_created",
    uploaded_materials.c.user_id,
    uploaded_materials.c.created_at,
)
Index(
    "idx_material_versions_material",
    material_versions.c.user_id,
    material_versions.c.material_id,
)
Index(
    "idx_support_links_indicator",
    academic_support_links.c.user_id,
    academic_support_links.c.target_indicator_id,
)
Index(
    "idx_recognition_candidates_review",
    recognition_candidates.c.user_id,
    recognition_candidates.c.review_status,
)
Index("idx_graph_edges_review", graph_edges.c.user_id, graph_edges.c.review_status)
Index(
    "idx_diagnostic_findings_decision",
    diagnostic_findings.c.user_id,
    diagnostic_findings.c.decision_status,
)
Index(
    "idx_diagnostic_findings_rule",
    diagnostic_findings.c.user_id,
    diagnostic_findings.c.rule_id,
)
Index(
    "idx_improvement_tasks_status",
    improvement_tasks.c.user_id,
    improvement_tasks.c.status,
)
Index(
    "idx_improvement_tasks_source",
    improvement_tasks.c.user_id,
    improvement_tasks.c.source_finding_id,
)

TENANT_SCOPED_TABLES = (
    "academic_programs",
    "academic_courses",
    "graduation_requirements",
    "competency_indicators",
    "course_objectives",
    "experiment_projects",
    "rubric_items",
    "uploaded_materials",
    "material_versions",
    "source_materials",
    "academic_support_links",
    "recognition_candidates",
    "graph_nodes",
    "graph_edges",
    "diagnostic_findings",
    "improvement_tasks",
)


def is_postgres_url(database_url: str | None) -> bool:
    return bool(database_url and database_url.startswith(("postgresql://", "postgresql+")))


PRIMARY_KEY_COLUMNS_SQL = text(
    """
    select
        tc.constraint_name,
        array_agg(kcu.column_name order by kcu.ordinal_position) as columns
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
        on tc.constraint_name = kcu.constraint_name
        and tc.table_schema = kcu.table_schema
        and tc.table_name = kcu.table_name
    where tc.constraint_type = 'PRIMARY KEY'
        and tc.table_schema = current_schema()
        and tc.table_name = :table_name
    group by tc.constraint_name
    """
)


def _tenant_primary_key_sql(table_name: str) -> str:
    if table_name not in TENANT_SCOPED_TABLES:
        raise ValueError(f"Unsupported tenant-scoped table: {table_name}")
    return (
        f'alter table "{table_name}" '
        f'add constraint "{table_name}_pkey" primary key (user_id, id)'
    )


def _drop_primary_key_sql(table_name: str, constraint_name: str) -> str:
    if table_name not in TENANT_SCOPED_TABLES:
        raise ValueError(f"Unsupported tenant-scoped table: {table_name}")
    if not constraint_name.endswith("_pkey"):
        raise ValueError(f"Unexpected primary key constraint: {constraint_name}")
    return f'alter table "{table_name}" drop constraint if exists "{constraint_name}"'


async def _ensure_tenant_scoped_primary_keys_async(conn) -> None:
    if conn.dialect.name != "postgresql":
        return
    for table_name in TENANT_SCOPED_TABLES:
        result = await conn.execute(PRIMARY_KEY_COLUMNS_SQL, {"table_name": table_name})
        row = result.first()
        current_columns = list(row.columns or []) if row else []
        if current_columns == ["user_id", "id"]:
            continue
        if row is not None:
            await conn.exec_driver_sql(
                _drop_primary_key_sql(table_name, row.constraint_name)
            )
        await conn.exec_driver_sql(_tenant_primary_key_sql(table_name))


def _ensure_tenant_scoped_primary_keys_sync(conn) -> None:
    if conn.dialect.name != "postgresql":
        return
    for table_name in TENANT_SCOPED_TABLES:
        result = conn.execute(PRIMARY_KEY_COLUMNS_SQL, {"table_name": table_name})
        row = result.first()
        current_columns = list(row.columns or []) if row else []
        if current_columns == ["user_id", "id"]:
            continue
        if row is not None:
            conn.exec_driver_sql(_drop_primary_key_sql(table_name, row.constraint_name))
        conn.exec_driver_sql(_tenant_primary_key_sql(table_name))


async def run_database_migrations(database_url: str) -> None:
    engine = create_async_engine(database_url, future=True)
    try:
        async with engine.begin() as conn:
            await conn.run_sync(metadata.create_all)
            await _ensure_tenant_scoped_primary_keys_async(conn)
            existing = await conn.execute(
                select(schema_migrations.c.version).where(
                    schema_migrations.c.version == PRODUCTION_SCHEMA_VERSION
                )
            )
            if existing.first() is None:
                await conn.execute(
                    insert(schema_migrations).values(
                        version=PRODUCTION_SCHEMA_VERSION,
                        applied_at=datetime.now(UTC).isoformat(),
                    )
                )
            tenant_pk_existing = await conn.execute(
                select(schema_migrations.c.version).where(
                    schema_migrations.c.version == TENANT_PRIMARY_KEY_SCHEMA_VERSION
                )
            )
            if tenant_pk_existing.first() is None:
                await conn.execute(
                    insert(schema_migrations).values(
                        version=TENANT_PRIMARY_KEY_SCHEMA_VERSION,
                        applied_at=datetime.now(UTC).isoformat(),
                    )
                )
    finally:
        await engine.dispose()


def run_database_migrations_sync(database_url: str) -> None:
    engine = create_engine(to_sqlalchemy_sync_url(database_url), future=True)
    try:
        with engine.begin() as conn:
            metadata.create_all(conn)
            _ensure_tenant_scoped_primary_keys_sync(conn)
            existing = conn.execute(
                select(schema_migrations.c.version).where(
                    schema_migrations.c.version == PRODUCTION_SCHEMA_VERSION
                )
            )
            if existing.first() is None:
                conn.execute(
                    insert(schema_migrations).values(
                        version=PRODUCTION_SCHEMA_VERSION,
                        applied_at=datetime.now(UTC).isoformat(),
                    )
                )
            tenant_pk_existing = conn.execute(
                select(schema_migrations.c.version).where(
                    schema_migrations.c.version == TENANT_PRIMARY_KEY_SCHEMA_VERSION
                )
            )
            if tenant_pk_existing.first() is None:
                conn.execute(
                    insert(schema_migrations).values(
                        version=TENANT_PRIMARY_KEY_SCHEMA_VERSION,
                        applied_at=datetime.now(UTC).isoformat(),
                    )
                )
    finally:
        engine.dispose()
