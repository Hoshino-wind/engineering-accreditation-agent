import { Tag } from 'antd';

import type { ImprovementCaseStatus } from '../model/improvementCase';

const statusView: Record<
  ImprovementCaseStatus,
  { color: string; label: string }
> = {
  'action-planned': { color: 'warning', label: '待审批' },
  'awaiting-decision': { color: 'warning', label: '待判效' },
  'awaiting-reevaluation': { color: 'warning', label: '等待复评' },
  closed: { color: 'success', label: '已关闭' },
  diagnosing: { color: 'default', label: '原因分析' },
  'in-progress': { color: 'processing', label: '执行中' },
};

interface ImprovementCaseStatusTagProps {
  status: ImprovementCaseStatus;
}

export function ImprovementCaseStatusTag({
  status,
}: ImprovementCaseStatusTagProps) {
  const view = statusView[status];

  return <Tag color={view.color}>{view.label}</Tag>;
}
