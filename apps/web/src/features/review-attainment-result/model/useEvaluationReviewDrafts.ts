import type { EvaluationReviewDecision } from '../../../entities/attainment-evaluation';
import { useLocalStorageState } from '../../../shared/lib';

export interface EvaluationReviewDraft {
  decision?: EvaluationReviewDecision;
  note: string;
}

const emptyDraft: EvaluationReviewDraft = {
  note: '',
};

export function useEvaluationReviewDrafts() {
  const [drafts, setDrafts] = useLocalStorageState<
    Record<string, EvaluationReviewDraft>
  >('engineering-accreditation.m6-review-drafts.v1', {});

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
