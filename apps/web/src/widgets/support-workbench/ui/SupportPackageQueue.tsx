import { Card, Table, Typography } from 'antd';
import type { TableProps } from 'antd';

import {
  SupportPackageStatusTag,
  type SupportPackage,
  type SupportPackageStatus,
  type SupportTemplateKind,
} from '../../../entities/support-package';
import { SupportPackageFiltersControl } from '../../../features/filter-support-packages';

interface SupportPackageQueueProps {
  keyword: string;
  onKeywordChange: (value: string) => void;
  onSelect: (supportPackage: SupportPackage) => void;
  onStatusChange: (value: SupportPackageStatus | 'all') => void;
  onTemplateChange: (value: SupportTemplateKind | 'all') => void;
  packages: SupportPackage[];
  selectedPackageId?: string;
  status: SupportPackageStatus | 'all';
  template: SupportTemplateKind | 'all';
  total: number;
}

const templateLabels: Record<SupportTemplateKind, string> = {
  capstone: '毕业设计',
  'course-teaching': '课程教学',
  'experiment-teaching': '实验教学',
};

const columns: TableProps<SupportPackage>['columns'] = [
  {
    key: 'package',
    title: '支撑包',
    width: 190,
    render: (_, supportPackage) => (
      <Typography.Text ellipsis strong>
        {supportPackage.displayId.replace('SP-2026-', 'SP-')}{' '}
        {supportPackage.title}
      </Typography.Text>
    ),
  },
  {
    dataIndex: 'course',
    ellipsis: true,
    key: 'course',
    title: '课程',
    width: 76,
  },
  {
    key: 'template',
    title: '模板',
    width: 70,
    render: (_, supportPackage) =>
      templateLabels[supportPackage.template.kind],
  },
  {
    dataIndex: 'status',
    key: 'status',
    title: '状态',
    width: 70,
    render: (status: SupportPackageStatus) => (
      <SupportPackageStatusTag status={status} />
    ),
  },
];

export function SupportPackageQueue({
  keyword,
  onKeywordChange,
  onSelect,
  onStatusChange,
  onTemplateChange,
  packages,
  selectedPackageId,
  status,
  template,
  total,
}: SupportPackageQueueProps) {
  return (
    <Card
      className="support-package-queue"
      extra={
        <Typography.Text type="secondary">
          当前 {packages.length} / 共 {total} 项
        </Typography.Text>
      }
      size="small"
      title="支撑包"
    >
      <SupportPackageFiltersControl
        keyword={keyword}
        onKeywordChange={onKeywordChange}
        onStatusChange={onStatusChange}
        onTemplateChange={onTemplateChange}
        status={status}
        template={template}
      />
      <Table<SupportPackage>
        columns={columns}
        dataSource={packages}
        locale={{ emptyText: '没有符合条件的支撑包' }}
        onRow={(supportPackage) => ({
          'aria-selected': supportPackage.id === selectedPackageId,
          onClick: () => onSelect(supportPackage),
        })}
        pagination={false}
        rowClassName={(supportPackage) =>
          supportPackage.id === selectedPackageId
            ? 'support-package-row--selected'
            : ''
        }
        rowKey="id"
        rowSelection={{
          hideSelectAll: true,
          onChange: (selectedRowKeys) => {
            const selected = packages.find(
              (supportPackage) =>
                supportPackage.id === selectedRowKeys[0],
            );
            if (selected) {
              onSelect(selected);
            }
          },
          selectedRowKeys: selectedPackageId
            ? [selectedPackageId]
            : [],
          type: 'radio',
        }}
        scroll={{ y: 378 }}
        size="small"
      />
    </Card>
  );
}
