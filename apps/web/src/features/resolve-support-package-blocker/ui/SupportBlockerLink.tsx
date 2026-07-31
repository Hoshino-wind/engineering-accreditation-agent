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
  objectId?: string;
}

function resolveTargetRoute(
  module: SupportSourceModule,
  objectId?: string,
) {
  const targetRoute = moduleRoutes[module];

  // M6 当前保存的是运行 ID，尚不能安全映射到评价对象；先只为 ID 已对齐的 M7 建立深链。
  if (module !== 'M7' || !objectId?.trim()) {
    return targetRoute;
  }

  const searchParams = new URLSearchParams({
    case: objectId.trim(),
  });
  return `${targetRoute}?${searchParams.toString()}`;
}

export function SupportBlockerLink({
  module,
  objectId,
}: SupportBlockerLinkProps) {
  const navigate = useNavigate();
  const targetRoute = resolveTargetRoute(module, objectId);

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
