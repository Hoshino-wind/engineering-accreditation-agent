import type {
  ImprovementCase,
  ImprovementCaseStatus,
  ImprovementSourceModule,
} from '../../../entities/improvement-case';

export interface ImprovementCaseFilters {
  keyword: string;
  source: ImprovementSourceModule | 'all';
  status: ImprovementCaseStatus | 'all';
}

export function filterImprovementCases(
  cases: ImprovementCase[],
  filters: ImprovementCaseFilters,
) {
  const normalizedKeyword = filters.keyword.trim().toLocaleLowerCase(
    'zh-CN',
  );

  return cases.filter((improvementCase) => {
    const sourceMatches =
      filters.source === 'all' ||
      improvementCase.source.module === filters.source;
    const statusMatches =
      filters.status === 'all' ||
      improvementCase.status === filters.status;
    const keywordMatches =
      normalizedKeyword.length === 0 ||
      [
        improvementCase.displayId,
        improvementCase.title,
        improvementCase.course,
        improvementCase.action.owner,
      ]
        .join(' ')
        .toLocaleLowerCase('zh-CN')
        .includes(normalizedKeyword);

    return sourceMatches && statusMatches && keywordMatches;
  });
}
