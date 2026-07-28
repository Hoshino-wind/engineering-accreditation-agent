import { Tag } from 'antd';

import type { DiagnosticFindingRisk } from '../model/diagnosticFinding';

const riskConfig: Record<
  DiagnosticFindingRisk,
  { color: string; label: string }
> = {
  high: { color: 'red', label: '高风险' },
  medium: { color: 'orange', label: '中风险' },
  low: { color: 'blue', label: '低风险' },
};

interface DiagnosticFindingRiskTagProps {
  risk: DiagnosticFindingRisk;
}

export function DiagnosticFindingRiskTag({
  risk,
}: DiagnosticFindingRiskTagProps) {
  const config = riskConfig[risk];
  return <Tag color={config.color}>{config.label}</Tag>;
}
