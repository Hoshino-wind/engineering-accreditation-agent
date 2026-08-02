import { useEffect } from 'react';

import type {
  AttainmentEvaluationSummary,
  EvaluationReviewDecision,
} from '../../../entities/attainment-evaluation';
import { useLocalStorageState } from '../../../shared/lib';

export interface EvaluationReviewDraft {
  decision?: EvaluationReviewDecision;
  note: string;
}

const emptyDraft: EvaluationReviewDraft = {
  note: '',
};
const legacyStorageKey =
  'engineering-accreditation.m6-review-drafts.v1';
const storageKey = 'engineering-accreditation.m6-review-drafts.v2';

function normalizeDraft(value: unknown): EvaluationReviewDraft | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.note !== 'string') {
    return undefined;
  }
  if (
    candidate.decision !== undefined &&
    candidate.decision !== 'confirm' &&
    candidate.decision !== 'recalculate'
  ) {
    return undefined;
  }
  return {
    decision: candidate.decision,
    note: candidate.note,
  };
}

function normalizeDrafts(
  value: unknown,
): Record<string, EvaluationReviewDraft> {
  if (!value || typeof value !== 'object') {
    return {};
  }
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, draft]) => {
      const normalized = normalizeDraft(draft);
      return normalized ? [[key, normalized]] : [];
    }),
  );
}

export function useEvaluationReviewDrafts(
  evaluations: AttainmentEvaluationSummary[],
) {
  const [drafts, setDrafts] = useLocalStorageState<
    Record<string, EvaluationReviewDraft>
  >(storageKey, {});

  useEffect(() => {
    const legacyValue = window.localStorage.getItem(legacyStorageKey);
    if (!legacyValue) {
      return;
    }
    try {
      const legacyDrafts = normalizeDrafts(JSON.parse(legacyValue));
      const currentDrafts = normalizeDrafts(drafts);
      const migratedDrafts = { ...currentDrafts };
      for (const evaluation of evaluations) {
        const legacyDraft = legacyDrafts[evaluation.id];
        if (
          legacyDraft &&
          !migratedDrafts[evaluation.presentedRunId]
        ) {
          migratedDrafts[evaluation.presentedRunId] = legacyDraft;
        }
      }
      window.localStorage.setItem(
        storageKey,
        JSON.stringify(migratedDrafts),
      );
      setDrafts(migratedDrafts);
      window.localStorage.removeItem(legacyStorageKey);
    } catch {
      // 损坏或不可写的旧草稿不参与迁移，也不影响当前运行。
    }
  }, [drafts, evaluations, setDrafts]);

  const getDraft = (runId: string) =>
    normalizeDraft(drafts[runId]) ?? emptyDraft;

  const setDecision = (
    runId: string,
    decision: EvaluationReviewDecision,
  ) => {
    setDrafts((current) => ({
      ...current,
      [runId]: {
        ...(current[runId] ?? emptyDraft),
        decision,
      },
    }));
  };

  const setNote = (runId: string, note: string) => {
    setDrafts((current) => ({
      ...current,
      [runId]: {
        ...(current[runId] ?? emptyDraft),
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
