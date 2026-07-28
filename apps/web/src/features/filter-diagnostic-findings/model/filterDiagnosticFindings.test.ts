import { describe, expect, it } from 'vitest';

import { prototypeOnlyDiagnosticFindings } from '../../../entities/diagnostic-finding';
import { filterDiagnosticFindings } from './filterDiagnosticFindings';

describe('filterDiagnosticFindings', () => {
  it('按课程与风险筛选诊断发现', () => {
    const findings = filterDiagnosticFindings(
      prototypeOnlyDiagnosticFindings,
      {
        course: '软件工程',
        findingType: 'all',
        keyword: '',
        risk: 'high',
      },
    );

    expect(findings).toHaveLength(1);
    expect(findings[0]?.title).toBe('实验缺少有效评分项');
  });

  it('可通过规则编号检索诊断发现', () => {
    const findings = filterDiagnosticFindings(
      prototypeOnlyDiagnosticFindings,
      {
        course: 'all',
        findingType: 'all',
        keyword: 'coverage-rule',
        risk: 'all',
      },
    );

    expect(findings.map((finding) => finding.id)).toEqual([
      'finding-os-assessment-ability-gap',
    ]);
  });

  it('按材料冲突类型筛选', () => {
    const findings = filterDiagnosticFindings(
      prototypeOnlyDiagnosticFindings,
      {
        course: 'all',
        findingType: 'material-conflict',
        keyword: '',
        risk: 'all',
      },
    );

    expect(findings).toHaveLength(3);
  });
});
