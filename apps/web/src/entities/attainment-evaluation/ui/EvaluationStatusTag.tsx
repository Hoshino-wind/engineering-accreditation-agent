import { Tag } from 'antd';

import type { EvaluationItemStatus } from '../model/attainmentEvaluation';

const statusConfig: Record<
  EvaluationItemStatus,
  { color: string; label: string }
> = {
  'awaiting-review': {
    color: 'orange',
    label: '待复核',
  },
  approved: {
    color: 'green',
    label: '已批准',
  },
  blocked: {
    color: 'red',
    label: '已阻断',
  },
  'not-achieved': {
    color: 'red',
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
