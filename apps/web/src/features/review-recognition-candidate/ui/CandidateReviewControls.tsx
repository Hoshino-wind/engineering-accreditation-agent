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
  Tooltip,
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

interface CandidateReviewControlsProps {
  candidate: RecognitionCandidate;
  draft: CandidateReviewDraft;
  onDecisionChange: (decision: CandidateReviewDecision) => void;
  onNoteChange: (note: string) => void;
}

export function CandidateReviewControls({
  candidate,
  draft,
  onDecisionChange,
  onNoteChange,
}: CandidateReviewControlsProps) {
  return (
    <section className="candidate-review-controls">
      <Typography.Text strong>审核决定</Typography.Text>
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
          description="决定和说明仅保存在当前页面草稿中，刷新后不会保留。"
          showIcon
          title="审核草稿已更新"
          type="info"
        />
      ) : null}

      <Tooltip title="审核写入将在 M4 后端业务切片接入">
        <Button block disabled type="primary">
          确认审核
        </Button>
      </Tooltip>
    </section>
  );
}
