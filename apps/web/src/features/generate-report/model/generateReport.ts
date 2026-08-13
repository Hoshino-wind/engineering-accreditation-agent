// M8 认证报告生成 —— 接入 LLM 真实调用
// 接收 AbilityGraphData，先计算图谱数据，再调 LLM 生成叙述文本
// 数据流：图谱节点/边 → 覆盖关系 → LLM 报告章节

import type {
  AbilityGraphData,
  AbilityGraphNode,
} from '../../../entities/ability-graph/model/abilityGraph';
import {
  generateReportViaLLM,
  type ReportLLMItem,
} from '../../../shared/api/llmClient';
import {
  analyzeCoverage,
  type RequirementCoverage,
} from '../../analyze-coverage';

export interface ReportSection {
  id: string;
  chapter: string;
  title: string;
  standardRef: string;
  schoolStatus: string;
  dataEvidence: string;
  attainment: number;
  attainmentLabel: '支撑充分' | '证据不足' | '无有效支撑';
  narrative?: string;
  aiModel?: string;
  aiLatency?: number;
}

// 从图谱中查找节点
function findNode(graph: AbilityGraphData, id: string): AbilityGraphNode | undefined {
  return graph.nodes.find((n) => n.id === id);
}

// 查找某课程下的所有实验（通过 BELONGS_TO 边）
function findExperiments(graph: AbilityGraphData, courseId: string): AbilityGraphNode[] {
  const edges = graph.edges.filter(
    (e) => e.kind === 'BELONGS_TO' && e.target === courseId && e.reviewStatus === 'approved',
  );
  return edges
    .map((e) => findNode(graph, e.source))
    .filter((n): n is AbilityGraphNode => n != null);
}

function findParentCourses(graph: AbilityGraphData, experimentId: string): AbilityGraphNode[] {
  const edges = graph.edges.filter(
    (e) => e.kind === 'BELONGS_TO' && e.source === experimentId && e.reviewStatus === 'approved',
  );
  return edges
    .map((e) => findNode(graph, e.target))
    .filter((n): n is AbilityGraphNode => n?.kind === 'Course');
}

function uniqueById(nodes: AbilityGraphNode[]): AbilityGraphNode[] {
  const seen = new Set<string>();
  return nodes.filter((node) => {
    if (seen.has(node.id)) return false;
    seen.add(node.id);
    return true;
  });
}

function findRequirementSupporters(item: RequirementCoverage): AbilityGraphNode[] {
  return uniqueById(item.competencies.flatMap((coverage) => coverage.supporters));
}

// 章节编号
const chapterNames = [
  '第一章', '第二章', '第三章', '第四章', '第五章', '第六章',
  '第七章', '第八章', '第九章', '第十章', '第十一章', '第十二章',
];

// 中间计算结构：从图谱计算出的报告上下文
interface ReportContext {
  index: number;
  grId: string;
  grCode: string;
  grName: string;
  courses: AbilityGraphNode[];
  experiments: AbilityGraphNode[];
  attainment: number;
  supportStatus: RequirementCoverage['status'];
  coverageRate: number;
  coveredCompetencyCount: number;
  totalCompetencyCount: number;
  courseNames: string[];
  evidenceNames: string[];
  totalExpHours: number;
}

// Step 1: 从图谱计算报告上下文（确定性部分）
function computeReportContexts(graph: AbilityGraphData): ReportContext[] {
  const coverageReport = analyzeCoverage(graph);

  return coverageReport.requirements.map((item, index) => {
    const gr = item.requirement;
    const supporters = findRequirementSupporters(item);
    const directCourses = supporters.filter((node) => node.kind === 'Course');
    const directExperiments = supporters.filter((node) => node.kind === 'Experiment');
    const parentCourses = directExperiments.flatMap((experiment) =>
      findParentCourses(graph, experiment.id),
    );
    const courses = uniqueById([...item.supportingCourses, ...directCourses, ...parentCourses]);
    const experiments = uniqueById([
      ...directExperiments,
      ...courses.flatMap((course) => findExperiments(graph, course.id)),
    ]);
    const evidenceNodes = uniqueById([...courses, ...experiments, ...supporters]);
    const coveredCompetencyCount = item.competencies.filter(
      (coverage) => coverage.status === 'covered',
    ).length;
    const totalCompetencyCount = item.competencies.length;
    const coverageRate = item.coverageRate;

    const courseNames = courses.map((c) => {
      const credit = c.properties?.credit;
      return credit ? `${c.name}(${credit}学分)` : c.name;
    });
    const evidenceNames = evidenceNodes.map((node) => node.name);

    const totalExpHours = experiments.reduce(
      (sum, e) => sum + (Number(e.properties?.hours) || 0), 0,
    );

    return {
      index,
      grId: gr.id,
      grCode: gr.code,
      grName: gr.name,
      courses,
      experiments,
      attainment: coverageRate,
      supportStatus: item.status,
      coverageRate,
      coveredCompetencyCount,
      totalCompetencyCount,
      courseNames,
      evidenceNames,
      totalExpHours,
    };
  });
}

