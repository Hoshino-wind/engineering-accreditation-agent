// 数据驱动的不达标解释生成
// 纯 TypeScript 规则化拼装，不依赖 LLM
// 传入图谱 + 毕业要求覆盖数据，实时算出"为什么不符合"的解释链

import type {
  AbilityGraphData,
  AbilityGraphEdge,
  AbilityGraphNode,
} from '../../../entities/ability-graph/model/abilityGraph';
import type {
  CompetencyCoverage,
  RequirementCoverage,
} from './analyzeCoverage';

// === 解释结构 ===

export interface SupportFact {
  node: AbilityGraphNode;
  strength: 'strong' | 'medium' | 'weak';
  edge: AbilityGraphEdge;
}

export interface GapReason {
  type: 'no-support' | 'weak-support' | 'pending-only' | 'no-experiment' | 'no-knowledge' | 'no-resource';
  description: string;
}

export interface BrokenPath {
  from: string;
  to: string;
  description: string;
  missingType: string;
}

export interface GapExplanation {
  // 一句话总结
  summary: string;
  // 达成度数据
  attainment: number;
  threshold: number;
  isBelowThreshold: boolean;
  // 支撑现状
  supportFacts: SupportFact[];
  // 缺口原因列表
  gapReasons: GapReason[];
  // 断裂路径
  brokenPaths: BrokenPath[];
  // 建议方向（数据驱动，非套话）
  recommendations: string[];
}

// === 阈值 ===
const STRENGTH_WEIGHT: Record<string, number> = { strong: 3, medium: 2, weak: 1 };
const ATTAINMENT_THRESHOLD = 0.7;

// === 辅助函数 ===

function findNode(graph: AbilityGraphData, id: string): AbilityGraphNode | undefined {
  return graph.nodes.find((n) => n.id === id);
}

function getIncomingEdges(graph: AbilityGraphData, targetId: string): AbilityGraphEdge[] {
  return graph.edges.filter((e) => e.target === targetId);
}

function getApprovedSupportEdges(graph: AbilityGraphData, targetId: string): AbilityGraphEdge[] {
  return getIncomingEdges(graph, targetId).filter(
    (e) => e.reviewStatus === 'approved' && (e.kind === 'SUPPORTS' || e.kind === 'SUPPORTS_REQ'),
  );
}

function getPendingEdges(graph: AbilityGraphData, targetId: string): AbilityGraphEdge[] {
  return getIncomingEdges(graph, targetId).filter((e) => e.reviewStatus === 'pending');
}

function getExperimentsForCourse(graph: AbilityGraphData, courseId: string): AbilityGraphNode[] {
  const edges = graph.edges.filter(
    (e) => e.kind === 'BELONGS_TO' && e.target === courseId && e.reviewStatus === 'approved',
  );
  return edges
    .map((e) => findNode(graph, e.source))
    .filter((n): n is AbilityGraphNode => n != null);
}

function getKnowledgePointsForExperiment(graph: AbilityGraphData, experimentId: string): AbilityGraphNode[] {
  const edges = graph.edges.filter(
    (e) => e.kind === 'COVERS_KNOWLEDGE' && e.source === experimentId && e.reviewStatus === 'approved',
  );
  return edges
    .map((e) => findNode(graph, e.target))
    .filter((n): n is AbilityGraphNode => n != null);
}

function getResourcesForExperiment(graph: AbilityGraphData, experimentId: string): AbilityGraphNode[] {
  const edges = graph.edges.filter(
    (e) => e.kind === 'USES_RESOURCE' && e.source === experimentId && e.reviewStatus === 'approved',
  );
  return edges
    .map((e) => findNode(graph, e.target))
    .filter((n): n is AbilityGraphNode => n != null);
}

function strengthLabel(s: string): string {
  const map: Record<string, string> = { strong: '强支撑', medium: '中等支撑', weak: '弱支撑' };
  return map[s] ?? s;
}

// === 核心实现：能力指标级解释 ===

