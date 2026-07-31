import { Card, Table, Typography } from 'antd';
import type { TableProps } from 'antd';

import {
  DiagnosticFindingRiskTag,
  DiagnosticFindingTypeTag,
  type DiagnosticFinding,
  type DiagnosticFindingRisk,
  type DiagnosticFindingType,
} from '../../../entities/diagnostic-finding';
import { DiagnosticFindingFiltersControl } from '../../../features/filter-diagnostic-findings';

interface DiagnosticFindingQueueProps {
  course: string;
  courses: string[];
  findingType: DiagnosticFindingType | 'all';
  findings: DiagnosticFinding[];
  keyword: string;
  onCourseChange: (value: string) => void;
  onFindingTypeChange: (value: DiagnosticFindingType | 'all') => void;
  onKeywordChange: (value: string) => void;
  onRiskChange: (value: DiagnosticFindingRisk | 'all') => void;
  onSelect: (finding: DiagnosticFinding) => void;
  risk: DiagnosticFindingRisk | 'all';
  selectedFindingId?: string;
}

const columns: TableProps<DiagnosticFinding>['columns'] = [
  {
    dataIndex: 'title',
    key: 'title',
    title: '发现标题',
    width: 206,
    render: (value: string, finding) => (
      <div className="diagnostic-queue-title">
        <Typography.Text strong>{value}</Typography.Text>
        <div>
          <DiagnosticFindingTypeTag findingType={finding.type} />
          <Typography.Text type="secondary">
            {finding.course}
          </Typography.Text>
        </div>
      </div>
    ),
  },
  {
    dataIndex: 'risk',
    key: 'risk',
    title: '风险',
    width: 70,
    render: (value: DiagnosticFindingRisk) => (
      <DiagnosticFindingRiskTag risk={value} />
    ),
  },
];

export function DiagnosticFindingQueue({
  course,
  courses,
  findingType,
  findings,
  keyword,
  onCourseChange,
  onFindingTypeChange,
  onKeywordChange,
  onRiskChange,
  onSelect,
  risk,
  selectedFindingId,
}: DiagnosticFindingQueueProps) {
  return (
    <Card
      className="diagnostic-finding-queue"
      extra={
        <Typography.Text type="secondary">
          当前 {findings.length} / 共 23 项
        </Typography.Text>
      }
      size="small"
      title="诊断发现"
    >
      <DiagnosticFindingFiltersControl
        course={course}
        courses={courses}
        findingType={findingType}
        keyword={keyword}
        onCourseChange={onCourseChange}
        onFindingTypeChange={onFindingTypeChange}
        onKeywordChange={onKeywordChange}
        onRiskChange={onRiskChange}
        risk={risk}
      />
      <Table<DiagnosticFinding>
        columns={columns}
        dataSource={findings}
        locale={{ emptyText: '没有符合条件的诊断发现' }}
        onRow={(finding) => ({
          'aria-selected': finding.id === selectedFindingId,
          onClick: () => onSelect(finding),
        })}
        pagination={false}
        rowClassName={(finding) =>
          finding.id === selectedFindingId
            ? 'diagnostic-finding-row--selected'
            : ''
        }
        rowKey="id"
        rowSelection={{
          hideSelectAll: true,
          onChange: (selectedRowKeys) => {
            const selected = findings.find(
              (finding) => finding.id === selectedRowKeys[0],
            );
            if (selected) {
              onSelect(selected);
            }
          },
          selectedRowKeys: selectedFindingId
            ? [selectedFindingId]
            : [],
          type: 'radio',
        }}
        scroll={{ y: 366 }}
        size="small"
      />
    </Card>
  );
}
