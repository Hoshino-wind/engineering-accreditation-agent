import { Card, Input, Select, Space, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useMemo, useState } from 'react';

import {
  filterWorkflowEvents,
  recordWorkflowEvent,
  WorkflowEventStatusTag,
  type WorkflowEvent,
  type WorkflowModule,
} from '../../../entities/workflow-event';
import { ExportWorkflowEventsButton } from '../../../features/export-workflow-events';

const timestampFormatter = new Intl.DateTimeFormat('zh-CN', {
  dateStyle: 'short',
  timeStyle: 'medium',
});

const moduleOptions = [
  { label: '全部模块', value: 'all' },
  ...Array.from({ length: 9 }, (_, index) => {
    const value = `M${index + 1}` as WorkflowModule;
    return { label: value, value };
  }),
];

const columns: ColumnsType<WorkflowEvent> = [
  {
    title: '时间',
    dataIndex: 'timestamp',
    key: 'timestamp',
    render: (value: string) =>
      timestampFormatter.format(new Date(value)),
    width: 170,
  },
  {
    title: '模块',
    dataIndex: 'module',
    key: 'module',
    render: (value: string) => <Tag color="blue">{value}</Tag>,
    width: 80,
  },
  {
    title: '动作',
    dataIndex: 'action',
    key: 'action',
    width: 150,
  },
  {
    title: '对象',
    dataIndex: 'objectId',
    key: 'objectId',
    width: 180,
    ellipsis: true,
  },
  {
    title: '结果摘要',
    dataIndex: 'summary',
    key: 'summary',
    ellipsis: true,
  },
  {
    title: '操作者',
    dataIndex: 'actor',
    key: 'actor',
    width: 100,
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    render: (status: WorkflowEvent['status']) => (
      <WorkflowEventStatusTag status={status} />
    ),
    width: 90,
  },
];

interface AuditEventsPanelProps {
  workflowEvents: readonly WorkflowEvent[];
}

export function AuditEventsPanel({
  workflowEvents,
}: AuditEventsPanelProps) {
  const [module, setModule] = useState<WorkflowModule | 'all'>('all');
  const [keyword, setKeyword] = useState('');
  const auditEvents = useMemo(
    () => filterWorkflowEvents(workflowEvents, { keyword, module }),
    [keyword, module, workflowEvents],
  );

  const recordExport = () => {
    recordWorkflowEvent({
      module: 'M9',
      action: '导出审计记录',
      objectId: `audit-export-${Date.now()}`,
      summary: `已导出 ${auditEvents.length} 条审计事件`,
      actor: '王老师',
      status: 'success',
    });
  };

  return (
    <Card
      className="governance-tab-card"
      extra={
        <ExportWorkflowEventsButton
          events={auditEvents}
          label="导出 CSV"
          onExport={recordExport}
        />
      }
      size="small"
      title="追加审计事件"
    >
      <Space className="governance-audit-filters">
        <Select
          aria-label="按模块筛选审计事件"
          onChange={setModule}
          options={moduleOptions}
          value={module}
        />
        <Input.Search
          allowClear
          aria-label="搜索审计事件"
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="搜索动作、对象、摘要或操作者"
          value={keyword}
        />
      </Space>
      <Table<WorkflowEvent>
        columns={columns}
        dataSource={[...auditEvents]}
        locale={{
          emptyText:
            '完成一次图谱、审核或提交操作后，审计事件会显示在这里',
        }}
        pagination={false}
        rowKey="id"
        scroll={{ y: 378 }}
        size="small"
      />
    </Card>
  );
}
