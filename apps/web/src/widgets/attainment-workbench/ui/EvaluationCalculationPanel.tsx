import { LinkOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Empty,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { TableProps } from 'antd';

import type {
  AttainmentCalculation,
  AttainmentContribution,
  AttainmentEvaluationItem,
} from '../../../entities/attainment-evaluation';

interface EvaluationCalculationPanelProps {
  calculation: AttainmentCalculation | null;
  evaluation: AttainmentEvaluationItem | null;
  onInspectTrace: () => void;
  presentedRunId: string;
}

const contributionColumns: TableProps<AttainmentContribution>['columns'] = [
  {
    key: 'input',
    title: '评分项',
    render: (_, contribution) => contribution.input.label,
  },
  {
    align: 'right',
    key: 'rate',
    title: '得分率',
    width: 92,
    render: (_, contribution) =>
      contribution.input.scoreRate?.toFixed(2) ?? '缺失',
  },
  {
    align: 'right',
    key: 'weight',
    title: '权重',
    width: 90,
    render: (_, contribution) =>
      `${Math.round(contribution.input.weight * 100)}%`,
  },
  {
    align: 'right',
    dataIndex: 'value',
    key: 'value',
    title: '贡献值',
    width: 116,
    render: (value?: number) => value?.toFixed(3) ?? '—',
  },
];

export function EvaluationCalculationPanel({
  calculation,
  evaluation,
  onInspectTrace,
  presentedRunId,
}: EvaluationCalculationPanelProps) {
  if (!evaluation || !calculation) {
    return (
      <Card
        className="evaluation-calculation-panel"
        size="small"
        title="计算过程与结果"
      >
        <Empty
          description="请选择一项评价对象"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    );
  }

  const viewingNonPresentedRun =
    evaluation.runId !== presentedRunId;

  return (
    <Card
      className="evaluation-calculation-panel"
      size="small"
      title="计算过程与结果"
    >
      {viewingNonPresentedRun ? (
        <Alert
          description={`左侧队列展示运行 ${presentedRunId} 的摘要；当前中、右区域展示指定运行 ${evaluation.runId} 的不可变快照。`}
          showIcon
          title="正在查看非当前展示运行"
          type="info"
        />
      ) : null}
      <section className="evaluation-result-strip">
        <div>
          <Typography.Text strong>
            {evaluation.objectiveCode} {evaluation.objectiveName}
          </Typography.Text>
          <Typography.Text type="secondary">
            {evaluation.course} · 运行 {evaluation.runId}
          </Typography.Text>
        </div>
        <div className="evaluation-result-stat">
          <Typography.Text type="secondary">达成度</Typography.Text>
          <Typography.Text className="evaluation-result-number" strong>
            {calculation.score?.toFixed(2) ?? '—'}
          </Typography.Text>
        </div>
        <div className="evaluation-result-stat">
          <Typography.Text type="secondary">达成阈值</Typography.Text>
          <Typography.Text className="evaluation-result-threshold">
            ≥ {evaluation.threshold.toFixed(2)}
          </Typography.Text>
        </div>
        <div className="evaluation-result-stat">
          <Typography.Text type="secondary">达成结论</Typography.Text>
          <Tag
            color={
              !calculation.ready
                ? 'error'
                : calculation.outcome === 'achieved'
                ? 'success'
                : 'warning'
            }
          >
            {!calculation.ready
              ? '已阻断'
              : calculation.outcome === 'achieved'
              ? '已达成'
              : '未达成'}
          </Tag>
        </div>
      </section>

      {!calculation.ready ? (
        <Alert
          description={calculation.blockers.join('；')}
          showIcon
          title="评价输入未就绪"
          type="error"
        />
      ) : null}

      <section className="evaluation-formula">
        <Typography.Text type="secondary">达成度计算公式</Typography.Text>
        <Typography.Text>
          课程目标达成度 = Σ（评分项得分率 × 权重）
        </Typography.Text>
      </section>

      <section className="evaluation-contribution-table">
        <Typography.Text strong>计算输入与贡献</Typography.Text>
        <Table<AttainmentContribution>
          columns={contributionColumns}
          dataSource={calculation.contributions}
          pagination={false}
          rowKey={(contribution) => contribution.input.id}
          size="small"
          summary={() => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0}>
                <Typography.Text strong>合计</Typography.Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell align="right" index={1}>
                —
              </Table.Summary.Cell>
              <Table.Summary.Cell align="right" index={2}>
                <Typography.Text strong>
                  {Math.round(calculation.weightTotal * 100)}%
                </Typography.Text>
              </Table.Summary.Cell>
              <Table.Summary.Cell align="right" index={3}>
                <Typography.Text strong>
                  {calculation.score?.toFixed(3) ?? '—'}
                </Typography.Text>
              </Table.Summary.Cell>
            </Table.Summary.Row>
          )}
        />
      </section>

      <section className="evaluation-ability-mapping">
        <Typography.Text strong>能力映射</Typography.Text>
        <div>
          <Typography.Text type="secondary">映射能力：</Typography.Text>
          <Tag color="blue">{evaluation.abilityCode}</Tag>
          <Typography.Text>{evaluation.abilityName}</Typography.Text>
        </div>
      </section>

      <Button
        className="evaluation-trace-link"
        icon={<LinkOutlined />}
        onClick={onInspectTrace}
        size="small"
        type="link"
      >
        查看完整计算明细
      </Button>
    </Card>
  );
}
