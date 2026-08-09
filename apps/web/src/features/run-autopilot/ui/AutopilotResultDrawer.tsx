// Autopilot 一键分析结果展示抽屉
import {
  CheckCircleFilled,
  CloseCircleFilled,
  MinusCircleFilled,
  ThunderboltOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Card,
  Descriptions,
  Drawer,
  Empty,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';

import type {
  AutopilotFindingItem,
  AutopilotNodeItem,
  AutopilotRelationItem,
  AutopilotRunResponse,
  AutopilotStepResult,
  AutopilotSuggestionItem,
} from '../model/autopilot';

import './autopilotResultDrawer.css';

const { Paragraph, Text, Title } = Typography;

interface AutopilotResultDrawerProps {
  open: boolean;
  result: AutopilotRunResponse | null;
  onClose: () => void;
}

// 步骤中文名映射
const stepLabelMap: Record<string, string> = {
  plan: '任务规划',
  extract: '节点提取',
  'infer-relations': '关系推断',
  review: '智能审核',
  coverage: '覆盖度分析',
  explain: '诊断叙述',
  suggest: '改进建议',
  report: '报告章节',
};

function stepLabel(step: string): string {
  return stepLabelMap[step] ?? step;
}

// 步骤状态标签
function StepStatusTag({ status }: { status: AutopilotStepResult['status'] }) {
  switch (status) {
    case 'success':
      return (
        <Tag color="success" icon={<CheckCircleFilled />}>
          成功
        </Tag>
      );
    case 'failed':
      return (
        <Tag color="error" icon={<CloseCircleFilled />}>
          失败
        </Tag>
      );
    case 'skipped':
      return (
        <Tag color="default" icon={<MinusCircleFilled />}>
          跳过
        </Tag>
      );
    default:
      return <Tag>{status}</Tag>;
  }
}

// 置信度展示（后端返回 0~1 的浮点数）
function Confidence({ value }: { value: number }) {
  const percent = Math.round(value * 100);
  const color = percent >= 90 ? 'success' : percent >= 70 ? 'processing' : 'warning';
  return <Tag color={color}>{percent}%</Tag>;
}

// 节点表格列
const nodeColumns: ColumnsType<AutopilotNodeItem> = [
  {
    title: '编号',
    dataIndex: 'code',
    key: 'code',
    width: 110,
  },
  {
    title: '名称',
    dataIndex: 'name',
    key: 'name',
    ellipsis: true,
  },
  {
    title: '类型',
    dataIndex: 'kind',
    key: 'kind',
    width: 110,
    render: (kind: string) => <Tag>{kind}</Tag>,
  },
  {
    title: '置信度',
    dataIndex: 'confidence',
    key: 'confidence',
    width: 100,
    align: 'center',
    render: (value: number) => <Confidence value={value} />,
  },
];

// 关系表格列
const relationColumns: ColumnsType<AutopilotRelationItem> = [
  {
    title: '源节点',
    dataIndex: 'source_id',
    key: 'source_id',
    width: 110,
  },
  {
    title: '目标节点',
    dataIndex: 'target_id',
    key: 'target_id',
    width: 110,
  },
  {
    title: '关系类型',
    dataIndex: 'relation_type',
    key: 'relation_type',
    width: 100,
    render: (type: string) => <Tag color="blue">{type}</Tag>,
  },
  {
    title: '置信度',
    dataIndex: 'confidence',
    key: 'confidence',
    width: 100,
    align: 'center',
    render: (value: number) => <Confidence value={value} />,
  },
  {
    title: '推理依据',
    dataIndex: 'reasoning',
    key: 'reasoning',
    ellipsis: true,
  },
];

export function AutopilotResultDrawer({
  open,
  result,
  onClose,
}: AutopilotResultDrawerProps) {
  return (
    <Drawer
      closable={{ 'aria-label': '关闭自动分析结果' }}
      destroyOnHidden
      onClose={onClose}
      open={open}
      size={820}
      title={
        <Space>
          <ThunderboltOutlined />
          <span>AI 自动分析结果</span>
        </Space>
      }
    >
      {result ? (
        <div className="autopilot-result-drawer">
          <Alert
            showIcon
            type="success"
            title="结果已自动保存到识别候选和诊断页"
            description="提取的支撑关系已写入「第 3 步 · 关系审核」，诊断叙述已写入「第 4 步 · 图谱诊断」，可直接前往复核。"
          />

          <Descriptions
            bordered
            size="small"
            column={2}
            items={[
              {
                key: 'resource',
                label: '分析材料',
                children: result.resource_name,
                span: 2,
              },
              {
                key: 'course',
                label: '课程',
                children: result.course || '—',
              },
              {
                key: 'model',
                label: '调用模型',
                children: result.model || '—',
              },
              {
                key: 'latency',
                label: '总耗时',
                children: `${result.total_latency_ms} ms`,
              },
              {
                key: 'candidates',
                label: '关系候选',
                children: `${result.candidates_created} 条`,
              },
              {
                key: 'findings',
                label: '诊断条数',
                children: `${result.findings_created} 条`,
              },
              {
                key: 'time',
                label: '完成时间',
                children: result.finished_at,
                span: 2,
              },
            ]}
          />

          <section className="autopilot-result-steps">
            <Title level={5}>各步骤状态</Title>
            <Space wrap size={[8, 8]}>
              {result.steps.map((step) => (
                <div key={step.step} className="autopilot-step-chip">
                  <Space size={6}>
                    <Text strong>{stepLabel(step.step)}</Text>
                    <StepStatusTag status={step.status} />
                    <Text type="secondary">{step.latency_ms} ms</Text>
                    <Text type="secondary">· {step.items_count} 项</Text>
                  </Space>
                  <Paragraph type="secondary" className="autopilot-step-summary">
                    {step.summary}
                  </Paragraph>
                </div>
              ))}
            </Space>
          </section>

          <Tabs
            defaultActiveKey="nodes"
            items={[
              {
                key: 'nodes',
                label: `提取的节点（${result.nodes.length}）`,
                children:
                  result.nodes.length > 0 ? (
                    <Table<AutopilotNodeItem>
                      size="small"
                      rowKey="code"
                      columns={nodeColumns}
                      dataSource={result.nodes}
                      pagination={{ pageSize: 8, showSizeChanger: false }}
                    />
                  ) : (
                    <Empty description="未提取到节点" />
                  ),
              },
              {
                key: 'relations',
                label: `支撑关系（${result.relations.length}）`,
                children:
                  result.relations.length > 0 ? (
                    <Table<AutopilotRelationItem>
                      size="small"
                      rowKey={(r) => `${r.source_id}-${r.target_id}-${r.relation_type}`}
                      columns={relationColumns}
                      dataSource={result.relations}
                      pagination={{ pageSize: 8, showSizeChanger: false }}
                    />
                  ) : (
                    <Empty description="未推断出支撑关系" />
                  ),
              },
              {
                key: 'findings',
                label: `诊断结果（${result.findings.length}）`,
                children:
                  result.findings.length > 0 ? (
                    <Space direction="vertical" size={12} className="autopilot-card-list">
                      {result.findings.map((finding: AutopilotFindingItem) => (
                        <Card
                          key={finding.target_code}
                          size="small"
                          title={
                            <Space>
                              <Tag color="orange">{finding.target_code}</Tag>
                              <Text strong>{finding.target_name}</Text>
                            </Space>
                          }
                        >
                          <Paragraph style={{ marginBottom: 0 }}>
                            {finding.narrative}
                          </Paragraph>
                          {finding.evidence_refs &&
                          finding.evidence_refs.length > 0 ? (
                            <Space wrap size={[4, 4]}>
                              {finding.evidence_refs.map((ref) => (
                                <Tag key={ref}>{ref}</Tag>
                              ))}
                            </Space>
                          ) : null}
                        </Card>
                      ))}
                    </Space>
                  ) : (
                    <Empty description="未生成诊断结果" />
                  ),
              },
              {
                key: 'suggestions',
                label: `改进建议（${result.suggestions.length}）`,
                children:
                  result.suggestions.length > 0 ? (
                    <Space direction="vertical" size={12} className="autopilot-card-list">
                      {result.suggestions.map(
                        (suggestion: AutopilotSuggestionItem) => (
                          <Card
                            key={suggestion.target_code}
                            size="small"
                            title={
                              <Space>
                                <Tag color="orange">{suggestion.target_code}</Tag>
                                <Text strong>{suggestion.target_name}</Text>
                              </Space>
                            }
                          >
                            <Descriptions
                              size="small"
                              column={1}
                              items={[
                                {
                                  key: 'root_cause',
                                  label: '根因',
                                  children: suggestion.root_cause,
                                },
                                {
                                  key: 'suggestion',
                                  label: '建议',
                                  children: suggestion.suggestion,
                                },
                                {
                                  key: 'expected_effect',
                                  label: '预期效果',
                                  children: suggestion.expected_effect,
                                },
                              ]}
                            />
                          </Card>
                        ),
                      )}
                    </Space>
                  ) : (
                    <Empty description="未生成改进建议" />
                  ),
              },
            ]}
          />
        </div>
      ) : null}
    </Drawer>
  );
}
