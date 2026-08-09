import { useMemo, useState } from 'react';

import type {
  DiagnosticFinding,
  DiagnosticFindingRisk,
  DiagnosticFindingType,
} from '../../../entities/diagnostic-finding';
import { filterDiagnosticFindings } from './filterDiagnosticFindings';

export function useDiagnosticFindingFilters(
  sourceFindings: DiagnosticFinding[],
  globalCourseName?: string | null,
) {
  const [course, setCourse] = useState('all');
  const [findingType, setFindingType] = useState<
    DiagnosticFindingType | 'all'
  >('all');
  const [keyword, setKeyword] = useState('');
  const [risk, setRisk] = useState<DiagnosticFindingRisk | 'all'>('all');

  // 当外部传入了全局课程（侧边栏选了具体课程），用它覆盖内部下拉选择
  const isCourseLocked =
    globalCourseName !== undefined && globalCourseName !== null;
  const effectiveCourse = isCourseLocked ? globalCourseName : course;

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
        course: effectiveCourse,
        findingType,
        keyword,
        risk,
      }),
    [effectiveCourse, findingType, keyword, risk, sourceFindings],
  );

  return {
    course,
    courses,
    findingType,
    findings,
    isCourseLocked,
    keyword,
    risk,
    setCourse,
    setFindingType,
    setKeyword,
    setRisk,
  };
}
