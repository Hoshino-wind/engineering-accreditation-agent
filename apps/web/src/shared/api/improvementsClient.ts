import { requestJson } from './http';

export type ImprovementPriority = 'high' | 'medium' | 'low';
export type ImprovementStatus =
  | 'planned'
  | 'in-progress'
  | 'awaiting-reevaluation'
  | 'closed';

export interface ImprovementTaskResponse {
  id: string;
  displayId: string;
  sourceModule: string;
  sourceFindingId?: string | null;
  sourceLabel: string;
  title: string;
  course: string;
  targetNode: string;
  priority: ImprovementPriority;
  status: ImprovementStatus;
  owner: string;
  dueAt: string;
  actionTitle: string;
  actionDetail: string;
  verificationMethod: string;
  baseline?: number | null;
  targetValue?: number | null;
  completionSummary: string;
  evidenceUri: string;
  reevaluationResult?: number | null;
  createdAt: string;
  updatedAt: string;
  closedAt?: string | null;
  sourcePayload: Record<string, unknown>;
}

export interface ImprovementTaskUpdateRequest {
  title?: string;
  course?: string;
  targetNode?: string;
  priority?: ImprovementPriority;
  status?: ImprovementStatus;
  owner?: string;
  dueAt?: string;
  actionTitle?: string;
  actionDetail?: string;
  verificationMethod?: string;
  baseline?: number | null;
  targetValue?: number | null;
  completionSummary?: string;
  evidenceUri?: string;
  reevaluationResult?: number | null;
}

export async function fetchImprovementTasks(): Promise<ImprovementTaskResponse[]> {
  return requestJson<ImprovementTaskResponse[]>('/api/v1/improvements/tasks');
}

export async function updateImprovementTask(
  taskId: string,
  changes: ImprovementTaskUpdateRequest,
): Promise<ImprovementTaskResponse> {
  return requestJson<ImprovementTaskResponse>(
    `/api/v1/improvements/tasks/${taskId}`,
    {
      body: JSON.stringify(changes),
      method: 'PATCH',
    },
  );
}
