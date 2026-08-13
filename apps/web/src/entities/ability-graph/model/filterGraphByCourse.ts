import type { AbilityGraphData } from './abilityGraph';

function normalize(value: unknown): string {
  return String(value ?? '').trim().toLocaleLowerCase('zh-CN');
}

function nodeMatchesCourse(
  node: AbilityGraphData['nodes'][number],
  courseName: string,
): boolean {
  const target = normalize(courseName);
  const props = node.properties ?? {};
  return [
    node.name,
    node.code,
    props.course,
    props.courseName,
    props.course_name,
    props.materialCourse,
  ].some((value) => normalize(value) === target);
}

function standardNodeIds(graph: AbilityGraphData): Set<string> {
  return new Set(
    graph.nodes
      .filter(
        (n) =>
          n.kind === 'GraduationRequirement' || n.kind === 'Competency',
      )
      .map((n) => n.id),
  );
}

export function filterGraphByCourse(
  graph: AbilityGraphData,
  courseName: string | null,
): AbilityGraphData {
  if (!courseName) return graph;

  const matchedCourseIds = new Set(
    graph.nodes
      .filter((n) => n.kind === 'Course' && nodeMatchesCourse(n, courseName))
      .map((n) => n.id),
  );

  const scopedSchoolNodeIds = new Set(
    graph.nodes
      .filter(
        (n) =>
          n.origin === 'school' &&
          n.kind !== 'Course' &&
          nodeMatchesCourse(n, courseName),
      )
      .map((n) => n.id),
  );

  if (matchedCourseIds.size === 0 && scopedSchoolNodeIds.size === 0) {
    const keepStandardIds = standardNodeIds(graph);
    return {
      nodes: graph.nodes.filter((n) => keepStandardIds.has(n.id)),
      edges: graph.edges.filter(
        (e) => keepStandardIds.has(e.source) && keepStandardIds.has(e.target),
      ),
    };
  }

  const matchedExperimentIds = new Set(
    graph.nodes
      .filter(
        (n) =>
          n.kind === 'Experiment' &&
          (scopedSchoolNodeIds.has(n.id) || nodeMatchesCourse(n, courseName)),
      )
      .map((n) => n.id),
  );
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  const matchedResIds = new Set<string>();

  for (const edge of graph.edges) {
    if (edge.kind === 'BELONGS_TO' && matchedCourseIds.has(edge.target)) {
      const sourceNode = nodeById.get(edge.source);
      if (sourceNode?.kind === 'TeachingResource') {
        matchedResIds.add(edge.source);
      } else {
        matchedExperimentIds.add(edge.source);
      }
    }
  }

  const matchedKpIds = new Set<string>();
  for (const edge of graph.edges) {
    if (matchedExperimentIds.has(edge.source)) {
      if (edge.kind === 'COVERS_KNOWLEDGE') {
        matchedKpIds.add(edge.target);
      } else if (edge.kind === 'USES_RESOURCE') {
        matchedResIds.add(edge.target);
      }
    }
  }

  const keepNodeIds = new Set<string>([
    ...standardNodeIds(graph),
    ...matchedCourseIds,
    ...scopedSchoolNodeIds,
    ...matchedExperimentIds,
    ...matchedKpIds,
    ...matchedResIds,
  ]);

  return {
    nodes: graph.nodes.filter((n) => keepNodeIds.has(n.id)),
    edges: graph.edges.filter(
      (e) => keepNodeIds.has(e.source) && keepNodeIds.has(e.target),
    ),
  };
}
