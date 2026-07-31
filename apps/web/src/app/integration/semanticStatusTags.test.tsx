import { cleanup, render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { EvaluationStatusTag } from '../../entities/attainment-evaluation';
import { DiagnosticFindingRiskTag } from '../../entities/diagnostic-finding';
import { ImprovementCaseStatusTag } from '../../entities/improvement-case';
import { RecognitionCandidateRiskTag } from '../../entities/recognition-candidate';
import { RoleAssignmentStatusTag } from '../../entities/role-assignment';
import { SupportPackageStatusTag } from '../../entities/support-package';
import { TeachingResourceStatusTag } from '../../entities/teaching-resource';
import {
  WorkItemPriorityTag,
  WorkItemStatusTag,
} from '../../entities/work-item';
import { WorkflowEventStatusTag } from '../../entities/workflow-event';

afterEach(cleanup);

function expectSemanticTone(
  element: ReactElement,
  tone: 'default' | 'error' | 'processing' | 'success' | 'warning',
) {
  const { container } = render(element);

  expect(container.querySelector(`.ant-tag-${tone}`)).not.toBeNull();
}

describe('业务状态标签语义色', () => {
  it('把成功、警告、错误和处理中状态映射到 Ant Design 语义色', () => {
    expectSemanticTone(
      <EvaluationStatusTag status="approved" />,
      'success',
    );
    expectSemanticTone(
      <EvaluationStatusTag status="awaiting-review" />,
      'warning',
    );
    expectSemanticTone(
      <EvaluationStatusTag status="blocked" />,
      'error',
    );
    expectSemanticTone(
      <ImprovementCaseStatusTag status="in-progress" />,
      'processing',
    );
  });

  it('对风险和优先级使用一致的严重度语义', () => {
    expectSemanticTone(<DiagnosticFindingRiskTag risk="high" />, 'error');
    expectSemanticTone(
      <DiagnosticFindingRiskTag risk="medium" />,
      'warning',
    );
    expectSemanticTone(<DiagnosticFindingRiskTag risk="low" />, 'success');
    expectSemanticTone(
      <RecognitionCandidateRiskTag risk="lowConfidence" />,
      'warning',
    );
    expectSemanticTone(<WorkItemPriorityTag priority="high" />, 'error');
  });

  it('覆盖资源、支撑包和待办的关键状态', () => {
    expectSemanticTone(
      <SupportPackageStatusTag status="ready-for-review" />,
      'processing',
    );
    expectSemanticTone(
      <SupportPackageStatusTag status="changes-required" />,
      'warning',
    );
    expectSemanticTone(
      <TeachingResourceStatusTag status="quarantined" />,
      'error',
    );
    expectSemanticTone(
      <RoleAssignmentStatusTag status="pending" />,
      'warning',
    );
    expectSemanticTone(<WorkItemStatusTag status="pending" />, 'warning');
    expectSemanticTone(
      <WorkItemStatusTag status="processing" />,
      'processing',
    );
    expectSemanticTone(
      <WorkflowEventStatusTag status="blocked" />,
      'error',
    );
    expectSemanticTone(
      <WorkflowEventStatusTag status="pending" />,
      'processing',
    );
  });
});
