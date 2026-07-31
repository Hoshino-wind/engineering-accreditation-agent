import { useState } from 'react';
import { App } from 'antd';

import {
  prototypeOnlyRecognitionCandidates,
  type RecognitionCandidate,
} from '../../../entities/recognition-candidate';
import { recordWorkflowEvent } from '../../../entities/workflow-event';
import { useRecognitionCandidateFilters } from '../../../features/filter-recognition-candidates';
import { CandidateEvidenceDrawer } from '../../../features/inspect-candidate-evidence';
import { useCandidateReviewDrafts } from '../../../features/review-recognition-candidate';
import { CandidateComparison } from './CandidateComparison';
import { CandidateEvidenceReview } from './CandidateEvidenceReview';
import { CandidateQueue } from './CandidateQueue';

import './recognitionWorkbench.css';

export function RecognitionWorkbench() {
  const { message } = App.useApp();
  const filters = useRecognitionCandidateFilters(
    prototypeOnlyRecognitionCandidates,
  );
  const reviewDrafts = useCandidateReviewDrafts();
  const [selectedCandidateId, setSelectedCandidateId] = useState(
    prototypeOnlyRecognitionCandidates[0]?.id,
  );
  const [evidenceDrawerOpen, setEvidenceDrawerOpen] = useState(false);

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

  return (
    <>
      <section className="recognition-workbench">
        <CandidateQueue
          candidateType={filters.candidateType}
          candidates={filters.candidates}
          course={filters.course}
          courses={filters.courses}
          keyword={filters.keyword}
          onCandidateTypeChange={filters.setCandidateType}
          onCourseChange={filters.setCourse}
          onKeywordChange={filters.setKeyword}
          onRiskChange={filters.setRisk}
          onSelect={handleSelect}
          risk={filters.risk}
          selectedCandidateId={selectedCandidate?.id}
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
          onSubmit={() => {
            if (!selectedCandidate || !selectedDraft.decision) {
              return;
            }
            recordWorkflowEvent({
              action: '确认识别候选',
              actor: '当前用户',
              module: 'M4',
              objectId: selectedCandidate.id,
              status: 'success',
              summary: `${selectedCandidate.title}：${selectedDraft.decision}`,
            });
            void message.success('审核结果已保存，并写入治理中心审计轨迹');
          }}
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
