/**
 * Pipeline 全局进度 API 客户端。
 *
 * 供前端进度条、引导组件、Overview 动态指引消费。
 * trea 可直接 import { fetchPipelineStatus, PipelineStatus } 使用。
 */

import { browserEnv } from '../config/env';
import { apiFetch } from './apiClient';

const API_BASE = browserEnv.VITE_API_BASE_URL || '';
const STATUS_ENDPOINT = `${API_BASE}/api/v1/pipeline/status`;

// ── 类型 ────────────────────────────────────────────────

export type PipelineStage =
  | 'idle'
  | 'uploading'
  | 'extracting'
  | 'reviewing'
  | 'diagnosing'
  | 'done';

export interface PipelineStatus {
  stage: PipelineStage;
  progress: number; // 0-1
  message: string;
  pendingReviewCount: number;
  /** 其中属于智能体运行推断边的待审核数（审核入口在智能体控制台） */
  pendingRunReviewCount: number;
  gapCount: number;
  suggestionCount: number;
  lastUpdated: string;
}

// ── 工具函数 ────────────────────────────────────────────

const STAGE_ORDER: PipelineStage[] = [
  'idle',
  'uploading',
  'extracting',
  'reviewing',
  'diagnosing',
  'done',
];

/** 将 stage 映射为数字索引（0=idle, 1=uploading, ..., 5=done），供进度条渲染。 */
export function getStageIndex(stage: PipelineStage): number {
  return STAGE_ORDER.indexOf(stage);
}

// ── 请求辅助 ────────────────────────────────────────────

// 鉴权与 X-Major-Id 注入统一由 apiFetch 负责

// ── 公开 API ────────────────────────────────────────────

/**
 * 获取 Pipeline 全局进度。
 * 后端不可用时返回 null，前端可降级为静态指引。
 */
export async function fetchPipelineStatus(): Promise<PipelineStatus | null> {
  try {
    const resp = await apiFetch(STATUS_ENDPOINT, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!resp.ok) return null;
    return (await resp.json()) as PipelineStatus;
  } catch {
    return null;
  }
}
