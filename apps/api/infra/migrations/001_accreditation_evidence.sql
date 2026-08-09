-- 001_accreditation_evidence.sql
-- 工程认证智能体：PostgreSQL 持久化 Schema
--
-- 三张表：
--   accreditation_entity_snapshots — 实体当前快照（可更新 / 可删除）
--   evidence_records               — 不可变证据记录（只增不改不删）
--   audit_events                   — 审计事件流（只增不改不删）
--
-- 读写隔离说明：
--   resources / candidates / findings 仓储在 EA_DATABASE_URL 配置后
--   从 accreditation_entity_snapshots.payload 重建领域对象。
--   写入时由 AccreditationStore.snapshot() 做 upsert。
--   删除时由 AccreditationStore.delete_snapshot() 物理删除快照行，
--   并追加 audit_events；evidence_records 永不删除。

-- ============================================================================
-- 1. 实体快照表
-- ============================================================================
CREATE TABLE IF NOT EXISTS accreditation_entity_snapshots (
    id           VARCHAR(36)   PRIMARY KEY,
    tenant_id    VARCHAR(128)  NOT NULL,
    entity_type  VARCHAR(64)   NOT NULL,
    entity_id    VARCHAR(128)  NOT NULL,
    version      VARCHAR(64)   NOT NULL DEFAULT '',
    payload      JSONB         NOT NULL DEFAULT '{}'::jsonb,
    updated_at   TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- 唯一约束：同一租户下同一实体类型 + 实体 ID 只能有一条快照
CREATE UNIQUE INDEX IF NOT EXISTS uq_accreditation_entity
    ON accreditation_entity_snapshots (tenant_id, entity_type, entity_id);

-- 查询索引：按租户 + 类型查询（仓储 list_all 使用）
CREATE INDEX IF NOT EXISTS idx_snapshots_tenant_type
    ON accreditation_entity_snapshots (tenant_id, entity_type);

CREATE INDEX IF NOT EXISTS idx_snapshots_entity_id
    ON accreditation_entity_snapshots (entity_id);

-- ============================================================================
-- 2. 证据记录表（不可变）
-- ============================================================================
CREATE TABLE IF NOT EXISTS evidence_records (
    id            VARCHAR(36)   PRIMARY KEY,
    tenant_id     VARCHAR(128)  NOT NULL,
    evidence_id   VARCHAR(128)  NOT NULL,
    subject_type  VARCHAR(64)   NOT NULL,
    subject_id    VARCHAR(128)  NOT NULL,
    source_name   VARCHAR(512)  NOT NULL DEFAULT '',
    source_version VARCHAR(64)  NOT NULL DEFAULT '',
    coordinate    VARCHAR(256)  NOT NULL DEFAULT '',
    fragment_type VARCHAR(64)   NOT NULL DEFAULT '',
    excerpt       TEXT          NOT NULL DEFAULT '',
    content_hash  VARCHAR(128)  NOT NULL DEFAULT '',
    recorded_at   TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_evidence_tenant_id
    ON evidence_records (tenant_id, evidence_id);

CREATE INDEX IF NOT EXISTS idx_evidence_tenant_subject
    ON evidence_records (tenant_id, subject_type, subject_id);

CREATE INDEX IF NOT EXISTS idx_evidence_content_hash
    ON evidence_records (content_hash);

-- ============================================================================
-- 3. 审计事件表（不可变）
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_events (
    id           VARCHAR(36)   PRIMARY KEY,
    tenant_id    VARCHAR(128)  NOT NULL,
    actor_id     VARCHAR(128)  NOT NULL DEFAULT '',
    action       VARCHAR(96)   NOT NULL,
    entity_type  VARCHAR(64)   NOT NULL DEFAULT '',
    entity_id    VARCHAR(128)  NOT NULL DEFAULT '',
    detail       JSONB         NOT NULL DEFAULT '{}'::jsonb,
    happened_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_tenant_time
    ON audit_events (tenant_id, happened_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_entity
    ON audit_events (entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_audit_action
    ON audit_events (action);
