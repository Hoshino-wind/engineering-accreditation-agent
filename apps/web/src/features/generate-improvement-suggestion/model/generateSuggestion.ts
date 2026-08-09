import type {
  AbilityGraphData,
  AbilityGraphNode,
} from '../../../entities/ability-graph';
import type { CoverageReport } from '../../analyze-coverage/model/analyzeCoverage';
import { analyzeCoverage } from '../../analyze-coverage/model/analyzeCoverage';
import { generateSuggestionsViaLLM, type SuggestionLLMItem } from '../../../shared/api/llmClient';

// 教学改进建议生成 —— 接入 LLM 真实调用
// 流程：先用 analyzeCoverage 识别缺口 → 调 LLM 生成改进建议 → 合并返回

export type SuggestionType = 'gap' | 'orphan' | 'pending' | 'weak';

export type SuggestionPriority = 'high' | 'medium' | 'low';

export interface ImprovementSuggestion {
  id: string;
  type: SuggestionType;
  priority: SuggestionPriority;
  title: string;
  targetRequirement?: AbilityGraphNode;
  targetCompetency?: AbilityGraphNode;
  problem: string;
  suggestion: string;
  expectedEffect: string;
  status: 'pending' | 'accepted' | 'rejected' | 'deferred';
  // AI 元数据
  aiModel?: string;
  aiLatency?: number;
}

/**
 * 调用 AI 生成改进建议
 * @param graph 完整图谱数据
 * @returns 建议列表（含 AI 生成的文本）
 */
export async function generateSuggestions(
  graph: AbilityGraphData,
): Promise<ImprovementSuggestion[]> {
  // Step 1: 先用确定性规则识别缺口
  const report: CoverageReport = analyzeCoverage(graph);

  // 收集所有需要 AI 生成建议的缺口
  const gapTargets: Array<{
    code: string;
    name: string;
    reqName: string;
    type: string;
    requirement?: AbilityGraphNode;
    competency?: AbilityGraphNode;
  }> = [];

  // 缺口型
  report.competencies
    .filter((cc) => cc.status === 'gap')
    .forEach((cc) => {
      const req = report.requirements.find((rc) =>
        rc.competencies.some((c) => c.competency.id === cc.competency.id),
      );
      gapTargets.push({
        code: cc.competency.code,
        name: cc.competency.name,
        reqName: req?.requirement.name ?? '未知',
        type: 'gap',
        requirement: req?.requirement,
        competency: cc.competency,
      });
    });

  // 部分覆盖型
  report.competencies
    .filter((cc) => cc.status === 'partial' && cc.supporters.length > 0)
    .forEach((cc) => {
      const req = report.requirements.find((rc) =>
        rc.competencies.some((c) => c.competency.id === cc.competency.id),
      );
      gapTargets.push({
        code: cc.competency.code,
        name: cc.competency.name,
        reqName: req?.requirement.name ?? '未知',
        type: 'weak',
        requirement: req?.requirement,
        competency: cc.competency,
      });
    });

  // 孤岛型
  report.orphanNodes.forEach((node) => {
    gapTargets.push({
      code: node.code,
      name: node.name,
      reqName: '（数据孤岛）',
      type: 'orphan',
    });
  });

  // Step 2: 调 LLM 生成建议文本（后端不可用时使用默认文本）
  let llmResponse: { data: SuggestionLLMItem[]; model: string; latency: number } | null = null;
  try {
    llmResponse = await generateSuggestionsViaLLM(
      gapTargets.map((g) => ({
        code: g.code,
        name: g.name,
        reqName: g.reqName,
        type: g.type,
      })),
    );
  } catch (err) {
    console.error('[generateSuggestions] LLM 调用失败', err);
  }

  // Step 3: 合并 LLM 结果与元数据
  const llmSuggestions = new Map<string, SuggestionLLMItem>();
  if (llmResponse) {
    for (const item of llmResponse.data) {
      llmSuggestions.set(item.targetCode, item);
    }
  }

  const suggestions: ImprovementSuggestion[] = [];

  for (const target of gapTargets) {
    const llmItem: SuggestionLLMItem | undefined = llmSuggestions.get(target.code);
    const isHighPriority = target.type === 'gap';

    const defaultProblem = `${target.name}存在${target.type === 'gap' ? '覆盖缺口' : target.type === 'weak' ? '支撑不足' : '数据孤岛'}。`;
    const defaultSuggestion = '建议补充相关教学环节。';
    const defaultEffect = '提升覆盖度至达标水平。';

    suggestions.push({
      id: `sug-${target.type}-${target.code}`,
      type: target.type as SuggestionType,
      priority: isHighPriority ? 'high' : 'medium',
      title: `${target.code} ${target.name} ${target.type === 'gap' ? '无课程支撑' : target.type === 'weak' ? '支撑不足' : '未关联标准'}`,
      targetRequirement: target.requirement,
      targetCompetency: target.competency,
      problem: llmItem?.rootCause ?? defaultProblem,
      suggestion: llmItem?.suggestion ?? defaultSuggestion,
      expectedEffect: llmItem?.expectedEffect ?? defaultEffect,
      status: 'pending',
      aiModel: llmResponse?.model,
      aiLatency: llmResponse?.latency,
    });
  }

  // 待审核建议（确定性，不需要 LLM）
  const pendingEdges = graph.edges.filter((e) => e.reviewStatus === 'pending');
  if (pendingEdges.length > 0) {
    suggestions.push({
      id: 'sug-pending-review',
      type: 'pending',
      priority: 'high',
      title: `${pendingEdges.length} 条 AI 推荐关系待审核`,
      problem: `系统 AI 已推荐 ${pendingEdges.length} 条支撑关系，但尚未经教师审核确认。未审核的关系不参与达成度计算。`,
      suggestion: '建议尽快在图谱页面确认这些关系（通过/修改/拒绝），通过后才能纳入达成度计算。',
      expectedEffect: '完成审核后，相关能力指标的达成度将更准确。',
      status: 'pending',
    });
  }

  // 按优先级排序
  const priorityOrder: Record<SuggestionPriority, number> = {
    high: 0,
    medium: 1,
    low: 2,
  };
  suggestions.sort(
    (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority],
  );

  return suggestions;
}
