import { Card, Typography } from 'antd';

import {
  getAbilityGraphCourseForCourseOutcome,
  type AbilityGraphState,
  type CourseOutcomeAlignment,
} from '../../../entities/ability-graph';
import { GraphStatusTag } from './GraphStatusTag';

const { Text } = Typography;

interface CourseOutcomeListProps {
  alignments: CourseOutcomeAlignment[];
  graph: AbilityGraphState;
  onSelect: (nodeId: string) => void;
  selectedId?: string;
  title?: string;
}

export function CourseOutcomeList({
  alignments,
  graph,
  onSelect,
  selectedId,
  title = '课程目标',
}: CourseOutcomeListProps) {
  return (
    <Card
      className="graph-workbench-panel graph-course-list"
      size="small"
      title={title}
    >
      <div className="graph-course-list-items">
        {alignments.map((alignment) => (
          <button
            className={
              selectedId === alignment.courseOutcome.id
                ? 'graph-course-row graph-course-row--selected'
                : 'graph-course-row'
            }
            key={alignment.courseOutcome.id}
            onClick={() => onSelect(alignment.courseOutcome.id)}
            type="button"
          >
            <span className="graph-course-row-heading">
              <Text code>{alignment.courseOutcome.code}</Text>
              <GraphStatusTag status={alignment.status} />
            </span>
            <Text strong>{alignment.courseOutcome.name}</Text>
            <Text type="secondary">
              {getAbilityGraphCourseForCourseOutcome(
                graph,
                alignment.courseOutcome.id,
              )?.name ?? '未关联课程'}
            </Text>
          </button>
        ))}
      </div>
    </Card>
  );
}
