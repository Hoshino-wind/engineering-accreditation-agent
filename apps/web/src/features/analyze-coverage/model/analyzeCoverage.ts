import type {
  AbilityGraphData,
  AbilityGraphEdge,
  AbilityGraphNode,
} from '../../../entities/ability-graph';

// 覆盖率分析：检查学校数据对认证标准的支撑覆盖情况
// 输入完整图谱（标准节点 + 学校节点 + 边），输出每条毕业要求/能力指标的覆盖状态

export type CoverageStatus = 'covered' | 'partial' | 'gap';

export interface CompetencyCoverage {
  competency: AbilityGraphNode;
  status: CoverageStatus;
  // 支撑该能力指标的课程/实验列表
  supporters: AbilityGraphNode[];
  // 支撑强度统计
  strongCount: number;
  mediumCount: number;
  weakCount: number;
  // 是否有 AI 待审核的支撑关系
  hasPendingReview: boolean;
}

export interface RequirementCoverage {
  requirement: AbilityGraphNode;
  status: CoverageStatus;
  // 该毕业要求下的能力指标覆盖明细
  competencies: CompetencyCoverage[];
  // 支撑该毕业要求的课程列表
  supportingCourses: AbilityGraphNode[];
  // 覆盖率：已覆盖能力指标数 / 总能力指标数
  coverageRate: number;
  // 强支撑课程数
  strongSupportCount: number;
}

export interface CoverageReport {
  requirements: RequirementCoverage[];
  competencies: CompetencyCoverage[];
  // 孤岛节点：无任何边的学校上传节点
  orphanNodes: AbilityGraphNode[];
  // 总体覆盖率
  overallCoverageRate: number;
  // 缺口数
  gapCount: number;
  // 部分覆盖数
  partialCount: number;
}

const STRENGTH_WEIGHT = {
  strong: 3,
  medium: 2,
  weak: 1,
};

export function analyzeCoverage(graph: AbilityGraphData): CoverageReport {
  const { nodes, edges } = graph;

  // 筛选标准节点
  const standardReqs = nodes.filter(
    (n) => n.kind === 'GraduationRequirement' && n.origin === 'standard',
  );
  const standardComps = nodes.filter(
    (n) => n.kind === 'Competency' && n.origin === 'standard',
  );

  // 筛选学校节点（课程、实验等）
  const schoolNodes = nodes.filter((n) => n.origin === 'school');

  // 只看审核通过的边（pending 的不算覆盖，只标记待审核）

  // 构建邻接索引：target → [source nodes]
  const incomingByTarget = new Map<string, AbilityGraphEdge[]>();
  for (const edge of edges) {
    const list = incomingByTarget.get(edge.target) ?? [];
    list.push(edge);
    incomingByTarget.set(edge.target, list);
  }

  // 找有边的节点 ID（用于孤岛检测）
  const connectedNodeIds = new Set<string>();
  for (const edge of edges) {
    connectedNodeIds.add(edge.source);
    connectedNodeIds.add(edge.target);
  }

  // 孤岛节点：学校上传但无任何边连接
  const orphanNodes = schoolNodes.filter((n) => !connectedNodeIds.has(n.id));

  // 分析每条能力指标的覆盖情况
  const competencyCoverages: CompetencyCoverage[] = standardComps.map((comp) => {
    const incomingEdges = incomingByTarget.get(comp.id) ?? [];
    const approvedIncoming = incomingEdges.filter(
      (e) => e.reviewStatus === 'approved',
    );
    const pendingIncoming = incomingEdges.filter(
      (e) => e.reviewStatus === 'pending',
    );

    // 找到支撑该能力指标的学校节点（课程/实验）
    const supporterIds = new Set(
      approvedIncoming.map((e) => e.source),
    );
    const supporters = schoolNodes.filter((n) => supporterIds.has(n.id));

    const strongCount = approvedIncoming.filter(
      (e) => e.strength === 'strong',
    ).length;
    const mediumCount = approvedIncoming.filter(
      (e) => e.strength === 'medium',
    ).length;
    const weakCount = approvedIncoming.filter(
      (e) => e.strength === 'weak',
    ).length;

    const totalStrength =
      strongCount * STRENGTH_WEIGHT.strong +
      mediumCount * STRENGTH_WEIGHT.medium +
      weakCount * STRENGTH_WEIGHT.weak;

    let status: CoverageStatus;
    if (supporters.length === 0 && pendingIncoming.length === 0) {
      status = 'gap';
    } else if (supporters.length === 0 && pendingIncoming.length > 0) {
      status = 'partial';
    } else if (totalStrength >= STRENGTH_WEIGHT.strong) {
      status = 'covered';
    } else {
      status = 'partial';
    }

    return {
      competency: comp,
      status,
      supporters,
      strongCount,
      mediumCount,
      weakCount,
      hasPendingReview: pendingIncoming.length > 0,
    };
  });

  // 分析每条毕业要求的覆盖情况
  const requirementCoverages: RequirementCoverage[] = standardReqs.map((req) => {
    // 该毕业要求下的能力指标
    const reqCode = req.code;
    const childComps = competencyCoverages.filter(
      (cc) => cc.competency.properties?.parent === reqCode,
    );

    // 支撑该毕业要求的课程（SUPPORTS_REQ 边）
    const reqIncoming = incomingByTarget.get(req.id) ?? [];
    const courseIds = new Set(
      reqIncoming
        .filter((e) => e.reviewStatus === 'approved')
        .map((e) => e.source),
    );
    const supportingCourses = schoolNodes.filter((n) => courseIds.has(n.id));

    const strongSupportCount = reqIncoming.filter(
      (e) => e.reviewStatus === 'approved' && e.strength === 'strong',
    ).length;

    // 覆盖率：已覆盖能力指标 / 总能力指标
    const coveredCount = childComps.filter(
      (cc) => cc.status === 'covered',
    ).length;
    const coverageRate =
      childComps.length > 0 ? coveredCount / childComps.length : 0;

    let status: CoverageStatus;
    if (coverageRate >= 0.8 && childComps.length > 0) {
      status = 'covered';
    } else if (coverageRate > 0) {
      status = 'partial';
    } else {
      status = 'gap';
    }

    return {
      requirement: req,
      status,
      competencies: childComps,
      supportingCourses,
      coverageRate,
      strongSupportCount,
    };
  });

  const gapCount = requirementCoverages.filter(
    (rc) => rc.status === 'gap',
  ).length;
  const partialCount = requirementCoverages.filter(
    (rc) => rc.status === 'partial',
  ).length;
  const overallCoverageRate =
    standardReqs.length > 0
      ? requirementCoverages.filter((rc) => rc.status === 'covered').length /
        standardReqs.length
      : 0;

  return {
    requirements: requirementCoverages,
    competencies: competencyCoverages,
    orphanNodes,
    overallCoverageRate,
    gapCount,
    partialCount,
  };
}
