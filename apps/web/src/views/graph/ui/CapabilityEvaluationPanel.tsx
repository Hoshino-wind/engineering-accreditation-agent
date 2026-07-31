import {
  AuditOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { Button, Progress, Tag, Typography } from 'antd';

import { type AbilityGraphCapabilityProfile } from '../../../entities/ability-graph';

const { Text } = Typography;

interface CapabilityEvaluationPanelProps {
  onInspectEvaluationStructure: (courseOutcomeId: string) => void;
  profile: AbilityGraphCapabilityProfile;
}

export function CapabilityEvaluationPanel({
  onInspectEvaluationStructure,
  profile,
}: CapabilityEvaluationPanelProps) {
  const totalPaths = profile.paths.length;
  const closurePercent =
    totalPaths === 0
      ? 0
      : Math.round((profile.closedLoopCount / totalPaths) * 100);

  return (
    <aside className="capability-evaluation-panel">
      <div className="capability-section-heading">
        <span>3</span>
        <div>
          <Text strong>评价结构</Text>
          <Text type="secondary">评分项评价什么、归集到哪里</Text>
        </div>
      </div>
      <div className="capability-evaluation-progress">
        <div>
          <Text strong>直接评价闭环率</Text>
          <Text type="secondary">
            {profile.closedLoopCount} / {totalPaths} 个课程目标
          </Text>
        </div>
        <Progress
          percent={closurePercent}
          showInfo={false}
          size="small"
          status={closurePercent === 100 ? 'success' : 'normal'}
        />
      </div>
      <div className="capability-evaluation-list">
        {profile.paths.map((path) => (
            <article
              className={`capability-evaluation-item${
                path.assessmentMapped
                  ? ' capability-evaluation-item--ready'
                  : ''
              }`}
              key={path.courseOutcome.id}
            >
              <div className="capability-evaluation-title">
                <span>
                  {path.assessmentMapped ? (
                    <CheckCircleOutlined />
                  ) : (
                    <AuditOutlined />
                  )}
                  <Text strong>{path.courseOutcome.code}</Text>
                </span>
                <Tag color={path.assessmentMapped ? 'success' : 'error'}>
                  {path.assessmentMapped ? '结构完整' : '评价断点'}
                </Tag>
              </div>
              <Text type="secondary">
                {path.directCriteria.map((item) => item.name).join('、') ||
                  '缺少可分离评分项'}
              </Text>
              {!path.assessmentMapped ? (
                <Text className="capability-evaluation-gap">
                  同时补齐 ASSESSES 与 CONTRIBUTES_TO 关系
                </Text>
              ) : null}
              <Button
                onClick={() =>
                  onInspectEvaluationStructure(path.courseOutcome.id)
                }
                size="small"
                type="link"
              >
                查看评价结构
              </Button>
            </article>
          ))}
      </div>
    </aside>
  );
}
