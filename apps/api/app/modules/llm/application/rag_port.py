"""RAG 检索接口定义 — 由 infra 层实现（Qdrant 或内存 mock）。"""

from __future__ import annotations

from abc import ABC, abstractmethod

from app.modules.llm.domain.models import RAGSearchResult


class RAGSearchPort(ABC):
    """RAG 向量检索的抽象接口。"""

    @abstractmethod
    async def search(
        self,
        query: str,
        top_k: int = 3,
        source_filter: str | None = None,
    ) -> RAGSearchResult:
        """检索与 query 最相关的文本块。"""

    @abstractmethod
    async def ingest(
        self,
        text: str,
        source: str,
        page: int | None = None,
        metadata: dict | None = None,
    ) -> str:
        """将文本分块、向量化并写入向量库，返回写入的 chunk ID 列表。"""

    @abstractmethod
    async def ingest_standard_library(
        self,
        standards: list[dict],
    ) -> int:
        """将认证标准原文写入向量库，返回写入的 chunk 数。"""
