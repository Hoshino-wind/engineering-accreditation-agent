import { Tag } from 'antd';

import type { EvaluationItemStatus } from '../model/attainmentEvaluation';

const statusConfig: Record<
  EvaluationItemStatus,
  { color: string; label: string }
> = {
  'awaiting-review': {
    color: 'warning',
    label: '待复核',
  },
  approved: {
    color: 'success',
    label: '已批准',
  },
  blocked: {
    color: 'error',
    label: '已阻断',
  },
  'not-achieved': {
    color: 'error',
    label: '未达标',
  },
};

interface EvaluationStatusTagProps {
  status: EvaluationItemStatus;
}

export function EvaluationStatusTag({
  status,
}: EvaluationStatusTagProps) {
  const config = statusConfig[status];

  return <Tag color={config.color}>{config.label}</Tag>;
}
