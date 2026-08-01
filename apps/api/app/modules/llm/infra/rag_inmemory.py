"""RAG 向量检索 — 内存实现（无 Qdrant 依赖时降级）。

生产环境替换为 QdrantClient，接口不变。
当前实现使用简单的关键词匹配 + 余弦相似度模拟向量检索。
"""

from __future__ import annotations

import math
import re
import logging
from collections import defaultdict

from app.modules.llm.application.rag_port import RAGSearchPort
from app.modules.llm.domain.models import RAGChunk, RAGSearchResult

logger = logging.getLogger(__name__)


def _tokenize(text: str) -> list[str]:
    """简单中文分词：按字符 + 英文单词。"""
    # 英文单词
    en_tokens = re.findall(r"[a-zA-Z]+", text.lower())
    # 中文字符（2-gram）
    cn_text = re.sub(r"[^\u4e00-\u9fff]", "", text)
    cn_tokens = [cn_text[i:i+2] for i in range(len(cn_text) - 1)] if len(cn_text) > 1 else [cn_text]
    return en_tokens + cn_tokens


def _cosine_sim(a: list[float], b: list[float]) -> float:
    if not a or not b:
        return 0.0
    dot = sum(x * y for x, y in zip(a, b, strict=False))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(y * y for y in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def _text_to_vector(text: str, vocab: dict[str, int]) -> list[float]:
    tokens = _tokenize(text)
    vec = [0.0] * len(vocab)
    for t in tokens:
        if t in vocab:
            vec[vocab[t]] += 1.0
    return vec


class InMemoryRAGRepository(RAGSearchPort):
    """内存向量检索 — 无外部依赖的 RAG 实现。

    - ingest 时分块并建立 TF 向量
    - search 时用 query 的 TF 向量与已有块做余弦相似度
    - 生产环境替换为 QdrantClient，接口不变
    """

    def __init__(self, chunk_size: int = 500, overlap: int = 50) -> None:
        self._chunks: list[dict] = []  # {id, text, source, page, tokens}
        self._vocab: dict[str, int] = defaultdict(int)
        self._chunk_size = chunk_size
        self._overlap = overlap
        self._next_id = 0

    def _split_chunks(self, text: str) -> list[str]:
        """文本分块：按 chunk_size 字符切分，带 overlap。"""
        if len(text) <= self._chunk_size:
            return [text] if text.strip() else []
        chunks = []
        step = self._chunk_size - self._overlap
        for i in range(0, len(text), step):
            chunk = text[i:i + self._chunk_size]
            if chunk.strip():
                chunks.append(chunk)
            if i + self._chunk_size >= len(text):
                break
        return chunks

    def _update_vocab(self, tokens: list[str]) -> None:
        for t in tokens:
            if t not in self._vocab:
                self._vocab[t] = len(self._vocab)

    async def search(
        self,
        query: str,
        top_k: int = 3,
        source_filter: str | None = None,
    ) -> RAGSearchResult:
        if not self._chunks:
            return RAGSearchResult(query=query, chunks=[])

        query_tokens = _tokenize(query)
        self._update_vocab(query_tokens)
        query_vec = _text_to_vector(query, self._vocab)

        scored: list[tuple[float, dict]] = []
        for chunk in self._chunks:
            if source_filter and chunk["source"] != source_filter:
                continue
            chunk_vec = _text_to_vector(chunk["text"], self._vocab)
            score = _cosine_sim(query_vec, chunk_vec)
            scored.append((score, chunk))

        scored.sort(key=lambda x: x[0], reverse=True)
        results = [
            RAGChunk(
                text=chunk["text"][:500],
                source=chunk["source"],
                page=chunk.get("page"),
                score=score,
            )
            for score, chunk in scored[:top_k]
            if score > 0
        ]
        return RAGSearchResult(query=query, chunks=results)

    async def ingest(
        self,
        text: str,
        source: str,
        page: int | None = None,
        metadata: dict | None = None,
    ) -> str:
        chunks = self._split_chunks(text)
        for chunk_text in chunks:
            self._next_id += 1
            chunk_id = f"chunk-{self._next_id}"
            tokens = _tokenize(chunk_text)
            self._update_vocab(tokens)
            self._chunks.append({
                "id": chunk_id,
                "text": chunk_text,
                "source": source,
                "page": page,
                "metadata": metadata or {},
                "tokens": tokens,
            })
        logger.info(f"RAG ingest: source={source}, chunks={len(chunks)}")
        return f"chunk-{self._next_id}"

    async def ingest_standard_library(self, standards: list[dict]) -> int:
        count = 0
        for std in standards:
            code = std.get("code", "")
            name = std.get("name", "")
            desc = std.get("description", "")
            text = f"{code} {name}。{desc}"
            if std.get("indicators"):
                for ind in std["indicators"]:
                    ind_text = f"\n- {ind.get('code', '')} {ind.get('name', '')}：{ind.get('description', '')}"
                    text += ind_text
            await self.ingest(text, source="2024认证标准", page=None, metadata={"type": "standard"})
            count += 1
        logger.info(f"RAG ingest_standard_library: {count} standards")
        return count

    def clone(self) -> "InMemoryRAGRepository":
        new_repo = InMemoryRAGRepository(
            chunk_size=self._chunk_size,
            overlap=self._overlap,
        )
        new_repo._chunks = [dict(c) for c in self._chunks]
        new_repo._vocab = defaultdict(int, self._vocab)
        new_repo._next_id = self._next_id
        return new_repo

    @property
    def chunk_count(self) -> int:
        return len(self._chunks)
