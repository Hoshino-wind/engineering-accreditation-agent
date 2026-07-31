import { ArrowRightOutlined, WarningOutlined } from '@ant-design/icons';
import { Button, Card, Empty, Tag, Typography } from 'antd';

import type {
  AbilityGraphNode,
  AbilityGraphState,
  CourseOutcomeAlignment,
} from '../../../entities/ability-graph';
import { CourseOutcomeList } from '../../../widgets/ability-graph-evaluation';
import { GraphNodeInspector } from './GraphNodeInspector';

const { Text } = Typography;

interface AlignmentWorkspaceProps {
  alignments: CourseOutcomeAlignment[];
  graph: AbilityGraphState;
  onOpenEdgeModal: () => void;
  onSelectCourseOutcome: (nodeId: string) => void;
  onSelectNode: (nodeId: string) => void;
  onStartRevision: (nodeId: string) => void;
  onUpdateNode: (
    nodeId: string,
    field: 'definition' | 'name',
    value: string,
  ) => void;
  selectedAlignment?: CourseOutcomeAlignment;
  selectedCourseOutcomeId: string;
  selectedNode?: AbilityGraphNode;
}

export function AlignmentWorkspace({
  alignments,
  graph,
  onOpenEdgeModal,
  onSelectCourseOutcome,
  onSelectNode,
  onStartRevision,
  onUpdateNode,
  selectedAlignment,
  selectedCourseOutcomeId,
  selectedNode,
}: AlignmentWorkspaceProps) {
  return (
    <section className="ability-graph-workbench">
      <CourseOutcomeList
        alignments={alignments}
        graph={graph}
        onSelect={onSelectCourseOutcome}
        selectedId={selectedCourseOutcomeId}
      />
      <Card
        className="graph-workbench-panel graph-alignment-canvas"
        size="small"
        title="课程目标—教学活动—直接评价"
      >
        {selectedAlignment ? (
          <div className="graph-alignment-flow">
            <div className="graph-alignment-column">
              <Text className="graph-alignment-column-title">
                课程目标
              </Text>
              <button
                className="graph-alignment-object graph-alignment-object--primary"
                onClick={() =>
                  onSelectNode(selectedAlignment.courseOutcome.id)
                }
                type="button"
              >
                <Text code>{selectedAlignment.courseOutcome.code}</Text>
                <Text strong>{selectedAlignment.courseOutcome.name}</Text>
                <Text type="secondary">
                  {selectedAlignment.courseOutcome.definition}
                </Text>
              </button>
            </div>
            <ArrowRightOutlined className="graph-alignment-arrow" />
            <div className="graph-alignment-column">
              <Text className="graph-alignment-column-title">
                实验教学活动
              </Text>
              {selectedAlignment.experiments.map((node) => (
                <button
                  className="graph-alignment-object"
                  key={node.id}
                  onClick={() => onSelectNode(node.id)}
                  type="button"
                >
                  <Text code>{node.code}</Text>
                  <Text strong>{node.name}</Text>
                  <Tag color="success">教到了</Tag>
                </button>
              ))}
            </div>
            <ArrowRightOutlined className="graph-alignment-arrow" />
            <div className="graph-alignment-column">
              <Text className="graph-alignment-column-title">
                考核任务
              </Text>
              {selectedAlignment.assessmentTasks.map((node) => (
                <button
                  className="graph-alignment-object"
                  key={node.id}
                  onClick={() => onSelectNode(node.id)}
                  type="button"
                >
                  <Text code>{node.code}</Text>
                  <Text strong>{node.name}</Text>
                </button>
              ))}
            </div>
            <ArrowRightOutlined className="graph-alignment-arrow" />
            <div className="graph-alignment-column">
              <Text className="graph-alignment-column-title">
                直接评价评分项
              </Text>
              {selectedAlignment.directCriteria.length > 0 ? (
                selectedAlignment.directCriteria.map((node) => (
                  <button
                    className="graph-alignment-object"
                    key={node.id}
                    onClick={() => onSelectNode(node.id)}
                    type="button"
                  >
                    <Text code>{node.code}</Text>
                    <Text strong>{node.name}</Text>
                    <Tag color="success">测到了</Tag>
                  </button>
                ))
              ) : (
                <div className="graph-alignment-missing">
                  <WarningOutlined />
                  <Text strong>缺少直接评价关系</Text>
                  <Text type="secondary">
                    评分项必须 ASSESSES 能力或技能，并通过
                    CONTRIBUTES_TO 归集到课程目标
                  </Text>
                  <Button
                    onClick={onOpenEdgeModal}
                    size="small"
                    type="primary"
                  >
                    补充关系
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <Empty description="请选择课程目标" />
        )}
      </Card>
      <GraphNodeInspector
        graph={graph}
        node={selectedNode}
        onStartRevision={onStartRevision}
        onUpdate={onUpdateNode}
      />
    </section>
  );
}
