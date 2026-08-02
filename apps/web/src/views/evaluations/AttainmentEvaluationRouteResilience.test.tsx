import {
  act,
  cleanup,
  fireEvent,
  waitFor,
} from '@testing-library/react';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from 'vitest';

import type { AttainmentEvaluationObjectList } from '../../entities/attainment-evaluation';
import {
  attainmentEvaluationObjectListFixture,
  attainmentEvaluationRunFixtures,
} from '../../entities/attainment-evaluation/testing';
import {
  getEvaluationObjectsMock,
  getEvaluationRunMock,
  getSelectedEvaluationRow,
  installAttainmentEvaluationPageTestEnvironment,
  renderAttainmentEvaluationPage,
  resetAttainmentEvaluationApiMocks,
  restoreAttainmentEvaluationPageTestEnvironment,
} from './testing/attainmentEvaluationPageTestHarness';

beforeAll(installAttainmentEvaluationPageTestEnvironment);
afterAll(restoreAttainmentEvaluationPageTestEnvironment);

beforeEach(() => {
  resetAttainmentEvaluationApiMocks();
});

afterEach(cleanup);

describe('AttainmentEvaluationPage async route resilience', () => {
  it('preserves an exact deep link until the object list resolves', async () => {
    let resolveObjects:
      | ((value: AttainmentEvaluationObjectList) => void)
      | undefined;
    getEvaluationObjectsMock.mockReturnValue(
      new Promise<AttainmentEvaluationObjectList>((resolve) => {
        resolveObjects = resolve;
      }),
    );
    const router = renderAttainmentEvaluationPage(
      '/evaluations?focus=review&evaluation=evaluation-ct6&run=eval-2026-071',
    );

    expect(router.state.location.search).toBe(
      '?focus=review&evaluation=evaluation-ct6&run=eval-2026-071',
    );
    expect(document.body.textContent).toContain(
      '正在读取服务端评价对象',
    );

    await act(async () => {
      resolveObjects?.(attainmentEvaluationObjectListFixture);
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(getSelectedEvaluationRow()?.textContent).toContain('CT-6');
    });
    expect(router.state.location.search).toBe(
      '?focus=review&evaluation=evaluation-ct6&run=eval-2026-071',
    );
  });

  it('does not trim or case-normalize an opaque object ID', async () => {
    const router = renderAttainmentEvaluationPage(
      '/evaluations?focus=review&evaluation=%20evaluation-ct6%20&run=eval-2026-071',
    );

    await waitFor(() => {
      expect(router.state.location.search).toBe(
        '?focus=review&evaluation=evaluation-ct3&run=eval-2026-066',
      );
    });
    expect(getSelectedEvaluationRow()?.textContent).toContain('CT-3');
  });

  it('preserves the URL on list failure and recovers through retry', async () => {
    getEvaluationObjectsMock.mockRejectedValueOnce(
      new Error('service unavailable'),
    );
    const router = renderAttainmentEvaluationPage(
      '/evaluations?evaluation=evaluation-ct6&run=eval-2026-071',
    );

    await waitFor(() => {
      expect(document.body.textContent).toContain('评价对象读取失败');
    });
    expect(router.state.location.search).toBe(
      '?evaluation=evaluation-ct6&run=eval-2026-071',
    );

    getEvaluationObjectsMock.mockResolvedValue(
      attainmentEvaluationObjectListFixture,
    );
    fireEvent.click(
      document.querySelector<HTMLButtonElement>(
        '.ant-alert-error .ant-alert-actions button',
      )!,
    );
    await waitFor(() => {
      expect(getSelectedEvaluationRow()?.textContent).toContain('CT-6');
    });
  });

  it('renders a successful empty queue without inventing a default', async () => {
    getEvaluationObjectsMock.mockResolvedValue({
      items: [],
      total: 0,
    });
    const router = renderAttainmentEvaluationPage('/evaluations');

    await waitFor(() => {
      expect(document.body.textContent).toContain(
        '当前周期暂无评价对象',
      );
    });
    expect(router.state.location.search).toBe('');
    expect(getEvaluationRunMock).not.toHaveBeenCalled();
  });

  it('recovers an unavailable historical run to the presented run', async () => {
    getEvaluationRunMock.mockImplementation((runId: string) =>
      Promise.resolve(
        runId === 'missing-run'
          ? null
          : attainmentEvaluationRunFixtures[runId] ?? null,
      ),
    );
    const router = renderAttainmentEvaluationPage(
      '/evaluations?evaluation=evaluation-ct6&run=missing-run',
    );

    await waitFor(() => {
      expect(router.state.location.search).toBe(
        '?evaluation=evaluation-ct6&run=eval-2026-071',
      );
    });
    await waitFor(() => {
      expect(document.body.textContent).toContain('eval-2026-071');
    });
  });

  it('keeps an exact historical run when it belongs to the object', async () => {
    const router = renderAttainmentEvaluationPage(
      '/evaluations?evaluation=evaluation-ct6&run=eval-2026-072',
    );

    await waitFor(() => {
      expect(document.body.textContent).toContain('eval-2026-072');
      expect(document.body.textContent).toContain('图谱 v0.4');
      expect(document.body.textContent).toContain(
        '正在查看非当前展示运行',
      );
      expect(document.body.textContent).toContain(
        '左侧队列展示运行 eval-2026-071 的摘要',
      );
      expect(document.body.textContent).toContain(
        '当前中、右区域展示指定运行 eval-2026-072 的不可变快照',
      );
    });
    expect(router.state.location.search).toBe(
      '?evaluation=evaluation-ct6&run=eval-2026-072',
    );
  });

  it('preserves the requested run when the detail service fails', async () => {
    getEvaluationRunMock.mockRejectedValue(
      new Error('service unavailable'),
    );
    const router = renderAttainmentEvaluationPage(
      '/evaluations?evaluation=evaluation-ct6&run=eval-2026-071',
    );

    await waitFor(() => {
      expect(document.body.textContent).toContain(
        '无法读取权威评价运行',
      );
    });
    expect(router.state.location.search).toBe(
      '?evaluation=evaluation-ct6&run=eval-2026-071',
    );
  });
});
