import { useMemo, useState } from 'react';

import type {
  ImprovementCase,
  ImprovementCaseStatus,
  ImprovementSourceModule,
} from '../../../entities/improvement-case';
import { filterImprovementCases } from './filterImprovementCases';

export function useImprovementCaseFilters(
  sourceCases: ImprovementCase[],
) {
  const [keyword, setKeyword] = useState('');
  const [source, setSource] = useState<
    ImprovementSourceModule | 'all'
  >('all');
  const [status, setStatus] = useState<
    ImprovementCaseStatus | 'all'
  >('all');
  const cases = useMemo(
    () =>
      filterImprovementCases(sourceCases, {
        keyword,
        source,
        status,
      }),
    [keyword, source, sourceCases, status],
  );

  return {
    cases,
    keyword,
    setKeyword,
    setSource,
    setStatus,
    source,
    status,
  };
}
