import {
  CheckCircleFilled,
  ExclamationCircleFilled,
} from '@ant-design/icons';
import { Card, Empty, Tag, Typography } from 'antd';

import type { ImprovementCase } from '../../../entities/improvement-case';
import type { ImprovementClosureAssessment } from '../../../features/assess-improvement-closure';
import {
  ImprovementEffectivenessControls,
  type ImprovementEffectivenessDraft,
} from '../../../features/decide-improvement-effectiveness';

interface ImprovementClosurePanelProps {
  assessment: ImprovementClosureAssessment | null;
  draft: ImprovementEffectivenessDraft;
  improvementCase: ImprovementCase | null;
  onEffectivenessChange: (
    effectiveness: NonNullable<
      ImprovementEffectivenessDraft['effectiveness']
    >,
  ) => void;
  onNoteChange: (note: string) => void;
}

export function ImprovementClosurePanel({
  assessment,
  draft,
  improvementCase,
  onEffectivenessChange,
  onNoteChange,
}: ImprovementClosurePanelProps) {
  if (!improvementCase || !assessment) {
    return (
      <Card
        className="improvement-closure-panel"
        size="small"
        title="复评与关闭门槛"
      >
        <Empty
          description="请选择一项改进问题"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    );
  }

  const reevaluation = improvementCase.reevaluation;
  const delta = reevaluation
    ? reevaluation.result - improvementCase.baseline
    : undefined;
  const targetReached = reevaluation
    ? reevaluation.result >= reevaluation.target
    : false;

  return (
    <Card
      className="improvement-closure-panel"
      size="small"
      title="复评与关闭门槛"
    >
      <section className="improvement-reevaluation-strip">
        <div>
          <Typography.Text type="secondary">基线</Typography.Text>
          <Typography.Text strong>
            {improvementCase.baseline.toFixed(2)}
          </Typography.Text>
        </div>
        <div>
          <Typography.Text type="secondary">目标</Typography.Text>
          <Typography.Text strong>
            {reevaluation ? `≥ ${reevaluation.target.toFixed(2)}` : '—'}
          </Typography.Text>
        </div>
        <div>
          <Typography.Text type="secondary">复评</Typography.Text>
          <Typography.Text strong>
            {reevaluation ? reevaluation.result.toFixed(2) : '—'}
          </Typography.Text>
        </div>
        <div>
          <Typography.Text type="secondary">
            {delta === undefined
              ? '等待运行'
              : `Δ ${delta >= 0 ? '+' : ''}${delta.toFixed(2)}`}
          </Typography.Text>
          {reevaluation ? (
            <Tag color={targetReached ? 'success' : 'orange'}>
              {targetReached ? '已达到目标' : '未达到目标'}
            </Tag>
          ) : (
            <Tag>待复评</Tag>
          )}
        </div>
      </section>

      <section className="improvement-closure-gates">
        <Typography.Text strong>关闭门槛</Typography.Text>
        <div>
          {assessment.checks.map((check) => (
            <div key={check.id}>
              <span>
                {check.status === 'complete' ? (
                  <CheckCircleFilled className="improvement-gate--complete" />
                ) : (
                  <ExclamationCircleFilled className="improvement-gate--pending" />
                )}
                <Typography.Text>{check.label}</Typography.Text>
              </span>
              <Typography.Text type="secondary">
                {check.status === 'complete' ? '已完成' : '待完成'}
              </Typography.Text>
            </div>
          ))}
        </div>
      </section>

      <ImprovementEffectivenessControls
        canRequestClosure={assessment.canRequestClosure}
        draft={draft}
        improvementCase={improvementCase}
        onEffectivenessChange={onEffectivenessChange}
        onNoteChange={onNoteChange}
        requiresRevisedAction={assessment.requiresRevisedAction}
      />
    </Card>
  );
}
