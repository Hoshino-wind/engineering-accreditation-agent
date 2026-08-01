# -*- coding: utf-8 -*-
"""Autopilot 请求/响应契约。"""
from __future__ import annotations

from pydantic import BaseModel


class AutopilotRunRequest(BaseModel):
    resource_id: str
    course: str | None = None


class AutopilotStepResult(BaseModel):
    step: str
    status: str  # success | failed | skipped
    latency_ms: int
    summary: str
    items_count: int = 0


class AutopilotNodeItem(BaseModel):
    code: str
    name: str
    kind: str
    confidence: float
    source_excerpt: str | None = None


class AutopilotRelationItem(BaseModel):
    source_id: str
    target_id: str
    relation_type: str
    strength: str
    confidence: float
    reasoning: str


class AutopilotFindingItem(BaseModel):
    target_code: str
    target_name: str
    narrative: str
    evidence_refs: list[str] | None = None


class AutopilotSuggestionItem(BaseModel):
    target_code: str
    target_name: str
    root_cause: str
    suggestion: str
    expected_effect: str


class AutopilotRunResponse(BaseModel):
    resource_id: str
    resource_name: str
    course: str
    model: str
    started_at: str
    finished_at: str
    total_latency_ms: int
    steps: list[AutopilotStepResult]
    nodes: list[AutopilotNodeItem]
    relations: list[AutopilotRelationItem]
    findings: list[AutopilotFindingItem]
    suggestions: list[AutopilotSuggestionItem]
    candidates_created: int
    findings_created: int
