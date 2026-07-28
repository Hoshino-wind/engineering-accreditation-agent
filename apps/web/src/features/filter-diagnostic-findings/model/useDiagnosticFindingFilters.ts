import { useMemo, useState } from 'react';

import type {
  DiagnosticFinding,
  DiagnosticFindingRisk,
  DiagnosticFindingType,
} from '../../../entities/diagnostic-finding';
import { filterDiagnosticFindings } from './filterDiagnosticFindings';

export function useDiagnosticFindingFilters(
  sourceFindings: DiagnosticFinding[],
) {
  const [course, setCourse] = useState('all');
  const [findingType, setFindingType] = useState<
    DiagnosticFindingType | 'all'
  >('all');
  const [keyword, setKeyword] = useState('');
  const [risk, setRisk] = useState<DiagnosticFindingRisk | 'all'>('all');

  const courses = useMemo(
    () =>
      Array.from(
        new Set(sourceFindings.map((finding) => finding.course)),
      ).sort((left, right) => left.localeCompare(right, 'zh-CN')),
    [sourceFindings],
  );

  const findings = useMemo(
    () =>
      filterDiagnosticFindings(sourceFindings, {
        course,
        findingType,
        keyword,
        risk,
      }),
    [course, findingType, keyword, risk, sourceFindings],
  );

  return {
    course,
    courses,
    findingType,
    findings,
    keyword,
    risk,
    setCourse,
    setFindingType,
    setKeyword,
    setRisk,
  };
}
