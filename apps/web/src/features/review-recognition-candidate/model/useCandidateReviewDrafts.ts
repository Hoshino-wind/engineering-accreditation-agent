import { useState } from 'react';

import type { CandidateReviewDecision } from '../../../entities/recognition-candidate';

export interface CandidateReviewDraft {
  decision?: CandidateReviewDecision;
  evidenceExcerpt?: string;
  note: string;
  sourceNode?: string;
  strength?: string;
  targetNode?: string;
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

  const setField = (
    candidateId: string,
    field: keyof Omit<CandidateReviewDraft, 'decision' | 'note'>,
    value: string,
  ) => {
    setDrafts((current) => ({
      ...current,
      [candidateId]: {
        ...(current[candidateId] ?? emptyDraft),
        [field]: value,
      },
    }));
  };

  return {
    getDraft,
    setDecision,
    setField,
    setNote,
  };
}
