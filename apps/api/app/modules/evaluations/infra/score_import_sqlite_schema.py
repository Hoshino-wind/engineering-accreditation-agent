import sqlite3

SCORE_IMPORT_TABLES = (
    "evaluation_score_import_batches",
    "evaluation_score_import_candidate_items",
    "evaluation_score_records",
    "evaluation_score_validation_reports",
    "evaluation_score_import_commands",
)

SCORE_IMPORT_SCHEMA_STATEMENTS = (
    """
    CREATE TABLE IF NOT EXISTS evaluation_score_import_batches (
        batch_id TEXT PRIMARY KEY,
        evaluation_object_id TEXT NOT NULL,
        base_run_id TEXT NOT NULL,
        scope TEXT NOT NULL,
        schema_version TEXT NOT NULL,
        profile TEXT NOT NULL,
        source_kind TEXT NOT NULL,
        base_context_digest TEXT NOT NULL,
        content_digest TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY(evaluation_object_id)
            REFERENCES evaluation_object_read_models(evaluation_object_id),
        FOREIGN KEY(base_run_id) REFERENCES evaluation_run_read_models(run_id)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS evaluation_score_import_candidate_items (
        batch_id TEXT NOT NULL,
        item_order INTEGER NOT NULL,
        input_id TEXT NOT NULL,
        earned_points_total TEXT,
        possible_points_total TEXT,
        observed_student_count INTEGER,
        PRIMARY KEY(batch_id, item_order),
        FOREIGN KEY(batch_id) REFERENCES evaluation_score_import_batches(batch_id)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS evaluation_score_records (
        record_id TEXT PRIMARY KEY,
        batch_id TEXT NOT NULL,
        input_id TEXT NOT NULL,
        earned_points_total TEXT NOT NULL,
        possible_points_total TEXT NOT NULL,
        observed_student_count INTEGER NOT NULL,
        score_rate TEXT NOT NULL,
        UNIQUE(batch_id, input_id),
        FOREIGN KEY(batch_id) REFERENCES evaluation_score_import_batches(batch_id)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS evaluation_score_validation_reports (
        report_id TEXT PRIMARY KEY,
        batch_id TEXT NOT NULL UNIQUE,
        report_version TEXT NOT NULL,
        validator_version TEXT NOT NULL,
        validation_status TEXT NOT NULL,
        report_digest TEXT NOT NULL,
        created_at TEXT NOT NULL,
        payload TEXT NOT NULL,
        payload_hash TEXT NOT NULL,
        FOREIGN KEY(batch_id) REFERENCES evaluation_score_import_batches(batch_id)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS evaluation_score_import_commands (
        idempotency_key TEXT PRIMARY KEY,
        operation_version TEXT NOT NULL,
        request_hash TEXT NOT NULL,
        batch_id TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL,
        FOREIGN KEY(batch_id) REFERENCES evaluation_score_import_batches(batch_id)
    )
    """,
)


def initialize_score_import_schema(connection: sqlite3.Connection) -> None:
    connection.execute("BEGIN IMMEDIATE")
    try:
        for statement in SCORE_IMPORT_SCHEMA_STATEMENTS:
            connection.execute(statement)
        for table in SCORE_IMPORT_TABLES:
            connection.execute(
                f"""
                CREATE TRIGGER IF NOT EXISTS prevent_{table}_update
                BEFORE UPDATE ON {table}
                BEGIN
                    SELECT RAISE(ABORT, 'immutable score import data');
                END
                """
            )
            connection.execute(
                f"""
                CREATE TRIGGER IF NOT EXISTS prevent_{table}_delete
                BEFORE DELETE ON {table}
                BEGIN
                    SELECT RAISE(ABORT, 'immutable score import data');
                END
                """
            )
        connection.commit()
    except Exception:
        connection.rollback()
        raise


__all__ = ["SCORE_IMPORT_TABLES", "initialize_score_import_schema"]
