import type {
  AbilityGraphData,
  AbilityGraphNode,
} from '../../../entities/ability-graph';

// 基于图谱数据的达成度计算
// 逻辑：实验→能力指标的支撑边（SUPPORTS）+ 课程→毕业要求的支撑边（SUPPORTS_REQ）
// 按支撑强度加权，模拟达成度得分（Demo 阶段用置信度+强度推算，正式接入后用实际成绩数据替换）

export interface CompetencyAttainment {
  competency: AbilityGraphNode;
  // 达成度 0~1
  attainment: number;
  // 支撑来源（课程/实验 + 贡献值）
  contributions: { node: AbilityGraphNode; value: number; strength: string }[];
  // 状态
  status: 'achieved' | 'warning' | 'gap';
}

export interface RequirementAttainment {
  requirement: AbilityGraphNode;
  // 达成度 0~1（下属能力指标的加权平均）
  attainment: number;
  status: 'achieved' | 'warning' | 'gap';
  competencies: CompetencyAttainment[];
}

export interface AttainmentReport {
  requirements: RequirementAttainment[];
  competencies: CompetencyAttainment[];
  // 总体达成度
  overallAttainment: number;
  // 预警数
  warningCount: number;
  // 缺口数
  gapCount: number;
}

const STRENGTH_FACTOR: Record<string, number> = {
  strong: 0.9,
  medium: 0.6,
  weak: 0.3,
};

// Demo 阶段：用边的 confidence 和 strength 模拟达成度
// 正式接入后：用实际学生成绩 × 支撑权重计算
export function calculateAttainmentFromGraph(
  graph: AbilityGraphData,
): AttainmentReport {
  const { nodes, edges } = graph;

  const standardComps = nodes.filter(
    (n) => n.kind === 'Competency' && n.origin === 'standard',
  );
  const standardReqs = nodes.filter(
    (n) => n.kind === 'GraduationRequirement' && n.origin === 'standard',
  );
  const schoolNodes = nodes.filter((n) => n.origin === 'school');

  // 构建 target → edges 索引
  const incomingByTarget = new Map<string, typeof edges>();
  for (const edge of edges) {
    const list = incomingByTarget.get(edge.target) ?? [];
    list.push(edge);
    incomingByTarget.set(edge.target, list);
  }

  const THRESHOLD_ACHIEVED = 0.7;
  const THRESHOLD_WARNING = 0.4;

  // 计算每个能力指标的达成度
  const compAttainments: CompetencyAttainment[] = standardComps.map((comp) => {
    const incoming = (incomingByTarget.get(comp.id) ?? []).filter(
      (e) => e.reviewStatus === 'approved' && e.kind === 'SUPPORTS',
    );

    if (incoming.length === 0) {
      return {
        competency: comp,
        attainment: 0,
        contributions: [],
        status: 'gap',
      };
    }

    // 每条边的贡献 = strength 因子 × confidence（Demo 用）
    const contributions = incoming.map((edge) => {
      const sourceNode = schoolNodes.find((n) => n.id === edge.source);
      const factor = STRENGTH_FACTOR[edge.strength ?? 'medium'] ?? 0.5;
      const confidence = edge.confidence ?? 0.7;
      const value = factor * confidence;
      return {
        node: sourceNode as AbilityGraphNode,
        value: Math.round(value * 1000) / 1000,
        strength: edge.strength ?? 'medium',
      };
    }).filter((c) => c.node);

    // 达成度 = 所有贡献的平均值（上限 1.0）
    const total = contributions.reduce((sum, c) => sum + c.value, 0);
    const attainment = Math.min(
      1,
      Math.round((total / contributions.length) * 1000) / 1000,
    );

    let status: CompetencyAttainment['status'];
    if (attainment >= THRESHOLD_ACHIEVED) {
      status = 'achieved';
    } else if (attainment >= THRESHOLD_WARNING) {
      status = 'warning';
    } else {
      status = 'gap';
    }

    return { competency: comp, attainment, contributions, status };
  });

  // 计算每个毕业要求的达成度（下属能力指标的平均）
  const reqAttainments: RequirementAttainment[] = standardReqs.map((req) => {
    const childComps = compAttainments.filter(
      (ca) => ca.competency.properties?.parent === req.code,
    );

    if (childComps.length === 0) {
      return {
        requirement: req,
        attainment: 0,
        status: 'gap',
        competencies: [],
      };
    }

    const attainment =
      Math.round(
        (childComps.reduce((sum, c) => sum + c.attainment, 0) /
          childComps.length) *
          1000,
      ) / 1000;

    let status: RequirementAttainment['status'];
    if (attainment >= THRESHOLD_ACHIEVED) {
      status = 'achieved';
    } else if (attainment >= THRESHOLD_WARNING) {
      status = 'warning';
    } else {
      status = 'gap';
    }

    return {
      requirement: req,
      attainment,
      status,
      competencies: childComps,
    };
  });

  const overallAttainment =
    reqAttainments.length > 0
      ? Math.round(
          (reqAttainments.reduce((sum, r) => sum + r.attainment, 0) /
            reqAttainments.length) *
            1000,
        ) / 1000
      : 0;

  const warningCount = reqAttainments.filter(
    (r) => r.status === 'warning',
  ).length;
  const gapCount = reqAttainments.filter((r) => r.status === 'gap').length;

  return {
    requirements: reqAttainments,
    competencies: compAttainments,
    overallAttainment,
    warningCount,
    gapCount,
  };
}
