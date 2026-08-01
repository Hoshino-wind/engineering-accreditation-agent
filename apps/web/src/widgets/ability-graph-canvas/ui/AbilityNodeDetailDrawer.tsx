import {
  Descriptions,
  Drawer,
  Empty,
  Space,
  Tag,
  Typography,
} from 'antd';

import {
  type AbilityGraphEdge,
  type AbilityGraphNode,
  EdgeKindTag,
  EdgeReviewStatusTag,
  EdgeSourceTag,
  NodeKindTag,
  nodeKindPresentation,
} from '../../../entities/ability-graph';
import './abilityNodeDetailDrawer.css';

interface AbilityNodeDetailDrawerProps {
  open: boolean;
  node: AbilityGraphNode | null;
  edges: AbilityGraphEdge[];
  nodes: AbilityGraphNode[];
  onClose: () => void;
  onJumpToNode?: (nodeId: string) => void;
}

// 节点详情抽屉：展示节点属性 + 上下游关系
// 点击关系对端可跳转，支持"点击溯源"的硬约束
export function AbilityNodeDetailDrawer({
  open,
  node,
  edges,
  nodes,
  onClose,
  onJumpToNode,
}: AbilityNodeDetailDrawerProps) {
  if (!node) {
    return (
      <Drawer onClose={onClose} open={open} title="节点详情" styles={{ wrapper: { width: 460 } }}>
        <Empty description="未选中节点" />
      </Drawer>
    );
  }

  const presentation = nodeKindPresentation[node.kind];
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // 入边：指向当前节点的关系
  const incoming = edges.filter((e) => e.target === node.id);
  // 出边：当前节点指向其他节点的关系
  const outgoing = edges.filter((e) => e.source === node.id);

  const renderEdgeItem = (edge: AbilityGraphEdge, incoming: boolean) => {
    const otherId = incoming ? edge.source : edge.target;
    const other = nodeMap.get(otherId);
    if (!other) return null;

    return (
      <div
        className="ability-graph-edge-item"
        key={edge.id}
        onClick={() => onJumpToNode?.(otherId)}
        role="button"
      >
        <Space size={6} wrap>
          <EdgeKindTag kind={edge.kind} />
          <EdgeSourceTag source={edge.sourceType} />
          <EdgeReviewStatusTag status={edge.reviewStatus} />
          {edge.strength && <Tag color={edge.strength === 'strong' ? 'green' : edge.strength === 'medium' ? 'blue' : 'default'}>{edge.strength}</Tag>}
          {edge.confidence !== undefined && (
            <Tag>置信度 {(edge.confidence * 100).toFixed(0)}%</Tag>
          )}
        </Space>
        <Typography.Text className="ability-graph-edge-target" strong>
          {other.code} · {other.name}
        </Typography.Text>
        {edge.aiReasoning && (
          <Typography.Paragraph
            className="ability-graph-edge-reasoning"
            type="secondary"
          >
            AI 依据：{edge.aiReasoning}
          </Typography.Paragraph>
        )}
      </div>
    );
  };

  return (
    <Drawer
      onClose={onClose}
      open={open}
      title={
        <Space>
          <NodeKindTag kind={node.kind} />
          <Typography.Text>{node.code}</Typography.Text>
        </Space>
      }
      styles={{ wrapper: { width: 460 } }}
    >
      <Typography.Title level={4} style={{ color: presentation.color }}>
        {node.name}
      </Typography.Title>
      {node.description && (
        <Typography.Paragraph type="secondary">
          {node.description}
        </Typography.Paragraph>
      )}

      {node.properties && Object.keys(node.properties).length > 0 && (
        <Descriptions
          column={1}
          bordered
          size="small"
          labelStyle={{ width: 120 }}
          items={Object.entries(node.properties).map(([key, value]) => ({
            key,
            label: key,
            children: String(value ?? '-'),
          }))}
        />
      )}

      <Typography.Title level={5} style={{ marginTop: 24 }}>
        上游关系（{incoming.length}）
      </Typography.Title>
      {incoming.length === 0 ? (
        <Typography.Text type="secondary">无上游关系</Typography.Text>
      ) : (
        incoming.map((edge) => renderEdgeItem(edge, true))
      )}

      <Typography.Title level={5} style={{ marginTop: 24 }}>
        下游关系（{outgoing.length}）
      </Typography.Title>
      {outgoing.length === 0 ? (
        <Typography.Text type="secondary">无下游关系</Typography.Text>
      ) : (
        outgoing.map((edge) => renderEdgeItem(edge, false))
      )}
    </Drawer>
  );
}
