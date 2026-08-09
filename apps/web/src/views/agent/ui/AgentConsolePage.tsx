import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeploymentUnitOutlined,
  LoadingOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  RocketOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Col,
  Collapse,
  Descriptions,
  Empty,
  Input,
  Progress,
  Row,
  Select,
  Space,
  Statistic,
  Steps,
  Tag,
  Timeline,
  Typography,
} from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import {
  type AgentRun,
  type PendingRelation,
  type ReviewDecision,
  getRun,
  listRuns,
  startRun,
  submitReview,
} from '../../../shared/api/orchestrationClient';

const { Paragraph, Text, Title } = Typography;
const { TextArea } = Input;

const PHASE_LABELS: Record<string, string> = {
  plan: '任务规划',
  extract: '节点提取',
  infer: '关系推断',
  review: '智能审核',
  coverage: '覆盖度分析',
  diagnose: '诊断叙述',
  improve: '改进建议',
  report: '报告章节',
};

const STATUS_TAG: Record<string, { color: string; label: string }> = {
  pending: { color: 'default', label: '等待中' },
  planning: { color: 'processing', label: '规划中' },
  running: { color: 'processing', label: '运行中' },
  awaiting_review: { color: 'warning', label: '待人工审核' },
  completed: { color: 'success', label: '已完成' },
  failed: { color: 'error', label: '失败' },
};

function fmtTime(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleTimeString('zh-CN', { hour12: false });
  } catch {
    return iso;
  }
}

function durationSeconds(run: AgentRun): number | null {
  if (!run.createdAt || !run.updatedAt) return null;
  const ms = new Date(run.updatedAt).getTime() - new Date(run.createdAt).getTime();
  if (Number.isNaN(ms) || ms < 0) return null;
  return Math.round(ms / 1000);
}

function extractModel(run: AgentRun): string | null {
  for (const step of run.steps) {
    for (const tc of step.toolCalls) {
      const hay = `${tc.summary ?? ''} ${tc.tool ?? ''}`;
      const idx = hay.indexOf('model=');
      if (idx >= 0) {
        return hay.slice(idx + 6).split(/[\s,;，）)]/)[0] || null;
      }
    }
  }
  return null;
}

