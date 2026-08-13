/**
 * 教学资源 API 客户端。
 *
 * 提供文件上传接口，将材料发送至后端 POST /resources/upload，
 * 后端不可用时返回 null，由前端降级为本地模拟。
 */

import { browserEnv } from '../config/env';
import { apiFetch } from './apiClient';

const API_BASE = browserEnv.VITE_API_BASE_URL || '';
const UPLOAD_ENDPOINT = `${API_BASE}/api/v1/resources/upload`;
const CLASSIFY_ENDPOINT = `${API_BASE}/api/v1/resources/classify`;
const HEALTH_ENDPOINT = `${API_BASE}/api/v1/resources/health`;
const HEALTH_ACTIONS_ENDPOINT = `${API_BASE}/api/v1/resources/health/actions`;
const HEALTH_ACTION_CONFIRM_ENDPOINT = `${HEALTH_ACTIONS_ENDPOINT}/confirm`;

// 7 类标准材料分类（与后端 MATERIAL_CATEGORIES 对齐）
export const MATERIAL_CATEGORY_OPTIONS = [
  '培养方案',
  '课程大纲',
  '实验指导书',
  '实验项目清单',
  '评分表',
  '学生报告',
  '评价结果',
  '其他',
] as const;

export type MaterialCategory = (typeof MATERIAL_CATEGORY_OPTIONS)[number];

// 评价证据类（本轮不进入节点提取主流水线）
const EVAL_EVIDENCE_CATEGORIES = new Set<MaterialCategory>([
  '评分表',
  '学生报告',
  '评价结果',
]);

export function isEvaluationEvidence(category: string): boolean {
  return EVAL_EVIDENCE_CATEGORIES.has(category as MaterialCategory);
}

// ── 类型（与后端 TeachingResourceResponse camelCase 对齐）──

export interface SuggestedCourse {
  name: string;
  code: string;
  credits?: number | null;
  description?: string | null;
  confidence: number;
  source_excerpt?: string | null;
}

export interface UploadResourceResponse {
  id: string;
  name: string;
  fileName: string;
  course: string;
  resourceType: string;
  version: string;
  versionGroupId: string;
  supersedesId?: string | null;
  isCurrentVersion: boolean;
  format: string;
  status: string;
  size: string;
  sensitivity: string;
  updatedAt: string;
  owner: string;
  hash: string;
  nextAction: string;
  sourceCoverage: number;
  evidenceFragments: unknown[];
  processingStages: { label: string; detail: string; status: string }[];
  pageCount?: number | null;
  failureReason?: string | null;
  suggestedCourse?: SuggestedCourse | null;
}

export interface ConfirmCoursePayload {
  name: string;
  code?: string | null;
  credits?: number | null;
  semester?: string | null;
  description?: string | null;
}

export interface ConfirmCourseResult {
  resourceId: string;
  courseId: string;
  courseName: string;
}

export interface MaterialHealth {
  healthScore: number;
  totalResources: number;
  readyCount: number;
  processingCount: number;
  failedCount: number;
  quarantinedCount: number;
  riskCount: number;
}

export interface MaterialHealthAction {
  riskCode: string;
  resourceId?: string | null;
  priority: 'high' | 'medium' | 'low';
  ownerRole: string;
  action: string;
  requiresHumanReview: boolean;
}

export interface ConfirmMaterialHealthActionResult {
  improvementId: string;
  created: boolean;
}

// ── 公开 API ────────────────────────────────────────────

/**
 * 拉取后端真实材料列表。
 * 后端不可用时返回 null，由前端降级为本地种子数据。
 *
 * @param course 可选课程名，传了就按课程过滤
 */
export async function fetchResources(
  course?: string | null,
): Promise<UploadResourceResponse[] | null> {
  try {
    const query = course ? `?course=${encodeURIComponent(course)}` : '';
    const resp = await apiFetch(`${API_BASE}/api/v1/resources${query}`, {
      method: 'GET',
      signal: AbortSignal.timeout(10_000),
    });
    if (!resp.ok) return null;
    return (await resp.json()) as UploadResourceResponse[];
  } catch {
    return null;
  }
}