export function explainCompetencyGap(
  cc: CompetencyCoverage,
  graph: AbilityGraphData,
): GapExplanation {
  const comp = cc.competency;
  const approvedEdges = getApprovedSupportEdges(graph, comp.id);
  const pendingEdges = getPendingEdges(graph, comp.id);

  // 支撑事实
  const supportFacts: SupportFact[] = approvedEdges.map((edge) => {
    const node = findNode(graph, edge.source);
    return {
      node: node ?? { id: edge.source, kind: 'Course', code: '未知', name: '未知节点' },
      strength: edge.strength ?? 'weak',
      edge,
    };
  });

  // 达成度计算
  const totalStrength = approvedEdges.reduce(
    (sum, e) => sum + (STRENGTH_WEIGHT[e.strength ?? 'weak'] ?? 1),
    0,
  );
  const attainment = Math.min(totalStrength / STRENGTH_WEIGHT.strong!, 1);
  const isBelowThreshold = attainment < ATTAINMENT_THRESHOLD;

  // 缺口原因
  const gapReasons: GapReason[] = [];
  const brokenPaths: BrokenPath[] = [];

  if (approvedEdges.length === 0 && pendingEdges.length === 0) {
    // 完全无支撑
    gapReasons.push({
      type: 'no-support',
      description: `能力指标「${comp.code} ${comp.name}」无任何课程或实验支撑，覆盖强度为 0。`,
    });
    brokenPaths.push({
      from: '毕业要求',
      to: comp.code,
      description: `从毕业要求到「${comp.name}」的支撑链路完全断裂`,
      missingType: '课程支撑边 (SUPPORTS)',
    });
  } else if (approvedEdges.length === 0 && pendingEdges.length > 0) {
    // 仅有 AI 待审核关系
    const pendingDescs = pendingEdges.map((e) => {
      const src = findNode(graph, e.source);
      return src ? `${src.code} ${src.name}` : e.source;
    }).join('、');
    gapReasons.push({
      type: 'pending-only',
      description: `仅有 ${pendingEdges.length} 条 AI 推荐关系待审核（${pendingDescs}），尚未经教师确认，不纳入达成度计算。`,
    });
    brokenPaths.push({
      from: 'AI 推荐关系',
      to: '达成度计算',
      description: `${pendingEdges.length} 条 AI 推荐关系处于 pending 状态，审核通过前不参与覆盖度计算`,
      missingType: '教师审核',
    });
  } else {
    // 有支撑但强度不足
    if (totalStrength < STRENGTH_WEIGHT.strong!) {
      const supporterNames = supportFacts
        .map((sf) => `${sf.node.name}(${strengthLabel(sf.strength)})`)
        .join('、');
      gapReasons.push({
        type: 'weak-support',
        description: `支撑强度不足：当前支撑方为 ${supporterNames}，加权强度 ${totalStrength}，低于达标线 ${STRENGTH_WEIGHT.strong}（需 strong=3 或 medium×2=4）。`,
      });
    }

    // 检查支撑链路完整性：实验→知识点、实验→资源
    for (const sf of supportFacts) {
      if (sf.node.kind === 'Experiment') {
        const kps = getKnowledgePointsForExperiment(graph, sf.node.id);
        if (kps.length === 0) {
          gapReasons.push({
            type: 'no-knowledge',
            description: `实验「${sf.node.name}」未覆盖任何知识点，知识图谱链路在此断裂。`,
          });
          brokenPaths.push({
            from: sf.node.name,
            to: '知识点',
            description: `实验 ${sf.node.code} → 知识点 路径缺失`,
            missingType: 'COVERS_KNOWLEDGE 边',
          });
        }

        const resources = getResourcesForExperiment(graph, sf.node.id);
        if (resources.length === 0) {
          gapReasons.push({
            type: 'no-resource',
            description: `实验「${sf.node.name}」未关联任何教学资源（设备/软件/文档），资源链路缺失。`,
          });
          brokenPaths.push({
            from: sf.node.name,
            to: '教学资源',
            description: `实验 ${sf.node.code} → 教学资源 路径缺失`,
            missingType: 'USES_RESOURCE 边',
          });
        }
      }

      // 如果支撑方是课程，检查是否有实验
      if (sf.node.kind === 'Course') {
        const experiments = getExperimentsForCourse(graph, sf.node.id);
        if (experiments.length === 0) {
          gapReasons.push({
            type: 'no-experiment',
            description: `课程「${sf.node.name}」下无实验项目，缺乏实践教学证据支撑。`,
          });
          brokenPaths.push({
            from: sf.node.name,
            to: '实验',
            description: `课程 ${sf.node.code} → 实验项目 路径缺失`,
            missingType: 'BELONGS_TO 边',
          });
        }
      }
    }
  }

  // 总结
  const supporterCount = approvedEdges.length;
  const supporterSummary = supporterCount > 0
    ? `当前由 ${supporterCount} 个节点支撑（强${cc.strongCount} 中${cc.mediumCount} 弱${cc.weakCount}），`
    : '当前无任何已审核的支撑关系，';

  const attainmentPct = Math.round(attainment * 100);
  const summary = cc.status === 'gap'
    ? `能力指标「${comp.code} ${comp.name}」存在覆盖缺口。${supporterSummary}达成度 0%，远低于阈值 ${ATTAINMENT_THRESHOLD * 100}%。`
    : `能力指标「${comp.code} ${comp.name}」支撑不足。${supporterSummary}达成度 ${attainmentPct}%，低于阈值 ${ATTAINMENT_THRESHOLD * 100}%。`;

  // 建议方向（基于数据，非套话）
  const recommendations: string[] = [];
  if (cc.status === 'gap') {
    if (pendingEdges.length > 0) {
      recommendations.push(`优先审核 ${pendingEdges.length} 条 AI 推荐关系，通过后可直接补上覆盖缺口。`);
    } else {
      recommendations.push(`在 M3 上传该能力指标对应的课程大纲或实验材料，触发 M4 提取节点后建立支撑关系。`);
    }
  } else {
    if (cc.weakCount > 0 && cc.strongCount === 0) {
      recommendations.push(`当前仅有弱支撑，建议将支撑强度提升至 medium 或 strong（如增加实验学时或综合设计环节）。`);
    }
    if (cc.mediumCount > 0 && cc.strongCount === 0) {
      recommendations.push(`建议至少将 1 条支撑关系升级为 strong（如增加综合性实验或课程设计）。`);
    }
    const noKp = gapReasons.some((r) => r.type === 'no-knowledge');
    if (noKp) {
      recommendations.push(`补充实验→知识点的覆盖关系，完善知识图谱链路。`);
    }
    const noRes = gapReasons.some((r) => r.type === 'no-resource');
    if (noRes) {
      recommendations.push(`为实验项目关联教学资源（设备/软件/文档），补全资源证据链。`);
    }
    const noExp = gapReasons.some((r) => r.type === 'no-experiment');
    if (noExp) {
      recommendations.push(`为支撑课程增设实验项目，确保有实践教学证据。`);
    }
  }

  if (recommendations.length === 0) {
    recommendations.push(`建议在 M7 教学改进流程中制定针对性方案。`);
  }

  return {
    summary,
    attainment,
    threshold: ATTAINMENT_THRESHOLD,
    isBelowThreshold,
    supportFacts,
    gapReasons,
    brokenPaths,
    recommendations,
  };
}

