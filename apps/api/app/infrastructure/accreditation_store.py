"""PostgreSQL persistence for accreditation evidence and audit records."""

from __future__ import annotations

from dataclasses import asdict, is_dataclass
from datetime import UTC, datetime
from enum import Enum
from typing import Any
from uuid import uuid4

from sqlalchemy import JSON, DateTime, String, Text, UniqueConstraint, select
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class EntitySnapshotRow(Base):
    __tablename__ = "accreditation_entity_snapshots"
    __table_args__ = (
        UniqueConstraint("tenant_id", "entity_type", "entity_id", name="uq_accreditation_entity"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    tenant_id: Mapped[str] = mapped_column(String(128), index=True)
    entity_type: Mapped[str] = mapped_column(String(64), index=True)
    entity_id: Mapped[str] = mapped_column(String(128), index=True)
    version: Mapped[str] = mapped_column(String(64))
    payload: Mapped[dict[str, Any]] = mapped_column(JSON)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class EvidenceRecordRow(Base):
    __tablename__ = "evidence_records"
    __table_args__ = (
        UniqueConstraint("tenant_id", "evidence_id", name="uq_evidence_tenant_id"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    tenant_id: Mapped[str] = mapped_column(String(128), index=True)
    evidence_id: Mapped[str] = mapped_column(String(128), index=True)
    subject_type: Mapped[str] = mapped_column(String(64), index=True)
    subject_id: Mapped[str] = mapped_column(String(128), index=True)
    source_name: Mapped[str] = mapped_column(String(512))
    source_version: Mapped[str] = mapped_column(String(64))
    coordinate: Mapped[str] = mapped_column(String(256))
    fragment_type: Mapped[str] = mapped_column(String(64))
    excerpt: Mapped[str] = mapped_column(Text)
    content_hash: Mapped[str] = mapped_column(String(128), index=True)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class AuditEventRow(Base):
    __tablename__ = "audit_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    tenant_id: Mapped[str] = mapped_column(String(128), index=True)
    actor_id: Mapped[str] = mapped_column(String(128), index=True)
    action: Mapped[str] = mapped_column(String(96), index=True)
    entity_type: Mapped[str] = mapped_column(String(64), index=True)
    entity_id: Mapped[str] = mapped_column(String(128), index=True)
    detail: Mapped[dict[str, Any]] = mapped_column(JSON)
    happened_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)


def _json_value(value: Any) -> Any:
    if isinstance(value, Enum):
        return value.value
    if is_dataclass(value):
        return {key: _json_value(item) for key, item in asdict(value).items()}
    if isinstance(value, dict):
        return {str(key): _json_value(item) for key, item in value.items()}
    if isinstance(value, (tuple, list)):
        return [_json_value(item) for item in value]
    return value


class AccreditationStore:
    """Writes immutable evidence/audit records and current entity snapshots."""

    def __init__(self, engine: AsyncEngine) -> None:
        self._engine = engine

    async def create_schema(self) -> None:
        async with self._engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)

    async def dispose(self) -> None:
        await self._engine.dispose()

    async def snapshot(
        self,
        *,
        tenant_id: str,
        entity_type: str,
        entity: Any,
        version: str,
    ) -> None:
        payload = _json_value(entity)
        entity_id = str(payload["id"])
        now = datetime.now(UTC)
        async with AsyncSession(self._engine, expire_on_commit=False) as session:
            result = await session.execute(
                select(EntitySnapshotRow).where(
                    EntitySnapshotRow.tenant_id == tenant_id,
                    EntitySnapshotRow.entity_type == entity_type,
                    EntitySnapshotRow.entity_id == entity_id,
                )
            )
            row = result.scalar_one_or_none()
            if row is None:
                session.add(EntitySnapshotRow(
                    id=str(uuid4()), tenant_id=tenant_id, entity_type=entity_type,
                    entity_id=entity_id, version=version, payload=payload, updated_at=now,
                ))
            else:
                row.version = version
                row.payload = payload
                row.updated_at = now
            await session.commit()

    async def evidence(
        self, *, tenant_id: str, evidence_id: str, subject_type: str, subject_id: str,
        source_name: str, source_version: str, coordinate: str, fragment_type: str,
        excerpt: str, content_hash: str,
    ) -> None:
        async with AsyncSession(self._engine, expire_on_commit=False) as session:
            result = await session.execute(
                select(EvidenceRecordRow).where(
                    EvidenceRecordRow.tenant_id == tenant_id,
                    EvidenceRecordRow.evidence_id == evidence_id,
                )
            )
            row = result.scalar_one_or_none()
            values = {
                "subject_type": subject_type, "subject_id": subject_id, "source_name": source_name,
                "source_version": source_version, "coordinate": coordinate,
                "fragment_type": fragment_type, "excerpt": excerpt, "content_hash": content_hash,
            }
            if row is None:
                session.add(EvidenceRecordRow(
                    id=str(uuid4()), tenant_id=tenant_id, evidence_id=evidence_id,
                    recorded_at=datetime.now(UTC), **values,
                ))
            else:
                for key, value in values.items():
                    setattr(row, key, value)
            await session.commit()

    async def delete_snapshot(
        self, *,
        tenant_id: str,
        entity_type: str,
        entity_id: str,
        actor_id: str | None = None,
    ) -> None:
        """删除实体快照（物理删除），并追加审计事件。

        证据记录（evidence_records）不可删除，保留原始证据链。
        """
        async with AsyncSession(self._engine, expire_on_commit=False) as session:
            result = await session.execute(
                select(EntitySnapshotRow).where(
                    EntitySnapshotRow.tenant_id == tenant_id,
                    EntitySnapshotRow.entity_type == entity_type,
                    EntitySnapshotRow.entity_id == entity_id,
                )
            )
            row = result.scalar_one_or_none()
            if row is not None:
                await session.delete(row)
            # 审计事件：删除快照
            session.add(AuditEventRow(
                id=str(uuid4()),
                tenant_id=tenant_id,
                actor_id=actor_id or tenant_id,
                action=f"{entity_type}.deleted",
                entity_type=entity_type,
                entity_id=entity_id,
                detail={"snapshot_removed": True},
                happened_at=datetime.now(UTC),
            ))
            await session.commit()

    async def get_snapshot(
        self, *, tenant_id: str, entity_type: str, entity_id: str
    ) -> dict[str, Any] | None:
        async with AsyncSession(self._engine, expire_on_commit=False) as session:
            result = await session.execute(
                select(EntitySnapshotRow).where(
                    EntitySnapshotRow.tenant_id == tenant_id,
                    EntitySnapshotRow.entity_type == entity_type,
                    EntitySnapshotRow.entity_id == entity_id,
                )
            )
            row = result.scalar_one_or_none()
            if row is None:
                return None
            return {
                "entity_id": row.entity_id,
                "version": row.version,
                "payload": dict(row.payload),
                "updated_at": row.updated_at.isoformat(),
            }

    async def list_audit_events(
        self, *, tenant_id: str, entity_type: str, entity_id: str
    ) -> list[dict[str, Any]]:
        async with AsyncSession(self._engine, expire_on_commit=False) as session:
            result = await session.execute(
                select(AuditEventRow)
                .where(
                    AuditEventRow.tenant_id == tenant_id,
                    AuditEventRow.entity_type == entity_type,
                    AuditEventRow.entity_id == entity_id,
                )
                .order_by(AuditEventRow.happened_at.asc())
            )
            return [
                {
                    "action": row.action,
                    "actor_id": row.actor_id,
                    "detail": dict(row.detail),
                    "happened_at": row.happened_at.isoformat(),
                }
                for row in result.scalars()
            ]

    async def audit(
        self,
        *,
        tenant_id: str,
        actor_id: str,
        action: str,
        entity_type: str,
        entity_id: str,
        detail: dict[str, Any],
    ) -> None:
        async with AsyncSession(self._engine, expire_on_commit=False) as session:
            session.add(AuditEventRow(
                id=str(uuid4()), tenant_id=tenant_id, actor_id=actor_id, action=action,
                entity_type=entity_type, entity_id=entity_id, detail=_json_value(detail),
                happened_at=datetime.now(UTC),
            ))
            await session.commit()
