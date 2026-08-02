import { useCallback, useEffect } from 'react';
import { App } from 'antd';
import { useSearchParams } from 'react-router';

import type { ImprovementCase } from '../../../entities/improvement-case';

const caseSearchParam = 'case';

export function useImprovementCaseRouteSelection(
  cases: ImprovementCase[],
) {
  const { message } = App.useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedCaseId =
    searchParams.get(caseSearchParam)?.trim() || undefined;
  const requestedCaseExists = requestedCaseId
    ? cases.some(
        (improvementCase) =>
          improvementCase.id === requestedCaseId,
      )
    : false;
  const invalidCaseId =
    requestedCaseId && !requestedCaseExists
      ? requestedCaseId
      : undefined;
  const selectedCaseId = requestedCaseExists
    ? requestedCaseId
    : cases[0]?.id;

  useEffect(() => {
    if (!invalidCaseId) {
      return;
    }

    void message.warning(
      `未找到指定改进问题 ${invalidCaseId}，已显示当前可处理问题`,
    );
    const nextSearchParams = new URLSearchParams(searchParams);
    if (selectedCaseId) {
      nextSearchParams.set(caseSearchParam, selectedCaseId);
    } else {
      nextSearchParams.delete(caseSearchParam);
    }
    setSearchParams(nextSearchParams, { replace: true });
  }, [
    invalidCaseId,
    message,
    searchParams,
    selectedCaseId,
    setSearchParams,
  ]);

  const selectCase = useCallback(
    (caseId: string) => {
      if (caseId === requestedCaseId) {
        return;
      }

      const nextSearchParams = new URLSearchParams(searchParams);
      nextSearchParams.set(caseSearchParam, caseId);
      setSearchParams(nextSearchParams);
    },
    [requestedCaseId, searchParams, setSearchParams],
  );

  return {
    selectCase,
    selectedCaseId,
  };
}