// === 核心实现：毕业要求级解释 ===

export function explainRequirementGap(
  rc: RequirementCoverage,
  graph: AbilityGraphData,
): GapExplanation {
  const req = rc.requirement;

  // 汇总子指标的解释
  const gapComps = rc.competencies.filter((cc) => cc.status === 'gap');
  const partialComps = rc.competencies.filter((cc) => cc.status === 'partial');
  const coveredComps = rc.competencies.filter((cc) => cc.status === 'covered');

  // 达成度：用覆盖率作为近似
  const attainment = rc.coverageRate;
  const isBelowThreshold = attainment < ATTAINMENT_THRESHOLD;

  // 支撑事实（从子指标汇总）
  const supportFacts: SupportFact[] = [];
  const seenEdgeIds = new Set<string>();
  for (const cc of rc.competencies) {
    const edges = getApprovedSupportEdges(graph, cc.competency.id);
    for (const edge of edges) {
      if (!seenEdgeIds.has(edge.id)) {
        seenEdgeIds.add(edge.id);
        const node = findNode(graph, edge.source);
        supportFacts.push({
          node: node ?? { id: edge.source, kind: 'Course', code: '未知', name: '未知节点' },
          strength: edge.strength ?? 'weak',
          edge,
        });
      }
    }
  }

  // 缺口原因
  const gapReasons: GapReason[] = [];

  if (gapComps.length > 0) {
    const gapNames = gapComps.map((cc) => `${cc.competency.code} ${cc.competency.name}`).join('、');
    gapReasons.push({
      type: 'no-support',
      description: `${gapComps.length} 个能力指标完全无支撑：${gapNames}。`,
    });
  }

  if (partialComps.length > 0) {
    const partialNames = partialComps.map((cc) => `${cc.competency.code}`).join('、');
    gapReasons.push({
      type: 'weak-support',
      description: `${partialComps.length} 个能力指标支撑不足（${partialNames}），加权强度未达达标线。`,
    });
  }

  // 检查是否有 pending 关系
  const pendingEdges = getPendingEdges(graph, req.id);
  for (const cc of rc.competencies) {
    pendingEdges.push(...getPendingEdges(graph, cc.competency.id));
  }
  if (pendingEdges.length > 0 && gapComps.length > 0) {
    gapReasons.push({
      type: 'pending-only',
      description: `存在 ${pendingEdges.length} 条 AI 推荐关系待审核，审核通过后可部分缓解覆盖缺口。`,
    });
  }

  // 断裂路径
  const brokenPaths: BrokenPath[] = [];
  for (const cc of gapComps) {
    brokenPaths.push({
      from: req.code,
      to: cc.competency.code,
      description: `${req.code} ${req.name} → ${cc.competency.code} ${cc.competency.name} 支撑链路缺失`,
      missingType: 'SUPPORTS 边',
    });
  }

  // 总结
  const coveredCount = coveredComps.length;
  const totalCount = rc.competencies.length;
  const summary = rc.status === 'gap'
    ? `毕业要求「${req.code} ${req.name}」存在完全覆盖缺口。${totalCount} 个能力指标中 ${gapComps.length} 个无任何支撑，覆盖率 0%。`
    : `毕业要求「${req.code} ${req.name}」覆盖不足。${totalCount} 个能力指标中仅 ${coveredCount} 个达标，${gapComps.length} 个缺口 + ${partialComps.length} 个部分覆盖，覆盖率 ${Math.round(rc.coverageRate * 100)}%。`;

  // 建议方向
  const recommendations: string[] = [];
  if (gapComps.length > 0) {
    const hasPending = pendingEdges.length > 0;
    if (hasPending) {
      recommendations.push(`优先审核 ${pendingEdges.length} 条 AI 推荐关系，通过后可直接提升覆盖率。`);
    } else {
      recommendations.push(`针对 ${gapComps.length} 个无支撑的能力指标，在 M3 上传对应课程材料并建立支撑关系。`);
    }
  }
  if (partialComps.length > 0) {
    recommendations.push(`对 ${partialComps.length} 个支撑不足的指标，建议提升支撑强度（增设综合实验或课程设计）。`);
  }
  if (rc.supportingCourses.length === 0) {
    recommendations.push(`当前无课程通过 SUPPORTS_REQ 边直接对标该毕业要求，建议在图谱中建立课程→毕业要求的直接映射。`);
  }
  if (recommendations.length === 0) {
    recommendations.push(`建议在 M7 教学改进流程中制定针对性方案。`);
  }

  return {
    summary,
    attainment,
    threshold: ATTAINMENT_THRESHOLD,
    isBelowThreshold,
    supportFacts,
    gapReasons,
    brokenPaths,
    recommendations,
  };
}
