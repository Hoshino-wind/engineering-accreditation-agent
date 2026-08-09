import '@xyflow/react/dist/style.css';

import {
  Background,
  Controls,
  type Edge,
  MarkerType,
  type Node,
  type NodeMouseHandler,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
} from '@xyflow/react';
import { useEffect, useMemo } from 'react';

import {
  type AbilityGraphData,
  type AbilityGraphNode,
  type EdgeReviewStatus,
} from '../../../entities/ability-graph';
import { columnHeaderSpecs, layoutGraph } from '../model/layout';
import { AbilityGraphColumnHeader } from './AbilityGraphColumnHeader';
import { AbilityGraphNodeCard } from './AbilityGraphNodeCard';
import './abilityGraphCanvas.css';

const nodeTypes = {
  ability: AbilityGraphNodeCard,
  columnHeader: AbilityGraphColumnHeader,
};

// 关系箭头配色：与 CSS 中的线色保持一致，保证箭头与线同色
const EDGE_COLOR_PENDING = '#f5a524';
const EDGE_COLOR_APPROVED = 'rgba(203,213,225,0.55)';
const EDGE_COLOR_SELECTED = '#7aa2f7';
const EDGE_COLOR_PREVIEW = '#f5a524';

/** 待审候选在图谱上的预览边（审核时对照上下文用） */
export interface AbilityGraphPreviewEdge {
  sourceId: string;
  targetId: string;
}

// 将业务边转换为 ReactFlow Edge：
// - 带方向箭头（支撑/归属等关系有明确语义方向）
// - 待审核边橙色虚线 + 橙色箭头；已通过边浅灰实线；选中时蓝色高亮
function toFlowEdge(edge: AbilityGraphData['edges'][number]): Edge {
  const isPending = edge.reviewStatus === 'pending';
  const color = isPending ? EDGE_COLOR_PENDING : EDGE_COLOR_APPROVED;
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: 'default',
    className: isPending
      ? 'ability-graph-edge-pending'
      : 'ability-graph-edge-approved',
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color,
      width: 14,
      height: 14,
    },
    data: edge as unknown as Record<string, unknown>,
  };
}

function toFlowNode(node: AbilityGraphNode): Node {
  return {
    id: node.id,
    type: 'ability',
    position: { x: 0, y: 0 },
    data: node as unknown as Record<string, unknown>,
  };
}

interface AbilityGraphCanvasProps {
  graph: AbilityGraphData;
  onNodeClick?: (node: AbilityGraphNode) => void;
  selectedNodeId?: string;
  // 用于外部触发重新布局
  layoutVersion?: number;
  // 待审候选的预览边：审核时高亮这条关系将连接的两个节点
  previewEdge?: AbilityGraphPreviewEdge | null;
  // 链路追踪：命中的节点 id 集合与边 id 集合（null = 未激活）
  tracePath?: { nodeIds: Set<string>; edgeIds: Set<string> } | null;
}

