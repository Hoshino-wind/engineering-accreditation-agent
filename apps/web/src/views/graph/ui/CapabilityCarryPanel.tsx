import {
  ArrowRightOutlined,
  CheckCircleOutlined,
  ExperimentOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { Button, Space, Tag, Typography } from 'antd';

import {
  abilityGraphCapabilityLevelLabels,
  type AbilityGraphCapabilityProfile,
} from '../../../entities/ability-graph';
import { capabilityStatusMeta } from './capabilityStructureMeta';

const { Paragraph, Text, Title } = Typography;

interface CapabilityCarryPanelProps {
  onInspectCourseOutcome: (courseOutcomeId: string) => void;
  profile: AbilityGraphCapabilityProfile;
}

export function CapabilityCarryPanel({
  onInspectCourseOutcome,
  profile,
}: CapabilityCarryPanelProps) {
  const capability = profile.capability;
  const semantics = capability.capability;
  const statusMeta = capabilityStatusMeta[profile.status];

  return (
    <main className="capability-carry-panel">
      <div className="capability-section-heading">
        <span>2</span>
        <div>
          <Text strong>培养承载</Text>
          <Text type="secondary">课程目标、实验与行为映射</Text>
        </div>
      </div>

      <div className="capability-definition">
        <div className="capability-definition-title">
          <div>
            <Space size={6} wrap>
              <code>{capability.code}</code>
              {semantics ? (
                <>
                  <Tag color="blue">{semantics.domain}</Tag>
                  <Tag>
                    {
                      abilityGraphCapabilityLevelLabels[
                        semantics.cognitiveLevel
                      ]
                    }
                  </Tag>
                </>
              ) : null}
            </Space>
            <Title level={4}>{capability.name}</Title>
          </div>
          <Tag color={statusMeta.color}>{statusMeta.label}</Tag>
        </div>
        <Paragraph>{capability.definition}</Paragraph>
        <div className="capability-behavior-list">
          <Text strong>可观察行为</Text>
          {semantics?.observableBehaviors.map((behavior) => {
            const mapped = profile.mappedBehaviors.includes(behavior);
            return (
              <div
                className={`capability-behavior${
                  mapped ? ' capability-behavior--mapped' : ''
                }`}
                key={behavior}
              >
                {mapped ? (
                  <CheckCircleOutlined />
                ) : (
                  <WarningOutlined />
                )}
                <span>{behavior}</span>
                <Text type="secondary">
                  {mapped ? '已映射' : '待映射'}
                </Text>
              </div>
            );
          }) ?? <Text type="secondary">尚未定义可观察行为</Text>}
        </div>
      </div>

      <div className="capability-path-list">
        {profile.paths.map((path) => {
          const pathMeta = capabilityStatusMeta[path.status];
          return (
            <article
              className="capability-path-row"
              key={path.supportEdge.id}
            >
              <div className="capability-path-main">
                <div className="capability-path-title">
                  <span>
                    <code>{path.courseOutcome.code}</code>
                    <Text type="secondary">
                      支撑 {path.performanceIndicator.code}
                    </Text>
                  </span>
                  <Tag color={pathMeta.color}>{pathMeta.label}</Tag>
                </div>
                <Text strong>{path.courseOutcome.name}</Text>
                <Text type="secondary">
                  {path.supportEdge.capabilityMapping?.rationale ??
                    '尚未说明该课程目标如何承载产出能力。'}
                </Text>
                <span
                  className="capability-path-behaviors"
                  title={path.mappedBehaviors.join('、')}
                >
                  {path.mappedBehaviors.length} /{' '}
                  {semantics?.observableBehaviors.length ?? 0} 项行为已覆盖
                </span>
              </div>
              <div className="capability-path-activity">
                <ExperimentOutlined />
                <span>
                  <Text strong>实验活动</Text>
                  <Text type="secondary">
                    {path.experiments.map((item) => item.name).join('、') ||
                      '尚未配置'}
                  </Text>
                </span>
                <Button
                  icon={<ArrowRightOutlined />}
                  iconPlacement="end"
                  onClick={() =>
                    onInspectCourseOutcome(path.courseOutcome.id)
                  }
                  size="small"
                  type="link"
                >
                  查看完整路径
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    </main>
  );
}
