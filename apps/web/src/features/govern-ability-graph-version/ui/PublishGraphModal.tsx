import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  LockOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { Alert, Modal, Tag, Typography } from 'antd';

import {
  canPublishAbilityGraph,
  type AbilityGraphPublishCheck,
  type AbilityGraphState,
} from '../../../entities/ability-graph';

import './publishGraphModal.css';

const { Text } = Typography;

export interface PublishGraphModalProps {
  graph: AbilityGraphState;
  hardBlockingChecks: AbilityGraphPublishCheck[];
  isSubmitting: boolean;
  onCancel: () => void;
  onSubmit: () => void | Promise<void>;
  open: boolean;
  publishChecks: AbilityGraphPublishCheck[];
}

function PublishCheckIcon({
  status,
}: {
  status: AbilityGraphPublishCheck['status'];
}) {
  if (status === 'pass') {
    return <CheckCircleOutlined className="graph-check-icon--pass" />;
  }
  if (status === 'blocked') {
    return <CloseCircleOutlined className="graph-check-icon--blocked" />;
  }
  return <WarningOutlined className="graph-check-icon--warning" />;
}

export function PublishGraphModal({
  graph,
  hardBlockingChecks,
  isSubmitting,
  onCancel,
  onSubmit,
  open,
  publishChecks,
}: PublishGraphModalProps) {
  return (
    <Modal
      cancelText={
        graph.version.status === 'published' ? '关闭' : '返回修正'
      }
      confirmLoading={isSubmitting}
      destroyOnHidden
      okButtonProps={{
        disabled:
          !canPublishAbilityGraph(publishChecks) ||
          graph.version.status === 'published' ||
          isSubmitting,
      }}
      okText={
        graph.version.status === 'published'
          ? '已发布'
          : hardBlockingChecks.length > 0
            ? '仍有发布阻断'
            : '发布不可变快照'
      }
      onCancel={onCancel}
      onOk={onSubmit}
      open={open}
      title={`最终发布确认 · ${graph.version.name}`}
      width={680}
    >
      <div className="graph-publish-modal-list">
        {publishChecks.map((check) => (
          <div className="graph-publish-check" key={check.id}>
            <PublishCheckIcon status={check.status} />
            <span>
              <Text strong>{check.label}</Text>
              <Text type="secondary">{check.detail}</Text>
            </span>
            <Tag
              color={
                check.status === 'pass'
                  ? 'success'
                  : check.status === 'warning'
                    ? 'warning'
                    : 'error'
              }
            >
              {check.status === 'pass'
                ? '通过'
                : check.status === 'warning'
                  ? '提示'
                  : '阻断'}
            </Tag>
          </div>
        ))}
      </div>
      <Alert
        description="发布后形成不可变图谱快照；后续修改必须创建新的对象或关系版本。"
        icon={<LockOutlined />}
        showIcon
        type="info"
      />
    </Modal>
  );
}
