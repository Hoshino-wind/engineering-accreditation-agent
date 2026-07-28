import { LockOutlined } from '@ant-design/icons';
import { Tag } from 'antd';

import type { TeachingResourceSensitivity } from '../model/teachingResource';

interface TeachingResourceSensitivityTagProps {
  sensitivity: TeachingResourceSensitivity;
}

export function TeachingResourceSensitivityTag({
  sensitivity,
}: TeachingResourceSensitivityTagProps) {
  if (sensitivity === 'restricted') {
    return (
      <Tag color="volcano" icon={<LockOutlined />}>
        受限
      </Tag>
    );
  }

  return <Tag>校内</Tag>;
}
