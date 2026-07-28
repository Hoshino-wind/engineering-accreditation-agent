import { Tag } from 'antd';

import type { DiagnosticFindingType } from '../model/diagnosticFinding';

const typeConfig: Record<
  DiagnosticFindingType,
  { color: string; label: string }
> = {
  'coverage-gap': { color: 'red', label: '覆盖缺口' },
  'material-conflict': { color: 'orange', label: '材料冲突' },
  'structural-risk': { color: 'purple', label: '结构风险' },
  'version-impact': { color: 'blue', label: '版本影响' },
};

interface DiagnosticFindingTypeTagProps {
  findingType: DiagnosticFindingType;
}

export function DiagnosticFindingTypeTag({
  findingType,
}: DiagnosticFindingTypeTagProps) {
  const config = typeConfig[findingType];
  return <Tag color={config.color}>{config.label}</Tag>;
}
