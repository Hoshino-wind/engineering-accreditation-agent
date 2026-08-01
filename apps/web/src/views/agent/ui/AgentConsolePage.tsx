import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  PlayCircleOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Input,
  Progress,
  Row,
  Space,
  Statistic,
  Steps,
  Tag,
  Timeline,
  Typography,
} from 'antd';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  type AgentRun,
  type PendingRelation,
  type ReviewDecision,
  getRun,
  startRun,
  submitReview,
} from '../../../shared/api/orchestrationClient';

const { Paragraph, Text, Title } = Typography;
const { TextArea } = Input;

const PHASE_LABELS: Record<string, string> = {
  plan: '规划',
  extract: '提取',
  infer: '推理',
  review: '审核',
  coverage: '覆盖度',
  diagnose: '诊断',
  improve: '改进',
  report: '报告',
};

const DEFAULT_STATUS_TAG = { color: 'default', label: '等待中' };

const STATUS_TAG: Record<string, { color: string; label: string }> = {
  pending: DEFAULT_STATUS_TAG,
  planning: { color: 'processing', label: '规划中' },
  running: { color: 'processing', label: '运行中' },
  awaiting_review: { color: 'warning', label: '待审核' },
  completed: { color: 'success', label: '已完成' },
  failed: { color: 'error', label: '失败' },
};

