import { Tag } from 'antd';

import type { WorkflowEventStatus } from '../model/workflowEvent';

const statusPresentation: Record<
  WorkflowEventStatus,
  { color: string; label: string }
> = {
  success: { color: 'success', label: '成功' },
  blocked: { color: 'error', label: '阻断' },
  warning: { color: 'warning', label: '警告' },
  pending: { color: 'processing', label: '处理中' },
};

interface WorkflowEventStatusTagProps {
  status: WorkflowEventStatus;
}

export function WorkflowEventStatusTag({
  status,
}: WorkflowEventStatusTagProps) {
  const presentation = statusPresentation[status];

  return (
    <Tag color={presentation.color}>{presentation.label}</Tag>
  );
}
