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
  Select,
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
  onFieldChange: (
    field: 'evidenceExcerpt' | 'sourceNode' | 'strength' | 'targetNode',
    value: string,
  ) => void;
  onNoteChange: (note: string) => void;
  onSubmit: () => Promise<void> | void;
  submitting?: boolean;
}

export function CandidateReviewControls({
  candidate,
  draft,
  onDecisionChange,
  onFieldChange,
  onNoteChange,
  onSubmit,
  submitting = false,
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

      <Typography.Text strong>可编辑关系内容</Typography.Text>
      <Input
        onChange={(event) => onFieldChange('sourceNode', event.target.value)}
        placeholder={candidate.sourceNode}
        value={draft.sourceNode ?? candidate.sourceNode}
      />
      <Input
        onChange={(event) => onFieldChange('targetNode', event.target.value)}
        placeholder={candidate.targetNode}
        value={draft.targetNode ?? candidate.targetNode}
      />
      <Select
        onChange={(value) => onFieldChange('strength', value)}
        options={[
          { label: 'strong', value: 'strong' },
          { label: 'medium', value: 'medium' },
          { label: 'weak', value: 'weak' },
        ]}
        placeholder="支撑强度"
        value={draft.strength ?? candidate.supportStrength}
      />
      <TextArea
        maxLength={500}
        onChange={(event) => onFieldChange('evidenceExcerpt', event.target.value)}
        placeholder={candidate.evidence[0]?.excerpt ?? '证据摘录'}
        rows={3}
        showCount
        value={draft.evidenceExcerpt ?? candidate.evidence[0]?.excerpt}
      />

      {draft.decision ? (
        <Alert
          description="点击确认后会写入当前登录用户的后端审核状态；演示环境重启后仍可能重置。"
          showIcon
          title="审核决定已选择"
          type="info"
        />
      ) : null}

      <Tooltip title={draft.decision ? '写入后端审核状态' : '请先选择审核决定'}>
        <Button
          block
          disabled={!draft.decision}
          loading={submitting}
          onClick={onSubmit}
          type="primary"
        >
          确认审核
        </Button>
      </Tooltip>
    </section>
  );
}
