import type { ReactNode } from 'react';

import { useAuthGuard } from '../../shared/auth/useAuthCheck';
import { useMajorGuard } from '../../shared/major/useMajorGuard';
import { AppShell } from './AppShell';

interface AuthShellProps {
  children?: ReactNode;
}

export function AuthShell(props: AuthShellProps) {
  useAuthGuard({ requireLogin: true });
  useMajorGuard();
  return <AppShell>{props.children}</AppShell>;
}
