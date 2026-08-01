import { LoadingOutlined } from '@ant-design/icons';
import { Tag } from 'antd';

import type { UploadedMaterialStatus } from '../model/uploadedMaterial';

const statusConfig: Record<
  UploadedMaterialStatus,
  { color: string; label: string }
> = {
  pending: { color: 'default', label: '待处理' },
  extracting: { color: 'processing', label: '提取中' },
  extracted: { color: 'success', label: '已提取' },
  failed: { color: 'error', label: '提取失败' },
};

export function MaterialStatusTag({
  status,
}: {
  status: UploadedMaterialStatus;
}) {
  const config = statusConfig[status];

  return (
    <Tag
      color={config.color}
      icon={status === 'extracting' ? <LoadingOutlined /> : undefined}
    >
      {config.label}
    </Tag>
  );
}
