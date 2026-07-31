import { Tag } from 'antd';

import type {
  CourseOutcomeAlignment,
} from '../../../entities/ability-graph';

export function GraphStatusTag({
  status,
}: {
  status: CourseOutcomeAlignment['status'];
}) {
  if (status === 'ready') {
    return <Tag color="success">结构就绪</Tag>;
  }
  if (status === 'review') {
    return <Tag color="warning">待审核</Tag>;
  }
  return <Tag color="error">存在断点</Tag>;
}
