import { clearAuth, getToken } from '../auth/authStore';
import { browserEnv } from '../config/env';

export async function requestJson<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  const token = getToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${browserEnv.VITE_API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearAuth();
    const next = encodeURIComponent(
      window.location.pathname + window.location.search,
    );
    window.location.replace(`/login?next=${next}`);
  }

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = (await response.json()) as { detail?: string };
      detail = body.detail ?? detail;
    } catch {
      // Ignore non-JSON error payloads.
    }
    throw new Error(detail || 'Request failed');
  }

  return (await response.json()) as T;
}

