import { CloudUploadOutlined, ReloadOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Empty, Spin, Tag } from 'antd';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

import {
  mapRecognitionCandidate,
  type RecognitionCandidate,
} from '../../../entities/recognition-candidate';
import { useRecognitionCandidateFilters } from '../../../features/filter-recognition-candidates';
import { useCourseState } from '../../../shared/course/useCourseState';
import { CandidateEvidenceDrawer } from '../../../features/inspect-candidate-evidence';
import { useCandidateReviewDrafts } from '../../../features/review-recognition-candidate';
import { reviewCandidate } from '../../../shared/api/recognitionClient';
import { CandidateComparison } from './CandidateComparison';
import { CandidateEvidenceReview } from './CandidateEvidenceReview';
import { CandidateQueue } from './CandidateQueue';

import './recognitionWorkbench.css';

interface RecognitionWorkbenchProps {
  candidates: RecognitionCandidate[];
  loading: boolean;
  loadFailed: boolean;
  onCandidateUpdated: (updated: RecognitionCandidate) => void;
  onReload: () => void;
}

export function RecognitionWorkbench({
  candidates,
  loading,
  loadFailed,
  onCandidateUpdated,
  onReload,
}: RecognitionWorkbenchProps) {
  const navigate = useNavigate();
  const { selectedCourseName } = useCourseState();
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    text: string;
    type: 'error' | 'success';
  } | null>(null);

  const filters = useRecognitionCandidateFilters(candidates, selectedCourseName);
  const reviewDrafts = useCandidateReviewDrafts();
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>();
  const [evidenceDrawerOpen, setEvidenceDrawerOpen] = useState(false);

  const pendingCount = useMemo(
    () =>
      candidates.filter(
        (c) => (c.reviewStatus ?? 'pending') === 'pending',
      ).length,
    [candidates],
  );

  const autoApprovedCount = useMemo(
    () =>
      candidates.filter(
        (c) => (c.reviewStatus ?? '') === 'accepted',
      ).length,
    [candidates],
  );

  const autoRejectedCount = useMemo(
    () =>
      candidates.filter(
        (c) => (c.reviewStatus ?? '') === 'rejected',
      ).length,
    [candidates],
  );

  const selectedCandidate =
    filters.candidates.find(
      (candidate) => candidate.id === selectedCandidateId,
    ) ??
    filters.candidates[0] ??
    null;
  const selectedDraft = selectedCandidate
    ? reviewDrafts.getDraft(selectedCandidate.id)
    : { note: '' };

  const handleSelect = (candidate: RecognitionCandidate) => {
    setSelectedCandidateId(candidate.id);
  };

  const handlePreviewInGraph = (candidate: RecognitionCandidate) => {
    void navigate('/graph', {
      state: {
        previewCandidate: {
          id: candidate.id,
          sourceNode: candidate.sourceNode,
          targetNode: candidate.targetNode,
        },
      },
    });
  };

  const handleSubmitReview = async () => {
    if (!selectedCandidate || !selectedDraft.decision) return;
    const decision = selectedDraft.decision;
    const backendDecision =
      decision === 'accept'
        ? 'accept'
        : decision === 'reject'
          ? 'reject'
          : 'modify';
    setSubmittingId(selectedCandidate.id);
    setFeedback(null);
    const raw = await reviewCandidate(selectedCandidate.id, backendDecision);
    setSubmittingId(null);
    if (raw) {
      onCandidateUpdated(mapRecognitionCandidate(raw));
      setFeedback({
        text: '审核决定已写入识别库并实时投影到能力图谱：采纳的支撑关系计入覆盖度，驳回的不再计入。',
        type: 'success',
      });
    } else {
      setFeedback({
        text: '审核写入失败，请检查后端服务是否运行后重试。',
        type: 'error',
      });
    }
  };

  if (loading) {
    return (
      <Card size="small">
        <div style={{ padding: '64px 0', textAlign: 'center' }}>
          <Spin size="large" tip="正在从识别库加载真实候选数据…" />
        </div>
      </Card>
    );
  }

  if (candidates.length === 0) {
    return (
      <Card size="small">
        <div style={{ padding: '48px 0' }}>
          {loadFailed ? (
            <Alert
              action={
                <Button
                  icon={<ReloadOutlined />}
                  onClick={onReload}
                  size="small"
                >
                  重试
                </Button>
              }
              description="无法连接后端识别服务。请确认 API 服务已启动（pnpm dev），然后重试。"
              showIcon
              title="识别候选加载失败"
              type="error"
            />
          ) : (
            <Empty description="识别库中还没有候选关系。上传教学材料后，AI 会自动解析并生成候选，无需手动运行。">
              <Button
                icon={<CloudUploadOutlined />}
                onClick={() => navigate('/resources')}
                type="primary"
              >
                去 ① 上传教学材料
              </Button>
            </Empty>
          )}
        </div>
      </Card>
    );
  }

  return (
    <>
      <div
        style={{
          display: 'flex',
          gap: 16,
          marginBottom: 12,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <Tag color="blue">待人工审核 {pendingCount}</Tag>
        <Tag color="green">AI 自动批准 {autoApprovedCount}</Tag>
        <Tag color="orange">AI 自动驳回 {autoRejectedCount}</Tag>
        <Tag>合计 {candidates.length}</Tag>
      </div>

      {feedback ? (
        <Alert
          closable
          description={feedback.text}
          onClose={() => setFeedback(null)}
          showIcon
          style={{ marginBottom: 12 }}
          title={feedback.type === 'success' ? '审核已提交' : '提交失败'}
          type={feedback.type}
        />
      ) : null}
      <section className="recognition-workbench">
        <CandidateQueue
          candidateType={filters.candidateType}
          candidates={filters.candidates}
          course={filters.course}
          courses={filters.courses}
          isCourseLocked={filters.isCourseLocked}
          keyword={filters.keyword}
          onCandidateTypeChange={filters.setCandidateType}
          onCourseChange={filters.setCourse}
          onKeywordChange={filters.setKeyword}
          onRiskChange={filters.setRisk}
          onReviewStatusChange={filters.setReviewStatus}
          onSelect={handleSelect}
          reviewStatus={filters.reviewStatus}
          risk={filters.risk}
          selectedCandidateId={selectedCandidate?.id}
          totalCount={pendingCount}
        />
        <CandidateComparison candidate={selectedCandidate} />
        <CandidateEvidenceReview
          candidate={selectedCandidate}
          draft={selectedDraft}
          onDecisionChange={(decision) => {
            if (selectedCandidate) {
              reviewDrafts.setDecision(selectedCandidate.id, decision);
            }
          }}
          onInspectEvidence={() => setEvidenceDrawerOpen(true)}
          onNoteChange={(note) => {
            if (selectedCandidate) {
              reviewDrafts.setNote(selectedCandidate.id, note);
            }
          }}
          onPreviewInGraph={() => {
            if (selectedCandidate) {
              handlePreviewInGraph(selectedCandidate);
            }
          }}
          onSubmitReview={() => void handleSubmitReview()}
          submitting={submittingId === selectedCandidate?.id}
        />
      </section>
      <CandidateEvidenceDrawer
        candidate={selectedCandidate}
        onClose={() => setEvidenceDrawerOpen(false)}
        open={evidenceDrawerOpen}
      />
    </>
  );
}
