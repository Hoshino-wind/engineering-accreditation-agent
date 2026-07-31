import { useCallback, useMemo } from 'react';

import { prototypeOnlyImprovementCases } from '../../../entities/improvement-case';
import { recordWorkflowEvent } from '../../../entities/workflow-event';
import { useLocalStorageState } from '../../../shared/lib';
import {
  createPrototypeOnlyImprovementIssue,
  toImprovementCase,
  type CreateImprovementIssueInput,
  type PrototypeOnlyImprovementIssue,
} from './prototypeOnlyImprovementIssue';

const prototypeOnlyImprovementIssueStorageKey =
  'engineering-accreditation.m7-local-issues.v1';

export function usePrototypeOnlyImprovementCases() {
  const [localIssues, setLocalIssues] = useLocalStorageState<
    PrototypeOnlyImprovementIssue[]
  >(prototypeOnlyImprovementIssueStorageKey, []);
  const cases = useMemo(
    () => [
      ...localIssues.map(toImprovementCase),
      ...prototypeOnlyImprovementCases,
    ],
    [localIssues],
  );

  const createIssue = useCallback(
    (input: CreateImprovementIssueInput) => {
      const nextIssue = createPrototypeOnlyImprovementIssue(input);

      setLocalIssues((current) => [nextIssue, ...current]);
      recordWorkflowEvent({
        action: '新建改进问题',
        actor: '当前用户',
        module: 'M7',
        objectId: nextIssue.id,
        status: 'pending',
        summary: `${nextIssue.title} · ${nextIssue.owner}`,
      });

      return nextIssue;
    },
    [setLocalIssues],
  );

  return {
    cases,
    createIssue,
    localIssueCount: localIssues.length,
  };
}
