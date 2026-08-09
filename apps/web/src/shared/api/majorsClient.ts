/**
 * 专业 API 客户端。
 *
 * 提供专业列表查询、新建与删除，供顶栏与专业切换器使用。
 * 后端路由：
 *   GET    /api/v1/majors       查询专业列表
 *   POST   /api/v1/majors       新建专业
 *   DELETE /api/v1/majors/{id}  删除专业
 */

import { getToken } from '../auth/authStore';
import { browserEnv } from '../config/env';
import { apiFetch } from './apiClient';

const API_BASE = browserEnv.VITE_API_BASE_URL || '';
const MAJORS_ENDPOINT = `${API_BASE}/api/v1/majors`;

export interface MajorResponse {
  id: string;
  code: string;
  name: string;
  schoolName: string;
  standardVersion: string;
  description?: string | null;
}

/** 新建专业入参（对齐后端 CreateMajorRequest：name 必填，其余选填） */
export interface CreateMajorPayload {
  name: string;
  code?: string;
  schoolName?: string;
  description?: string;
}

export class MajorsApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'MajorsApiError';
  }
}

export async function fetchMajors(): Promise<MajorResponse[] | null> {
  const token = getToken();
  if (!token) return null;

  try {
    const resp = await apiFetch(MAJORS_ENDPOINT, {
      method: 'GET',
      skipMajorId: true, // 列出全部专业，不按专业隔离
    });
    if (!resp.ok) {
      if (resp.status === 401) {
        return null;
      }
      return null;
    }
    return (await resp.json()) as MajorResponse[];
  } catch {
    return null;
  }
}

export async function createMajor(
  payload: CreateMajorPayload,
): Promise<MajorResponse> {
  const token = getToken();
  if (!token) {
    throw new MajorsApiError(401, '请先登录');
  }

  const body: Record<string, unknown> = { name: payload.name.trim() };
  if (payload.code != null) body.code = payload.code;
  if (payload.schoolName != null) body.schoolName = payload.schoolName;
  if (payload.description != null) body.description = payload.description;

  const resp = await apiFetch(MAJORS_ENDPOINT, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    let detail = `请求失败 (${resp.status})`;
    try {
      const err = (await resp.json()) as { detail?: string };
      if (err?.detail) detail = err.detail;
    } catch {
      /* ignore */
    }
    throw new MajorsApiError(resp.status, detail);
  }
  return (await resp.json()) as MajorResponse;
}

export async function deleteMajor(majorId: string): Promise<void> {
  const token = getToken();
  if (!token) {
    throw new MajorsApiError(401, '请先登录');
  }

  const resp = await apiFetch(
    `${MAJORS_ENDPOINT}/${encodeURIComponent(majorId)}`,
    { method: 'DELETE' },
  );
  if (!resp.ok) {
    let detail = `删除失败 (${resp.status})`;
    try {
      const err = (await resp.json()) as { detail?: string };
      if (err?.detail) detail = err.detail;
    } catch {
      /* ignore */
    }
    throw new MajorsApiError(resp.status, detail);
  }
}
