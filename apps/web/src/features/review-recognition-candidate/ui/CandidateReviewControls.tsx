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
  onSubmit: () => void;
}

export function CandidateReviewControls({
  candidate,
  draft,
  onDecisionChange,
  onNoteChange,
  onSubmit,
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
          description="决定和说明已自动保存到本机草稿，可继续切换候选后再回来处理。"
          showIcon
          title="审核草稿已更新"
          type="info"
        />
      ) : null}

      <Tooltip
        title={
          draft.decision
            ? '提交后将写入本地审核轨迹'
            : '请先选择审核决定'
        }
      >
        <Button
          block
          disabled={!draft.decision}
          onClick={onSubmit}
          type="primary"
        >
          确认审核
        </Button>
      </Tooltip>
    </section>
  );
}
