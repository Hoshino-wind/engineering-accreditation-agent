import { Tag } from 'antd';

import type { WorkItemStatus } from '../model/workItem';

const statusPresentation: Record<
  WorkItemStatus,
  { color: string; label: string }
> = {
  pending: {
    color: 'orange',
    label: '待处理',
  },
  processing: {
    color: 'blue',
    label: '处理中',
  },
  blocked: {
    color: 'red',
    label: '待补充',
  },
};

interface WorkItemStatusTagProps {
  status: WorkItemStatus;
}

export function WorkItemStatusTag({ status }: WorkItemStatusTagProps) {
  const presentation = statusPresentation[status];

  return <Tag color={presentation.color}>{presentation.label}</Tag>;
}
