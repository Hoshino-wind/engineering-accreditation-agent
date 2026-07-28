import type { Key } from 'react';
import { useState } from 'react';

import { Card, Table, Typography } from 'antd';
import type { TableProps } from 'antd';

import {
  prototypeOnlyWorkItems,
  type WorkItem,
  WorkItemStatusTag,
} from '../../../entities/work-item';
import {
  useWorkItemFilters,
  WorkItemFiltersControl,
} from '../../../features/filter-work-items';

const columns: TableProps<WorkItem>['columns'] = [
  {
    title: '事项',
    dataIndex: 'title',
    key: 'title',
    minWidth: 240,
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
    width: 100,
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
    width: 90,
  },
  {
    title: '更新时间',
    dataIndex: 'updatedAt',
    key: 'updatedAt',
    width: 156,
  },
];

export function WorkQueue() {
  const filters = useWorkItemFilters(prototypeOnlyWorkItems);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([
    prototypeOnlyWorkItems[0]?.key ?? '',
  ]);

  return (
    <Card
      size="small"
      title="待处理事项"
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
        rowSelection={{
          type: 'radio',
          selectedRowKeys,
          onChange: setSelectedRowKeys,
        }}
        scroll={{ x: 840 }}
        size="small"
      />
    </Card>
  );
}
