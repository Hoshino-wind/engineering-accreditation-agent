import { useEffect } from 'react';

import { useMajorState } from './useMajorState';

/**
 * 路由守卫：如果用户尚未选择专业，则重定向到专业选择页。
 * 用于所有需要专业上下文的认证后页面。
 */
export function useMajorGuard(): void {
  const { isLoading, hasSelectedMajor } = useMajorState();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isLoading) return;

    if (!hasSelectedMajor) {
      const next = encodeURIComponent(
        window.location.pathname + window.location.search,
      );
      window.location.replace(`/select-major?next=${next}`);
    }
  }, [isLoading, hasSelectedMajor]);
}