export function AgentConsolePage() {
  const navigate = useNavigate();
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [runsLoading, setRunsLoading] = useState(true);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [run, setRun] = useState<AgentRun | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 高级：自定义目标分析
  const [goal, setGoal] = useState('');
  const [startLoading, setStartLoading] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const isActive = (status: string | undefined) =>
    status === 'running' || status === 'planning' || status === 'awaiting_review';

  const poll = useCallback(
    (runId: string) => {
      stopPolling();
      pollRef.current = setInterval(async () => {
        const data = await getRun(runId);
        if (data) {
          setRun(data);
          if (!isActive(data.status)) {
            stopPolling();
          }
        }
      }, 2000);
    },
    [stopPolling],
  );

  useEffect(() => stopPolling, [stopPolling]);

  // 首次进入：自动加载运行列表并选中最近一次
  const loadRuns = useCallback(
    async (autoSelect: boolean, silent = false) => {
      if (!silent) setRunsLoading(true);
      const data = await listRuns();
      if (!silent) setRunsLoading(false);
      if (!data) {
        if (!silent) setError('无法连接到后端服务，请确认 API 已启动。');
        return;
      }
      setError(null);
      // 后端按创建顺序返回，最后一个即最近一次
      const ordered = [...data];
      setRuns(ordered);
      if (autoSelect && ordered.length > 0) {
        const latest = ordered[ordered.length - 1];
        if (latest) {
          setSelectedRunId(latest.runId);
          setRun(latest);
          if (isActive(latest.status)) {
            poll(latest.runId);
          }
        }
      }
    },
    [poll],
  );

  useEffect(() => {
    void loadRuns(true);
  }, [loadRuns]);

  // 空列表时静默轮询：上传触发的分析完成后，运行会自动出现在观测台
  useEffect(() => {
    if (runs.length > 0) return;
    const t = setInterval(() => {
      void loadRuns(true, true);
    }, 3000);
    return () => clearInterval(t);
  }, [runs.length, loadRuns]);

  // 切换查看某次运行
  const selectRun = async (runId: string) => {
    setSelectedRunId(runId);
    stopPolling();
    const data = await getRun(runId);
    if (data) {
      setRun(data);
      if (isActive(data.status)) {
        poll(runId);
      }
    }
  };

  const handleReview = async (decisions: ReviewDecision[]) => {
    if (!run) return;
    setReviewLoading(true);
    const data = await submitReview(run.runId, decisions);
    setReviewLoading(false);
    if (data) {
      setRun(data);
      if (isActive(data.status)) {
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
    void handleReview(decisions);
  };

  const rejectAll = () => {
    if (!run) return;
    const decisions: ReviewDecision[] = run.pendingReview.map((r) => ({
      relationId: r.id,
      decision: 'rejected' as const,
    }));
    void handleReview(decisions);
  };

  // 高级：自定义目标启动
  const handleStart = async () => {
    if (!goal.trim()) return;
    setStartLoading(true);
    setError(null);
    const data = await startRun(goal.trim());
    setStartLoading(false);
    if (!data) {
      setError('无法连接到后端服务，请确认 API 已启动。');
      return;
    }
    setRuns((prev) => [...prev, data]);
    setSelectedRunId(data.runId);
    setRun(data);
    if (isActive(data.status)) {
      poll(data.runId);
    }
  };

  const statusInfo = (STATUS_TAG[run?.status ?? 'pending'] ?? STATUS_TAG.pending)!;
  const model = useMemo(() => (run ? extractModel(run) : null), [run]);
  const duration = run ? durationSeconds(run) : null;

  const runOptions = useMemo(
    () =>
      runs
        .map((r, idx) => {
          const st =
            STATUS_TAG[r.status] ?? STATUS_TAG.pending ?? { color: 'default', label: '等待中' };
          const label = r.goal.length > 30 ? `${r.goal.slice(0, 30)}…` : r.goal;
          return {
            value: r.runId,
            label: `运行 ${idx + 1} · ${label}（${st.label}）`,
          };
        })
        .reverse(),
    [runs],
  );

  return (
    <main style={{ padding: 24, maxWidth: 1240, margin: '0 auto' }}>
      <Space align="center" size={10} style={{ marginBottom: 12 }}>
        <DeploymentUnitOutlined style={{ fontSize: 24, color: '#1677ff' }} />
        <Title level={4} style={{ margin: 0 }}>
          AI 运行观测台
        </Title>
        {run && <Tag color={statusInfo.color}>{statusInfo.label}</Tag>}
        {run && run.status === 'completed' && (
          <>
            <Button size="small" onClick={() => navigate('/graph')}>
              查看图谱结果
            </Button>
            <Button size="small" onClick={() => navigate('/diagnostics')}>
              查看诊断
            </Button>
          </>
        )}
      </Space>

      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        title="这一页是做什么的？"
        description="日常使用只需在「① 上传教学材料」上传文件，分析会自动触发，无需在此手动启动。这里用于观察多智能体协作的完整轨迹：AI 执行了哪些步骤、调用了什么模型、推断了哪些支撑关系、审核结论如何——全部可追溯，供核查与演示。"
      />

      {/* 运行选择与刷新 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Text type="secondary">分析运行：</Text>
          {runs.length > 1 ? (
            <Select
              value={selectedRunId ?? undefined}
              onChange={(v) => void selectRun(v)}
              options={runOptions}
              style={{ minWidth: 360 }}
              placeholder="选择要查看的运行"
            />
          ) : (
            <Text>
              {run ? (run.goal.length > 48 ? `${run.goal.slice(0, 48)}…` : run.goal) : '暂无运行'}
            </Text>
          )}
          <Button
            icon={<ReloadOutlined />}
            loading={runsLoading}
            onClick={() => void loadRuns(false)}
          >
            刷新
          </Button>
        </Space>
      </Card>

      {error && (
        <Alert
          type="error"
          title={error}
          closable
          onClose={() => setError(null)}
          style={{ marginBottom: 16 }}
        />
      )}

      {!run && !runsLoading && (
        <Empty
          description="还没有分析运行。去上传一份培养方案，系统会自动开始多智能体分析；分析完成后运行会自动出现在这里（每 3 秒自动刷新）。"
          style={{ marginTop: 60 }}
        >
          <Button type="primary" icon={<RocketOutlined />} onClick={() => navigate('/resources')}>
            去 ① 上传教学材料
          </Button>
        </Empty>
      )}

      {run && (
        <Row gutter={16}>
          {/* 左列：运行信息 + Agent 步骤时间线 + 审核 */}
          <Col xs={24} lg={14}>
            <Card size="small" style={{ marginBottom: 16 }}>
              <Descriptions
                size="small"
                column={2}
                items={[
                  { key: 'goal', label: '分析目标', span: 2, children: run.goal },
                  { key: 'start', label: '开始时间', children: fmtTime(run.createdAt) },
                  {
                    key: 'dur',
                    label: '耗时',
                    children: duration !== null ? `${duration} 秒` : '进行中',
                  },
                  {
                    key: 'model',
                    label: '使用模型',
                    children: model ? <Tag color="blue">{model}</Tag> : '—',
                  },
                  {
                    key: 'steps',
                    label: '已完成步骤',
                    children: `${run.steps.filter((s) => s.status === 'completed').length} / ${Math.max(run.steps.length, 8)}`,
                  },
                ]}
              />
            </Card>

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
                          styles={{
                            value: {
                              color:
                                (run.result.coverage.overallCoverageRate ?? 0) >= 0.8
                                  ? '#52c41a'
                                  : '#faad14',
                            },
                          }}
                        />
                      </Col>
                      <Col span={8}>
                        <Statistic
                          title="已覆盖"
                          value={run.result.coverage.coveredCount ?? 0}
                          styles={{ value: { color: '#52c41a' } }}
                        />
                      </Col>
                      <Col span={8}>
                        <Statistic
                          title="缺口"
                          value={run.result.coverage.gapCount ?? 0}
                          styles={{ value: { color: '#ff4d4f' } }}
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
                            {ch.chapterTitle as string}
                          </Text>
                          <Paragraph
                            ellipsis={{ rows: 2, expandable: true }}
                            style={{ fontSize: 12, marginBottom: 0 }}
                          >
                            {ch.narrative as string}
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
                          {s.targetName as string}
                        </Text>
                        <br />
                        <Text type="secondary">
                          {s.suggestion as string}
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
                title="等待人工审核"
                description="多智能体已暂停，等待教师审核 AI 推断的支撑关系后继续执行。可在左侧一键批准/驳回，或到「③ 关系审核」逐条处理。"
              />
            )}

            {(run.status === 'running' || run.status === 'planning') && (
              <Card size="small">
                <Space>
                  <LoadingOutlined style={{ fontSize: 20 }} />
                  <Text>智能体协作进行中，页面每 2 秒自动刷新...</Text>
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

            {run.status === 'failed' && (
              <Alert
                type="error"
                showIcon
                title="运行失败"
                description={run.error ?? '未知错误，可尝试重新上传材料触发分析。'}
              />
            )}
          </Col>
        </Row>
      )}

      {/* 高级：自定义目标分析 */}
      <Collapse
        style={{ marginTop: 20 }}
        items={[
          {
            key: 'advanced',
            label: '自定义目标分析（高级，一般无需使用）',
            children: (
              <>
                <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 8 }}>
                  上传材料后系统会自动发起分析，通常不需要手动启动。此入口仅用于对指定目标单独发起一次多智能体分析。
                </Paragraph>
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
                        void handleStart();
                      }
                    }}
                  />
                  <Button
                    type="primary"
                    icon={<PlayCircleOutlined />}
                    loading={startLoading}
                    onClick={() => void handleStart()}
                    style={{ height: 'auto' }}
                  >
                    启动
                  </Button>
                </Space.Compact>
              </>
            ),
          },
        ]}
      />
    </main>
  );
}
