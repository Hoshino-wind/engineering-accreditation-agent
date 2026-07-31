import { Tag } from 'antd';

import type { TeachingResourceStatus } from '../model/teachingResource';

const statusPresentation: Record<
  TeachingResourceStatus,
  { color: string; label: string }
> = {
  ready: { color: 'success', label: '可用' },
  processing: { color: 'processing', label: '处理中' },
  awaitingClassification: { color: 'warning', label: '待分类' },
  failed: { color: 'error', label: '解析失败' },
  quarantined: { color: 'error', label: '已隔离' },
};

interface TeachingResourceStatusTagProps {
  status: TeachingResourceStatus;
}

export function TeachingResourceStatusTag({
  status,
}: TeachingResourceStatusTagProps) {
  const presentation = statusPresentation[status];

  return <Tag color={presentation.color}>{presentation.label}</Tag>;
}
