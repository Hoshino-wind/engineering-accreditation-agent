import { ArrowRightOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Empty,
  Space,
  Tag,
  Typography,
} from 'antd';

import {
  getAbilityGraphNodeById,
  type AbilityGraphNode,
  type AbilityGraphState,
  type CourseOutcomeAlignment,
} from '../../../entities/ability-graph';
import { CourseOutcomeList } from './CourseOutcomeList';

const { Text, Title } = Typography;

interface EvaluationStructureWorkspaceProps {
  alignments: CourseOutcomeAlignment[];
  graph: AbilityGraphState;
  onNavigateToEvaluations: () => void;
  onOpenEdgeModal: () => void;
  onOpenPublish: () => void;
  onSelectCourseOutcome: (nodeId: string) => void;
  selectedAlignment?: CourseOutcomeAlignment;
  selectedCourseOutcomeId: string;
}

export function EvaluationStructureWorkspace({
  alignments,
  graph,
  onNavigateToEvaluations,
  onOpenEdgeModal,
  onOpenPublish,
  onSelectCourseOutcome,
  selectedAlignment,
  selectedCourseOutcomeId,
}: EvaluationStructureWorkspaceProps) {
  const structureComplete =
    selectedAlignment?.assessmentPathComplete === true;
  const structureReady =
    structureComplete && graph.version.status === 'published';

  return (
    <section className="ability-graph-workbench">
      <CourseOutcomeList
        alignments={alignments}
        graph={graph}
        onSelect={onSelectCourseOutcome}
        selectedId={selectedCourseOutcomeId}
        title="评价对象"
      />
      <Card
        className="graph-workbench-panel graph-evidence-chain"
        size="small"
        title="能力评价结构"
      >
        {selectedAlignment ? (
          <>
            <div className="graph-evidence-flow">
              <div className="graph-evidence-step">
                <Text type="secondary">评分项</Text>
                <Text strong>
                  {selectedAlignment.directCriteria.length} 个评分项
                </Text>
                <Text>
                  {selectedAlignment.directCriteria
                    .map((criterion) => criterion.code)
                    .join('、') || '未配置'}
                </Text>
              </div>
              <div className="graph-evidence-branches">
                <div className="graph-evidence-branch">
                  <ArrowRightOutlined />
                  <div className="graph-evidence-step">
                    <Text code>ASSESSES</Text>
                    <Text strong>被评价能力或技能</Text>
                    <Text>
                      {selectedAlignment.capabilityTargets
                        .map((capability) => capability.code)
                        .join('、') || '尚未映射'}
                    </Text>
                  </div>
                </div>
                <div className="graph-evidence-branch">
                  <ArrowRightOutlined />
                  <div className="graph-evidence-step">
                    <Text code>CONTRIBUTES_TO</Text>
                    <Text strong>
                      {selectedAlignment.courseOutcome.code}
                    </Text>
                    <Text>{selectedAlignment.courseOutcome.name}</Text>
                  </div>
                </div>
              </div>
            </div>
            <div className="graph-evidence-detail">
              {selectedAlignment.directCriteria.length > 0 ? (
                selectedAlignment.directCriteria.map((criterion) => {
                  const assessedTargets = graph.edges
                    .filter(
                      (edge) =>
                        edge.status !== 'superseded' &&
                        edge.relation === 'assesses' &&
                        edge.sourceId === criterion.id,
                    )
                    .map((edge) =>
                      getAbilityGraphNodeById(graph, edge.targetId),
                    )
                    .filter(
                      (node): node is AbilityGraphNode => Boolean(node),
                    );

                  return (
                    <div key={criterion.id}>
                      <Text code>{criterion.code}</Text>
                      <Title level={5}>{criterion.name}</Title>
                      <Space size={[4, 4]} wrap>
                        <Tag color="purple">
                          ASSESSES{' '}
                          {assessedTargets
                            .map((target) => target.code)
                            .join('、') || '未映射'}
                        </Tag>
                        <Tag color="cyan">
                          CONTRIBUTES_TO{' '}
                          {selectedAlignment.courseOutcome.code}
                        </Tag>
                      </Space>
                    </div>
                  );
                })
              ) : (
                <Alert
                  description="先为考核任务补充评分项，再分别建立 ASSESSES 与 CONTRIBUTES_TO 关系。"
                  showIcon
                  title="评价结构尚未闭合"
                  type="error"
                />
              )}
            </div>
          </>
        ) : (
          <Empty description="请选择课程目标" />
        )}
      </Card>
      <Card
        className="graph-workbench-panel graph-evidence-readiness"
        extra={
          <Tag
            color={
              structureReady
                ? 'success'
                : structureComplete
                  ? 'warning'
                  : 'error'
            }
          >
            {structureReady
              ? '可正式引用'
              : structureComplete
                ? '等待发布'
                : '结构阻断'}
          </Tag>
        }
        size="small"
        title="评价运行归属"
      >
        <Space orientation="vertical" size={14}>
          <Descriptions
            column={1}
            items={[
              {
                key: 'graph',
                label: 'M2 保存',
                children: '评价对象、语义指向与课程目标归集路径',
              },
              {
                key: 'evaluation',
                label: '达成度评价保存',
                children: '教学班、样本、权重、评分输入、策略与结果',
              },
              {
                key: 'boundary',
                label: '边界',
                children: '评价运行引用已发布图谱版本，但不写回主图',
              },
            ]}
            size="small"
          />
          <Alert
            description={
              structureReady
                ? '正式评价可以引用当前结构；计算策略和结果仍在“达成度评价”中管理。'
                : structureComplete
                  ? '评价结构已经闭合，但当前仍是草稿；发布后达成度评价才能正式引用。'
                  : '评价结构未闭合，达成度评价不得生成正式结果。'
            }
            showIcon
            title={
              structureReady
                ? '结构可供评价引用'
                : structureComplete
                  ? '先发布图谱版本'
                  : '先补齐主图关系'
            }
            type={structureReady ? 'success' : 'warning'}
          />
          {structureReady ? (
            <Button onClick={onNavigateToEvaluations} type="primary">
              进入达成度评价
            </Button>
          ) : structureComplete ? (
            <Button onClick={onOpenPublish} type="primary">
              检查并发布
            </Button>
          ) : (
            <Button onClick={onOpenEdgeModal} type="primary">
              补充评价关系
            </Button>
          )}
        </Space>
      </Card>
    </section>
  );
}
