import { useState } from 'react';

import type { EvaluationReviewDecision } from '../../../entities/attainment-evaluation';

export interface EvaluationReviewDraft {
  decision?: EvaluationReviewDecision;
  note: string;
}

const emptyDraft: EvaluationReviewDraft = {
  note: '',
};

export function useEvaluationReviewDrafts() {
  const [drafts, setDrafts] = useState<
    Record<string, EvaluationReviewDraft>
  >({});

  const getDraft = (evaluationId: string) =>
    drafts[evaluationId] ?? emptyDraft;

  const setDecision = (
    evaluationId: string,
    decision: EvaluationReviewDecision,
  ) => {
    setDrafts((current) => ({
      ...current,
      [evaluationId]: {
        ...(current[evaluationId] ?? emptyDraft),
        decision,
      },
    }));
  };

  const setNote = (evaluationId: string, note: string) => {
    setDrafts((current) => ({
      ...current,
      [evaluationId]: {
        ...(current[evaluationId] ?? emptyDraft),
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
