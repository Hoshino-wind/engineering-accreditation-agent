import { PlusOutlined } from '@ant-design/icons';
import {
  Button,
  Card,
  Table,
  Tag,
  Typography,
  type TableColumnsType,
} from 'antd';

import {
  getAbilityGraphCourseForCourseOutcome,
  type AbilityGraphNode,
  type AbilityGraphState,
  type CourseOutcomeAlignment,
} from '../../../entities/ability-graph';
import { GraphStatusTag } from '../../../widgets/ability-graph-evaluation';

const { Text } = Typography;

interface CoverageAlignmentTableProps {
  alignments: CourseOutcomeAlignment[];
  graph: AbilityGraphState;
  onOpenEdgeModal: () => void;
  onSelectCourseOutcome: (nodeId: string) => void;
  selectedCourseOutcomeId: string;
  selectedSupportTarget?: AbilityGraphNode;
}

export function CoverageAlignmentTable({
  alignments,
  graph,
  onOpenEdgeModal,
  onSelectCourseOutcome,
  selectedCourseOutcomeId,
  selectedSupportTarget,
}: CoverageAlignmentTableProps) {
  const columns: TableColumnsType<CourseOutcomeAlignment> = [
    {
      title: '课程目标',
      key: 'courseOutcome',
      width: 190,
      render: (_, alignment) => (
        <button
          className="graph-table-object"
          onClick={() =>
            onSelectCourseOutcome(alignment.courseOutcome.id)
          }
          type="button"
        >
          <span className="graph-table-object-meta">
            <Text code>{alignment.courseOutcome.code}</Text>
            <Text type="secondary">
              {getAbilityGraphCourseForCourseOutcome(
                graph,
                alignment.courseOutcome.id,
              )?.name ?? '未归属课程'}
            </Text>
          </span>
          <Text strong>{alignment.courseOutcome.name}</Text>
          <Text type="secondary">{alignment.courseOutcome.definition}</Text>
        </button>
      ),
    },
    {
      title: '教学活动',
      key: 'teaching',
      width: 105,
      render: (_, alignment) => (
        <div className="graph-table-stack">
          {alignment.experiments.length > 0 ? (
            alignment.experiments.map((node) => (
              <Text key={node.id}>{node.name}</Text>
            ))
          ) : (
            <Text type="danger">未配置实验</Text>
          )}
          <Tag
            color={alignment.experiments.length > 0 ? 'success' : 'error'}
          >
            {alignment.experiments.length > 0 ? '教到了' : '教学断点'}
          </Tag>
        </div>
      ),
    },
    {
      title: '直接评价',
      key: 'assessment',
      width: 120,
      render: (_, alignment) => (
        <div className="graph-table-stack">
          {alignment.directCriteria.length > 0 ? (
            alignment.directCriteria.map((node) => (
              <Text key={node.id}>{node.name}</Text>
            ))
          ) : (
            <Text type="danger">缺少可分离评分项</Text>
          )}
          <Tag
            color={
              alignment.directCriteria.length > 0 ? 'success' : 'error'
            }
          >
            {alignment.directCriteria.length > 0
              ? '测到了'
              : '评价断点'}
          </Tag>
        </div>
      ),
    },
    {
      title: '状态',
      key: 'status',
      width: 72,
      render: (_, alignment) => (
        <GraphStatusTag status={alignment.status} />
      ),
    },
  ];

  return (
    <Card
      className="graph-workbench-panel graph-coverage-table"
      extra={
        <Button
          icon={<PlusOutlined />}
          onClick={onOpenEdgeModal}
          size="small"
        >
          关联支撑
        </Button>
      }
      size="small"
      title={`指标点 × 课程目标${selectedSupportTarget ? `（${selectedSupportTarget.code}）` : ''}`}
    >
      <Table<CourseOutcomeAlignment>
        columns={columns}
        dataSource={alignments}
        pagination={false}
        rowClassName={(alignment) =>
          alignment.courseOutcome.id === selectedCourseOutcomeId
            ? 'graph-table-row--selected'
            : ''
        }
        rowKey={(alignment) => alignment.courseOutcome.id}
        scroll={{ y: 280 }}
        size="small"
      />
    </Card>
  );
}
