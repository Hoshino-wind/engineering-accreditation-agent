import { apiClient } from '../../../shared/api/client';
import type { AttainmentEvaluationPreflight } from '../model/attainmentEvaluation';
import { mapEvaluationPreflight } from '../model/mapEvaluationPreflight';
import { isRequestedEvaluationRunNotFound } from './isRequestedEvaluationRunNotFound';

const unavailableMessage = '评价输入预检服务不可用';

export async function getAttainmentEvaluationPreflight(
  runId: string,
): Promise<AttainmentEvaluationPreflight | null> {
  try {
    const { data, error, response } = await apiClient.GET(
      '/api/v1/evaluations/runs/{run_id}/preflight',
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
    if (
      error ||
      !data ||
      data.runId !== runId ||
      data.scope !== 'pilot_snapshot' ||
      data.reportVersion !== 'evaluation-preflight:v1'
    ) {
      throw new Error(unavailableMessage);
    }
    return mapEvaluationPreflight(data);
  } catch {
    throw new Error(unavailableMessage);
  }
}
