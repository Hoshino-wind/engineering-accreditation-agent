/**
 * 课程 API 客户端。
 *
 * 后端路由：
 *   GET    /api/v1/courses       查询课程列表
 *   POST   /api/v1/courses       新建课程
 *   DELETE /api/v1/courses/{id}  删除课程
 */

import { getToken } from '../auth/authStore';
import { browserEnv } from '../config/env';
import { apiFetch } from './apiClient';

const API_BASE = browserEnv.VITE_API_BASE_URL || '';
const COURSES_ENDPOINT = `${API_BASE}/api/v1/courses`;

// 与后端 CourseResponse camelCase 对齐
export interface CourseResponse {
  id: string;
  code: string;
  name: string;
  credits?: number | null;
  semester?: string | null;
  majorId: string;
  description?: string | null;
  graphNodeId?: string | null;
}

export interface CreateCoursePayload {
  name: string;
  code?: string | null;
  credits?: number | null;
  semester?: string | null;
  description?: string | null;
  majorId?: string;
}

export class CoursesApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'CoursesApiError';
  }
}

async function _authorizedRequest(
  url: string,
  init: RequestInit,
): Promise<Response> {
  const token = getToken();
  if (!token) {
    throw new CoursesApiError(401, '请先登录');
  }
  // 统一走 apiFetch：自动注入 Authorization 与 X-Major-Id
  return apiFetch(url, init);
}

export async function fetchCourses(): Promise<CourseResponse[] | null> {
  try {
    const resp = await _authorizedRequest(COURSES_ENDPOINT, { method: 'GET' });
    if (!resp.ok) return null;
    return (await resp.json()) as CourseResponse[];
  } catch {
    return null;
  }
}

export async function createCourse(
  payload: CreateCoursePayload,
): Promise<CourseResponse> {
  const body: Record<string, unknown> = { name: payload.name.trim() };
  if (payload.code != null) body.code = payload.code;
  if (payload.credits != null) body.credits = payload.credits;
  if (payload.semester != null) body.semester = payload.semester;
  if (payload.description != null) body.description = payload.description;
  if (payload.majorId != null) body.majorId = payload.majorId;

  const resp = await _authorizedRequest(COURSES_ENDPOINT, {
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
    throw new CoursesApiError(resp.status, detail);
  }
  return (await resp.json()) as CourseResponse;
}

export async function deleteCourse(courseId: string): Promise<void> {
  const resp = await _authorizedRequest(
    `${COURSES_ENDPOINT}/${encodeURIComponent(courseId)}`,
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
    throw new CoursesApiError(resp.status, detail);
  }
}
