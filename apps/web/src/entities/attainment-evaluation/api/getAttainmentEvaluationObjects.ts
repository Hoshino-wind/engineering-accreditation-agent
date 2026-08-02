import { apiClient } from '../../../shared/api/client';
import type { AttainmentEvaluationObjectList } from '../model/attainmentEvaluation';
import { mapEvaluationSummary } from '../model/mapAttainmentEvaluation';

const unavailableMessage = '评价对象读取服务不可用';

export async function getAttainmentEvaluationObjects(): Promise<AttainmentEvaluationObjectList> {
  try {
    const { data, error } = await apiClient.GET(
      '/api/v1/evaluations/objects',
    );
    if (
      error ||
      !data ||
      data.total !== data.items.length
    ) {
      throw new Error(unavailableMessage);
    }
    const items = data.items.map(mapEvaluationSummary);
    if (
      new Set(items.map((item) => item.id)).size !== items.length ||
      new Set(items.map((item) => item.presentedRunId)).size !==
        items.length
    ) {
      throw new Error(unavailableMessage);
    }
    return {
      items,
      total: data.total,
    };
  } catch {
    throw new Error(unavailableMessage);
  }
}
