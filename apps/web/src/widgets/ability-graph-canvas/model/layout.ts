import type { Edge, Node } from '@xyflow/react';

import type { AbilityGraphNodeKind } from '../../../entities/ability-graph';

// 按原型图 [prototype.html#L820-L859] 的分列布局：
// 列 0：毕业要求（红 #C53030）
// 列 1：能力指标（橙 #DD6B20）
// 列 2：课程（蓝）
// 列 3：实验项目（紫）
// 列 4：知识点（青 #319795）
// 列 5：教学资源（绿 #2D7A4F）
// 每列节点自上而下均匀分布，横向按业务维度从左到右展开
// 这不是流程图（有方向），也不是力导向（放射），而是按业务语义分列的图谱
const KIND_TO_COLUMN: Record<AbilityGraphNodeKind, number> = {
  GraduationRequirement: 0,
  Competency: 1,
  Course: 2,
  Experiment: 3,
  KnowledgePoint: 4,
  TeachingResource: 5,
};

// 对齐原型图 [prototype.html#L837-L849] 的横向紧凑布局：
// 毕业要求/能力指标~40 课程~240 实验~430 知识点~620 资源~810
const COLUMN_X = [40, 240, 430, 620, 810, 1000];
const NODE_WIDTH = 160;
const NODE_HEIGHT = 56;
const NODE_GAP_Y = 22;
const COL_TOP_PADDING = 30;

interface DagreNodePosition {
  x: number;
  y: number;
}

// 按列分组，每列单独排版，列内节点按其在该列的顺序自上而下分布
export function layoutGraph(
  nodes: Node[],
  edges: Edge[],
): { nodes: Node[]; edges: Edge[] } {
  if (nodes.length === 0) {
    return { nodes, edges };
  }

  // 构造 kind -> node[] 的分组
  const byKind = new Map<AbilityGraphNodeKind, Node[]>();
  for (const node of nodes) {
    const data = node.data as { kind?: AbilityGraphNodeKind };
    const kind = data.kind ?? 'KnowledgePoint';
    if (!byKind.has(kind)) byKind.set(kind, []);
    byKind.get(kind)!.push(node);
  }

  // 每列独立算高度，然后取最高列做对齐基准，较矮的列做垂直居中偏移
  const colHeights: Record<number, number> = {};
  for (const [kind, list] of byKind) {
    const col = KIND_TO_COLUMN[kind];
    colHeights[col] =
      list.length * NODE_HEIGHT + Math.max(0, list.length - 1) * NODE_GAP_Y;
  }
  const maxHeight = Math.max(0, ...Object.values(colHeights));

  const positionedById = new Map<string, DagreNodePosition>();
  for (const [kind, list] of byKind) {
    const col = KIND_TO_COLUMN[kind];
    const colX = COLUMN_X[col] ?? 0;
    const thisHeight = colHeights[col] ?? 0;
    // 让较矮的列垂直居中对齐到最高列
    const colYStart =
      maxHeight === 0
        ? COL_TOP_PADDING
        : COL_TOP_PADDING + (maxHeight - thisHeight) / 2;
    list.forEach((node, index) => {
      const y = colYStart + index * (NODE_HEIGHT + NODE_GAP_Y);
      positionedById.set(node.id, { x: colX, y });
    });
  }

  const positionedNodes = nodes.map((node) => ({
    ...node,
    position: positionedById.get(node.id) ?? { x: 0, y: 0 },
  }));

  return { nodes: positionedNodes, edges };
}
