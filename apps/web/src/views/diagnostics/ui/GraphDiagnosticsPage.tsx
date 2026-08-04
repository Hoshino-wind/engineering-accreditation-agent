import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  FileAddOutlined,
  FormOutlined,
  NodeIndexOutlined,
  ReloadOutlined,
  ToolOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  message,
  Progress,
  Row,
  Space,
  Spin,
  Statistic,
  Tag,
  Typography,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

import type { AbilityGraphData } from '../../../entities/ability-graph';
import {
  analyzeCoverage,
  type CoverageStatus,
} from '../../../features/analyze-coverage';
import {
  decideDiagnosticFinding,
  fetchGraphDiagnosticReport,
  type DiagnosticDecisionStatus,
  type DiagnosticFindingResponse,
  type DiagnosticRisk,
  type GraphDiagnosticReportResponse,
} from '../../../shared/api/diagnosticsClient';
import { fetchAbilityGraph } from '../../../shared/api/graphClient';

import './graphDiagnosticsPage.css';

const { Paragraph, Text, Title } = Typography;

const STATUS_CONFIG: Record<
  CoverageStatus,
  { color: string; label: string; tagColor: string }
> = {
  covered: { color: '#52c41a', label: '已覆盖', tagColor: 'success' },
  partial: { color: '#faad14', label: '部分覆盖', tagColor: 'warning' },
  gap: { color: '#ff4d4f', label: '缺口', tagColor: 'error' },
};

const RISK_CONFIG: Record<DiagnosticRisk, { color: string; label: string }> = {
  high: { color: 'error', label: '高风险' },
  medium: { color: 'warning', label: '中风险' },
  low: { color: 'processing', label: '低风险' },
};

const ISSUE_STATUS_CONFIG: Record<
  DiagnosticDecisionStatus,
  { color: string; label: string }
> = {
  pending: { color: 'processing', label: '待处理' },
  confirmed: { color: 'blue', label: '已确认' },
  converted: { color: 'success', label: '已转任务' },
  dismissed: { color: 'default', label: '已标记误报' },
};

const FINDING_TYPE_LABEL: Record<DiagnosticFindingResponse['type'], string> = {
  'coverage-gap': '覆盖缺口',
  'material-conflict': '材料冲突',
  'structural-risk': '结构风险',
  'version-impact': '版本影响',
};

type DiagnosticAction = 'supplement' | 'review' | 'graph' | 'improvement';

interface DiagnosticIssue {
  id: string;
  title: string;
  typeLabel: string;
  risk: DiagnosticRisk;
  status: DiagnosticDecisionStatus;
  targetCode: string;
  targetName: string;
  course: string;
  description: string;
  evidence: string;
  recommendation: string;
  primaryAction: DiagnosticAction;
  secondaryAction?: DiagnosticAction;
  raw: DiagnosticFindingResponse;
}

const emptyGraph: AbilityGraphData = { nodes: [], edges: [] };

function actionFromDestination(destination: string): DiagnosticAction {
  const normalized = destination.toUpperCase();
  if (normalized === 'M3') {
    return 'supplement';
  }
  if (normalized === 'M4') {
    return 'review';
  }
  if (normalized === 'M2') {
    return 'graph';
  }
  return 'improvement';
}

function secondaryActionFor(primary: DiagnosticAction): DiagnosticAction | undefined {
  if (primary === 'supplement') {
    return 'review';
  }
  if (primary === 'review') {
    return 'supplement';
  }
  if (primary === 'graph') {
    return 'review';
  }
  return undefined;
}

function extractCode(text: string) {
  const match = text.match(/(C-\d{2}-\d{2}|GR-\d{1,2}(?:-\d{1,2})?)/i);
  return match?.[0].toUpperCase() ?? text.split(' ', 1)[0] ?? '';
}

function removeLeadingCode(text: string, code: string) {
  return text.replace(code, '').trim() || text;
}

function evidenceText(finding: DiagnosticFindingResponse) {
  if (finding.evidence.length === 0) {
    return `${finding.sourceNode} -> ${finding.targetNode}`;
  }
  return finding.evidence
    .slice(0, 3)
    .map((item) => `${item.objectName} / ${item.coordinate}：${item.excerpt}`)
    .join('\n');
}

