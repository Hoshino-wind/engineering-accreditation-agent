import type { ImprovementEffectiveness } from '../../../entities/improvement-case';
import { useLocalStorageState } from '../../../shared/lib';

export interface ImprovementEffectivenessDraft {
  effectiveness?: ImprovementEffectiveness;
  note: string;
}

const emptyDraft: ImprovementEffectivenessDraft = {
  note: '',
};

export function useImprovementEffectivenessDrafts() {
  const [drafts, setDrafts] = useLocalStorageState<
    Record<string, ImprovementEffectivenessDraft>
  >('engineering-accreditation.m7-effectiveness-drafts.v1', {});

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
