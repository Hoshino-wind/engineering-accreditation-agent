import { Alert, Button, Input, Radio, Typography } from 'antd';

import type {
  AttainmentEvaluationItem,
  EvaluationReviewDecision,
} from '../../../entities/attainment-evaluation';
import type { EvaluationReviewDraft } from '../model/useEvaluationReviewDrafts';

import './evaluationReviewControls.css';

const { TextArea } = Input;

interface EvaluationReviewControlsProps {
  blockers: string[];
  draft: EvaluationReviewDraft;
  evaluation: AttainmentEvaluationItem;
  onDecisionChange: (decision: EvaluationReviewDecision) => void;
  onNoteChange: (note: string) => void;
  onSubmit: () => void;
}

export function EvaluationReviewControls({
  blockers,
  draft,
  evaluation,
  onDecisionChange,
  onNoteChange,
  onSubmit,
}: EvaluationReviewControlsProps) {
  const blocked = blockers.length > 0;

  return (
    <section className="evaluation-review-controls">
      <div className="evaluation-review-heading">
        <Typography.Text strong>复核结论</Typography.Text>
        <Typography.Text type="secondary">
          当前为本地草稿
        </Typography.Text>
      </div>

      {blocked ? (
        <Alert
          description={blockers.join('；')}
          showIcon
          title="输入未就绪，不能形成复核结论"
          type="error"
        />
      ) : null}

      <Radio.Group
        block
        disabled={blocked || evaluation.status === 'approved'}
        onChange={(event) =>
          onDecisionChange(event.target.value as EvaluationReviewDecision)
        }
        optionType="button"
        options={[
          {
            label: '确认结果',
            value: 'confirm',
          },
          {
            label: '申请重算',
            value: 'recalculate',
          },
        ]}
        size="small"
        value={draft.decision}
      />

      <Typography.Text strong>复核说明</Typography.Text>
      <TextArea
        disabled={blocked || evaluation.status === 'approved'}
        maxLength={500}
        onChange={(event) => onNoteChange(event.target.value)}
        placeholder="说明复核依据、发现的问题或重算建议（非必填）"
        rows={2}
        showCount
        value={draft.note}
      />
      <Button
        block
        disabled={
          blocked ||
          evaluation.status === 'approved' ||
          !draft.decision
        }
        onClick={onSubmit}
        size="small"
        type="primary"
      >
        提交确认
      </Button>
    </section>
  );
}