export async function fetchMaterialHealth(): Promise<MaterialHealth | null> {
  try {
    const resp = await apiFetch(HEALTH_ENDPOINT, {
      method: 'GET',
      signal: AbortSignal.timeout(10_000),
    });
    if (!resp.ok) return null;
    return (await resp.json()) as MaterialHealth;
  } catch {
    return null;
  }
}

export async function fetchMaterialHealthActions(): Promise<
  MaterialHealthAction[] | null
> {
  try {
    const resp = await apiFetch(HEALTH_ACTIONS_ENDPOINT, {
      method: 'GET',
      signal: AbortSignal.timeout(10_000),
    });
    if (!resp.ok) return null;
    return (await resp.json()) as MaterialHealthAction[];
  } catch {
    return null;
  }
}

export async function confirmMaterialHealthAction(
  action: MaterialHealthAction,
): Promise<ConfirmMaterialHealthActionResult> {
  const resp = await apiFetch(HEALTH_ACTION_CONFIRM_ENDPOINT, {
    method: 'POST',
    body: JSON.stringify({
      riskCode: action.riskCode,
      resourceId: action.resourceId ?? null,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!resp.ok) {
    let detail = `确认处理失败 (${resp.status})`;
    try {
      const body = (await resp.json()) as { detail?: string };
      if (body.detail) detail = body.detail;
    } catch {
      // Ignore non-JSON error payloads.
    }
    throw new Error(detail);
  }
  return (await resp.json()) as ConfirmMaterialHealthActionResult;
}

/**
 * 上传教学资源文件。
 *
 * 失败时抛 UploadError，携带对用户友好的具体原因：
 *  - 401：登录已过期
 *  - 网络错误 / CORS / preflight 失败：后端不可达
 *  - 超时：上传超时
 *  - 其他 HTTP 错误：携带状态码与后端返回的 detail
 *
 * 上层应 try/catch 并以 message.error 展示原因，不再静默降级到本地数据。
 *
 * @param file     用户选择的文件
 * @param course   所属课程（可选，默认 "通用"）
 * @param category 材料分类（培养方案 / 课程大纲 / 实验指导书 / 试卷 / 其他）
 */
export class UploadError extends Error {
  constructor(
    message: string,
    readonly kind: 'unauthorized' | 'network' | 'timeout' | 'http' | 'unknown',
    readonly status?: number,
  ) {
    super(message);
    this.name = 'UploadError';
  }
}

export async function uploadResource(
  file: File,
  course: string,
  category: string,
): Promise<UploadResourceResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('course', course);
  formData.append('category', category);

  // 注意：FormData 不设置 Content-Type，由 apiFetch 交给浏览器自动补 boundary
  let resp: Response;
  try {
    resp = await apiFetch(UPLOAD_ENDPOINT, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(30_000),
    });
  } catch (err) {
    // 区分超时 vs 网络/CORS
    const isTimeout =
      err instanceof DOMException &&
      (err.name === 'TimeoutError' || err.name === 'AbortError');
    if (isTimeout) {
      throw new UploadError(
        '上传超时（30 秒），请检查文件大小或网络后重试',
        'timeout',
      );
    }
    throw new UploadError(
      '无法连接到后端服务，请确认 API 已启动（Network/CORS 错误）',
      'network',
    );
  }

  if (!resp.ok) {
    let detail = '';
    try {
      const body = (await resp.json()) as { detail?: unknown };
      detail = typeof body.detail === 'string' ? body.detail : '';
    } catch {
      // 非 JSON 响应体，忽略
    }
    if (resp.status === 401) {
      throw new UploadError(
        '登录已过期，请重新登录后再上传',
        'unauthorized',
        401,
      );
    }
    throw new UploadError(
      `上传失败：HTTP ${resp.status}${detail ? ` · ${detail}` : ''}`,
      'http',
      resp.status,
    );
  }

  return (await resp.json()) as UploadResourceResponse;
}

// ── 材料分类（上传前调用） ───────────────────────────────

export interface ClassifyResourceResponse {
  category: string;
  confidence: number;
  reason: string;
  isEvaluationEvidence: boolean;
  model: string;
  latencyMs: number;
}

export class ClassifyError extends Error {
  constructor(
    message: string,
    readonly kind: 'unauthorized' | 'network' | 'timeout' | 'http' | 'unknown',
    readonly status?: number,
  ) {
    super(message);
    this.name = 'ClassifyError';
  }
}

/**
 * 调用后端 LLM 预判材料类型。
 *
 * 失败时抛 ClassifyError；上层应捕获并降级为"其他 + 让老师手选"。
 */
export async function classifyMaterial(
  file: File,
): Promise<ClassifyResourceResponse> {
  const formData = new FormData();
  formData.append('file', file);

  // 注意：FormData 不设置 Content-Type，由 apiFetch 交给浏览器自动补 boundary
  let resp: Response;
  try {
    resp = await apiFetch(CLASSIFY_ENDPOINT, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(30_000),
    });
  } catch (err) {
    const isTimeout =
      err instanceof DOMException &&
      (err.name === 'TimeoutError' || err.name === 'AbortError');
    if (isTimeout) {
      throw new ClassifyError('识别超时，请改用手动选择', 'timeout');
    }
    throw new ClassifyError(
      '无法连接识别服务，请改用手动选择',
      'network',
    );
  }

  if (!resp.ok) {
    if (resp.status === 401) {
      throw new ClassifyError('登录已过期', 'unauthorized', 401);
    }
    let detail = '';
    try {
      const body = (await resp.json()) as { detail?: unknown };
      detail = typeof body.detail === 'string' ? body.detail : '';
    } catch {
      // 非 JSON 响应体
    }
    throw new ClassifyError(
      `识别失败：HTTP ${resp.status}${detail ? ` · ${detail}` : ''}`,
      'http',
      resp.status,
    );
  }

  return (await resp.json()) as ClassifyResourceResponse;
}

