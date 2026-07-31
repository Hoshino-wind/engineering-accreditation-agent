import {
  CheckCircleFilled,
  EyeOutlined,
  StopOutlined,
} from '@ant-design/icons';
import {
  Button,
  Card,
  Descriptions,
  Empty,
  Typography,
} from 'antd';

import type {
  AttainmentCalculation,
  AttainmentEvaluationItem,
  EvaluationReviewDecision,
} from '../../../entities/attainment-evaluation';
import {
  EvaluationReviewControls,
  type EvaluationReviewDraft,
} from '../../../features/review-attainment-result';

interface EvaluationConfigurationPanelProps {
  calculation: AttainmentCalculation | null;
  draft: EvaluationReviewDraft;
  evaluation: AttainmentEvaluationItem | null;
  onDecisionChange: (decision: EvaluationReviewDecision) => void;
  onInspectTrace: () => void;
  onNoteChange: (note: string) => void;
  onSubmit: () => void;
}

export function EvaluationConfigurationPanel({
  calculation,
  draft,
  evaluation,
  onDecisionChange,
  onInspectTrace,
  onNoteChange,
  onSubmit,
}: EvaluationConfigurationPanelProps) {
  if (!evaluation || !calculation) {
    return (
      <Card
        className="evaluation-configuration-panel"
        size="small"
        title="评价配置与确认"
      >
        <Empty
          description="请选择一项评价对象"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    );
  }

  return (
    <Card
      className="evaluation-configuration-panel"
      size="small"
      title="评价配置与确认"
    >
      <section className="evaluation-source-version">
        <Typography.Text strong>来源与版本</Typography.Text>
        <Descriptions
          bordered
          column={1}
          items={[
            {
              key: 'graph',
              label: '图谱版本',
              children: evaluation.graphVersion,
            },
            {
              key: 'policy',
              label: '策略版本',
              children: evaluation.policyVersion,
            },
            {
              key: 'snapshot',
              label: '评分快照',
              children: evaluation.scoreSnapshot,
            },
            {
              key: 'sample',
              label: '样本范围',
              children: `${evaluation.studentCount} 名学生`,
            },
          ]}
          size="small"
        />
      </section>

      <section className="evaluation-readiness">
        <Typography.Text strong>输入就绪检查</Typography.Text>
        <div className="evaluation-readiness-list">
          {evaluation.readinessChecks.map((check) => (
            <div key={check.id}>
              <div>
                {check.status === 'pass' ? (
                  <CheckCircleFilled className="evaluation-check--pass" />
                ) : (
                  <StopOutlined className="evaluation-check--blocked" />
                )}
                <Typography.Text>{check.label}</Typography.Text>
              </div>
              <Typography.Text type="secondary">
                {check.detail}
              </Typography.Text>
            </div>
          ))}
        </div>
        <Button
          block
          icon={<EyeOutlined />}
          onClick={onInspectTrace}
          size="small"
        >
          查看输入快照
        </Button>
      </section>

      <EvaluationReviewControls
        blockers={calculation.blockers}
        draft={draft}
        evaluation={evaluation}
        onDecisionChange={onDecisionChange}
        onNoteChange={onNoteChange}
        onSubmit={onSubmit}
      />
    </Card>
  );
}
