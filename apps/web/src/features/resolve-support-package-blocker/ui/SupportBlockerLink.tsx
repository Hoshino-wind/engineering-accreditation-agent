import { Button } from 'antd';
import { useNavigate } from 'react-router';

import type { SupportSourceModule } from '../../../entities/support-package';

const moduleRoutes: Partial<Record<SupportSourceModule, string>> = {
  M2: '/graph',
  M3: '/resources',
  M5: '/diagnostics',
  M6: '/evaluations',
  M7: '/improvements',
};

interface SupportBlockerLinkProps {
  module: SupportSourceModule;
}

export function SupportBlockerLink({
  module,
}: SupportBlockerLinkProps) {
  const navigate = useNavigate();
  const targetRoute = moduleRoutes[module];

  if (!targetRoute) {
    return null;
  }

  return (
    <Button
      onClick={() => navigate(targetRoute)}
      size="small"
      type="link"
    >
      返回 {module}
    </Button>
  );
}
