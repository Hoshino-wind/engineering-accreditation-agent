import { Tag } from 'antd';

import type { SupportPackageStatus } from '../model/supportPackage';

const statusView: Record<
  SupportPackageStatus,
  { color: string; label: string }
> = {
  approved: { color: 'success', label: '已批准' },
  'changes-required': { color: 'warning', label: '需修正' },
  draft: { color: 'default', label: '草稿' },
  exported: { color: 'success', label: '已导出' },
  'ready-for-review': { color: 'processing', label: '待复核' },
};

interface SupportPackageStatusTagProps {
  status: SupportPackageStatus;
}

export function SupportPackageStatusTag({
  status,
}: SupportPackageStatusTagProps) {
  const view = statusView[status];

  return <Tag color={view.color}>{view.label}</Tag>;
}