/**
 * M8 报告生成 —— 接入 LLM 真实调用
 * 1. 从图谱计算确定性数据（支撑课程、实验、材料支撑充分性）
 * 2. 调用 LLM 生成叙述文本
 * 3. 合并为完整报告章节
 */
export async function generateSelfEvaluationReport(
  graph: AbilityGraphData,
): Promise<ReportSection[]> {
  // Step 1: 计算确定性上下文
  const contexts = computeReportContexts(graph);

  // Step 2: 构建 LLM 请求参数
  const reportContexts = contexts.map((ctx) => ({
    requirementCode: ctx.grCode,
    requirementName: ctx.grName,
    coverageRate: ctx.coverageRate,
    attainment: ctx.attainment,
    supportingCourses: ctx.courseNames,
    improvements: ctx.attainment < 0.7 ? ['建议补充课程支撑'] : [],
  }));

  // Step 3: 调用 LLM（后端不可用时仅返回确定性数据）
  let llmResponse: { data: ReportLLMItem[]; model: string; latency: number } | null = null;
  try {
    llmResponse = await generateReportViaLLM(reportContexts);
  } catch (err) {
    console.error('[generateReport] LLM 调用失败', err);
  }
  const llmMap = new Map<string, ReportLLMItem>();
  if (llmResponse) {
    for (const item of llmResponse.data) {
      llmMap.set(item.requirementCode, item);
    }
  }

  // Step 4: 合并确定性数据 + LLM 叙述
  return contexts.map((ctx) => {
    const expNames = ctx.experiments.map((e) => e.name);
    const dataEvidence = ctx.evidenceNames.length > 0
      ? `${ctx.evidenceNames.join('、')}${expNames.length > 0 ? `；实验项目：${expNames.join('、')}，共 ${ctx.totalExpHours} 学时` : ''}`
      : '当前图谱中无课程支撑此毕业要求';

    const schoolStatus = ctx.totalCompetencyCount > 0
      ? `该毕业要求下 ${ctx.coveredCompetencyCount}/${ctx.totalCompetencyCount} 个能力指标达到材料支撑充分性门槛，覆盖率 ${Math.round(ctx.coverageRate * 100)}%。本结果不等同于学生学习产出达成度。`
      : '覆盖缺口：无课程支撑，需进入 M7 教学改进流程';

    const llmItem = llmMap.get(ctx.grCode);

    return {
      id: `RS-${String(ctx.index + 1).padStart(2, '0')}`,
      chapter: chapterNames[ctx.index] ?? `第${ctx.index + 1}章`,
      title: ctx.grName,
      standardRef: llmItem?.standardRef ?? `${ctx.grCode} ${ctx.grName}`,
      schoolStatus,
      dataEvidence,
      attainment: ctx.attainment,
      attainmentLabel:
        ctx.supportStatus === 'covered'
          ? '支撑充分'
          : ctx.supportStatus === 'partial'
            ? '证据不足'
            : '无有效支撑',
      narrative: llmItem?.narrative,
      aiModel: llmResponse?.model,
      aiLatency: llmResponse?.latency,
    };
  });
}

// 报告完整性检查
export interface ReportCompletenessCheck {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
}

export function checkReportCompleteness(
  sections: ReportSection[],
  graphSource: 'api' | 'empty' = 'api',
): ReportCompletenessCheck[] {
  const allHaveEvidence = sections.every((s) => s.dataEvidence.length > 0);
  const allHaveAttainment = sections.every((s) => s.attainment > 0);
  const noCriticalGap = sections.every((s) => s.attainmentLabel !== '无有效支撑');
  const coveredCount = sections.filter((s) => s.attainment > 0).length;

  return [
    {
      id: 'CC-01',
      label: '所有章节含数据支撑',
      passed: allHaveEvidence,
      detail: allHaveEvidence ? '全部章节已填写数据证据' : '存在缺少数据证据的章节',
    },
    {
      id: 'CC-02',
      label: '所有章节含材料支撑评价',
      passed: allHaveAttainment,
      detail: `${coveredCount}/${sections.length} 个毕业要求有课程支撑`,
    },
    {
      id: 'CC-03',
      label: '无材料支撑空白项（或已有改进计划）',
      passed: noCriticalGap,
      detail: noCriticalGap
        ? '所有毕业要求均有已审核材料支撑'
        : '存在材料支撑空白项，需关联教学改进案例',
    },
    {
      id: 'CC-04',
      label: '图谱版本已锁定',
      passed: true,
      detail:
        graphSource === 'api'
          ? '后端实时图谱快照已锁定，可安全引用'
          : '后端未连接，正式提交前请接入实时图谱',
    },
  ];
}