export function AgentConsolePage() {
  const [goal, setGoal] = useState('');
  const [run, setRun] = useState<AgentRun | null>(null);
  const [loading, setLoading] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const poll = useCallback(
    (runId: string) => {
      stopPolling();
      pollRef.current = setInterval(async () => {
        const data = await getRun(runId);
        if (data) {
          setRun(data);
          if (data.status === 'completed' || data.status === 'failed') {
            stopPolling();
          }
        }
      }, 2000);
    },
    [stopPolling],
  );

  useEffect(() => stopPolling, [stopPolling]);

  const handleStart = async () => {
    if (!goal.trim()) return;
    setLoading(true);
    setError(null);
    setRun(null);
    const data = await startRun(goal.trim());
    setLoading(false);
    if (!data) {
      setError('无法连接到后端服务，请确认 API 已启动。');
      return;
    }
    setRun(data);
    if (data.status === 'running' || data.status === 'planning') {
      poll(data.runId);
    }
  };

  const handleReview = async (decisions: ReviewDecision[]) => {
    if (!run) return;
    setReviewLoading(true);
    const data = await submitReview(run.runId, decisions);
    setReviewLoading(false);
    if (data) {
      setRun(data);
      if (data.status === 'running') {
        poll(data.runId);
      }
    }
  };

  const approveAll = () => {
    if (!run) return;
    const decisions: ReviewDecision[] = run.pendingReview.map((r) => ({
      relationId: r.id,
      decision: 'approved' as const,
    }));
    handleReview(decisions);
  };

  const rejectAll = () => {
    if (!run) return;
    const decisions: ReviewDecision[] = run.pendingReview.map((r) => ({
      relationId: r.id,
      decision: 'rejected' as const,
    }));
    handleReview(decisions);
  };

  const statusInfo = STATUS_TAG[run?.status ?? 'pending'] ?? DEFAULT_STATUS_TAG;

  return (
    <main style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <Space align="center" size={10} style={{ marginBottom: 20 }}>
        <RobotOutlined style={{ fontSize: 24, color: '#1677ff' }} />
        <Title level={4} style={{ margin: 0 }}>
          智能体协作控制台
        </Title>
        {run && <Tag color={statusInfo.color}>{statusInfo.label}</Tag>}
      </Space>

      {/* 目标输入 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space.Compact style={{ width: '100%' }}>
          <TextArea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="输入分析目标，例如：分析电子信息工程（嵌入式）培养方案的课程支撑情况"
            autoSize={{ minRows: 1, maxRows: 3 }}
            style={{ flex: 1 }}
            onPressEnter={(e) => {
              if (!e.shiftKey) {
                e.preventDefault();
                handleStart();
              }
            }}
          />
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            loading={loading}
            onClick={handleStart}
            style={{ height: 'auto' }}
          >
            启动
          </Button>
        </Space.Compact>
      </Card>

      {error && (
        <Alert
          type="error"
          message={error}
          closable
          onClose={() => setError(null)}
          style={{ marginBottom: 16 }}
        />
      )}

      {!run && !loading && (
        <Empty
          description="输入目标并点击「启动」，多智能体将协作完成分析"
          style={{ marginTop: 60 }}
        />
      )}

      {run && (
        <Row gutter={16}>
          {/* 左列：Agent 步骤时间线 */}
          <Col xs={24} lg={14}>
            <Card title="协作进度" size="small" style={{ marginBottom: 16 }}>
              {run.steps.length === 0 ? (
                <Space>
                  <LoadingOutlined />
                  <Text type="secondary">智能体正在启动...</Text>
                </Space>
              ) : (
                <Timeline
                  items={run.steps.map((step) => ({
                    color:
                      step.status === 'completed'
                        ? 'green'
                        : step.status === 'failed'
                          ? 'red'
                          : 'blue',
                    dot:
                      step.status === 'running' ? <LoadingOutlined /> : undefined,
                    children: (
                      <div>
                        <Space size={4}>
                          <Text strong>{step.agent}</Text>
                          <Tag style={{ fontSize: 11 }}>
                            {PHASE_LABELS[step.phase] ?? step.phase}
                          </Tag>
                        </Space>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {step.summary}
                        </Text>
                        {step.toolCalls.map((tc, i) => (
                          <div key={i} style={{ fontSize: 11, color: '#999' }}>
                            {tc.tool}
                            {tc.latencyMs > 0 && ` · ${tc.latencyMs}ms`}
                          </div>
                        ))}
                      </div>
                    ),
                  }))}
                />
              )}
            </Card>

            {/* 审核面板 */}
            {run.status === 'awaiting_review' && run.pendingReview.length > 0 && (
              <Card
                title={
                  <Space>
                    <Text strong>人工审核网关</Text>
                    <Tag color="warning">{run.pendingReview.length} 条待审核</Tag>
                  </Space>
                }
                size="small"
                extra={
                  <Space>
                    <Button
                      size="small"
                      type="primary"
                      icon={<CheckCircleOutlined />}
                      loading={reviewLoading}
                      onClick={approveAll}
                    >
                      全部批准
                    </Button>
                    <Button
                      size="small"
                      danger
                      icon={<CloseCircleOutlined />}
                      loading={reviewLoading}
                      onClick={rejectAll}
                    >
                      全部驳回
                    </Button>
                  </Space>
                }
              >
                <div style={{ maxHeight: 300, overflow: 'auto' }}>
                  {run.pendingReview.map((rel: PendingRelation) => (
                    <div
                      key={rel.id}
                      style={{
                        padding: '6px 0',
                        borderBottom: '1px solid #f0f0f0',
                        fontSize: 13,
                      }}
                    >
                      <Text code>{rel.source}</Text>
                      <Text type="secondary"> → </Text>
                      <Text code>{rel.target}</Text>
                      {rel.strength && (
                        <Tag
                          color={
                            rel.strength === 'strong'
                              ? 'green'
                              : rel.strength === 'medium'
                                ? 'orange'
                                : 'default'
                          }
                          style={{ marginLeft: 8 }}
                        >
                          {rel.strength}
                        </Tag>
                      )}
                      {rel.reasoning && (
                        <div style={{ color: '#999', fontSize: 12, marginTop: 2 }}>
                          {rel.reasoning}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </Col>

          {/* 右列：结果摘要 */}
          <Col xs={24} lg={10}>
            {run.status === 'completed' && run.result && (
              <>
                {run.result.coverage && (
                  <Card title="覆盖度分析" size="small" style={{ marginBottom: 16 }}>
                    <Row gutter={12}>
                      <Col span={8}>
                        <Statistic
                          title="覆盖率"
                          value={Math.round(
                            (run.result.coverage.overallCoverageRate ?? 0) * 100,
                          )}
                          suffix="%"
                          valueStyle={{
                            color:
                              (run.result.coverage.overallCoverageRate ?? 0) >= 0.8
                                ? '#52c41a'
                                : '#faad14',
                          }}
                        />
                      </Col>
                      <Col span={8}>
                        <Statistic
                          title="已覆盖"
                          value={run.result.coverage.coveredCount ?? 0}
                          valueStyle={{ color: '#52c41a' }}
                        />
                      </Col>
                      <Col span={8}>
                        <Statistic
                          title="缺口"
                          value={run.result.coverage.gapCount ?? 0}
                          valueStyle={{ color: '#ff4d4f' }}
                        />
                      </Col>
                    </Row>
                    <Progress
                      percent={Math.round(
                        (run.result.coverage.overallCoverageRate ?? 0) * 100,
                      )}
                      size="small"
                      style={{ marginTop: 12 }}
                    />
                  </Card>
                )}

                {run.result.reportChapters &&
                  run.result.reportChapters.length > 0 && (
                    <Card title="报告章节" size="small" style={{ marginBottom: 16 }}>
                      {run.result.reportChapters.map((ch, i) => (
                        <div key={i} style={{ marginBottom: 8 }}>
                          <Text strong style={{ fontSize: 13 }}>
                            {(ch as Record<string, unknown>).chapterTitle as string}
                          </Text>
                          <Paragraph
                            ellipsis={{ rows: 2, expandable: true }}
                            style={{ fontSize: 12, marginBottom: 0 }}
                          >
                            {(ch as Record<string, unknown>).narrative as string}
                          </Paragraph>
                        </div>
                      ))}
                    </Card>
                  )}

                {run.result.suggestions && run.result.suggestions.length > 0 && (
                  <Card title="改进建议" size="small">
                    {run.result.suggestions.map((s, i) => (
                      <div key={i} style={{ marginBottom: 8, fontSize: 13 }}>
                        <Text strong>
                          {(s as Record<string, unknown>).targetName as string}
                        </Text>
                        <br />
                        <Text type="secondary">
                          {(s as Record<string, unknown>).suggestion as string}
                        </Text>
                      </div>
                    ))}
                  </Card>
                )}
              </>
            )}

            {run.status === 'awaiting_review' && (
              <Alert
                type="info"
                showIcon
                message="等待人工审核"
                description="多智能体已暂停，等待教师审核 AI 推断的支撑关系后继续执行。"
              />
            )}

            {(run.status === 'running' || run.status === 'planning') && (
              <Card size="small">
                <Space>
                  <LoadingOutlined style={{ fontSize: 20 }} />
                  <Text>智能体协作进行中...</Text>
                </Space>
                {run.plan.length > 0 && (
                  <Steps
                    direction="vertical"
                    size="small"
                    style={{ marginTop: 12 }}
                    current={run.steps.length}
                    items={run.plan.map((p) => ({ title: p }))}
                  />
                )}
              </Card>
            )}
          </Col>
        </Row>
      )}
    </main>
  );
}
