import {
  getPilotScoreBatchApiMocks,
  resetPilotScoreBatchApiMock,
} from './pilotScoreBatchApiMock';

import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App as AntdApp } from 'antd';
import { type Mock, vi } from 'vitest';
import { createMemoryRouter, RouterProvider } from 'react-router';

import {
  attainmentEvaluationObjectListFixture,
  attainmentEvaluationPreflightFixtures,
  attainmentEvaluationRunFixtures,
} from '../../../entities/attainment-evaluation';
import type {
  CreateAttainmentEvaluationRunInput,
  CreatedAttainmentEvaluationRun,
} from '../../../features/create-attainment-evaluation-run';
import { AttainmentEvaluationPage } from '../index';
import {
  installAttainmentEvaluationPageTestEnvironment as installPageTestEnvironment,
  restoreAttainmentEvaluationPageTestEnvironment as restorePageTestEnvironment,
} from './evaluationPageTestEnvironment';
const {
  CapturePilotScoreBatchErrorMock,
  capturePilotScoreBatchMock,
} = getPilotScoreBatchApiMocks();

interface TestEvaluationRunError extends Error {
  blockers: string[];
}

type TestEvaluationRunErrorConstructor = new (
  message?: string,
) => TestEvaluationRunError;

type CreateEvaluationRunMock = Mock<
  (
    input: CreateAttainmentEvaluationRunInput,
    context?: unknown,
  ) => Promise<CreatedAttainmentEvaluationRun>
>;

const {
  CreateEvaluationRunErrorMock,
  createEvaluationRunMock,
  getEvaluationObjectsMock,
  getEvaluationPreflightMock,
  getEvaluationRunMock,
}: {
  CreateEvaluationRunErrorMock: TestEvaluationRunErrorConstructor;
  createEvaluationRunMock: CreateEvaluationRunMock;
  getEvaluationObjectsMock: Mock;
  getEvaluationPreflightMock: Mock;
  getEvaluationRunMock: Mock;
} = vi.hoisted(() => ({
  CreateEvaluationRunErrorMock: class extends Error {
    blockers: string[] = [];
  },
  createEvaluationRunMock: vi.fn(),
  getEvaluationObjectsMock: vi.fn(),
  getEvaluationPreflightMock: vi.fn(),
  getEvaluationRunMock: vi.fn(),
}));

vi.mock(
  '../../../features/create-attainment-evaluation-run/api/createAttainmentEvaluationRun',
  () => ({
    CreateAttainmentEvaluationRunError:
      CreateEvaluationRunErrorMock,
    createAttainmentEvaluationRun: createEvaluationRunMock,
  }),
);

vi.mock(
  '../../../entities/attainment-evaluation/api/getAttainmentEvaluationObjects',
  () => ({
    getAttainmentEvaluationObjects: getEvaluationObjectsMock,
  }),
);

vi.mock(
  '../../../entities/attainment-evaluation/api/getAttainmentEvaluationPreflight',
  () => ({
    getAttainmentEvaluationPreflight: getEvaluationPreflightMock,
  }),
);

vi.mock(
  '../../../entities/attainment-evaluation/api/getAttainmentEvaluationRun',
  () => ({
    getAttainmentEvaluationRun: getEvaluationRunMock,
  }),
);

export function resetAttainmentEvaluationApiMocks() {
  resetPilotScoreBatchApiMock();
  createEvaluationRunMock.mockReset();
  getEvaluationObjectsMock.mockReset();
  getEvaluationPreflightMock.mockReset();
  getEvaluationRunMock.mockReset();
  getEvaluationObjectsMock.mockResolvedValue(
    attainmentEvaluationObjectListFixture,
  );
  getEvaluationRunMock.mockImplementation(
    (runId: string) =>
      Promise.resolve(
        attainmentEvaluationRunFixtures[runId] ?? null,
      ),
  );
  getEvaluationPreflightMock.mockImplementation(
    (runId: string) =>
      Promise.resolve(
        attainmentEvaluationPreflightFixtures[runId] ?? null,
      ),
  );
}

export {
  CapturePilotScoreBatchErrorMock,
  CreateEvaluationRunErrorMock,
  capturePilotScoreBatchMock,
  createEvaluationRunMock,
  getEvaluationObjectsMock,
  getEvaluationPreflightMock,
  getEvaluationRunMock,
};

export function getAttainmentEvaluationRunFixture(runId: string) {
  return attainmentEvaluationRunFixtures[runId];
}

export function getAttainmentEvaluationPreflightFixture(runId: string) {
  return attainmentEvaluationPreflightFixtures[runId];
}

export function installAttainmentEvaluationPageTestEnvironment() {
  installPageTestEnvironment();
}

export function restoreAttainmentEvaluationPageTestEnvironment() {
  restorePageTestEnvironment();
}

export function renderAttainmentEvaluationPage(initialEntry: string) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  const router = createMemoryRouter(
    [
      {
        path: '/evaluations',
        element: <AttainmentEvaluationPage />,
      },
      {
        path: '/graph',
        element: <div>能力图谱测试工作台</div>,
      },
    ],
    { initialEntries: [initialEntry] },
  );

  render(
    <AntdApp>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </AntdApp>,
  );
  return router;
}

export function getSelectedEvaluationRow() {
  return document.querySelector<HTMLTableRowElement>(
    'tr[aria-selected="true"]',
  );
}

export function getEvaluationRow(text: string) {
  return Array.from(
    document.querySelectorAll<HTMLTableRowElement>('tbody tr'),
  ).find((row) => row.textContent?.includes(text));
}
