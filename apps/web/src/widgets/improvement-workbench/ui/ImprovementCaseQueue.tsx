import { Card, Table, Typography } from 'antd';
import type { TableProps } from 'antd';

import {
  ImprovementCaseStatusTag,
  ImprovementSourceTag,
  type ImprovementCase,
  type ImprovementCaseStatus,
  type ImprovementSourceModule,
} from '../../../entities/improvement-case';
import { ImprovementCaseFiltersControl } from '../../../features/filter-improvement-cases';

interface ImprovementCaseQueueProps {
  cases: ImprovementCase[];
  keyword: string;
  onKeywordChange: (value: string) => void;
  onSelect: (improvementCase: ImprovementCase) => void;
  onSourceChange: (
    value: ImprovementSourceModule | 'all',
  ) => void;
  onStatusChange: (value: ImprovementCaseStatus | 'all') => void;
  selectedCaseId?: string;
  source: ImprovementSourceModule | 'all';
  status: ImprovementCaseStatus | 'all';
}

const columns: TableProps<ImprovementCase>['columns'] = [
  {
    key: 'issue',
    title: '问题',
    width: 190,
    render: (_, improvementCase) => (
      <Typography.Text ellipsis strong>
        {improvementCase.displayId.replace('QI-2026-', 'QI-')}{' '}
        {improvementCase.title}
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
    key: 'source',
    title: '来源',
    width: 70,
    render: (_, improvementCase) => (
      <ImprovementSourceTag
        module={improvementCase.source.module}
      />
    ),
  },
  {
    dataIndex: 'status',
    key: 'status',
    title: '状态',
    width: 70,
    render: (status: ImprovementCaseStatus) => (
      <ImprovementCaseStatusTag status={status} />
    ),
  },
];

export function ImprovementCaseQueue({
  cases,
  keyword,
  onKeywordChange,
  onSelect,
  onSourceChange,
  onStatusChange,
  selectedCaseId,
  source,
  status,
}: ImprovementCaseQueueProps) {
  return (
    <Card
      className="improvement-case-queue"
      extra={
        <Typography.Text type="secondary">
          当前 {cases.length} / 共 6 项
        </Typography.Text>
      }
      size="small"
      title="改进问题"
    >
      <ImprovementCaseFiltersControl
        keyword={keyword}
        onKeywordChange={onKeywordChange}
        onSourceChange={onSourceChange}
        onStatusChange={onStatusChange}
        source={source}
        status={status}
      />
      <Table<ImprovementCase>
        columns={columns}
        dataSource={cases}
        locale={{ emptyText: '没有符合条件的改进问题' }}
        onRow={(improvementCase) => ({
          'aria-selected': improvementCase.id === selectedCaseId,
          onClick: () => onSelect(improvementCase),
        })}
        pagination={false}
        rowClassName={(improvementCase) =>
          improvementCase.id === selectedCaseId
            ? 'improvement-case-row--selected'
            : ''
        }
        rowKey="id"
        rowSelection={{
          hideSelectAll: true,
          onChange: (selectedRowKeys) => {
            const selected = cases.find(
              (improvementCase) =>
                improvementCase.id === selectedRowKeys[0],
            );
            if (selected) {
              onSelect(selected);
            }
          },
          selectedRowKeys: selectedCaseId ? [selectedCaseId] : [],
          type: 'radio',
        }}
        scroll={{ y: 378 }}
        size="small"
      />
    </Card>
  );
}
