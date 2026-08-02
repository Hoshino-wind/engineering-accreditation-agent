import { useCallback, useEffect } from 'react';
import { App } from 'antd';
import { useSearchParams } from 'react-router';

import type { AttainmentEvaluationSummary } from '../../../entities/attainment-evaluation';

const evaluationSearchParam = 'evaluation';
const runSearchParam = 'run';

export function useAttainmentEvaluationRouteSelection(
  evaluations: AttainmentEvaluationSummary[],
  resolved: boolean,
) {
  const { message } = App.useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const hasRequestedEvaluation = searchParams.has(
    evaluationSearchParam,
  );
  const requestedEvaluationId = hasRequestedEvaluation
    ? (searchParams.get(evaluationSearchParam) ?? '')
    : undefined;
  const requestedRunId =
    searchParams.get(runSearchParam) ?? undefined;
  const requestedEvaluation = evaluations.find(
    (evaluation) => evaluation.id === requestedEvaluationId,
  );
  const selectedEvaluation =
    requestedEvaluation ?? evaluations[0];
  const selectedEvaluationId = selectedEvaluation?.id;
  const selectedRunId =
    requestedEvaluation && requestedRunId
      ? requestedRunId
      : selectedEvaluation?.presentedRunId;

  useEffect(() => {
    if (!resolved || evaluations.length === 0) {
      return;
    }

    if (hasRequestedEvaluation && !requestedEvaluation) {
      const invalidEvaluationLabel =
        requestedEvaluationId || '（空值）';
      void message.warning(
        `未找到指定评价对象 ${invalidEvaluationLabel}，已显示当前可处理对象`,
      );
      const nextSearchParams = new URLSearchParams(searchParams);
      if (selectedEvaluation) {
        nextSearchParams.set(
          evaluationSearchParam,
          selectedEvaluation.id,
        );
        nextSearchParams.set(
          runSearchParam,
          selectedEvaluation.presentedRunId,
        );
      }
      setSearchParams(nextSearchParams, { replace: true });
      return;
    }

    if (!requestedEvaluationId && requestedRunId && selectedEvaluation) {
      void message.warning(
        `运行 ${requestedRunId} 缺少评价对象定位，已显示当前可处理对象`,
      );
      const nextSearchParams = new URLSearchParams(searchParams);
      nextSearchParams.set(
        evaluationSearchParam,
        selectedEvaluation.id,
      );
      nextSearchParams.set(
        runSearchParam,
        selectedEvaluation.presentedRunId,
      );
      setSearchParams(nextSearchParams, { replace: true });
      return;
    }

    if (requestedEvaluation && !requestedRunId) {
      const nextSearchParams = new URLSearchParams(searchParams);
      nextSearchParams.set(
        runSearchParam,
        requestedEvaluation.presentedRunId,
      );
      setSearchParams(nextSearchParams, { replace: true });
    }
  }, [
    evaluations.length,
    hasRequestedEvaluation,
    message,
    requestedEvaluation,
    requestedEvaluationId,
    requestedRunId,
    resolved,
    searchParams,
    selectedEvaluation,
    setSearchParams,
  ]);

  const selectEvaluation = useCallback(
    (evaluation: AttainmentEvaluationSummary) => {
      if (
        evaluation.id === requestedEvaluationId &&
        evaluation.presentedRunId === requestedRunId
      ) {
        return;
      }
      const nextSearchParams = new URLSearchParams(searchParams);
      nextSearchParams.set(evaluationSearchParam, evaluation.id);
      nextSearchParams.set(runSearchParam, evaluation.presentedRunId);
      setSearchParams(nextSearchParams);
    },
    [
      requestedEvaluationId,
      requestedRunId,
      searchParams,
      setSearchParams,
    ],
  );

  const recoverPresentedRun = useCallback(() => {
    if (!selectedEvaluation) {
      return;
    }
    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.set(
      evaluationSearchParam,
      selectedEvaluation.id,
    );
    nextSearchParams.set(
      runSearchParam,
      selectedEvaluation.presentedRunId,
    );
    setSearchParams(nextSearchParams, { replace: true });
  }, [searchParams, selectedEvaluation, setSearchParams]);

  const selectRun = useCallback(
    (evaluationId: string, runId: string) => {
      const nextSearchParams = new URLSearchParams(searchParams);
      nextSearchParams.set(evaluationSearchParam, evaluationId);
      nextSearchParams.set(runSearchParam, runId);
      setSearchParams(nextSearchParams);
    },
    [searchParams, setSearchParams],
  );

  return {
    recoverPresentedRun,
    selectEvaluation,
    selectRun,
    selectedEvaluationId,
    selectedRunId,
  };
}
