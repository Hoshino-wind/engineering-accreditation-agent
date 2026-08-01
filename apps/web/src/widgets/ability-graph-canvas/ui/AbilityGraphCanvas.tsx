import '@xyflow/react/dist/style.css';

import {
  Background,
  Controls,
  type Edge,
  type Node,
  type NodeMouseHandler,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
} from '@xyflow/react';
import { useMemo } from 'react';

import {
  type AbilityGraphData,
  type AbilityGraphNode,
  type EdgeReviewStatus,
} from '../../../entities/ability-graph';
import { layoutGraph } from '../model/layout';
import { AbilityGraphNodeCard } from './AbilityGraphNodeCard';
import './abilityGraphCanvas.css';

const nodeTypes = { ability: AbilityGraphNodeCard };

// 将业务边转换为 ReactFlow Edge
// 力导向布局下用 default（贝塞尔曲线）更符合网状视觉
// 待审核边用虚线橙色突出，已通过用灰色实线，被选中时高亮蓝色
function toFlowEdge(
  edge: AbilityGraphData['edges'][number],
): Edge {
  const isPending = edge.reviewStatus === 'pending';
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: 'default',
    className: isPending
      ? 'ability-graph-edge-pending'
      : 'ability-graph-edge-approved',
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
}

function AbilityGraphCanvasInner({
  graph,
  onNodeClick,
  selectedNodeId,
  layoutVersion = 0,
}: AbilityGraphCanvasProps) {
  const initial = useMemo(() => {
    const flowNodes = graph.nodes.map(toFlowNode);
    const flowEdges = graph.edges.map(toFlowEdge);
    return layoutGraph(flowNodes, flowEdges);
    // layoutVersion 变化时重新计算布局
  }, [graph, layoutVersion]);

  const [nodes, , onNodesChange] = useNodesState(initial.nodes);
  const [edges, , onEdgesChange] = useEdgesState(initial.edges);

  // 选中节点时高亮：深色背景下用亮蓝色描边 + 白色外光晕（对齐原型图视觉）
  const decoratedNodes = useMemo(() => {
    if (!selectedNodeId) return nodes;
    return nodes.map((node) =>
      node.id === selectedNodeId
        ? {
            ...node,
            style: {
              ...node.style,
              outline: '2px solid #63b3ed',
              boxShadow: '0 0 0 3px rgba(99,179,237,0.4)',
            },
          }
        : node,
    );
  }, [nodes, selectedNodeId]);

  const decoratedEdges = useMemo(() => {
    if (!selectedNodeId) return edges;
    return edges.map((edge) =>
      edge.source === selectedNodeId || edge.target === selectedNodeId
        ? { ...edge, className: 'ability-graph-edge-selected' }
        : edge,
    );
  }, [edges, selectedNodeId]);

  const handleNodeClick: NodeMouseHandler = (_, node) => {
    onNodeClick?.(node.data as unknown as AbilityGraphNode);
  };

  return (
    <div className="ability-graph-canvas">
      <ReactFlow
        edges={decoratedEdges}
        nodes={decoratedNodes}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={1.8}
        proOptions={{ hideAttribution: true }}
      >
        {/* 深色画布背景下用极淡的小圆点（原型图无网格，仅做深度参考） */}
        <Background color="rgba(255,255,255,0.06)" gap={22} size={1} />
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