function mapFindingToIssue(finding: DiagnosticFindingResponse): DiagnosticIssue {
  const primaryAction = actionFromDestination(finding.suggestedDestination);
  const targetCode = extractCode(finding.targetNode || finding.sourceNode);
  return {
    id: finding.id,
    title: finding.title,
    typeLabel: FINDING_TYPE_LABEL[finding.type],
    risk: finding.risk,
    status: finding.decisionStatus,
    targetCode,
    targetName: removeLeadingCode(finding.targetNode, targetCode),
    course: finding.course,
    description: finding.rule.basis,
    evidence: evidenceText(finding),
    recommendation: finding.rule.rationale,
    primaryAction,
    secondaryAction: secondaryActionFor(primaryAction),
    raw: finding,
  };
}

export function GraphDiagnosticsPage() {
  const navigate = useNavigate();
  const [graph, setGraph] = useState<AbilityGraphData>(emptyGraph);
  const [diagnosticReport, setDiagnosticReport] =
    useState<GraphDiagnosticReportResponse>();
  const [loading, setLoading] = useState(true);
  const [selectedReqId, setSelectedReqId] = useState<string | undefined>();
  const [selectedIssueId, setSelectedIssueId] = useState<string | undefined>();
  const [decisionLoadingId, setDecisionLoadingId] = useState<string | undefined>();

  const loadDiagnostics = async (showMessage = false) => {
    setLoading(true);
    try {
      const [graphData, graphReport] = await Promise.all([
        fetchAbilityGraph(),
        fetchGraphDiagnosticReport(),
      ]);
      setGraph(graphData);
      setDiagnosticReport(graphReport);
      if (showMessage) {
        message.success('已重新读取正式图谱并完成诊断');
      }
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : '图谱诊断数据加载失败';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDiagnostics();
  }, []);

  const coverageReport = useMemo(() => analyzeCoverage(graph), [graph]);
  const issues = useMemo(
    () => (diagnosticReport?.findings ?? []).map(mapFindingToIssue),
    [diagnosticReport],
  );
  const pendingIssues = issues.filter((issue) => issue.status === 'pending');
  const selectedReq =
    coverageReport.requirements.find((r) => r.requirement.id === selectedReqId) ??
    coverageReport.requirements[0];
  const selectedIssue =
    issues.find((issue) => issue.id === selectedIssueId) ?? issues[0];

  useEffect(() => {
    if (!selectedIssueId || !issues.some((issue) => issue.id === selectedIssueId)) {
      setSelectedIssueId(issues[0]?.id);
    }
  }, [issues, selectedIssueId]);

  const patchFinding = (finding: DiagnosticFindingResponse) => {
    setDiagnosticReport((current) => {
      if (!current) {
        return current;
      }
      return {
        ...current,
        findings: current.findings.map((item) =>
          item.id === finding.id ? finding : item,
        ),
      };
    });
  };

  const handleDecision = async (
    issue: DiagnosticIssue,
    decision: 'confirm' | 'dismiss' | 'convert',
  ) => {
    setDecisionLoadingId(issue.id);
    try {
      const updated = await decideDiagnosticFinding(issue.id, decision);
      patchFinding(updated);
      if (decision === 'convert') {
        message.success('已转为整改任务，后续可到 M7 教学改进继续跟踪');
      } else if (decision === 'dismiss') {
        message.info('已标记为误报，系统会保留处置记录');
      } else {
        message.success('已确认该诊断问题');
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : '诊断处置失败';
      message.error(msg);
    } finally {
      setDecisionLoadingId(undefined);
    }
  };

  const handleAction = (issue: DiagnosticIssue, action: DiagnosticAction) => {
    const params = new URLSearchParams({
      diagnostic: issue.id,
      indicator: issue.targetCode,
      course: issue.course,
    });

    if (action === 'supplement') {
      message.info('已带着诊断上下文跳转到 M3，请补充或重新解析材料');
      navigate(`/resources?${params.toString()}`);
      return;
    }

    if (action === 'review') {
      message.info('已跳转到 M4，请审核或修正 AI 推荐关系');
      navigate(`/recognition?${params.toString()}`);
      return;
    }

    if (action === 'graph') {
      message.info('已跳转到 M2，请查看节点和支撑路径');
      navigate(`/graph?${params.toString()}`);
      return;
    }

    message.info('已跳转到 M7，请跟踪整改闭环');
    navigate(`/improvements?${params.toString()}`);
  };

  const renderActionButton = (
    issue: DiagnosticIssue,
    action: DiagnosticAction,
    type: 'primary' | 'default' = 'default',
  ) => {
    if (action === 'supplement') {
      return (
        <Button
          icon={<FileAddOutlined />}
          onClick={() => handleAction(issue, action)}
          type={type}
        >
          补充材料
        </Button>
      );
    }

    if (action === 'review') {
      return (
        <Button
          icon={<FormOutlined />}
          onClick={() => handleAction(issue, action)}
          type={type}
        >
          审核关系
        </Button>
      );
    }

    if (action === 'graph') {
      return (
        <Button
          icon={<NodeIndexOutlined />}
          onClick={() => handleAction(issue, action)}
          type={type}
        >
          查看图谱
        </Button>
      );
    }

    return (
      <Button
        icon={<ToolOutlined />}
        onClick={() => handleAction(issue, action)}
        type={type}
      >
        教学改进
      </Button>
    );
  };

  const overallCoverageRate =
    diagnosticReport?.overallCoverageRate ?? coverageReport.overallCoverageRate;
  const gapCount = diagnosticReport?.gapCount ?? coverageReport.gapCount;
  const partialCount =
    diagnosticReport?.partialCount ?? coverageReport.partialCount;
  const orphanNodeCount =
    diagnosticReport?.orphanNodeCount ?? coverageReport.orphanNodes.length;

  return (
    <main className="graph-diagnostics-page">
      <div className="graph-diagnostics-page-header">
        <div>
          <Space align="center" size={10} wrap>
            <Title level={2}>图谱诊断工作台</Title>
            <Tag color="geekblue">M5 图谱诊断</Tag>
            <Tag color="green">基于已审核图谱</Tag>
            {diagnosticReport ? (
              <Tag color={diagnosticReport.diagnosticsMode.includes('llm') ? 'purple' : 'blue'}>
                {diagnosticReport.diagnosticsMode}
              </Tag>
            ) : null}
          </Space>
          <Paragraph type="secondary">
            系统只把教师审核通过或修改确认的关系计入正式图谱，并据此发现覆盖缺口、弱支撑和孤立节点。
            诊断结果会保存到后端，可直接跳回 M3 补材料、M4 审关系或 M2 查图谱。
          </Paragraph>
        </div>
        <Button icon={<ReloadOutlined />} onClick={() => void loadDiagnostics(true)}>
          重新诊断
        </Button>
      </div>

      {loading ? (
        <Card className="diagnostics-loading-card">
          <Spin />
        </Card>
      ) : null}

      <Card className="diagnostics-stats" size="small">
        <Row gutter={[24, 16]}>
          <Col>
            <Statistic
              suffix="%"
              title="总体覆盖率"
              value={Math.round(overallCoverageRate * 100)}
              valueStyle={{
                color:
                  overallCoverageRate >= 0.8
                    ? '#52c41a'
                    : overallCoverageRate >= 0.5
                      ? '#faad14'
                      : '#ff4d4f',
              }}
            />
          </Col>
          <Col>
            <Statistic
              prefix={<WarningOutlined />}
              title="待处理问题"
              value={pendingIssues.length}
              valueStyle={{
                color: pendingIssues.length > 0 ? '#ff4d4f' : '#52c41a',
              }}
            />
          </Col>
          <Col>
            <Statistic
              prefix={<ExclamationCircleOutlined />}
              title="覆盖缺口"
              value={gapCount}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Col>
          <Col>
            <Statistic
              prefix={<ExclamationCircleOutlined />}
              title="弱支撑/待审核"
              value={partialCount}
              valueStyle={{ color: '#faad14' }}
            />
          </Col>
          <Col>
            <Statistic
              prefix={<CheckCircleOutlined />}
              title="已转任务"
              value={issues.filter((issue) => issue.status === 'converted').length}
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col>
            <Statistic
              prefix={<NodeIndexOutlined />}
              title="孤立节点"
              value={orphanNodeCount}
              valueStyle={{ color: '#faad14' }}
            />
          </Col>
        </Row>
      </Card>

      <Alert
        className="diagnostics-loop-alert"
        description="建议处理顺序：先处理高风险覆盖缺口，再处理待审核关系和弱支撑；每次补材料或审核关系后回到本页点击重新诊断。"
        icon={<ToolOutlined />}
        message="M5 是认证图谱的质量检查和回流入口，诊断问题与处置状态会保存到后端。"
        showIcon
        type="info"
      />

      <section className="diagnostics-workbench-grid">
        <Card
          className="diagnostics-issue-list-card"
          size="small"
          title={
            <Space size={8}>
              <span>诊断问题清单</span>
              <Tag color={pendingIssues.length > 0 ? 'error' : 'success'}>
                {pendingIssues.length} 待处理
              </Tag>
            </Space>
          }
        >
          {issues.length > 0 ? (
            <div className="diagnostics-issue-list">
              {issues.map((issue) => {
                const risk = RISK_CONFIG[issue.risk];
                const status = ISSUE_STATUS_CONFIG[issue.status];
                const isSelected = selectedIssue?.id === issue.id;
                return (
                  <button
                    className={`diagnostics-issue-item ${isSelected ? 'selected' : ''}`}
                    key={issue.id}
                    onClick={() => setSelectedIssueId(issue.id)}
                    type="button"
                  >
                    <div className="diagnostics-issue-item-header">
                      <Space size={8} wrap>
                        <Tag color={risk.color}>{risk.label}</Tag>
                        <Tag color={status.color}>{status.label}</Tag>
                        <Text strong>{issue.title}</Text>
                      </Space>
                    </div>
                    <div className="diagnostics-issue-item-meta">
                      <Text type="secondary">{issue.typeLabel}</Text>
                      <Text type="secondary"> / </Text>
                      <Text type="secondary">{issue.course}</Text>
                      <Text type="secondary"> / </Text>
                      <Text type="secondary">
                        {issue.targetCode} {issue.targetName}
                      </Text>
                    </div>
                    <Paragraph ellipsis={{ rows: 2 }} type="secondary">
                      {issue.description}
                    </Paragraph>
                  </button>
                );
              })}
            </div>
          ) : (
            <Empty
              description="当前正式图谱未发现覆盖缺口或孤立节点"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )}
        </Card>

        <Card
          className="diagnostics-action-card"
          size="small"
          title="处置建议"
        >
          {selectedIssue ? (
            <div className="diagnostics-action-content">
              <Space size={8} wrap>
                <Tag color={RISK_CONFIG[selectedIssue.risk].color}>
                  {RISK_CONFIG[selectedIssue.risk].label}
                </Tag>
                <Tag color={ISSUE_STATUS_CONFIG[selectedIssue.status].color}>
                  {ISSUE_STATUS_CONFIG[selectedIssue.status].label}
                </Tag>
                <Tag>{selectedIssue.typeLabel}</Tag>
                <Tag>{selectedIssue.raw.rule.kind}</Tag>
              </Space>

              <Title level={4}>{selectedIssue.title}</Title>
              <Text type="secondary">
                课程/范围：{selectedIssue.course}；图谱版本：
                {selectedIssue.raw.graphVersion}
              </Text>

              <div className="diagnostics-action-section">
                <Text strong>诊断规则</Text>
                <Paragraph>{selectedIssue.description}</Paragraph>
              </div>

              <div className="diagnostics-action-section">
                <Text strong>当前证据</Text>
                <Paragraph className="diagnostics-evidence-text" type="secondary">
                  {selectedIssue.evidence}
                </Paragraph>
              </div>

              <div className="diagnostics-action-section">
                <Text strong>诊断意见</Text>
                <Paragraph>{selectedIssue.recommendation}</Paragraph>
              </div>

              <Space className="diagnostics-action-buttons" wrap>
                {renderActionButton(
                  selectedIssue,
                  selectedIssue.primaryAction,
                  'primary',
                )}
                {selectedIssue.secondaryAction
                  ? renderActionButton(selectedIssue, selectedIssue.secondaryAction)
                  : null}
                <Button
                  icon={<CheckCircleOutlined />}
                  loading={decisionLoadingId === selectedIssue.id}
                  onClick={() => void handleDecision(selectedIssue, 'confirm')}
                >
                  确认问题
                </Button>
                <Button
                  icon={<ToolOutlined />}
                  loading={decisionLoadingId === selectedIssue.id}
                  onClick={() => void handleDecision(selectedIssue, 'convert')}
                >
                  转整改任务
                </Button>
                <Button
                  icon={<CloseCircleOutlined />}
                  loading={decisionLoadingId === selectedIssue.id}
                  onClick={() => void handleDecision(selectedIssue, 'dismiss')}
                >
                  标记误报
                </Button>
              </Space>
            </div>
          ) : (
            <Empty
              description="选择左侧问题后查看处置建议"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )}
        </Card>
      </section>

      {issues.some((issue) => issue.status !== 'pending') ? (
        <Card
          className="diagnostics-action-record-card"
          size="small"
          title="处置记录"
        >
          <Space size={[8, 8]} wrap>
            {issues
              .filter((issue) => issue.status !== 'pending')
              .map((issue) => (
                <Tag color={ISSUE_STATUS_CONFIG[issue.status].color} key={issue.id}>
                  {issue.targetCode} {ISSUE_STATUS_CONFIG[issue.status].label}
                </Tag>
              ))}
          </Space>
        </Card>
      ) : null}

      <Card
        className="diagnostics-coverage-card"
        size="small"
        title="毕业要求覆盖率"
      >
        <div className="diagnostics-coverage-list">
          {coverageReport.requirements.map((rc) => {
            const cfg = STATUS_CONFIG[rc.status];
            const isSelected = selectedReq?.requirement.id === rc.requirement.id;
            return (
              <button
                className={`diagnostics-coverage-item ${isSelected ? 'selected' : ''}`}
                key={rc.requirement.id}
                onClick={() => setSelectedReqId(rc.requirement.id)}
                type="button"
              >
                <div className="diagnostics-coverage-item-header">
                  <Space size={8} wrap>
                    <Tag color={cfg.tagColor}>{rc.requirement.code}</Tag>
                    <Text strong>{rc.requirement.name}</Text>
                  </Space>
                  <Tag color={cfg.tagColor}>{cfg.label}</Tag>
                </div>
                <Progress
                  format={(p) => `${p}%`}
                  percent={Math.round(rc.coverageRate * 100)}
                  size="small"
                  strokeColor={cfg.color}
                />
                <div className="diagnostics-coverage-item-meta">
                  <Text type="secondary">
                    能力指标 {rc.competencies.filter((c) => c.status === 'covered').length}/
                    {rc.competencies.length} 已覆盖
                  </Text>
                  {rc.supportingCourses.length > 0 ? (
                    <Text type="secondary">
                      {' / '}支撑来源 {rc.supportingCourses.length} 个
                    </Text>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      </Card>

      {selectedReq ? (
        <Card
          className="diagnostics-detail-card"
          size="small"
          title={`${selectedReq.requirement.code} ${selectedReq.requirement.name} - 能力指标明细`}
        >
          <Paragraph type="secondary">
            {selectedReq.requirement.description}
          </Paragraph>
          <div className="diagnostics-detail-list">
            {selectedReq.competencies.map((cc) => {
              const cfg = STATUS_CONFIG[cc.status];
              return (
                <div className="diagnostics-detail-item" key={cc.competency.id}>
                  <div className="diagnostics-detail-item-header">
                    <Space size={8} wrap>
                      <Tag color={cfg.tagColor}>{cc.competency.code}</Tag>
                      <Text strong>{cc.competency.name}</Text>
                      {cc.hasPendingReview ? (
                        <Tag color="orange">有待审核关系</Tag>
                      ) : null}
                    </Space>
                    <Tag color={cfg.tagColor}>{cfg.label}</Tag>
                  </div>
                  <Paragraph style={{ margin: '4px 0', fontSize: 12 }} type="secondary">
                    {cc.competency.description}
                  </Paragraph>
                  {cc.supporters.length > 0 ? (
                    <Space size={4} wrap>
                      {cc.supporters.map((s) => (
                        <Tag color="blue" key={s.id}>
                          {s.code} {s.name}
                        </Tag>
                      ))}
                      <Text style={{ fontSize: 12 }} type="secondary">
                        strong {cc.strongCount} / medium {cc.mediumCount} / weak {cc.weakCount}
                      </Text>
                    </Space>
                  ) : (
                    <Text style={{ fontSize: 12 }} type="danger">
                      暂无已审核通过的支撑关系
                    </Text>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      ) : (
        <Empty
          className="diagnostics-empty"
          description="暂无毕业要求数据，请先确认 M2 图谱是否已加载标准节点"
        />
      )}
    </main>
  );
}
