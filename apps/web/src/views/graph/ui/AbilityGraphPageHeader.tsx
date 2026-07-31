import {
  EditOutlined,
  NodeIndexOutlined,
  PlusOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { Button, Space, Tag, Typography } from 'antd';

import type { AbilityGraphState } from '../../../entities/ability-graph';
import type { AbilityGraphView } from '../model/abilityGraphPageModel';

const { Title } = Typography;

interface AbilityGraphPageHeaderProps {
  activeView: AbilityGraphView;
  graph: AbilityGraphState;
  isLoading: boolean;
  isSaving: boolean;
  onOpenEdgeModal: () => void;
  onOpenNodeModal: () => void;
  onOpenPublish: () => void;
  onStartGraphRevision: () => void;
  persistenceError: unknown;
  revision?: number;
  updatedBy?: string;
}

export function AbilityGraphPageHeader({
  activeView,
  graph,
  isLoading,
  isSaving,
  onOpenEdgeModal,
  onOpenNodeModal,
  onOpenPublish,
  onStartGraphRevision,
  persistenceError,
  revision,
  updatedBy,
}: AbilityGraphPageHeaderProps) {
  return (
    <div className="ability-graph-page-header">
      <div>
        <Space align="center" size={10}>
          <Title level={2}>能力形成与评价图谱</Title>
          <Tag color="blue">正式事实</Tag>
          <Tag
            color={
              graph.version.status === 'published' ? 'success' : 'warning'
            }
          >
            {graph.version.name}{' '}
            {graph.version.status === 'published'
              ? '已发布'
              : `草稿 · 基于 ${graph.version.baseVersion ?? '新建'}`}
          </Tag>
          <Tag
            color={
              persistenceError
                ? 'error'
                : isLoading || isSaving
                  ? 'processing'
                  : 'success'
            }
          >
            {persistenceError
              ? '服务端连接异常'
              : isLoading
                ? '正在连接服务端'
                : isSaving
                  ? '服务端保存中'
                  : `服务端修订 r${revision ?? '—'} · ${updatedBy ?? '—'}`}
          </Tag>
        </Space>
      </div>
      <Space>
        {graph.version.status === 'published' ? (
          <Button
            disabled={isSaving}
            icon={<EditOutlined />}
            loading={isSaving}
            onClick={onStartGraphRevision}
            type="primary"
          >
            创建图谱修订
          </Button>
        ) : (
          <>
            <Button
              disabled={isLoading}
              icon={<SafetyCertificateOutlined />}
              onClick={onOpenPublish}
              type="primary"
            >
              检查并发布
            </Button>
            <Button
              disabled={isLoading || isSaving}
              icon={<NodeIndexOutlined />}
              onClick={onOpenNodeModal}
            >
              新建对象
            </Button>
            <Button
              disabled={isLoading || isSaving}
              icon={<PlusOutlined />}
              onClick={onOpenEdgeModal}
            >
              新建关系
            </Button>
          </>
        )}
        {graph.version.status === 'published' ? (
          <Button
            disabled={isLoading}
            icon={<SafetyCertificateOutlined />}
            onClick={onOpenPublish}
            type={activeView === 'publish' ? 'primary' : 'default'}
          >
            查看版本快照
          </Button>
        ) : null}
      </Space>
    </div>
  );
}
