import { EyeOutlined, FileTextOutlined } from '@ant-design/icons';
import {
  Button,
  Card,
  Empty,
  Space,
  Tag,
  Typography,
} from 'antd';

import type {
  CandidateReviewDecision,
  RecognitionCandidate,
} from '../../../entities/recognition-candidate';
import {
  CandidateReviewControls,
  type CandidateReviewDraft,
} from '../../../features/review-recognition-candidate';

interface CandidateEvidenceReviewProps {
  candidate: RecognitionCandidate | null;
  draft: CandidateReviewDraft;
  onDecisionChange: (decision: CandidateReviewDecision) => void;
  onInspectEvidence: () => void;
  onNoteChange: (note: string) => void;
  onSubmit: () => void;
}

export function CandidateEvidenceReview({
  candidate,
  draft,
  onDecisionChange,
  onInspectEvidence,
  onNoteChange,
  onSubmit,
}: CandidateEvidenceReviewProps) {
  if (!candidate) {
    return (
      <Card
        className="candidate-evidence-review"
        size="small"
        title="来源证据与审核"
      >
        <Empty
          description="请选择一条候选"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    );
  }

  const primaryEvidence = candidate.evidence[0];

  return (
    <Card
      className="candidate-evidence-review"
      size="small"
      title="来源证据与审核"
    >
      {primaryEvidence ? (
        <section className="candidate-primary-evidence">
          <Typography.Text type="secondary">来源材料</Typography.Text>
          <Space>
            <FileTextOutlined />
            <Typography.Text strong>
              {primaryEvidence.resourceName}
            </Typography.Text>
            <Tag color="blue">{primaryEvidence.resourceVersion}</Tag>
          </Space>
          <Typography.Text type="secondary">
            {primaryEvidence.coordinate}
          </Typography.Text>
          <Typography.Paragraph>
            {primaryEvidence.excerpt}
          </Typography.Paragraph>
          <div className="candidate-evidence-footer">
            <Typography.Text
              copyable={{ text: primaryEvidence.hash }}
              type="secondary"
            >
              {primaryEvidence.hash}
            </Typography.Text>
            <Button
              icon={<EyeOutlined />}
              onClick={onInspectEvidence}
              size="small"
            >
              查看原文
            </Button>
          </div>
        </section>
      ) : null}

      <CandidateReviewControls
        candidate={candidate}
        draft={draft}
        onDecisionChange={onDecisionChange}
        onNoteChange={onNoteChange}
        onSubmit={onSubmit}
      />
    </Card>
  );
}
