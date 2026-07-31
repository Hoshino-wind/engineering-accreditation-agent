import type {
  WorkflowEvent,
  WorkflowModule,
} from './workflowEvent';

export interface WorkflowEventFilters {
  keyword: string;
  module: WorkflowModule | 'all';
}

export function filterWorkflowEvents(
  events: readonly WorkflowEvent[],
  filters: WorkflowEventFilters,
) {
  const keyword = filters.keyword.trim().toLowerCase();

  return events.filter(
    (event) =>
      (filters.module === 'all' || event.module === filters.module) &&
      `${event.action}${event.objectId}${event.summary}${event.actor}`
        .toLowerCase()
        .includes(keyword),
  );
}

export function countBlockedWorkflowEvents(
  events: readonly WorkflowEvent[],
) {
  return events.filter((event) => event.status === 'blocked').length;
}
