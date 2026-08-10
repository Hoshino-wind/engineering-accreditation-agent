import {
  ArrowRightOutlined,
  CheckOutlined,
  CloseOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { Button, Empty, message, Space, Tag, Typography } from 'antd';
import { useMemo } from 'react';

import {
  type AbilityGraphEdge,
  type AbilityGraphNode,
  EdgeKindTag,
  EdgeSourceTag,
  NodeKindTag,
  nodeKindPresentation,
} from '../../../entities/ability-graph';
import {
  reviewCandidate,
  type BackendCandidateDecision,
} from '../../../shared/api/recognitionClient';
import './abilityReviewPanel.css';

const { Paragraph, Text, Title } = Typography;

interface AbilityReviewPanelProps {
  node: AbilityGraphNode | null;
  edges: AbilityGraphEdge[];
  nodes: AbilityGraphNode[];
  /** 候选 ID 映射（edge.id → candidate.id），用于就地审核写回 */
  edgeCandidateMap?: Record<string, string>;
  onJumpToNode?: (nodeId: string) => void;
  /** 审核完成后刷新图谱和候选数据 */
  onReviewed?: (edgeId: string, decision: 'approved' | 'rejected') => void;
}

const strengthLabels: Record<'strong' | 'medium' | 'weak', { color: string; label: string }> = {
  strong: { color: 'green', label: '强支撑' },
  medium: { color: 'blue', label: '中支撑' },
  weak: { color: 'default', label: '弱支撑' },
};

// 节点关系面板（支持就地审核）：
// - 展示选中节点的上下游关系，用户在图谱视觉上下文中判断合理性
// - AI 待审核边提供「采纳/驳回」按钮，审核通过后实时生效
export function AbilityReviewPanel({
  node,
  edges,
  nodes,
  edgeCandidateMap = {},
  onJumpToNode,
  onReviewed,
}: AbilityReviewPanelProps) {
  const nodeMap = useMemo(
    () => new Map(nodes.map((n) => [n.id, n])),
    [nodes],
  );

  const relatedEdges = useMemo(() => {
    if (!node) return [];
    return edges.filter((e) => e.source === node.id || e.target === node.id);
  }, [edges, node]);

  const pendingEdges = useMemo(
    () => relatedEdges.filter((e) => e.reviewStatus === 'pending'),
    [relatedEdges],
  );
  const approvedEdges = useMemo(
    () =>
      relatedEdges.filter(
        (e) => e.reviewStatus === 'approved' || e.reviewStatus === 'modified',
      ),
    [relatedEdges],
  );
  const rejectedCount = useMemo(
    () => relatedEdges.filter((e) => e.reviewStatus === 'rejected').length,
    [relatedEdges],
  );

  if (!node) {
    return (
      <aside className="ability-review-panel ability-review-panel-empty">
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <Space direction="vertical" size={4}>
              <Text type="secondary">点击左侧图谱节点</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                对照图谱上下文审核 AI 推荐关系
              </Text>
            </Space>
          }
        />
      </aside>
    );
  }

  const presentation = nodeKindPresentation[node.kind];
  const isStandard = node.origin === 'standard';

  const handleReview = async (edgeId: string, decision: BackendCandidateDecision) => {
    const candidateId = edgeCandidateMap[edgeId];
    if (!candidateId) {
      message.error('未找到这条图谱边对应的后端候选记录，请先刷新图谱或到 M4 识别与审核处理');
      return;
    }
    const ok = await reviewCandidate(candidateId, decision);
    if (!ok) {
      message.error('审核写入失败，请重试');
      return;
    }
    message.success(decision === 'accept' ? '已采纳，关系生效' : '已驳回');
    onReviewed?.(edgeId, decision === 'accept' ? 'approved' : 'rejected');
  };

  const renderEdgeItem = (edge: AbilityGraphEdge, showActions: boolean) => {
    const otherId = edge.source === node.id ? edge.target : edge.source;
    const other = nodeMap.get(otherId);
    const direction = edge.source === node.id ? '出' : '入';
    if (!other) return null;

    const isPending = edge.reviewStatus === 'pending';

    return (
      <div
        key={edge.id}
        className={`ability-review-edge-item ${
          isPending
            ? 'ability-review-edge-item-pending'
            : 'ability-review-edge-item-approved'
        }`}
      >
        <div className="ability-review-edge-head">
          <Space size={4} wrap>
            <Tag color={direction === '出' ? 'blue' : 'purple'}>
              {direction}边
            </Tag>
            <EdgeKindTag kind={edge.kind} />
            <EdgeSourceTag source={edge.sourceType} />
            {edge.strength && (
              <Tag color={strengthLabels[edge.strength].color}>
                {strengthLabels[edge.strength].label}
              </Tag>
            )}
            {edge.confidence !== undefined && (
              <Tag>置信 {(edge.confidence * 100).toFixed(0)}%</Tag>
            )}
          </Space>
        </div>
        <div
          className="ability-review-edge-target"
          onClick={() => onJumpToNode?.(otherId)}
          role="button"
        >
          <NodeKindTag kind={other.kind} />
          <Text strong className="ability-review-edge-target-name">
            {other.code} · {other.name}
          </Text>
          <ArrowRightOutlined className="ability-review-edge-target-arrow" />
        </div>
        {edge.aiReasoning && (
          <Paragraph className="ability-review-edge-reasoning" type="secondary">
            <ExclamationCircleOutlined style={{ marginRight: 4 }} />
            {edge.sourceType === 'ai' ? 'AI 依据：' : '依据：'}
            {edge.aiReasoning}
          </Paragraph>
        )}

        {showActions && isPending && (
          <div className="ability-review-edge-actions">
            <Button
              size="small"
              type="primary"
              icon={<CheckOutlined />}
              onClick={() => void handleReview(edge.id, 'accept')}
            >
              采纳
            </Button>
            <Button
              size="small"
              danger
              icon={<CloseOutlined />}
              onClick={() => void handleReview(edge.id, 'reject')}
            >
              驳回
            </Button>
          </div>
        )}
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
          <Tag color={isStandard ? 'gold' : 'default'}>
            {isStandard ? '内置标准' : '学校上传'}
          </Tag>
        </Space>
        <Title level={4} style={{ color: presentation.color, margin: '8px 0 4px' }}>
          {node.name}
        </Title>
        {node.description && (
          <Paragraph type="secondary" className="ability-review-node-desc">
            {node.description}
          </Paragraph>
        )}
        <Paragraph className="ability-review-panel-note" type="secondary">
          对照图谱上下文判断这条关系的合理性：采纳即计入覆盖度/达成度计算，驳回则不计入。
        </Paragraph>
      </div>

      <div className="ability-review-panel-body">
        {pendingEdges.length > 0 && (
          <div className="ability-review-section">
            <div className="ability-review-section-head">
              <Text strong>
                待审核 AI 推荐关系（{pendingEdges.length}）
              </Text>
              <Tag color="orange">对照图谱上下文判断</Tag>
            </div>
            <div className="ability-review-edge-list">
              {pendingEdges.map((e) => renderEdgeItem(e, true))}
            </div>
          </div>
        )}

        {pendingEdges.length === 0 && approvedEdges.length > 0 && (
          <div className="ability-review-section">
            <Text type="secondary" style={{ fontSize: 12 }}>
              当前节点没有待审核的 AI 推荐关系。
            </Text>
          </div>
        )}

        <div className="ability-review-section">
          <div className="ability-review-section-head">
            <Text strong>已确认关系（{approvedEdges.length}）</Text>
          </div>
          {approvedEdges.length > 0 ? (
            <div className="ability-review-edge-list">
              {approvedEdges.slice(0, 10).map((e) => renderEdgeItem(e, false))}
            </div>
          ) : (
            <Text type="secondary" style={{ fontSize: 12 }}>
              暂无已确认关系
            </Text>
          )}
          {approvedEdges.length > 10 && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              …共 {approvedEdges.length} 条，仅显示前 10 条
            </Text>
          )}
        </div>

        {rejectedCount > 0 && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            另有 {rejectedCount} 条已驳回关系，不计入覆盖度，不在图谱中显示。
          </Text>
        )}
      </div>
    </aside>
  );
}
