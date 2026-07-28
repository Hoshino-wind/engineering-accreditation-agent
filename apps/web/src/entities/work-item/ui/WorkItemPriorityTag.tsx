import { Tag } from 'antd';

import type { WorkItemPriority } from '../model/workItem';

const priorityPresentation: Record<
  WorkItemPriority,
  { color: string; label: string }
> = {
  high: {
    color: 'red',
    label: '高',
  },
  medium: {
    color: 'gold',
    label: '中',
  },
};

interface WorkItemPriorityTagProps {
  priority: WorkItemPriority;
}

export function WorkItemPriorityTag({
  priority,
}: WorkItemPriorityTagProps) {
  const presentation = priorityPresentation[priority];

  return <Tag color={presentation.color}>{presentation.label}</Tag>;
}
