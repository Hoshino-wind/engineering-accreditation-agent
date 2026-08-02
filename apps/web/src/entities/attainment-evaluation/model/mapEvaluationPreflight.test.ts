import { describe, expect, it } from 'vitest';

import { attainmentEvaluationPreflightFixtures } from '../testing/attainmentEvaluationPreflightFixtures';
import { mapEvaluationPreflight } from './mapEvaluationPreflight';

describe('mapEvaluationPreflight', () => {
  it('preserves server-owned remediation semantics without parsing blocker copy', () => {
    const dto = attainmentEvaluationPreflightFixtures[
      'eval-2026-068'
    ]!;

    const report = mapEvaluationPreflight(dto);

    expect(report).toEqual(dto);
    expect(report.checks[0]).toMatchObject({
      action: 'prepare_score_data',
      owner: 'score_input',
      status: 'blocked',
    });
    expect(report.missingInputs[0]).toEqual({
      evidenceName: '团队互评汇总 v1.0',
      id: 'input-teamwork',
      label: '团队协作',
    });
  });

  it('returns independent arrays for query-cache safety', () => {
    const dto = attainmentEvaluationPreflightFixtures[
      'eval-2026-070'
    ]!;

    const report = mapEvaluationPreflight(dto);

    expect(report.blockers).not.toBe(dto.blockers);
    expect(report.checks).not.toBe(dto.checks);
    expect(report.checks[0]).not.toBe(dto.checks[0]);
    expect(report.missingInputs).not.toBe(dto.missingInputs);
  });
});
