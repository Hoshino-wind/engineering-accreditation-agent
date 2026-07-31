import type { CandidateReviewDecision } from '../../../entities/recognition-candidate';
import { useLocalStorageState } from '../../../shared/lib';

export interface CandidateReviewDraft {
  decision?: CandidateReviewDecision;
  note: string;
}

const emptyDraft: CandidateReviewDraft = {
  note: '',
};

export function useCandidateReviewDrafts() {
  const [drafts, setDrafts] = useLocalStorageState<
    Record<string, CandidateReviewDraft>
  >('engineering-accreditation.m4-review-drafts.v1', {});

  const getDraft = (candidateId: string) => drafts[candidateId] ?? emptyDraft;

  const setDecision = (
    candidateId: string,
    decision: CandidateReviewDecision,
  ) => {
    setDrafts((current) => ({
      ...current,
      [candidateId]: {
        ...(current[candidateId] ?? emptyDraft),
        decision,
      },
    }));
  };

  const setNote = (candidateId: string, note: string) => {
    setDrafts((current) => ({
      ...current,
      [candidateId]: {
        ...(current[candidateId] ?? emptyDraft),
        note,
      },
    }));
  };

  return {
    getDraft,
    setDecision,
    setNote,
  };
}
