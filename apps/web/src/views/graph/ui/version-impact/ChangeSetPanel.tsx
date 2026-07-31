import {
  DiffOutlined,
  LockOutlined,
} from '@ant-design/icons';
import { Card, Space, Tag, Typography } from 'antd';

import {
  isAbilityGraphChangeReviewed,
  type AbilityGraphChange,
  type AbilityGraphState,
} from '../../../../entities/ability-graph';
import { changeKindMeta } from './versionImpactMeta';

const { Text } = Typography;

interface ChangeSetPanelProps {
  changes: AbilityGraphChange[];
  graph: AbilityGraphState;
  isPublished: boolean;
  onSelectChange: (changeId: string) => void;
  reviewedCount: number;
  selectedChange?: AbilityGraphChange;
}

export function ChangeSetPanel({
  changes,
  graph,
  isPublished,
  onSelectChange,
  reviewedCount,
  selectedChange,
}: ChangeSetPanelProps) {
  return (
    <Card
      className="graph-workbench-panel graph-change-set"
      extra={
        isPublished ? (
          <Tag color="success">不可变</Tag>
        ) : (
          <Tag
            color={
              reviewedCount === changes.length ? 'success' : 'warning'
            }
          >
            {reviewedCount} / {changes.length} 已审核
          </Tag>
        )
      }
      size="small"
      title={isPublished ? '正式版本快照' : '草稿变更集'}
    >
      <div className="graph-version-route">
        <span>
          <Text type="secondary">
            {isPublished ? '当前快照' : '正式基线'}
          </Text>
          <Text strong>
            {isPublished
              ? graph.version.name
              : graph.version.baseVersion ?? '—'}
          </Text>
        </span>
        {isPublished ? <LockOutlined /> : <DiffOutlined />}
        <span>
          <Text type="secondary">
            {isPublished ? '发布状态' : '当前草稿'}
          </Text>
          <Text strong>{isPublished ? '已锁定' : graph.version.name}</Text>
        </span>
      </div>
      <Space className="graph-change-summary" size={4} wrap>
        {(['modified', 'added', 'removed'] as const).map((kind) => (
          <Tag color={changeKindMeta[kind].color} key={kind}>
            {changeKindMeta[kind].label}{' '}
            {changes.filter((change) => change.kind === kind).length}
          </Tag>
        ))}
      </Space>
      <div className="graph-change-list">
        {changes.length > 0 ? (
          changes.map((change) => {
            const reviewed = isAbilityGraphChangeReviewed(
              graph,
              change.id,
            );
            return (
              <button
                className={
                  change.id === selectedChange?.id
                    ? 'graph-change-row graph-change-row--selected'
                    : 'graph-change-row'
                }
                key={change.id}
                onClick={() => onSelectChange(change.id)}
                type="button"
              >
                <span>
                  <Tag color={changeKindMeta[change.kind].color}>
                    {changeKindMeta[change.kind].label}
                  </Tag>
                  <Text code>{change.code}</Text>
                </span>
                <Text strong>{change.label}</Text>
                <Text type="secondary">
                  {change.entityKind === 'node' ? '图谱对象' : '图谱关系'}
                  {' · '}
                  {change.changedFields.length} 个字段变化
                </Text>
                <Text
                  className={
                    reviewed
                      ? 'graph-change-review--done'
                      : 'graph-change-review--pending'
                  }
                >
                  {reviewed ? '已审核' : '待审核'}
                </Text>
              </button>
            );
          })
        ) : (
          <div className="graph-empty-state">
            {isPublished
              ? '当前正式快照没有未发布变更'
              : '当前草稿与正式基线无差异'}
          </div>
        )}
      </div>
    </Card>
  );
}
