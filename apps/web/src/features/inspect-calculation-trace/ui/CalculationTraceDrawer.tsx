import {
  CalculatorOutlined,
  CheckCircleOutlined,
  FileSearchOutlined,
  StopOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Descriptions,
  Drawer,
  Space,
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

import './calculationTraceDrawer.css';

interface CalculationTraceDrawerProps {
  calculation: AttainmentCalculation | null;
  evaluation: AttainmentEvaluationItem | null;
  onClose: () => void;
  open: boolean;
}

const contributionColumns: TableProps<AttainmentContribution>['columns'] = [
  {
    key: 'label',
    title: '评分项',
    render: (_, contribution) => contribution.input.label,
  },
  {
    align: 'right',
    key: 'rate',
    title: '得分率',
    width: 90,
    render: (_, contribution) =>
      contribution.input.scoreRate === undefined
        ? '缺失'
        : contribution.input.scoreRate.toFixed(2),
  },
  {
    align: 'right',
    key: 'weight',
    title: '权重',
    width: 80,
    render: (_, contribution) =>
      `${Math.round(contribution.input.weight * 100)}%`,
  },
  {
    align: 'right',
    dataIndex: 'value',
    key: 'value',
    title: '贡献值',
    width: 90,
    render: (value?: number) => value?.toFixed(3) ?? '—',
  },
];

export function CalculationTraceDrawer({
  calculation,
  evaluation,
  onClose,
  open,
}: CalculationTraceDrawerProps) {
  return (
    <Drawer
      closable={{ 'aria-label': '关闭计算明细' }}
      destroyOnHidden
      onClose={onClose}
      open={open}
      size={720}
      title={
        <Space>
          <CalculatorOutlined />
          <span>完整计算明细与输入快照</span>
        </Space>
      }
    >
      {evaluation && calculation ? (
        <div className="calculation-trace-drawer">
          <Alert
            description="该页面仅展示版本化确定性策略的输入、中间值和结果；AI 不参与正式数值计算。"
            icon={
              calculation.ready ? (
                <CheckCircleOutlined />
              ) : (
                <StopOutlined />
              )
            }
            showIcon
            title={
              calculation.ready
                ? '计算过程可复算'
                : '输入校验已阻断正式结果'
            }
            type={calculation.ready ? 'success' : 'error'}
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
                key: 'graph',
                label: '图谱版本',
                children: evaluation.graphVersion,
              },
              {
                key: 'policy',
                label: '策略版本',
                children: evaluation.policyVersion,
              },
              {
                key: 'program',
                label: '程序版本',
                children: evaluation.programVersion,
              },
              {
                key: 'sample',
                label: '样本范围',
                children: `${evaluation.studentCount} 名学生`,
              },
              {
                key: 'snapshot',
                label: '输入快照',
                children: evaluation.inputSnapshot.createdAt,
              },
              {
                key: 'hash',
                label: '快照哈希',
                children: (
                  <Typography.Text
                    copyable={{ text: evaluation.inputSnapshot.hash }}
                  >
                    {evaluation.inputSnapshot.hash}
                  </Typography.Text>
                ),
              },
            ]}
            size="small"
          />

          <section>
            <Typography.Title level={5}>计算输入与中间值</Typography.Title>
            <div className="calculation-trace-formula">
              课程目标达成度 = Σ（评分项得分率 × 权重）
            </div>
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

          <section>
            <Typography.Title level={5}>来源证据</Typography.Title>
            <div className="calculation-trace-evidence">
              {evaluation.evidence.length > 0 ? (
                evaluation.evidence.map((evidence) => (
                  <article key={evidence.id}>
                    <FileSearchOutlined />
                    <div>
                      <Space>
                        <Tag color="blue">{evidence.version}</Tag>
                        <Typography.Text strong>
                          {evidence.name}
                        </Typography.Text>
                      </Space>
                      <Typography.Text type="secondary">
                        {evidence.coordinate}
                      </Typography.Text>
                      <Typography.Text
                        copyable={{ text: evidence.hash }}
                        type="secondary"
                      >
                        {evidence.hash}
                      </Typography.Text>
                    </div>
                  </article>
                ))
              ) : (
                <Typography.Text type="secondary">
                  当前原型未展开该对象的证据明细。
                </Typography.Text>
              )}
            </div>
          </section>
        </div>
      ) : null}
    </Drawer>
  );
}
