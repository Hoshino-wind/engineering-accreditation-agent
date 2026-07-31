import { FileOutlined } from '@ant-design/icons';
import { Card, Progress, Space, Table, Tag, Typography } from 'antd';
import type { TableProps } from 'antd';

import {
  TeachingResourceSensitivityTag,
  TeachingResourceStatusTag,
  type TeachingResource,
} from '../../../entities/teaching-resource';
import { TeachingResourceFilters } from '../../../features/filter-teaching-resources';
import type {
  TeachingResourceStatus,
  TeachingResourceType,
} from '../../../entities/teaching-resource';

interface TeachingResourceInventoryProps {
  course: string;
  courses: string[];
  keyword: string;
  onCourseChange: (value: string) => void;
  onKeywordChange: (value: string) => void;
  onResourceTypeChange: (value: TeachingResourceType | 'all') => void;
  onSelect: (resource: TeachingResource) => void;
  onStatusChange: (value: TeachingResourceStatus | 'all') => void;
  resourceType: TeachingResourceType | 'all';
  resources: TeachingResource[];
  selectedResourceId?: string;
  status: TeachingResourceStatus | 'all';
}

const columns: TableProps<TeachingResource>['columns'] = [
  {
    title: '材料',
    dataIndex: 'name',
    key: 'name',
    width: 246,
    render: (value: string, resource) => (
      <div className="teaching-resource-name">
        <Space size={6}>
          <FileOutlined />
          <Typography.Text strong>{value}</Typography.Text>
        </Space>
        <Typography.Text ellipsis type="secondary">
          {resource.fileName}
        </Typography.Text>
      </div>
    ),
  },
  {
    title: '课程',
    dataIndex: 'course',
    key: 'course',
    width: 108,
  },
  {
    title: '材料类型',
    dataIndex: 'resourceType',
    key: 'resourceType',
    width: 112,
    render: (value: string) => <Tag color="blue">{value}</Tag>,
  },
  {
    title: '版本',
    dataIndex: 'version',
    key: 'version',
    width: 68,
    render: (value: string, resource) => (
      <div>
        <Typography.Text>{value}</Typography.Text>
        <Typography.Text className="teaching-resource-format" type="secondary">
          {resource.format}
        </Typography.Text>
      </div>
    ),
  },
  {
    title: '处理状态',
    dataIndex: 'status',
    key: 'status',
    width: 102,
    render: (value: TeachingResource['status']) => (
      <TeachingResourceStatusTag status={value} />
    ),
  },
  {
    title: '证据片段',
    dataIndex: 'evidenceFragments',
    key: 'evidenceFragments',
    width: 82,
    align: 'right',
    render: (value: TeachingResource['evidenceFragments']) => value.length,
  },
  {
    title: '来源覆盖',
    dataIndex: 'sourceCoverage',
    key: 'sourceCoverage',
    width: 130,
    render: (value: number) => (
      <Progress percent={value} size="small" status={value < 30 ? 'exception' : 'normal'} />
    ),
  },
  {
    title: '访问',
    dataIndex: 'sensitivity',
    key: 'sensitivity',
    width: 82,
    render: (value: TeachingResource['sensitivity']) => (
      <TeachingResourceSensitivityTag sensitivity={value} />
    ),
  },
  {
    title: '更新时间',
    dataIndex: 'updatedAt',
    key: 'updatedAt',
    width: 132,
  },
];

export function TeachingResourceInventory({
  course,
  courses,
  keyword,
  onCourseChange,
  onKeywordChange,
  onResourceTypeChange,
  onSelect,
  onStatusChange,
  resourceType,
  resources,
  selectedResourceId,
  status,
}: TeachingResourceInventoryProps) {
  return (
    <Card
      className="teaching-resource-inventory"
      size="small"
      title="材料清单"
      extra={
        <Typography.Text type="secondary">
          当前显示 {resources.length} 份
        </Typography.Text>
      }
    >
      <TeachingResourceFilters
        course={course}
        courses={courses}
        keyword={keyword}
        onCourseChange={onCourseChange}
        onKeywordChange={onKeywordChange}
        onResourceTypeChange={onResourceTypeChange}
        onStatusChange={onStatusChange}
        resourceType={resourceType}
        status={status}
      />
      <Table<TeachingResource>
        columns={columns}
        dataSource={resources}
        locale={{ emptyText: '没有符合条件的教学资源' }}
        onRow={(resource) => ({
          'aria-selected': resource.id === selectedResourceId,
          onClick: () => onSelect(resource),
          onKeyDown: (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onSelect(resource);
            }
          },
          tabIndex: 0,
        })}
        pagination={false}
        rowClassName={(resource) =>
          resource.id === selectedResourceId
            ? 'teaching-resource-row--selected'
            : ''
        }
        rowKey="id"
        scroll={{ x: 1062 }}
        size="small"
      />
    </Card>
  );
}
