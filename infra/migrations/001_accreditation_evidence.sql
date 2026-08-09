CREATE TABLE IF NOT EXISTS accreditation_entity_snapshots (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(128) NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id VARCHAR(128) NOT NULL,
    version VARCHAR(64) NOT NULL,
    payload JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT uq_accreditation_entity UNIQUE (tenant_id, entity_type, entity_id)
);
CREATE INDEX IF NOT EXISTS ix_accreditation_entity_tenant ON accreditation_entity_snapshots (tenant_id, entity_type);

CREATE TABLE IF NOT EXISTS evidence_records (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(128) NOT NULL,
    evidence_id VARCHAR(128) NOT NULL,
    subject_type VARCHAR(64) NOT NULL,
    subject_id VARCHAR(128) NOT NULL,
    source_name VARCHAR(512) NOT NULL,
    source_version VARCHAR(64) NOT NULL,
    coordinate VARCHAR(256) NOT NULL,
    fragment_type VARCHAR(64) NOT NULL,
    excerpt TEXT NOT NULL,
    content_hash VARCHAR(128) NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL,
    CONSTRAINT uq_evidence_tenant_id UNIQUE (tenant_id, evidence_id)
);
CREATE INDEX IF NOT EXISTS ix_evidence_subject ON evidence_records (tenant_id, subject_type, subject_id);

CREATE TABLE IF NOT EXISTS audit_events (
    id VARCHAR(36) PRIMARY KEY,
    tenant_id VARCHAR(128) NOT NULL,
    actor_id VARCHAR(128) NOT NULL,
    action VARCHAR(96) NOT NULL,
    entity_type VARCHAR(64) NOT NULL,
    entity_id VARCHAR(128) NOT NULL,
    detail JSONB NOT NULL,
    happened_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_audit_entity ON audit_events (tenant_id, entity_type, entity_id, happened_at);
