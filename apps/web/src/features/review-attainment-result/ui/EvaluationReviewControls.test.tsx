import { cleanup, render, screen } from '@testing-library/react';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import type { AttainmentEvaluationItem } from '../../../entities/attainment-evaluation';
import { EvaluationReviewControls } from './EvaluationReviewControls';

beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      disconnect() {}
      observe() {}
      unobserve() {}
    },
  );
});

afterEach(cleanup);
afterAll(() => vi.unstubAllGlobals());

describe('EvaluationReviewControls', () => {
  it('locks an approved run even when its outcome is not achieved', () => {
    const evaluation: AttainmentEvaluationItem = {
      abilityCode: 'BA-5',
      abilityName: '工程规范与职业伦理',
      approvalStatus: 'approved',
      calculation: {
        blockers: [],
        contributions: [],
        outcome: 'not-achieved',
        ready: true,
        score: 0.68,
        weightTotal: 1,
      },
      course: '计算机网络',
      evidence: [],
      graphVersion: '图谱 v0.3',
      id: 'evaluation-ct6',
      inputSnapshot: {
        createdAt: '2026-05-12 11:05',
        hash: 'sha256:test',
      },
      inputs: [],
      objectiveCode: 'CT-6',
      objectiveName: '工程规范与伦理',
      policyVersion: 'policy v1.2',
      programVersion: 'evaluator 0.8.0',
      readinessChecks: [],
      readinessStatus: 'ready',
      runId: 'eval-2026-071',
      scoreSnapshot: '2026-05-12',
      status: 'not-achieved',
      studentCount: 40,
      threshold: 0.7,
    };

    const { container } = render(
      <EvaluationReviewControls
        blockers={[]}
        draft={{ decision: 'confirm', note: '复核说明' }}
        evaluation={evaluation}
        onDecisionChange={vi.fn()}
        onNoteChange={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByText('当前运行只读')).not.toBeNull();
    expect(
      container.querySelector<HTMLInputElement>(
        'input[type="radio"][value="confirm"]',
      )?.disabled,
    ).toBe(true);
    expect(
      screen.getByPlaceholderText<HTMLTextAreaElement>(
        '说明复核依据、发现的问题或重算建议（非必填）',
      ).disabled,
    ).toBe(true);
    expect(
      screen.getByText('保存本地草稿').closest('button')?.disabled,
    ).toBe(true);
  });
});
