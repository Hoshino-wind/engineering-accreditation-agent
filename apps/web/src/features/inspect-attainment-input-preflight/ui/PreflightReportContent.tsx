import {
  Alert,
  Descriptions,
  Space,
  Tag,
  Typography,
} from 'antd';
import type { ReactNode } from 'react';

import type {
  AttainmentEvaluationItem,
  AttainmentEvaluationPreflight,
} from '../../../entities/attainment-evaluation';
import { PreflightCheckList } from './PreflightCheckList';
import type { AttainmentInputResolutionContext } from './InspectAttainmentInputPreflight';

interface PreflightReportContentProps {
  evaluation: AttainmentEvaluationItem;
  onNavigateToAbilityGraph: () => void;
  report: AttainmentEvaluationPreflight;
  renderScoreInputAction?: (
    context: AttainmentInputResolutionContext,
  ) => ReactNode;
}

export function PreflightReportContent({
  evaluation,
  onNavigateToAbilityGraph,
  report,
  renderScoreInputAction,
}: PreflightReportContentProps) {
  const hasScoreBlocker = report.checks.some(
    (check) =>
      check.status === 'blocked' &&
      check.action === 'prepare_score_data',
  );
  const hasGraphBlocker = report.checks.some(
    (check) =>
      check.status === 'blocked' &&
      check.action === 'repair_graph_relation',
  );

  return (
    <div className="attainment-preflight-drawer-content">
      <Alert
        description={
          report.status === 'ready'
            ? '当前输入快照已通过本版本预检，可关闭抽屉并运行评价。'
            : `已定位 ${report.blockedCheckCount} 个阻断检查；请按责任归属处理后重新预检。`
        }
        showIcon
        title={
          report.status === 'ready'
            ? '当前运行输入已就绪'
            : '当前运行仍被输入条件阻断'
        }
        type={report.status === 'ready' ? 'success' : 'error'}
      />

      <Descriptions
        bordered
        column={2}
        items={[
          {
            key: 'objective',
            label: '评价对象',
            children: `${evaluation.objectiveCode} ${evaluation.objectiveName}`,
            span: 2,
          },
          {
            key: 'course',
            label: '课程',
            children: evaluation.course,
          },
          {
            key: 'scope',
            label: '报告范围',
            children: <Tag>试点快照</Tag>,
          },
          {
            key: 'run',
            label: '精确运行',
            children: report.runId,
            span: 2,
          },
          {
            key: 'snapshot',
            label: '输入快照摘要',
            children: (
              <Typography.Text
                copyable={{ text: report.inputSnapshotHash }}
              >
                {report.inputSnapshotHash}
              </Typography.Text>
            ),
            span: 2,
          },
          {
            key: 'version',
            label: '预检规则',
            children: report.reportVersion,
          },
          {
            key: 'report',
            label: '报告摘要',
            children: (
              <Typography.Text copyable={{ text: report.reportHash }}>
                {report.reportHash}
              </Typography.Text>
            ),
          },
        ]}
        size="small"
      />

      <section>
        <Space className="attainment-preflight-section-title">
          <Typography.Title level={5}>检查项</Typography.Title>
          <Tag color="success">{report.passedCheckCount} 通过</Tag>
          <Tag color={report.blockedCheckCount > 0 ? 'error' : 'default'}>
            {report.blockedCheckCount} 阻断
          </Tag>
        </Space>
        <PreflightCheckList
          checks={report.checks}
          onNavigateToAbilityGraph={onNavigateToAbilityGraph}
        />
      </section>

      {report.missingInputs.length > 0 ? (
        <section>
          <Typography.Title level={5}>缺失评分输入</Typography.Title>
          <div className="attainment-preflight-missing-list">
            {report.missingInputs.map((input) => (
              <article key={input.id}>
                <div>
                  <Typography.Text strong>{input.label}</Typography.Text>
                  <Tag color="error">缺失</Tag>
                </div>
                <Typography.Text type="secondary">
                  预期来源：{input.evidenceName}
                </Typography.Text>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {hasScoreBlocker ? (
        <section className="attainment-preflight-score-action">
          <Alert
            description="可为当前精确运行的全部评分输入填写结构化汇总值；仅形成试点汇总准备批次，不接收个人成绩明细，不会修改历史运行或自动重新预检。"
            showIcon
            title="准备试点汇总评分数据"
            type="warning"
          />
          {renderScoreInputAction?.({ evaluation, report })}
        </section>
      ) : null}

      {hasGraphBlocker ? (
        <Alert
          description="当前报告只确认阻断归属能力图谱，尚未提供精确图谱目标 ID；进入工作台后需要人工定位，本页面不会根据课程目标编码猜测节点。"
          showIcon
          title="图谱修复目标仍需精确定位"
          type="info"
        />
      ) : null}

      <Alert
        description="本报告由不可变运行快照实时派生，只用于当前规则版本下的修复导航；不会修改历史运行，也不作为持久化审计事实。"
        showIcon
        title="试点预检边界"
        type="info"
      />
    </div>
  );
}
