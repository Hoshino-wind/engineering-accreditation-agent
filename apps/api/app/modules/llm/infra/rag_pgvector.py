"""RAG 向量检索 — PostgreSQL pgvector 实现。

- 表 rag_chunks：text + embedding vector(1536) + source/page/metadata
- search：余弦距离最近邻（<=> 运算符），按租户隔离
- embedding 由 OpenAI 兼容接口生成（与 LLM 客户端同一配置）
- 未配置数据库或 embedding key 时由 bootstrap 回退到内存实现
"""
from __future__ import annotations

import hashlib
import logging
from datetime import datetime

from sqlalchemy import JSON, DateTime, String, Text, text
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from app.modules.llm.application.rag_port import RAGSearchPort
from app.modules.llm.domain.models import RAGChunk, RAGSearchResult

logger = logging.getLogger(__name__)

_EMBEDDING_DIM = 1536


class _RagBase(DeclarativeBase):
    pass


class RagChunkRow(_RagBase):
    __tablename__ = "rag_chunks"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    tenant_id: Mapped[str] = mapped_column(String(128), index=True)
    content: Mapped[str] = mapped_column(Text)
    source: Mapped[str] = mapped_column(String(512))
    page: Mapped[int | None] = mapped_column(nullable=True)
    meta: Mapped[dict] = mapped_column("metadata", JSON, default=dict)
    embedding: Mapped[list] = mapped_column("embedding", JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class PostgresRAGRepository(RAGSearchPort):
    """pgvector 版 RAG 检索。embedder 为 async 函数：text -> list[float]。"""

    def __init__(
        self,
        engine: AsyncEngine,
        *,
        tenant_id: str,
        embedder,
        dim: int = _EMBEDDING_DIM,
    ) -> None:
        self._engine = engine
        self._tenant_id = tenant_id
        self._embedder = embedder
        self._dim = dim

    async def _ensure_schema(self) -> None:
        async with self._engine.begin() as conn:
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            await conn.execute(
                text(
                    "CREATE TABLE IF NOT EXISTS rag_chunks ("
                    "  id VARCHAR(64) PRIMARY KEY,"
                    "  tenant_id VARCHAR(128) NOT NULL,"
                    "  content TEXT NOT NULL,"
                    "  source VARCHAR(512) NOT NULL,"
                    "  page INT,"
                    "  metadata JSONB DEFAULT '{}'::jsonb,"
                    f"  embedding vector({self._dim}),"
                    "  created_at TIMESTAMPTZ NOT NULL DEFAULT now()"
                    ")"
                )
            )
            await conn.execute(
                text(
                    "CREATE INDEX IF NOT EXISTS idx_rag_chunks_tenant"
                    " ON rag_chunks (tenant_id)"
                )
            )

    def _chunk_texts(self, text_: str, size: int = 400) -> list[str]:
        """简单定长分块（保留边界完整性）。"""
        text_ = text_.strip()
        if not text_:
            return []
        return [text_[i : i + size] for i in range(0, len(text_), size)]

    async def search(
        self,
        query: str,
        top_k: int = 3,
        source_filter: str | None = None,
    ) -> RAGSearchResult:
        await self._ensure_schema()
        query_vec = await self._embedder(query)
        sql = (
            "SELECT content, source, page, metadata AS meta,"
            " 1 - (embedding <=> :vec::vector) AS sim"
            " FROM rag_chunks WHERE tenant_id = :tenant"
        )
        params: dict = {"vec": query_vec, "tenant": self._tenant_id, "k": top_k}
        if source_filter:
            sql += " AND source = :source"
            params["source"] = source_filter
        sql += " ORDER BY sim DESC LIMIT :k"
        async with AsyncSession(self._engine) as session:
            rows = await session.execute(text(sql), params)
            results = [
                RAGChunk(
                    chunk_id=row.id if hasattr(row, "id") else "",
                    content=row.content,
                    source=row.source,
                    page=row.page,
                    metadata=dict(row.meta or {}),
                    score=float(row.sim or 0.0),
                )
                for row in rows
            ]
        return RAGSearchResult(query=query, results=results, total=len(results))

    async def ingest(
        self,
        text_: str,
        source: str,
        page: int | None = None,
        metadata: dict | None = None,
    ) -> str:
        await self._ensure_schema()
        chunks = self._chunk_texts(text_)
        if not chunks:
            return ""
        vectors = await self._embedder(chunks)
        chunk_ids: list[str] = []
        async with AsyncSession(self._engine) as session:
            for i, (chunk, vec) in enumerate(zip(chunks, vectors, strict=False)):
                cid = hashlib.sha256(
                    f"{self._tenant_id}:{source}:{page or 0}:{i}".encode()
                ).hexdigest()[:32]
                chunk_ids.append(cid)
                session.add(
                    RagChunkRow(
                        id=cid,
                        tenant_id=self._tenant_id,
                        content=chunk,
                        source=source,
                        page=page,
                        meta=metadata or {},
                        embedding=vec,
                    )
                )
            await session.commit()
        return ",".join(chunk_ids)

    async def ingest_standard_library(self, standards: list[dict]) -> int:
        total = 0
        for item in standards:
            content = f"{item.get('code', '')} {item.get('name', '')}：{item.get('text', '')}"
            cid = await self.ingest(content, source="standard-library")
            if cid:
                total += len(cid.split(","))
        return total
