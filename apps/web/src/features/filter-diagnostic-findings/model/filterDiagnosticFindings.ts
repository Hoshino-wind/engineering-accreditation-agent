import type {
  DiagnosticFinding,
  DiagnosticFindingRisk,
  DiagnosticFindingType,
} from '../../../entities/diagnostic-finding';

export interface DiagnosticFindingFilters {
  course: string;
  findingType: DiagnosticFindingType | 'all';
  keyword: string;
  risk: DiagnosticFindingRisk | 'all';
}

export function filterDiagnosticFindings(
  findings: DiagnosticFinding[],
  filters: DiagnosticFindingFilters,
): DiagnosticFinding[] {
  const keyword = filters.keyword.trim().toLocaleLowerCase('zh-CN');

  return findings.filter((finding) => {
    const matchesCourse =
      filters.course === 'all' || finding.course === filters.course;
    const matchesType =
      filters.findingType === 'all' ||
      finding.type === filters.findingType;
    const matchesRisk =
      filters.risk === 'all' || finding.risk === filters.risk;
    const matchesKeyword =
      keyword.length === 0 ||
      [
        finding.course,
        finding.rule.id,
        finding.sourceNode,
        finding.targetNode,
        finding.title,
      ].some((value) =>
        value.toLocaleLowerCase('zh-CN').includes(keyword),
      );

    return matchesCourse && matchesType && matchesRisk && matchesKeyword;
  });
}
