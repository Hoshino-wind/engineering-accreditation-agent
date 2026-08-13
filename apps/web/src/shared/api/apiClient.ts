/**
 * 全局 API 请求封装。
 *
 * 统一注入：
 *   - Authorization: Bearer <token>      （来自 authStore）
 *   - X-Major-Id: <selectedMajorId>      （来自 majorStore，实现多专业隔离）
 *
 * 所有业务 API 客户端应优先使用 apiFetch，而非直接调用 fetch，
 * 这样切换专业后后续请求会自动带上新的 X-Major-Id。
 *
 * skipMajorId：少数请求本身不按专业隔离（如 GET /majors 列出全部专业），
 * 传入 true 可跳过 X-Major-Id 注入。
 */

import { clearAuth, getToken } from '../auth/authStore';
import { getSelectedMajorId } from '../major/majorStore';

export interface ApiRequestOptions extends RequestInit {
  /** 某些请求不需要 major_id（如 GET /majors 本身），传 true 跳过注入 */
  skipMajorId?: boolean;
}

export async function apiFetch(
  url: string,
  options: ApiRequestOptions = {},
): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    // 有 body 且非 FormData 时默认按 JSON 处理；
    // FormData 必须交给浏览器自动补带 boundary 的 Content-Type
    ...(options.body && !(options.body instanceof FormData)
      ? { 'Content-Type': 'application/json' }
      : {}),
    ...((options.headers as Record<string, string> | undefined) ?? {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!options.skipMajorId) {
    const majorId = getSelectedMajorId();
    if (majorId) headers['X-Major-Id'] = majorId;
  }
  const response = await fetch(url, { ...options, headers });
  if (response.status === 401) {
    clearAuth();
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      const next = encodeURIComponent(
        window.location.pathname + window.location.search,
      );
      window.location.replace(`/login?next=${next}`);
    }
  }
  return response;
}
