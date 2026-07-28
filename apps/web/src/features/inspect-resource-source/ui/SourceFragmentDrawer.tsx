import {
  FileSearchOutlined,
  LockOutlined,
  NumberOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Descriptions,
  Drawer,
  Empty,
  Space,
  Tag,
  Typography,
} from 'antd';

import type { TeachingResource } from '../../../entities/teaching-resource';

import './sourceFragmentDrawer.css';

interface SourceFragmentDrawerProps {
  onClose: () => void;
  open: boolean;
  resource: TeachingResource | null;
}

export function SourceFragmentDrawer({
  onClose,
  open,
  resource,
}: SourceFragmentDrawerProps) {
  return (
    <Drawer
      destroyOnHidden
      onClose={onClose}
      open={open}
      size={640}
      title={
        <Space>
          <FileSearchOutlined />
          <span>来源片段</span>
        </Space>
      }
    >
      {resource ? (
        <div className="source-fragment-drawer">
          <Descriptions
            column={1}
            items={[
              { key: 'name', label: '材料', children: resource.name },
              {
                key: 'version',
                label: '版本',
                children: `${resource.version} · ${resource.hash}`,
              },
              {
                key: 'access',
                label: '访问范围',
                children:
                  resource.sensitivity === 'restricted'
                    ? '受限访问 · 仅展示脱敏片段'
                    : '校内成员可查看',
              },
            ]}
            size="small"
          />

          {resource.sensitivity === 'restricted' ? (
            <Alert
              icon={<LockOutlined />}
              showIcon
              title="当前为受控文本视图，原始文件内容不会发送给外部模型。"
              type="warning"
            />
          ) : null}

          {resource.evidenceFragments.length > 0 ? (
            <div className="source-fragment-list">
              <Typography.Text strong>
                已定位 {resource.evidenceFragments.length} 个示例片段
              </Typography.Text>
              {resource.evidenceFragments.map((fragment) => (
                <article className="source-fragment-item" key={fragment.id}>
                  <NumberOutlined />
                  <div>
                    <Space>
                      <Tag color="blue">{fragment.type}</Tag>
                      <Typography.Text>{fragment.coordinate}</Typography.Text>
                    </Space>
                    <Typography.Paragraph>
                      {fragment.preview}
                    </Typography.Paragraph>
                    <Typography.Text type="secondary">
                      内容哈希 {fragment.hash}
                    </Typography.Text>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <Empty
              description="当前材料尚未生成可引用的来源片段"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )}
        </div>
      ) : null}
    </Drawer>
  );
}
