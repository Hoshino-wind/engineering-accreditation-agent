import type {
  AttainmentEvaluationSummary,
  EvaluationItemStatus,
} from '../../../entities/attainment-evaluation';

export interface AttainmentEvaluationFilters {
  course: string;
  keyword: string;
  status: EvaluationItemStatus | 'all';
}

export function filterAttainmentEvaluations(
  evaluations: AttainmentEvaluationSummary[],
  filters: AttainmentEvaluationFilters,
) {
  const keyword = filters.keyword.trim().toLocaleLowerCase('zh-CN');

  return evaluations.filter((evaluation) => {
    const matchesCourse =
      filters.course === 'all' || evaluation.course === filters.course;
    const matchesStatus =
      filters.status === 'all' || evaluation.status === filters.status;
    const matchesKeyword =
      keyword.length === 0 ||
      [
        evaluation.objectiveCode,
        evaluation.objectiveName,
        evaluation.course,
        evaluation.abilityCode,
        evaluation.abilityName,
      ].some((value) =>
        value.toLocaleLowerCase('zh-CN').includes(keyword),
      );

    return matchesCourse && matchesStatus && matchesKeyword;
  });
}
