import { SearchOutlined } from '@ant-design/icons';
import { Card, Input, Select, Space, Table, Tag, Typography } from 'antd';
import type { TableProps } from 'antd';

import type { WorkItem } from '../model/workItem';
import { useWorkQueue } from '../model/useWorkQueue';

const statusPresentation = {
  pending: {
    color: 'orange',
    label: '待处理',
  },
  processing: {
    color: 'blue',
    label: '处理中',
  },
  blocked: {
    color: 'red',
    label: '待补充',
  },
} as const;

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
    render: (value: WorkItem['status']) => {
      const presentation = statusPresentation[value];
      return <Tag color={presentation.color}>{presentation.label}</Tag>;
    },
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
  const queue = useWorkQueue();

  return (
    <Card
      size="small"
      title="待处理事项"
      extra={
        <Typography.Text type="secondary">
          共 {queue.items.length} 项
        </Typography.Text>
      }
    >
      <Space className="work-queue-filters" size={8}>
        <Select
          aria-label="按类型筛选"
          onChange={queue.setType}
          options={[
            { value: 'all', label: '全部类型' },
            { value: '证据缺口', label: '证据缺口' },
            { value: '关系审核', label: '关系审核' },
            { value: '评价准备', label: '评价准备' },
          ]}
          value={queue.type}
        />
        <Select
          aria-label="按状态筛选"
          onChange={queue.setStatus}
          options={[
            { value: 'all', label: '全部状态' },
            { value: 'pending', label: '待处理' },
            { value: 'processing', label: '处理中' },
            { value: 'blocked', label: '待补充' },
          ]}
          value={queue.status}
        />
        <Input
          allowClear
          aria-label="搜索待处理事项"
          onChange={(event) => queue.setKeyword(event.target.value)}
          placeholder="搜索事项、课程或负责人"
          prefix={<SearchOutlined />}
          value={queue.keyword}
        />
      </Space>

      <Table<WorkItem>
        columns={columns}
        dataSource={queue.items}
        locale={{ emptyText: '没有符合条件的事项' }}
        pagination={false}
        rowKey="key"
        rowSelection={{
          type: 'radio',
          selectedRowKeys: queue.selectedRowKeys,
          onChange: queue.setSelectedRowKeys,
        }}
        scroll={{ x: 840 }}
        size="small"
      />
    </Card>
  );
}
