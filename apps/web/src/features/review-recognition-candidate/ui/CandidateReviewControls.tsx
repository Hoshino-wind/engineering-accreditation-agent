import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  EditOutlined,
  MergeCellsOutlined,
  PartitionOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Input,
  Radio,
  Space,
  Tag,
  Typography,
} from 'antd';
import type { RadioChangeEvent } from 'antd';

import type {
  CandidateReviewDecision,
  RecognitionCandidate,
} from '../../../entities/recognition-candidate';
import type { CandidateReviewDraft } from '../model/useCandidateReviewDrafts';

import './candidateReviewControls.css';

const { TextArea } = Input;

const REVIEW_STATUS_META: Record<
  string,
  { color: string; label: string } | undefined
> = {
  accepted: { color: 'success', label: '已接受' },
  modified: { color: 'warning', label: '已修改' },
  pending: { color: 'default', label: '待审核' },
  rejected: { color: 'error', label: '已驳回' },
};

interface CandidateReviewControlsProps {
  candidate: RecognitionCandidate;
  draft: CandidateReviewDraft;
  onDecisionChange: (decision: CandidateReviewDecision) => void;
  onNoteChange: (note: string) => void;
  onSubmitReview: () => void;
  submitting: boolean;
}

export function CandidateReviewControls({
  candidate,
  draft,
  onDecisionChange,
  onNoteChange,
  onSubmitReview,
  submitting,
}: CandidateReviewControlsProps) {
  const statusMeta = candidate.reviewStatus
    ? REVIEW_STATUS_META[candidate.reviewStatus]
    : undefined;

  return (
    <section className="candidate-review-controls">
      <Space>
        <Typography.Text strong>审核决定</Typography.Text>
        {statusMeta ? (
          <Tag color={statusMeta.color}>识别库状态：{statusMeta.label}</Tag>
        ) : null}
      </Space>
      <Radio.Group
        buttonStyle="solid"
        onChange={(event: RadioChangeEvent) =>
          onDecisionChange(event.target.value as CandidateReviewDecision)
        }
        value={draft.decision}
      >
        <Radio.Button value="accept">
          <CheckCircleOutlined /> 接受
        </Radio.Button>
        <Radio.Button value="modify">
          <EditOutlined /> 修改
        </Radio.Button>
        <Radio.Button value="merge">
          <MergeCellsOutlined /> 合并
        </Radio.Button>
        <Radio.Button value="split">
          <PartitionOutlined /> 拆分
        </Radio.Button>
        <Radio.Button value="reject">
          <CloseCircleOutlined /> 驳回
        </Radio.Button>
      </Radio.Group>

      <label htmlFor={`candidate-note-${candidate.id}`}>
        <Typography.Text strong>审核说明</Typography.Text>
      </label>
      <TextArea
        id={`candidate-note-${candidate.id}`}
        maxLength={500}
        onChange={(event) => onNoteChange(event.target.value)}
        placeholder="说明审核理由、依据或修改建议"
        rows={4}
        showCount
        value={draft.note}
      />

      {draft.decision ? (
        <Alert
          description="点击下方「确认审核」后，决定将写入识别库并实时更新该候选的审核状态。"
          showIcon
          title="审核草稿已就绪"
          type="info"
        />
      ) : null}

      <Button
        block
        disabled={!draft.decision}
        loading={submitting}
        onClick={onSubmitReview}
        type="primary"
      >
        确认审核
      </Button>
    </section>
  );
}
