import type {
  EvaluationPreflightAction,
  EvaluationPreflightOwner,
} from '../../../entities/attainment-evaluation';

export const preflightOwnerLabels: Record<
  EvaluationPreflightOwner,
  string
> = {
  ability_graph: '能力图谱',
  evaluation_owner: '评价负责人',
  evaluation_policy: '评价策略',
  score_input: '评分数据准备',
};

export const preflightActionGuidance: Record<
  Exclude<EvaluationPreflightAction, 'none' | 'repair_graph_relation'>,
  string
> = {
  inspect_input_snapshot: '由评价负责人核查当前输入快照',
  prepare_score_data: '为当前运行全部评分输入准备结构化试点汇总值',
  review_evaluation_policy: '由评价策略负责人核查权重和规则',
};
