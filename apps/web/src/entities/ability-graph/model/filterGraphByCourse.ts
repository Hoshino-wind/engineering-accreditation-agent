/**
 * 按课程名过滤能力图谱。
 *
 * 图谱是 6 层结构：毕业要求 → 能力指标 → 课程 → 实验项目 → 知识点 → 教学资源。
 * 选中某门课后：
 * - 保留该 Course 节点
 * - 从该 Course 向下遍历 BELONGS_TO 找到实验项目
 * - 从实验项目向下遍历 COVERS_KNOWLEDGE / USES_RESOURCE 找到知识点和资源
 * - 保留所有 GraduationRequirement 和 Competency 节点（标准内置，全专业共享）
 * - 同时保留该课程/实验向上连接的 SUPPORTS_REQ / SUPPORTS 边
 * - 过滤掉其他课程及其子树
 *
 * @param graph     完整图谱
 * @param courseName 课程名（null = 全部课程，不过滤）
 */

import type { AbilityGraphData } from './abilityGraph';

export function filterGraphByCourse(
  graph: AbilityGraphData,
  courseName: string | null,
): AbilityGraphData {
  // 全部课程模式：不过滤
  if (!courseName) return graph;

  // 1. 找到匹配的 Course 节点
  const matchedCourseNodes = graph.nodes.filter(
    (n) => n.kind === 'Course' && n.name === courseName,
  );

  // 如果没找到匹配的课程，返回只含标准节点的图
  if (matchedCourseNodes.length === 0) {
    const standardNodes = graph.nodes.filter(
      (n) => n.kind === 'GraduationRequirement' || n.kind === 'Competency',
    );
    const standardNodeIds = new Set(standardNodes.map((n) => n.id));
    const standardEdges = graph.edges.filter(
      (e) =>
        standardNodeIds.has(e.source) && standardNodeIds.has(e.target),
    );
    return { nodes: standardNodes, edges: standardEdges };
  }

  const matchedCourseIds = new Set(matchedCourseNodes.map((n) => n.id));

  // 2. 从 Course 向下找 Experiment（BELONGS_TO: Experiment → Course）
  const matchedExperimentIds = new Set<string>();
  for (const edge of graph.edges) {
    if (
      edge.kind === 'BELONGS_TO' &&
      matchedCourseIds.has(edge.target) // target 是 Course
    ) {
      matchedExperimentIds.add(edge.source); // source 是 Experiment
    }
  }

  // 3. 从 Experiment 向下找 KnowledgePoint 和 TeachingResource
  const matchedKpIds = new Set<string>();
  const matchedResIds = new Set<string>();
  for (const edge of graph.edges) {
    if (matchedExperimentIds.has(edge.source)) {
      if (edge.kind === 'COVERS_KNOWLEDGE') {
        matchedKpIds.add(edge.target);
      } else if (edge.kind === 'USES_RESOURCE') {
        matchedResIds.add(edge.target);
      }
    }
  }

  // 4. 汇总保留的节点 ID
  const keepNodeIds = new Set<string>([
    ...matchedCourseIds,
    ...matchedExperimentIds,
    ...matchedKpIds,
    ...matchedResIds,
    // 标准节点全部保留
    ...graph.nodes
      .filter(
        (n) =>
          n.kind === 'GraduationRequirement' || n.kind === 'Competency',
      )
      .map((n) => n.id),
  ]);

  // 5. 过滤节点和边
  const nodes = graph.nodes.filter((n) => keepNodeIds.has(n.id));
  const edges = graph.edges.filter(
    (e) => keepNodeIds.has(e.source) && keepNodeIds.has(e.target),
  );

  return { nodes, edges };
}
