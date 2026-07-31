import type {
  AbilityGraphChangeKind,
  AbilityGraphImpactAction,
} from '../../../../entities/ability-graph';

export const changeKindMeta: Record<
  AbilityGraphChangeKind,
  { color: string; label: string }
> = {
  added: { color: 'success', label: '新增' },
  modified: { color: 'warning', label: '修改' },
  removed: { color: 'error', label: '移除' },
};

export const impactActionLabels: Record<
  AbilityGraphImpactAction,
  string
> = {
  recheck: '标记重新诊断',
  recalculate: '标记需要重评',
  refresh: '标记刷新支撑包',
};
