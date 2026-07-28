import { useState } from 'react';

import type { CandidateReviewDecision } from '../../../entities/recognition-candidate';

export interface CandidateReviewDraft {
  decision?: CandidateReviewDecision;
  note: string;
}

const emptyDraft: CandidateReviewDraft = {
  note: '',
};

export function useCandidateReviewDrafts() {
  const [drafts, setDrafts] = useState<
    Record<string, CandidateReviewDraft>
  >({});

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
