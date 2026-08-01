"""LLM + RAG API 路由。"""

from collections.abc import Callable
from typing import Annotated

from fastapi import APIRouter, Depends

from app.modules.llm.application.ports import LLMClientPort
from app.modules.llm.application.rag_port import RAGSearchPort
from app.modules.llm.contracts.llm import (
    ExtractNodesRequest,
    ExtractNodesResponse,
    GenerateExplanationRequest,
    GenerateExplanationResponse,
    GenerateReportRequest,
    GenerateReportResponse,
    GenerateSuggestionsRequest,
    GenerateSuggestionsResponse,
    InferRelationsRequest,
    InferRelationsResponse,
    RAGSearchRequest,
    RAGSearchResponse,
    RAGChunkResponse,
)


def create_llm_router(
    llm_client_provider: Callable[[], LLMClientPort],
    rag_search_provider: Callable[[], RAGSearchPort],
) -> APIRouter:
    router = APIRouter(prefix="/llm", tags=["llm"])

    @router.post(
        "/extract",
        response_model=ExtractNodesResponse,
        summary="M4 智能体：从材料文本提取结构化节点",
    )
    async def extract_nodes(
        body: ExtractNodesRequest,
        llm: Annotated[LLMClientPort, Depends(llm_client_provider)],
    ) -> ExtractNodesResponse:
        resp = await llm.extract_nodes(
            material_text=body.material_text,
            material_category=body.material_category,
            material_name=body.material_name,
        )
        return ExtractNodesResponse(
            data=[
                {
                    "code": item.code,
                    "name": item.name,
                    "kind": item.kind,
                    "credit_hours": item.credit_hours,
                    "description": item.description,
                    "confidence": item.confidence,
                    "source_excerpt": item.source_excerpt,
                }
                for item in resp.data
            ],
            model=resp.model,
            usage={"prompt_tokens": resp.usage.prompt_tokens, "completion_tokens": resp.usage.completion_tokens, "total_tokens": resp.usage.total_tokens},
            latency=resp.latency,
        )

    @router.post(
        "/infer-relations",
        response_model=InferRelationsResponse,
        summary="M4→M2 智能体：推断学校节点与标准指标的支撑关系",
    )
    async def infer_relations(
        body: InferRelationsRequest,
        llm: Annotated[LLMClientPort, Depends(llm_client_provider)],
    ) -> InferRelationsResponse:
        resp = await llm.infer_relations(
            school_nodes=body.school_nodes,
            standard_nodes=body.standard_nodes,
        )
        return InferRelationsResponse(
            data=[
                {
                    "source_id": item.source_id,
                    "target_id": item.target_id,
                    "relation_type": item.relation_type,
                    "strength": item.strength,
                    "confidence": item.confidence,
                    "reasoning": item.reasoning,
                }
                for item in resp.data
            ],
            model=resp.model,
            usage={"prompt_tokens": resp.usage.prompt_tokens, "completion_tokens": resp.usage.completion_tokens, "total_tokens": resp.usage.total_tokens},
            latency=resp.latency,
        )

    @router.post(
        "/explain",
        response_model=GenerateExplanationResponse,
        summary="M5 智能体：基于缺口事实生成诊断叙述",
    )
    async def generate_explanation(
        body: GenerateExplanationRequest,
        llm: Annotated[LLMClientPort, Depends(llm_client_provider)],
        rag: Annotated[RAGSearchPort, Depends(rag_search_provider)],
    ) -> GenerateExplanationResponse:
        # RAG 检索：为每个缺口检索相关材料原文
        rag_context: list[str] = []
        if body.rag_context:
            rag_context = body.rag_context
        else:
            for fact in body.gap_facts:
                query = f"{fact.get('name', '')} {fact.get('code', '')}"
                result = await rag.search(query, top_k=2)
                for chunk in result.chunks:
                    rag_context.append(f"[{chunk.source}] {chunk.text}")

        resp = await llm.generate_explanation(
            gap_facts=body.gap_facts,
            rag_context=rag_context,
        )
        return GenerateExplanationResponse(
            data=[
                {
                    "target_code": item.target_code,
                    "target_name": item.target_name,
                    "narrative": item.narrative,
                    "evidence_refs": item.evidence_refs,
                }
                for item in resp.data
            ],
            model=resp.model,
            usage={"prompt_tokens": resp.usage.prompt_tokens, "completion_tokens": resp.usage.completion_tokens, "total_tokens": resp.usage.total_tokens},
            latency=resp.latency,
        )

    @router.post(
        "/suggest",
        response_model=GenerateSuggestionsResponse,
        summary="M7 智能体：基于缺口数据生成改进建议",
    )
    async def generate_suggestions(
        body: GenerateSuggestionsRequest,
        llm: Annotated[LLMClientPort, Depends(llm_client_provider)],
    ) -> GenerateSuggestionsResponse:
        resp = await llm.generate_suggestions(gaps=body.gaps)
        return GenerateSuggestionsResponse(
            data=[
                {
                    "target_code": item.target_code,
                    "target_name": item.target_name,
                    "root_cause": item.root_cause,
                    "suggestion": item.suggestion,
                    "expected_effect": item.expected_effect,
                }
                for item in resp.data
            ],
            model=resp.model,
            usage={"prompt_tokens": resp.usage.prompt_tokens, "completion_tokens": resp.usage.completion_tokens, "total_tokens": resp.usage.total_tokens},
            latency=resp.latency,
        )

    @router.post(
        "/report",
        response_model=GenerateReportResponse,
        summary="M8 智能体：基于全图谱数据生成自评报告章节",
    )
    async def generate_report(
        body: GenerateReportRequest,
        llm: Annotated[LLMClientPort, Depends(llm_client_provider)],
    ) -> GenerateReportResponse:
        resp = await llm.generate_report(report_context=body.report_context)
        return GenerateReportResponse(
            data=[
                {
                    "requirement_code": item.requirement_code,
                    "chapter_title": item.chapter_title,
                    "standard_ref": item.standard_ref,
                    "narrative": item.narrative,
                }
                for item in resp.data
            ],
            model=resp.model,
            usage={"prompt_tokens": resp.usage.prompt_tokens, "completion_tokens": resp.usage.completion_tokens, "total_tokens": resp.usage.total_tokens},
            latency=resp.latency,
        )

    # ── RAG 检索接口 ────────────────────────────────────

    @router.post(
        "/rag/search",
        response_model=RAGSearchResponse,
        summary="RAG 向量检索：检索与 query 最相关的文本块",
    )
    async def rag_search(
        body: RAGSearchRequest,
        rag: Annotated[RAGSearchPort, Depends(rag_search_provider)],
    ) -> RAGSearchResponse:
        result = await rag.search(
            query=body.query,
            top_k=body.top_k,
            source_filter=body.source_filter,
        )
        return RAGSearchResponse(
            query=result.query,
            chunks=[
                RAGChunkResponse(
                    text=chunk.text,
                    source=chunk.source,
                    page=chunk.page,
                    score=chunk.score,
                )
                for chunk in result.chunks
            ],
        )

    return router
