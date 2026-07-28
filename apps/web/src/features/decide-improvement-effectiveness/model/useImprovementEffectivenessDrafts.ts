import { useState } from 'react';

import type { ImprovementEffectiveness } from '../../../entities/improvement-case';

export interface ImprovementEffectivenessDraft {
  effectiveness?: ImprovementEffectiveness;
  note: string;
}

const emptyDraft: ImprovementEffectivenessDraft = {
  note: '',
};

export function useImprovementEffectivenessDrafts() {
  const [drafts, setDrafts] = useState<
    Record<string, ImprovementEffectivenessDraft>
  >({});

  const getDraft = (caseId: string) => drafts[caseId] ?? emptyDraft;

  const setEffectiveness = (
    caseId: string,
    effectiveness: ImprovementEffectiveness,
  ) => {
    setDrafts((current) => ({
      ...current,
      [caseId]: {
        ...(current[caseId] ?? emptyDraft),
        effectiveness,
      },
    }));
  };

  const setNote = (caseId: string, note: string) => {
    setDrafts((current) => ({
      ...current,
      [caseId]: {
        ...(current[caseId] ?? emptyDraft),
        note,
      },
    }));
  };

  return {
    getDraft,
    setEffectiveness,
    setNote,
  };
}
