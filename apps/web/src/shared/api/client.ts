import type { paths } from '@engineering-accreditation/api-client';
import createClient from 'openapi-fetch';

import { clearAuth, getToken } from '../auth/authStore';
import { browserEnv } from '../config/env';

export const apiClient = createClient<paths>({
  baseUrl: browserEnv.VITE_API_BASE_URL,
  fetch: (request: Request) => {
    const headers = new Headers(request.headers);
    const token = getToken();
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    const newRequest = new Request(request, { headers });

    return fetch(newRequest).then((response) => {
      if (response.status === 401) {
        clearAuth();
        if (typeof window !== 'undefined') {
          const next = encodeURIComponent(
            window.location.pathname + window.location.search,
          );
          window.location.replace(`/login?next=${next}`);
        }
      }
      return response;
    });
  },
});
