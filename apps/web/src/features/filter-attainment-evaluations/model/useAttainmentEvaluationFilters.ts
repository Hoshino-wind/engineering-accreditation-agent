import { useMemo, useState } from 'react';

import type {
  AttainmentEvaluationItem,
  EvaluationItemStatus,
} from '../../../entities/attainment-evaluation';
import { filterAttainmentEvaluations } from './filterAttainmentEvaluations';

export function useAttainmentEvaluationFilters(
  sourceEvaluations: AttainmentEvaluationItem[],
) {
  const [course, setCourse] = useState('all');
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<EvaluationItemStatus | 'all'>(
    'all',
  );
  const courses = useMemo(
    () =>
      Array.from(
        new Set(sourceEvaluations.map((evaluation) => evaluation.course)),
      ).sort((left, right) => left.localeCompare(right, 'zh-CN')),
    [sourceEvaluations],
  );
  const evaluations = useMemo(
    () =>
      filterAttainmentEvaluations(sourceEvaluations, {
        course,
        keyword,
        status,
      }),
    [course, keyword, sourceEvaluations, status],
  );

  return {
    course,
    courses,
    evaluations,
    keyword,
    setCourse,
    setKeyword,
    setStatus,
    status,
  };
}
