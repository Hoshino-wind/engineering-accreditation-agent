import { App, Button } from 'antd';
import { useNavigate } from 'react-router';

import type { SupportSourceModule } from '../../../entities/support-package';
import { useSupportBlockerTarget } from '../model/useSupportBlockerTarget';

interface SupportBlockerLinkProps {
  module: SupportSourceModule;
  sourceObjectId?: string;
}

export function SupportBlockerLink({
  module,
  sourceObjectId,
}: SupportBlockerLinkProps) {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const target = useSupportBlockerTarget(module, sourceObjectId);

  const targetRoute = target.route;
  if (!targetRoute) {
    return null;
  }

  return (
    <Button
      disabled={target.isLoading}
      loading={target.isLoading}
      onClick={() => {
        if (target.kind === 'not-found') {
          void message.info(
            '未找到该评价运行，已打开 M6 评价对象列表',
          );
        } else if (target.kind === 'service-unavailable') {
          void message.warning(
            '评价运行定位服务暂不可用，已打开 M6 评价对象列表',
          );
        } else if (target.kind === 'object-unavailable') {
          void message.warning(
            '对应评价对象尚未载入当前工作台，已打开 M6 评价对象列表',
          );
        }
        void navigate(targetRoute);
      }}
      size="small"
      type="link"
    >
      {target.isLoading || target.kind === 'exact' ? '返回' : '打开'}{' '}
      {module}
    </Button>
  );
}