function AbilityGraphCanvasInner({
  graph,
  onNodeClick,
  selectedNodeId,
  layoutVersion = 0,
  previewEdge = null,
  tracePath = null,
}: AbilityGraphCanvasProps) {
  const initial = useMemo(() => {
    const flowNodes = graph.nodes.map(toFlowNode);
    const flowEdges = graph.edges.map(toFlowEdge);
    const laid = layoutGraph(flowNodes, flowEdges);
    // 每个存在的列顶部插入一个不可拖动的列头标签节点
    const headerNodes: Node[] = columnHeaderSpecs(laid.nodes).map((spec) => ({
      id: `col-header-${spec.kind}`,
      type: 'columnHeader',
      position: { x: spec.x, y: spec.y },
      data: { kind: spec.kind, count: spec.count },
      draggable: false,
      selectable: false,
    }));
    return { nodes: [...headerNodes, ...laid.nodes], edges: laid.edges };
    // layoutVersion 变化时重新计算布局
  }, [graph, layoutVersion]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initial.edges);

  // graph 数据或布局版本变化时同步画布状态（审核通过/驳回后图谱实时刷新依赖此处）
  useEffect(() => {
    setNodes(initial.nodes);
    setEdges(initial.edges);
  }, [initial, setNodes, setEdges]);

  // 节点高亮：
  // - 链路追踪模式：路径内节点正常显示（路径内非选中节点加青色描边），路径外节点变暗
  // - 选中节点靛蓝描边（始终优先）
  // - 预览边的两端节点琥珀描边
  const decoratedNodes = useMemo(() => {
    const traceActive = tracePath !== null;
    return nodes.map((node) => {
      const isColHeader = node.type !== 'ability';
      const inTrace = traceActive && tracePath.nodeIds.has(node.id);
      const dimmed = traceActive && !inTrace && !isColHeader;

      // 选中节点（靛蓝）> 追踪路径节点（青色）> 预览边节点（琥珀）
      if (node.id === selectedNodeId) {
        return {
          ...node,
          className: dimmed ? 'ability-graph-node-dimmed' : '',
          style: {
            ...node.style,
            outline: '2px solid #7aa2f7',
            boxShadow: '0 0 0 4px rgba(122,162,247,0.28)',
          },
        };
      }
      if (inTrace) {
        return {
          ...node,
          style: {
            ...node.style,
            outline: '2px solid #38b2ac',
            boxShadow: '0 0 0 3px rgba(56,178,172,0.25)',
          },
        };
      }
      if (
        previewEdge &&
        (node.id === previewEdge.sourceId || node.id === previewEdge.targetId)
      ) {
        return {
          ...node,
          className: dimmed ? 'ability-graph-node-dimmed' : '',
          style: {
            ...node.style,
            outline: '2px solid #f5a524',
            boxShadow: '0 0 0 4px rgba(245,165,36,0.3)',
          },
        };
      }
      if (dimmed) {
        return { ...node, className: 'ability-graph-node-dimmed' };
      }
      return node;
    });
  }, [nodes, selectedNodeId, previewEdge, tracePath]);

  const decoratedEdges = useMemo(() => {
    const traceActive = tracePath !== null;

    return edges.map((edge) => {
      // 链路追踪模式：路径内边高亮，路径外边变暗
      if (traceActive) {
        const inTrace = tracePath.edgeIds.has(edge.id);
        if (inTrace) {
          return {
            ...edge,
            className: 'ability-graph-edge-traced',
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: '#38b2ac',
              width: 16,
              height: 16,
            },
          };
        }
        return { ...edge, className: 'ability-graph-edge-dimmed' };
      }

      // 默认模式：选中节点的直接关联边高亮
      if (
        selectedNodeId &&
        (edge.source === selectedNodeId || edge.target === selectedNodeId)
      ) {
        return {
          ...edge,
          className: 'ability-graph-edge-selected',
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: EDGE_COLOR_SELECTED,
            width: 16,
            height: 16,
          },
        };
      }
      return edge;
    });
  }, [edges, selectedNodeId, tracePath]);

  // 待审候选的预览边：审核时对照图谱上下文，显示这条关系将连向哪两个节点
  const previewFlowEdge = useMemo<Edge | null>(() => {
    if (!previewEdge) return null;
    const { sourceId, targetId } = previewEdge;
    const hasSource = nodes.some((n) => n.id === sourceId);
    const hasTarget = nodes.some((n) => n.id === targetId);
    if (!hasSource || !hasTarget) return null;
    return {
      id: 'preview-candidate-edge',
      source: sourceId,
      target: targetId,
      type: 'default',
      className: 'ability-graph-edge-preview',
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: EDGE_COLOR_PREVIEW,
        width: 16,
        height: 16,
      },
      data: { preview: true },
    };
  }, [previewEdge, nodes]);

  const finalEdges = useMemo(
    () => (previewFlowEdge ? [...decoratedEdges, previewFlowEdge] : decoratedEdges),
    [decoratedEdges, previewFlowEdge],
  );

  const handleNodeClick: NodeMouseHandler = (_, node) => {
    if (node.type !== 'ability') return;
    onNodeClick?.(node.data as unknown as AbilityGraphNode);
  };

  return (
    <div className="ability-graph-canvas">
      <ReactFlow
        edges={finalEdges}
        nodes={decoratedNodes}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        fitView
        fitViewOptions={{ padding: 0.16 }}
        minZoom={0.2}
        maxZoom={1.8}
        proOptions={{ hideAttribution: true }}
      >
        {/* 深色画布背景下用极淡的小圆点做深度参考 */}
        <Background color="rgba(255,255,255,0.05)" gap={24} size={1} />
        <Controls
          showInteractive={false}
          position="bottom-right"
          className="ability-graph-controls"
        />
      </ReactFlow>
    </div>
  );
}

export function AbilityGraphCanvas(props: AbilityGraphCanvasProps) {
  return (
    <ReactFlowProvider>
      <AbilityGraphCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

// 导出审核状态工具，供外部使用
export type { EdgeReviewStatus };
