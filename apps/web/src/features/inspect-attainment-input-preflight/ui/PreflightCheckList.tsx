import {
  CheckCircleFilled,
  ExportOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { Button, Tag, Typography } from 'antd';

import type { EvaluationPreflightCheck } from '../../../entities/attainment-evaluation';
import {
  preflightActionGuidance,
  preflightOwnerLabels,
} from '../model/preflightPresentation';

interface PreflightCheckListProps {
  checks: EvaluationPreflightCheck[];
  onNavigateToAbilityGraph?: () => void;
}

function PreflightCheckAction({
  check,
  onNavigateToAbilityGraph,
}: {
  check: EvaluationPreflightCheck;
  onNavigateToAbilityGraph?: () => void;
}) {
  if (check.status === 'pass' || check.action === 'none') {
    return null;
  }
  if (check.action === 'repair_graph_relation') {
    return (
      <Button
        disabled={!onNavigateToAbilityGraph}
        icon={<ExportOutlined />}
        onClick={onNavigateToAbilityGraph}
        size="small"
      >
        打开能力图谱工作台
      </Button>
    );
  }
  return (
    <Typography.Text className="attainment-preflight-check-guidance">
      下一步：{preflightActionGuidance[check.action]}
    </Typography.Text>
  );
}

export function PreflightCheckList({
  checks,
  onNavigateToAbilityGraph,
}: PreflightCheckListProps) {
  return (
    <div className="attainment-preflight-check-list">
      {checks.map((check) => (
        <article
          className={`attainment-preflight-check attainment-preflight-check--${check.status}`}
          key={check.id}
        >
          <div className="attainment-preflight-check-heading">
            {check.status === 'pass' ? (
              <CheckCircleFilled className="attainment-preflight-check-icon--pass" />
            ) : (
              <StopOutlined className="attainment-preflight-check-icon--blocked" />
            )}
            <Typography.Text strong>{check.label}</Typography.Text>
            <Tag color={check.status === 'pass' ? 'success' : 'error'}>
              {check.status === 'pass' ? '通过' : '阻断'}
            </Tag>
            <Tag>{preflightOwnerLabels[check.owner]}</Tag>
          </div>
          <Typography.Paragraph type="secondary">
            {check.detail}
          </Typography.Paragraph>
          <PreflightCheckAction
            check={check}
            onNavigateToAbilityGraph={onNavigateToAbilityGraph}
          />
        </article>
      ))}
    </div>
  );
}
