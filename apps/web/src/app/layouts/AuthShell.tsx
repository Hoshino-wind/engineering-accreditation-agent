import type { ReactNode } from 'react';

import { useAuthGuard } from '../../shared/auth/useAuthCheck';
import { AppShell } from './AppShell';

interface AuthShellProps {
  children?: ReactNode;
}

export function AuthShell(props: AuthShellProps) {
  useAuthGuard({ requireLogin: true });
  return <AppShell>{props.children}</AppShell>;
}
