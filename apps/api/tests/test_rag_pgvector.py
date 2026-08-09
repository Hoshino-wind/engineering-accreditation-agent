"""pgvector RAG 仓储测试（第 5 步补缺）。

- 无数据库依赖：分块逻辑
- 需要 EA_DATABASE_URL：ingest → search 端到端（未配置时 skip）
"""
from __future__ import annotations

import os

import pytest
from app.modules.llm.infra.rag_pgvector import PostgresRAGRepository


class TestChunking:
    def test_chunk_long_text(self) -> None:
        repo = PostgresRAGRepository.__new__(PostgresRAGRepository)
        chunks = repo._chunk_texts("甲" * 1000, size=400)
        assert len(chunks) == 3
        assert all(len(c) <= 400 for c in chunks)
        assert "".join(chunks) == "甲" * 1000

    def test_chunk_short_text(self) -> None:
        repo = PostgresRAGRepository.__new__(PostgresRAGRepository)
        assert repo._chunk_texts("短文本", size=400) == ["短文本"]

    def test_chunk_empty(self) -> None:
        repo = PostgresRAGRepository.__new__(PostgresRAGRepository)
        assert repo._chunk_texts("   ") == []


_DATABASE_URL = os.environ.get("EA_DATABASE_URL")


@pytest.mark.skipif(
    _DATABASE_URL is None,
    reason="EA_DATABASE_URL 未配置，跳过 PostgreSQL RAG 集成测试",
)
class TestRagIntegration:
    @pytest.fixture
    async def repo(self):
        from sqlalchemy.ext.asyncio import create_async_engine

        engine = create_async_engine(_DATABASE_URL, pool_pre_ping=True)
        fake_embedder = lambda texts: [  # noqa: E731
            [0.1 + i * 0.01] * 4 + [0.0] * 1532 for i in range(len(texts))
        ]
        r = PostgresRAGRepository(
            engine, tenant_id="user-rag-test", embedder=fake_embedder, dim=1536
        )
        await r._ensure_schema()
        yield r
        await engine.dispose()

    async def test_ingest_and_search_roundtrip(self, repo) -> None:
        chunk_ids = await repo.ingest(
            "实验教学能力图谱构建方法，知识点与能力节点关联分析。",
            source="test-materials",
            page=1,
        )
        assert chunk_ids

        result = await repo.search("能力图谱构建", top_k=2)
        assert result.total >= 1
        assert result.results[0].source == "test-materials"

    async def test_ingest_standard_library(self, repo) -> None:
        count = await repo.ingest_standard_library(
            [
                {"code": "GR-01", "name": "工程知识", "text": "掌握数学与自然科学基础"},
                {"code": "GR-02", "name": "问题分析", "text": "能够应用基本原理识别与表达复杂工程问题"},
            ]
        )
        assert count >= 2
