import { message } from 'antd';
import { useEffect, useMemo, useState } from 'react';

import {
  prototypeOnlyRecognitionCandidates,
  type RecognitionCandidate,
} from '../../../entities/recognition-candidate';
import { useRecognitionCandidateFilters } from '../../../features/filter-recognition-candidates';
import { CandidateEvidenceDrawer } from '../../../features/inspect-candidate-evidence';
import { useCandidateReviewDrafts } from '../../../features/review-recognition-candidate';
import {
  fetchRecognitionCandidates,
  submitCandidateReview,
} from '../../../shared/api/recognitionClient';
import { CandidateComparison } from './CandidateComparison';
import { CandidateEvidenceReview } from './CandidateEvidenceReview';
import { CandidateQueue } from './CandidateQueue';

import './recognitionWorkbench.css';

export function RecognitionWorkbench() {
  const [backendCandidates, setBackendCandidates] = useState<RecognitionCandidate[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>();
  const [submittingCandidateId, setSubmittingCandidateId] = useState<string>();
  const [evidenceDrawerOpen, setEvidenceDrawerOpen] = useState(false);
  const reviewDrafts = useCandidateReviewDrafts();

  useEffect(() => {
    void fetchRecognitionCandidates()
      .then(setBackendCandidates)
      .catch(() => {
        setBackendCandidates([]);
      });
  }, []);

  const allCandidates = useMemo(
    () =>
      mergeCandidates(backendCandidates, prototypeOnlyRecognitionCandidates),
    [backendCandidates],
  );

  const filters = useRecognitionCandidateFilters(allCandidates);

  useEffect(() => {
    const firstCandidate = filters.candidates[0];
    if (
      firstCandidate &&
      !filters.candidates.some((candidate) => candidate.id === selectedCandidateId)
    ) {
      setSelectedCandidateId(firstCandidate.id);
    }
  }, [filters.candidates, selectedCandidateId]);

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

  const handleSubmitReview = async () => {
    if (!selectedCandidate || !selectedDraft.decision) return;

    setSubmittingCandidateId(selectedCandidate.id);
    try {
      const updated = await submitCandidateReview(
        selectedCandidate.id,
        selectedDraft.decision,
        selectedDraft.note,
        {
          evidenceExcerpt: selectedDraft.evidenceExcerpt,
          sourceNode: selectedDraft.sourceNode,
          strength: selectedDraft.strength,
          targetNode: selectedDraft.targetNode,
        },
      );
      setBackendCandidates((prev) =>
        mergeCandidates([updated], prev).map((candidate) =>
          candidate.id === updated.id ? updated : candidate,
        ),
      );
      message.success('审核结果已写入后端，后续可进入正式图谱');
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : '审核提交失败，请稍后重试';
      message.error(msg);
    } finally {
      setSubmittingCandidateId(undefined);
    }
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
          onFieldChange={(field, value) => {
            if (selectedCandidate) {
              reviewDrafts.setField(selectedCandidate.id, field, value);
            }
          }}
          onInspectEvidence={() => setEvidenceDrawerOpen(true)}
          onNoteChange={(note) => {
            if (selectedCandidate) {
              reviewDrafts.setNote(selectedCandidate.id, note);
            }
          }}
          onSubmitReview={handleSubmitReview}
          submitting={submittingCandidateId === selectedCandidate?.id}
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

function mergeCandidates(
  primary: RecognitionCandidate[],
  secondary: RecognitionCandidate[],
): RecognitionCandidate[] {
  const seen = new Set<string>();
  return [...primary, ...secondary].filter((candidate) => {
    if (seen.has(candidate.id)) return false;
    seen.add(candidate.id);
    return true;
  });
}
