import { Card, Table, Tag, Typography } from 'antd';
import type { TableProps } from 'antd';

import {
  prototypeOnlyWorkItems,
  type WorkItem,
  WorkItemPriorityTag,
  WorkItemStatusTag,
} from '../../../entities/work-item';
import {
  useWorkItemFilters,
  WorkItemFiltersControl,
} from '../../../features/filter-work-items';

const columns: TableProps<WorkItem>['columns'] = [
  {
    title: '优先级',
    dataIndex: 'priority',
    key: 'priority',
    width: 72,
    render: (value: WorkItem['priority']) => (
      <WorkItemPriorityTag priority={value} />
    ),
  },
  {
    title: '模块',
    dataIndex: 'module',
    key: 'module',
    width: 64,
    render: (value: string) => <Tag color="geekblue">{value}</Tag>,
  },
  {
    title: '事项',
    dataIndex: 'title',
    key: 'title',
    minWidth: 280,
    render: (value: string) => <Typography.Text strong>{value}</Typography.Text>,
  },
  {
    title: '课程',
    dataIndex: 'course',
    key: 'course',
    width: 120,
  },
  {
    title: '类型',
    dataIndex: 'type',
    key: 'type',
    width: 92,
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 100,
    render: (value: WorkItem['status']) => (
      <WorkItemStatusTag status={value} />
    ),
  },
  {
    title: '负责人',
    dataIndex: 'owner',
    key: 'owner',
    width: 76,
  },
  {
    title: '截止时间',
    dataIndex: 'dueAt',
    key: 'dueAt',
    width: 110,
  },
  {
    title: '下一步',
    dataIndex: 'action',
    key: 'action',
    width: 132,
    render: (value: string) => (
      <Typography.Text className="work-queue-action">
        {value}
      </Typography.Text>
    ),
  },
];

export function WorkQueue() {
  const filters = useWorkItemFilters(prototypeOnlyWorkItems);

  return (
    <Card
      className="work-queue"
      size="small"
      title="我的优先任务"
      extra={
        <Typography.Text type="secondary">
          共 {filters.items.length} 项
        </Typography.Text>
      }
    >
      <WorkItemFiltersControl
        keyword={filters.keyword}
        onKeywordChange={filters.setKeyword}
        onStatusChange={filters.setStatus}
        onTypeChange={filters.setType}
        status={filters.status}
        type={filters.type}
      />

      <Table<WorkItem>
        columns={columns}
        dataSource={filters.items}
        locale={{ emptyText: '没有符合条件的事项' }}
        pagination={false}
        rowKey="key"
        rowClassName={(record) =>
          record.priority === 'high' ? 'work-queue-row--high' : ''
        }
        scroll={{ x: 1040 }}
        size="small"
      />
    </Card>
  );
}
