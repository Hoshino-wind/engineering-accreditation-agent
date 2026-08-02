import {
  AuditOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Drawer,
  Skeleton,
  Space,
} from 'antd';
import type { ReactNode } from 'react';

import {
  type AttainmentEvaluationItem,
  useAttainmentEvaluationPreflightQuery,
} from '../../../entities/attainment-evaluation';
import { PreflightReportContent } from './PreflightReportContent';
import type { AttainmentInputResolutionContext } from './InspectAttainmentInputPreflight';

import './attainmentInputPreflightDrawer.css';

interface AttainmentInputPreflightDrawerProps {
  evaluation: AttainmentEvaluationItem;
  onClose: () => void;
  onNavigateToAbilityGraph?: () => void;
  open: boolean;
  renderScoreInputAction?: (
    context: AttainmentInputResolutionContext,
  ) => ReactNode;
}

export function AttainmentInputPreflightDrawer({
  evaluation,
  onClose,
  onNavigateToAbilityGraph,
  open,
  renderScoreInputAction,
}: AttainmentInputPreflightDrawerProps) {
  const preflightQuery = useAttainmentEvaluationPreflightQuery(
    evaluation.runId,
    open,
  );
  const reportMatchesEvaluation = Boolean(
    preflightQuery.data &&
      preflightQuery.data.runId === evaluation.runId &&
      preflightQuery.data.evaluationObjectId === evaluation.id,
  );
  const report = reportMatchesEvaluation
    ? (preflightQuery.data ?? null)
    : null;
  const reportUnavailable =
    preflightQuery.isError ||
    (preflightQuery.isSuccess && !reportMatchesEvaluation);
  const navigateToAbilityGraph = () => {
    onClose();
    onNavigateToAbilityGraph?.();
  };

  return (
    <Drawer
      closable={{ 'aria-label': '关闭输入预检' }}
      destroyOnHidden
      extra={
        <Button
          icon={<ReloadOutlined />}
          loading={preflightQuery.isFetching}
          onClick={() => {
            void preflightQuery.refetch();
          }}
          size="small"
        >
          重新预检
        </Button>
      }
      onClose={onClose}
      open={open}
      size={760}
      title={
        <Space>
          <AuditOutlined />
          <span>输入预检与修复导航</span>
        </Space>
      }
    >
      {preflightQuery.isPending ? (
        <Skeleton active paragraph={{ rows: 12 }} />
      ) : null}

      {reportUnavailable ? (
        <Alert
          action={
            <Button
              onClick={() => {
                void preflightQuery.refetch();
              }}
              size="small"
            >
              重试
            </Button>
          }
          description="无法读取当前精确运行的权威预检报告；页面不会根据旧摘要或中文提示推断修复动作。"
          showIcon
          title="预检报告不可用"
          type="error"
        />
      ) : null}

      {report ? (
        <PreflightReportContent
          evaluation={evaluation}
          onNavigateToAbilityGraph={navigateToAbilityGraph}
          report={report}
          renderScoreInputAction={renderScoreInputAction}
        />
      ) : null}
    </Drawer>
  );
}
