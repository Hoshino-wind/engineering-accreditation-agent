import { useState } from 'react';

import type { FindingDecision } from '../../../entities/diagnostic-finding';

export interface FindingDecisionDraft {
  decision?: FindingDecision;
  note: string;
}

const emptyDraft: FindingDecisionDraft = {
  note: '',
};

export function useFindingDecisionDrafts() {
  const [drafts, setDrafts] = useState<
    Record<string, FindingDecisionDraft>
  >({});

  const getDraft = (findingId: string) => drafts[findingId] ?? emptyDraft;

  const setDecision = (
    findingId: string,
    decision: FindingDecision,
  ) => {
    setDrafts((current) => ({
      ...current,
      [findingId]: {
        ...(current[findingId] ?? emptyDraft),
        decision,
      },
    }));
  };

  const setNote = (findingId: string, note: string) => {
    setDrafts((current) => ({
      ...current,
      [findingId]: {
        ...(current[findingId] ?? emptyDraft),
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
