import { Badge, Empty, Flex, Skeleton, Tooltip, Typography } from 'antd';

import type { SystemComponentStatus } from '../model/systemStatus';
import { useSystemStatusQuery } from '../model/useSystemStatusQuery';
import './systemStatusList.css';

const statusPresentation = {
  operational: {
    badge: 'success',
    label: '正常',
  },
  configured: {
    badge: 'processing',
    label: '已配置',
  },
  not_configured: {
    badge: 'warning',
    label: '待配置',
  },
} as const;

export function SystemStatusList() {
  const query = useSystemStatusQuery();

  if (query.isPending) {
    return <Skeleton active paragraph={{ rows: 4 }} title={false} />;
  }

  if (query.isError) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="API 服务暂不可用"
      />
    );
  }

  return (
    <Flex className="system-status-list" vertical>
      {query.data.components.map((component: SystemComponentStatus) => {
        const presentation = statusPresentation[component.status];
        return (
          <Tooltip key={component.key} title={component.detail} placement="left">
            <div className="system-status-row">
              <Typography.Text>{component.name}</Typography.Text>
              <Badge status={presentation.badge} text={presentation.label} />
            </div>
          </Tooltip>
        );
      })}
    </Flex>
  );
}
