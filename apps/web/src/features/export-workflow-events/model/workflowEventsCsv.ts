import type { WorkflowEvent } from '../../../entities/workflow-event';

const auditCsvHeader = [
  '时间',
  '模块',
  '动作',
  '对象',
  '摘要',
  '操作者',
  '状态',
] as const;

export function serializeWorkflowEventsCsv(
  events: readonly WorkflowEvent[],
) {
  const rows = events.map((event) => [
    event.timestamp,
    event.module,
    event.action,
    event.objectId,
    event.summary,
    event.actor,
    event.status,
  ]);
  const csv = [auditCsvHeader, ...rows]
    .map((row) =>
      row
        .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
        .join(','),
    )
    .join('\n');

  return `\uFEFF${csv}`;
}

export function getWorkflowEventsCsvFilename(date = new Date()) {
  return `audit-events-${date.toISOString().slice(0, 10)}.csv`;
}

export function downloadWorkflowEventsCsv(
  events: readonly WorkflowEvent[],
) {
  const url = URL.createObjectURL(
    new Blob([serializeWorkflowEventsCsv(events)], {
      type: 'text/csv;charset=utf-8',
    }),
  );
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = getWorkflowEventsCsvFilename();
  anchor.click();
  URL.revokeObjectURL(url);
}
