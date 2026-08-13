import type { AbilityGraphData } from '../../../entities/ability-graph';
import type {
  CompetencyCoverageData,
  CoverageData,
  RequirementCoverageData,
} from '../../../shared/api/graphClient';

function matchesCourseName(value: unknown, courseName: string): boolean {
  const normalized = String(value ?? '').trim();
  return normalized === courseName;
}

function sourceNodeIdsForCourse(
  graph: AbilityGraphData,
  courseName: string,
): Set<string> {
  const courseIds = new Set(
    graph.nodes
      .filter(
        (node) =>
          node.kind === 'Course' &&
          (matchesCourseName(node.name, courseName) ||
            matchesCourseName(node.properties?.courseName, courseName) ||
            matchesCourseName(node.properties?.course, courseName)),
      )
      .map((node) => node.id),
  );

  if (courseIds.size === 0) return new Set();

  const sourceIds = new Set<string>(courseIds);
  for (const edge of graph.edges) {
    if (edge.kind === 'BELONGS_TO' && courseIds.has(edge.target)) {
      sourceIds.add(edge.source);
    }
  }
  return sourceIds;
}

function competencyMatchesCourse(
  competency: CompetencyCoverageData,
  courseName: string,
  sourceIds: Set<string>,
): boolean {
  if (competency.supporters.includes(courseName)) return true;
  return competency.evidence.some((item) => sourceIds.has(item.sourceNodeId));
}

/**
 * Scope backend coverage to the currently selected course.
 *
 * Backend coverage supporters are evidence node names, usually experiments, not
 * course names. The course filter therefore has to use the graph hierarchy:
 * Experiment --BELONGS_TO--> Course, then keep competencies whose evidence
 * source node belongs to the selected course.
 */
export function filterCoverageByCourse(
  coverage: CoverageData,
  courseName: string | null,
  graph: AbilityGraphData,
): CoverageData {
  if (!courseName) return coverage;

  const scopedSourceIds = sourceNodeIdsForCourse(graph, courseName);
  if (scopedSourceIds.size === 0 && graph.nodes.length === 0) {
    return coverage;
  }

  const filteredComps = coverage.competencies.filter((competency) =>
    competencyMatchesCourse(competency, courseName, scopedSourceIds),
  );

  const compsByReq = new Map<string, CompetencyCoverageData[]>();
  for (const comp of filteredComps) {
    const list = compsByReq.get(comp.requirementCode) ?? [];
    list.push(comp);
    compsByReq.set(comp.requirementCode, list);
  }

  const filteredReqs: RequirementCoverageData[] = coverage.requirements.map(
    (req) => {
      const comps = compsByReq.get(req.code) ?? [];
      const coveredCount = comps.filter((c) => c.status === 'covered').length;
      const supportedCount = comps.filter((c) => c.status !== 'gap').length;
      const competencyCount = comps.length;
      const coverageRate = competencyCount > 0 ? coveredCount / competencyCount : 0;
      const status: RequirementCoverageData['status'] =
        coverageRate >= 1 ? 'covered' : supportedCount > 0 ? 'partial' : 'gap';
      return {
        ...req,
        competencyCount,
        coveredCount,
        coverageRate,
        status,
        supportingCourses: competencyCount > 0 ? [courseName] : [],
        strongSupportCount: comps.reduce((sum, c) => sum + c.strongCount, 0),
      };
    },
  );

  const coveredCount = filteredComps.filter((c) => c.status === 'covered').length;
  const partialCount = filteredComps.filter((c) => c.status === 'partial').length;
  const gapCount = filteredComps.filter((c) => c.status === 'gap').length;
  const overallCoverageRate =
    filteredComps.length > 0 ? coveredCount / filteredComps.length : 0;

  return {
    ...coverage,
    competencies: filteredComps,
    requirements: filteredReqs,
    coveredCount,
    partialCount,
    gapCount,
    overallCoverageRate,
  };
}
