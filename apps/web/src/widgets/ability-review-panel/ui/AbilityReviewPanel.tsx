import {
  CheckOutlined,
  CloseOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Checkbox,
  Empty,
  Space,
  Tag,
  Typography,
} from 'antd';
import { useMemo, useState } from 'react';

import {
  type AbilityGraphEdge,
  type AbilityGraphNode,
  EdgeKindTag,
  EdgeReviewStatusTag,
  EdgeSourceTag,
  NodeKindTag,
  nodeKindPresentation,
} from '../../../entities/ability-graph';
import './abilityReviewPanel.css';

const { Paragraph, Text, Title } = Typography;

interface AbilityReviewPanelProps {
  node: AbilityGraphNode | null;
  edges: AbilityGraphEdge[];
  nodes: AbilityGraphNode[];
  onJumpToNode?: (nodeId: string) => void;
  // 审核操作回调（仅 UI 状态，后端接入后改为调用 API）
  onApproveEdge?: (edgeId: string) => void;
  onRejectEdge?: (edgeId: string) => void;
  onModifyEdge?: (edgeId: string) => void;
}

// 节点审核面板：
// - 顶部：节点基本信息（类型/编号/名称/描述）
// - 中部：该节点的待审核 AI 关系列表，每条可单独通过/修改/驳回
// - 底部：批量审核操作（全选/批量通过/批量驳回）
// 对齐 PRD：右侧 30% 宽度固定面板，作为图谱页的审核工作台
export function AbilityReviewPanel({
  node,
  edges,
  nodes,
  onJumpToNode,
  onApproveEdge,
  onRejectEdge,
  onModifyEdge,
}: AbilityReviewPanelProps) {
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<Set<string>>(new Set());

  const nodeMap = useMemo(
    () => new Map(nodes.map((n) => [n.id, n])),
    [nodes],
  );

  // 当前节点的待审核关系（出边或入边）
  const pendingEdges = useMemo(() => {
    if (!node) return [];
    return edges.filter(
      (e) =>
        (e.source === node.id || e.target === node.id) &&
        e.reviewStatus === 'pending',
    );
  }, [edges, node]);

  // 当前节点的已通过关系，作为上下文展示
  const approvedEdges = useMemo(() => {
    if (!node) return [];
    return edges.filter(
      (e) =>
        (e.source === node.id || e.target === node.id) &&
        e.reviewStatus === 'approved',
    );
  }, [edges, node]);

  if (!node) {
    return (
      <aside className="ability-review-panel ability-review-panel-empty">
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <Space direction="vertical" size={4}>
              <Text type="secondary">点击左侧图谱节点</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                查看待审核的 AI 推荐关系
              </Text>
            </Space>
          }
        />
      </aside>
    );
  }

  const presentation = nodeKindPresentation[node.kind];

  const toggleSelect = (edgeId: string) => {
    setSelectedEdgeIds((prev) => {
      const next = new Set(prev);
      if (next.has(edgeId)) {
        next.delete(edgeId);
      } else {
        next.add(edgeId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedEdgeIds.size === pendingEdges.length) {
      setSelectedEdgeIds(new Set());
    } else {
      setSelectedEdgeIds(new Set(pendingEdges.map((e) => e.id)));
    }
  };

  const handleBatchApprove = () => {
    selectedEdgeIds.forEach((id) => onApproveEdge?.(id));
    setSelectedEdgeIds(new Set());
  };

  const handleBatchReject = () => {
    selectedEdgeIds.forEach((id) => onRejectEdge?.(id));
    setSelectedEdgeIds(new Set());
  };

  const renderEdgeItem = (edge: AbilityGraphEdge) => {
    const otherId = edge.source === node.id ? edge.target : edge.source;
    const other = nodeMap.get(otherId);
    const direction = edge.source === node.id ? '出' : '入';
    if (!other) return null;

    return (
      <div key={edge.id} className="ability-review-edge-item">
        <div className="ability-review-edge-head">
          <Checkbox
            checked={selectedEdgeIds.has(edge.id)}
            onChange={() => toggleSelect(edge.id)}
          />
          <Space size={4} wrap>
            <Tag color={direction === '出' ? 'blue' : 'purple'}>
              {direction}边
            </Tag>
            <EdgeKindTag kind={edge.kind} />
            <EdgeSourceTag source={edge.sourceType} />
            <EdgeReviewStatusTag status={edge.reviewStatus} />
            {edge.strength && (
              <Tag
                color={
                  edge.strength === 'strong'
                    ? 'green'
                    : edge.strength === 'medium'
                      ? 'blue'
                      : 'default'
                }
              >
                {edge.strength}
              </Tag>
            )}
            {edge.confidence !== undefined && (
              <Tag>置信度 {(edge.confidence * 100).toFixed(0)}%</Tag>
            )}
          </Space>
        </div>
        <div
          className="ability-review-edge-target"
          onClick={() => onJumpToNode?.(otherId)}
          role="button"
        >
          <NodeKindTag kind={other.kind} />
          <Text strong>
            {other.code} · {other.name}
          </Text>
        </div>
        {edge.aiReasoning && (
          <Paragraph className="ability-review-edge-reasoning" type="secondary">
            <ExclamationCircleOutlined style={{ marginRight: 4 }} />
            AI 依据：{edge.aiReasoning}
          </Paragraph>
        )}
        {(edge.reviewedBy || edge.reviewedAt || edge.evidenceSummary) && (
          <div className="ability-review-edge-trace">
            <Space size={6} wrap>
              {edge.reviewedBy && <Tag color="green">{edge.reviewedBy}</Tag>}
              {edge.reviewedAt && <Tag>{edge.reviewedAt}</Tag>}
            </Space>
            {edge.evidenceSummary && (
              <Text type="secondary">{edge.evidenceSummary}</Text>
            )}
          </div>
        )}
        <Space size={6} className="ability-review-edge-actions">
          <Button
            size="small"
            type="primary"
            icon={<CheckOutlined />}
            onClick={() => onApproveEdge?.(edge.id)}
          >
            确认
          </Button>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => onModifyEdge?.(edge.id)}
          >
            修改
          </Button>
          <Button
            size="small"
            danger
            icon={<CloseOutlined />}
            onClick={() => onRejectEdge?.(edge.id)}
          >
            驳回
          </Button>
        </Space>
      </div>
    );
  };

  return (
    <aside
      className="ability-review-panel"
      style={{ borderTop: `3px solid ${presentation.color}` }}
    >
      <div className="ability-review-panel-header">
        <Space size={6}>
          <NodeKindTag kind={node.kind} />
          <Text type="secondary" className="ability-review-node-code">
            {node.code}
          </Text>
        </Space>
        <Title level={4} style={{ color: presentation.color, margin: '8px 0 4px' }}>
          {node.name}
        </Title>
        {node.description && (
          <Paragraph type="secondary" className="ability-review-node-desc">
            {node.description}
          </Paragraph>
        )}
      </div>

      <div className="ability-review-panel-body">
        {pendingEdges.length > 0 && (
          <div className="ability-review-section">
            <div className="ability-review-section-head">
              <Space>
                <TeamOutlined />
                <Text strong>待审核 AI 关系（{pendingEdges.length}）</Text>
              </Space>
              <Checkbox
                checked={
                  selectedEdgeIds.size === pendingEdges.length &&
                  pendingEdges.length > 0
                }
                indeterminate={
                  selectedEdgeIds.size > 0 &&
                  selectedEdgeIds.size < pendingEdges.length
                }
                onChange={toggleSelectAll}
              >
                全选
              </Checkbox>
            </div>

            {selectedEdgeIds.size > 0 && (
              <Alert
                className="ability-review-batch-bar"
                type="info"
                showIcon={false}
                message={
                  <Space size={8}>
                    <Text>已选 {selectedEdgeIds.size} 项</Text>
                    <Button
                      size="small"
                      type="primary"
                      icon={<CheckOutlined />}
                      onClick={handleBatchApprove}
                    >
                      批量通过
                    </Button>
                    <Button
                      size="small"
                      danger
                      icon={<CloseOutlined />}
                      onClick={handleBatchReject}
                    >
                      批量驳回
                    </Button>
                  </Space>
                }
              />
            )}

            <div className="ability-review-edge-list">
              {pendingEdges.map(renderEdgeItem)}
            </div>
          </div>
        )}

        {pendingEdges.length === 0 && (
          <Alert
            type="success"
            showIcon
            message="当前节点暂无待审核关系"
            description={`已有 ${approvedEdges.length} 条已通过关系`}
            style={{ margin: '12px 0' }}
          />
        )}

        <div className="ability-review-section">
          <Text strong type="secondary">
            已通过关系（{approvedEdges.length}）作为上下文
          </Text>
          <div className="ability-review-approved-list">
            {approvedEdges.slice(0, 8).map((edge) => {
              const otherId =
                edge.source === node.id ? edge.target : edge.source;
              const other = nodeMap.get(otherId);
              if (!other) return null;
              return (
                <div
                  key={edge.id}
                  className="ability-review-approved-item"
                  onClick={() => onJumpToNode?.(otherId)}
                  role="button"
                >
                  <EdgeKindTag kind={edge.kind} />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {other.code} · {other.name}
                  </Text>
                </div>
              );
            })}
            {approvedEdges.length > 8 && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                …共 {approvedEdges.length} 条，仅显示前 8 条
              </Text>
            )}
            {approvedEdges.length === 0 && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                无已通过关系
              </Text>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
