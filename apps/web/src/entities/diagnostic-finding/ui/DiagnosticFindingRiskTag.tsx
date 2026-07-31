import { Tag } from 'antd';

import type { DiagnosticFindingRisk } from '../model/diagnosticFinding';

const riskConfig: Record<
  DiagnosticFindingRisk,
  { color: string; label: string }
> = {
  high: { color: 'error', label: '高风险' },
  medium: { color: 'warning', label: '中风险' },
  low: { color: 'success', label: '低风险' },
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
