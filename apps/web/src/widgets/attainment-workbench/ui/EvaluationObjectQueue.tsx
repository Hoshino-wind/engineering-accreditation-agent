import { Card, Table, Typography } from 'antd';
import type { TableProps } from 'antd';

import {
  EvaluationStatusTag,
  type AttainmentEvaluationItem,
  type EvaluationItemStatus,
} from '../../../entities/attainment-evaluation';
import { calculateAttainment } from '../../../features/calculate-attainment';
import { AttainmentEvaluationFiltersControl } from '../../../features/filter-attainment-evaluations';

interface EvaluationObjectQueueProps {
  course: string;
  courses: string[];
  evaluations: AttainmentEvaluationItem[];
  keyword: string;
  onCourseChange: (value: string) => void;
  onKeywordChange: (value: string) => void;
  onSelect: (evaluation: AttainmentEvaluationItem) => void;
  onStatusChange: (value: EvaluationItemStatus | 'all') => void;
  selectedEvaluationId?: string;
  status: EvaluationItemStatus | 'all';
}

const columns: TableProps<AttainmentEvaluationItem>['columns'] = [
  {
    key: 'objective',
    title: '课程目标',
    width: 180,
    render: (_, evaluation) => (
      <Typography.Text strong>
        {evaluation.objectiveCode} {evaluation.objectiveName}
      </Typography.Text>
    ),
  },
  {
    dataIndex: 'course',
    ellipsis: true,
    key: 'course',
    title: '课程',
    width: 86,
  },
  {
    dataIndex: 'status',
    key: 'status',
    title: '状态',
    width: 76,
    render: (status: EvaluationItemStatus) => (
      <EvaluationStatusTag status={status} />
    ),
  },
  {
    align: 'right',
    key: 'result',
    title: '结果',
    width: 58,
    render: (_, evaluation) => {
      const result = calculateAttainment(evaluation);
      return result.score?.toFixed(2) ?? '—';
    },
  },
];

export function EvaluationObjectQueue({
  course,
  courses,
  evaluations,
  keyword,
  onCourseChange,
  onKeywordChange,
  onSelect,
  onStatusChange,
  selectedEvaluationId,
  status,
}: EvaluationObjectQueueProps) {
  return (
    <Card
      className="evaluation-object-queue"
      extra={
        <Typography.Text type="secondary">
          当前 {evaluations.length} / 共 6 项
        </Typography.Text>
      }
      size="small"
      title="评价对象"
    >
      <AttainmentEvaluationFiltersControl
        course={course}
        courses={courses}
        keyword={keyword}
        onCourseChange={onCourseChange}
        onKeywordChange={onKeywordChange}
        onStatusChange={onStatusChange}
        status={status}
      />
      <Table<AttainmentEvaluationItem>
        columns={columns}
        dataSource={evaluations}
        locale={{ emptyText: '没有符合条件的评价对象' }}
        onRow={(evaluation) => ({
          'aria-selected': evaluation.id === selectedEvaluationId,
          onClick: () => onSelect(evaluation),
        })}
        pagination={false}
        rowClassName={(evaluation) =>
          evaluation.id === selectedEvaluationId
            ? 'evaluation-object-row--selected'
            : ''
        }
        rowKey="id"
        rowSelection={{
          hideSelectAll: true,
          onChange: (selectedRowKeys) => {
            const selected = evaluations.find(
              (evaluation) => evaluation.id === selectedRowKeys[0],
            );
            if (selected) {
              onSelect(selected);
            }
          },
          selectedRowKeys: selectedEvaluationId
            ? [selectedEvaluationId]
            : [],
          type: 'radio',
        }}
        scroll={{ y: 378 }}
        size="small"
      />
    </Card>
  );
}
