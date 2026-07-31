export type AbilityGraphView =
  | 'capability'
  | 'coverage'
  | 'alignment'
  | 'evaluation-structure'
  | 'publish';

export const graphViewItems = [
  { key: 'capability', label: '能力结构' },
  { key: 'coverage', label: '支撑矩阵' },
  { key: 'alignment', label: '培养路径' },
  { key: 'evaluation-structure', label: '评价结构' },
  { key: 'publish', label: '版本治理' },
];
