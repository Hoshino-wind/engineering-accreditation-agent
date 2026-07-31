import { CheckCircleOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Space,
  Tag,
  Typography,
} from 'antd';

import {
  isAbilityGraphChangeReviewed,
  type AbilityGraphChange,
  type AbilityGraphState,
} from '../../../../entities/ability-graph';
import { changeKindMeta } from './versionImpactMeta';

const { Text } = Typography;

interface ChangeDetailPanelProps {
  graph: AbilityGraphState;
  isPersisting: boolean;
  isPublished: boolean;
  onApproveChange: (changeId: string) => void;
  selectedChange?: AbilityGraphChange;
}

export function ChangeDetailPanel({
  graph,
  isPersisting,
  isPublished,
  onApproveChange,
  selectedChange,
}: ChangeDetailPanelProps) {
  return (
    <Card
      className="graph-workbench-panel graph-change-detail"
      extra={
        selectedChange ? (
          <Tag color={changeKindMeta[selectedChange.kind].color}>
            {changeKindMeta[selectedChange.kind].label}
          </Tag>
        ) : null
      }
      size="small"
      title="变更详情与审核"
    >
      {selectedChange ? (
        <Space orientation="vertical" size={12}>
          <div>
            <Text code>{selectedChange.code}</Text>
            <Text className="graph-change-title" strong>
              {selectedChange.label}
            </Text>
          </div>
          <Descriptions
            column={1}
            items={[
              {
                key: 'before',
                label: '变更前',
                children: selectedChange.beforeSummary,
              },
              {
                key: 'after',
                label: '变更后',
                children: selectedChange.afterSummary,
              },
            ]}
            size="small"
          />
          <div className="graph-field-diff-list">
            {selectedChange.changedFields.map((field) => (
              <div className="graph-field-diff" key={field.field}>
                <Text strong>{field.label}</Text>
                <span>
                  <Text delete type="secondary">
                    {field.before}
                  </Text>
                  <Text>{field.after}</Text>
                </span>
              </div>
            ))}
          </div>
          <Alert
            description="审核只确认本项差异，不会自动批准其他对象，也不会替代下游影响处置。"
            showIcon
            title="逐项审核"
            type="info"
          />
          <Button
            block
            disabled={
              isPersisting ||
              isAbilityGraphChangeReviewed(graph, selectedChange.id)
            }
            icon={<CheckCircleOutlined />}
            loading={isPersisting}
            onClick={() => onApproveChange(selectedChange.id)}
            type="primary"
          >
            {isAbilityGraphChangeReviewed(graph, selectedChange.id)
              ? '本项已审核'
              : '确认本项变更'}
          </Button>
        </Space>
      ) : (
        <div className="graph-empty-state">
          {isPublished
            ? '正式快照已锁定；创建修订后可在此查看字段差异'
            : '选择一项变更查看字段差异'}
        </div>
      )}
    </Card>
  );
}
