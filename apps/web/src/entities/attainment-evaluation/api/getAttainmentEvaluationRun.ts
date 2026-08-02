import { apiClient } from '../../../shared/api/client';
import type { AttainmentEvaluationItem } from '../model/attainmentEvaluation';
import { mapEvaluationRun } from '../model/mapAttainmentEvaluation';
import { isRequestedEvaluationRunNotFound } from './isRequestedEvaluationRunNotFound';

const unavailableMessage = '评价运行读取服务不可用';

export async function getAttainmentEvaluationRun(
  runId: string,
): Promise<AttainmentEvaluationItem | null> {
  try {
    const { data, error, response } = await apiClient.GET(
      '/api/v1/evaluations/runs/{run_id}',
      {
        params: {
          path: {
            run_id: runId,
          },
        },
      },
    );
    if (
      response.status === 404 &&
      isRequestedEvaluationRunNotFound(error, runId)
    ) {
      return null;
    }
    if (error || !data || data.runId !== runId) {
      throw new Error(unavailableMessage);
    }
    return mapEvaluationRun(data);
  } catch {
    throw new Error(unavailableMessage);
  }
}
