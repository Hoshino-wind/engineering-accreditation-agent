import { useEffect } from 'react';

import { getToken } from './authStore';

interface AuthGuardOptions {
  requireLogin: boolean;
}

const PUBLIC_PATHS = ['/login', '/register'];

export function useAuthGuard({ requireLogin }: AuthGuardOptions): void {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const currentPath = window.location.pathname;
    const isPublicPath = PUBLIC_PATHS.some(
      (p) => currentPath === p || currentPath.startsWith(p + '/'),
    );

    if (!requireLogin) return;
    if (isPublicPath) return;

    const token = getToken();
    if (!token) {
      const next = encodeURIComponent(
        window.location.pathname + window.location.search,
      );
      window.location.replace(`/login?next=${next}`);
    }
  }, [requireLogin]);
}
