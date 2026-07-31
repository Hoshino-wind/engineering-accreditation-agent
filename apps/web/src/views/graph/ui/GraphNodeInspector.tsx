import { EditOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Empty,
  Input,
  Space,
  Tag,
  Typography,
} from 'antd';

import {
  abilityGraphNodeTypeLabels,
  type AbilityGraphNode,
  type AbilityGraphNodeType,
  type AbilityGraphState,
} from '../../../entities/ability-graph';

const { Text } = Typography;

const nodeTypeColors: Record<AbilityGraphNodeType, string> = {
  'graduate-outcome': 'geekblue',
  'performance-indicator': 'blue',
  course: 'cyan',
  'course-outcome': 'cyan',
  ability: 'purple',
  skill: 'magenta',
  knowledge: 'gold',
  experiment: 'green',
  'teaching-resource': 'lime',
  'assessment-task': 'purple',
  'rubric-criterion': 'gold',
};

interface GraphNodeInspectorProps {
  graph: AbilityGraphState;
  node?: AbilityGraphNode;
  onStartRevision: (nodeId: string) => void;
  onUpdate: (
    nodeId: string,
    field: 'definition' | 'name',
    value: string,
  ) => void;
}

export function GraphNodeInspector({
  graph,
  node,
  onStartRevision,
  onUpdate,
}: GraphNodeInspectorProps) {
  if (!node) {
    return (
      <Card
        className="graph-workbench-panel graph-inspector"
        size="small"
        title="对象检查器"
      >
        <Empty description="请选择一个图谱对象" />
      </Card>
    );
  }

  const editable = node.status === 'draft';
  const relationCount = graph.edges.filter(
    (edge) =>
      edge.status !== 'superseded' &&
      (edge.sourceId === node.id || edge.targetId === node.id),
  ).length;

  return (
    <Card
      className="graph-workbench-panel graph-inspector"
      extra={
        <Tag color={editable ? 'warning' : 'success'}>
          {editable ? '修订草稿' : '正式只读'}
        </Tag>
      }
      size="small"
      title="对象检查器"
    >
      <Space orientation="vertical" size={12}>
        <div className="graph-object-code">
          <Text code>{node.code}</Text>
          <Tag color={nodeTypeColors[node.type]}>
            {abilityGraphNodeTypeLabels[node.type]}
          </Tag>
        </div>
        <label>
          <Text strong>对象名称</Text>
          <Input
            defaultValue={node.name}
            disabled={!editable}
            key={`${node.id}:${node.version}:name`}
            onBlur={(event) =>
              onUpdate(node.id, 'name', event.target.value)
            }
          />
        </label>
        <label>
          <Text strong>可观察定义</Text>
          <Input.TextArea
            defaultValue={node.definition}
            disabled={!editable}
            key={`${node.id}:${node.version}:definition`}
            onBlur={(event) =>
              onUpdate(node.id, 'definition', event.target.value)
            }
            rows={3}
          />
        </label>
        <Descriptions
          column={1}
          items={[
            { key: 'version', label: '对象版本', children: node.version },
            {
              key: 'nodeVersionId',
              label: '版本标识',
              children: node.nodeVersionId,
            },
            { key: 'owner', label: '责任人', children: node.owner },
            {
              key: 'source',
              label: '来源',
              children: `${node.source.material} ${node.source.version}`,
            },
            {
              key: 'coordinate',
              label: '来源坐标',
              children: node.source.coordinate,
            },
            {
              key: 'sourceRefId',
              label: '来源引用',
              children: node.source.sourceRefId,
            },
            {
              key: 'relations',
              label: '有效关系',
              children: `${relationCount} 条`,
            },
          ]}
          size="small"
        />
        {editable ? (
          <Alert
            description="修改只进入当前图谱草稿，发布后才形成新的正式版本。"
            showIcon
            type="info"
          />
        ) : (
          <Button
            icon={<EditOutlined />}
            onClick={() => onStartRevision(node.id)}
          >
            创建修订
          </Button>
        )}
      </Space>
    </Card>
  );
}