// ── 确认候选课程（创建课程 + 回写材料归属） ───────────────

export async function confirmSuggestedCourse(
  resourceId: string,
  payload: ConfirmCoursePayload,
): Promise<ConfirmCourseResult> {
  const resp = await apiFetch(
    `${API_BASE}/api/v1/resources/${encodeURIComponent(resourceId)}/confirm-course`,
    {
      method: 'POST',
      body: JSON.stringify({
        name: payload.name.trim(),
        ...(payload.code != null ? { code: payload.code } : {}),
        ...(payload.credits != null ? { credits: payload.credits } : {}),
        ...(payload.semester != null ? { semester: payload.semester } : {}),
        ...(payload.description != null ? { description: payload.description } : {}),
      }),
      signal: AbortSignal.timeout(15_000),
    },
  );
  if (!resp.ok) {
    let detail = `确认失败 (${resp.status})`;
    try {
      const err = (await resp.json()) as { detail?: string };
      if (err?.detail) detail = err.detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  return (await resp.json()) as ConfirmCourseResult;
}

// ── 删除教学资源 ───────────────────────────────────────────

export async function deleteResource(resourceId: string): Promise<void> {
  const resp = await apiFetch(
    `${API_BASE}/api/v1/resources/${encodeURIComponent(resourceId)}`,
    { method: 'DELETE', signal: AbortSignal.timeout(10_000) },
  );
  if (!resp.ok) {
    let detail = `删除失败 (${resp.status})`;
    try {
      const err = (await resp.json()) as { detail?: string };
      if (err?.detail) detail = err.detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
}

export async function clearResourcesScope(
  course?: string | null,
  clearGraph = true,
): Promise<void> {
  const params = new URLSearchParams();
  if (course) params.set('course', course);
  if (clearGraph) params.set('clearGraph', 'true');
  const query = params.toString();
  const resp = await apiFetch(`${API_BASE}/api/v1/resources${query ? `?${query}` : ''}`, {
    method: 'DELETE',
    signal: AbortSignal.timeout(15_000),
  });
  if (!resp.ok) {
    let detail = `清空失败 (${resp.status})`;
    try {
      const err = (await resp.json()) as { detail?: string };
      if (err?.detail) detail = err.detail;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
}

// ── 获取单个资源详情（轮询候选课程状态用） ─────────────────

export async function fetchResource(
  resourceId: string,
): Promise<UploadResourceResponse | null> {
  try {
    const resp = await apiFetch(
      `${API_BASE}/api/v1/resources/${encodeURIComponent(resourceId)}`,
      { method: 'GET', signal: AbortSignal.timeout(10_000) },
    );
    if (!resp.ok) return null;
    return (await resp.json()) as UploadResourceResponse;
  } catch {
    return null;
  }
}
