import type { AbilityGraphCapabilityPathStatus } from '../../../entities/ability-graph';

export const capabilityStatusMeta: Record<
  AbilityGraphCapabilityPathStatus,
  { color: string; label: string }
> = {
  'closed-loop': { color: 'success', label: '闭环完整' },
  'semantics-gap': { color: 'error', label: '语义待补' },
  'teaching-gap': { color: 'warning', label: '承载不足' },
  'assessment-gap': { color: 'error', label: '评价待补' },
};
