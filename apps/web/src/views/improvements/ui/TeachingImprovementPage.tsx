import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileDoneOutlined,
  LinkOutlined,
  LoadingOutlined,
  PlusOutlined,
  RocketOutlined,
} from '@ant-design/icons';
import {
  Badge,
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  message,
  Modal,
  Select,
  Space,
  Steps,
  Tag,
} from 'antd';
import type { Dayjs } from 'dayjs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';

import {
  type CreateImprovementPayload,
  type ImprovementData,
  completeImprovement,
  createImprovement,
  fetchImprovements,
  updateImprovementStatus,
} from '../../../shared/api/improvementsClient';
import { NextStepBanner } from '../../../widgets/next-step-banner/ui/NextStepBanner';
import { EmptyStateGuide } from '../../../widgets/empty-state-guide';
import { useCourseState } from '../../../shared/course/useCourseState';

import './teachingImprovementPage.css';

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; badge: 'default' | 'processing' | 'warning' | 'success' | 'error' }
> = {
  open: { label: '待处理', color: 'default', badge: 'default' },
  'in-progress': { label: '进行中', color: 'processing', badge: 'processing' },
  resolved: { label: '已解决', color: 'success', badge: 'success' },
  closed: { label: '已关闭', color: 'default', badge: 'default' },
};

const STATUS_FLOW = ['open', 'in-progress', 'resolved', 'closed'] as const;
type ImprovementStatus = (typeof STATUS_FLOW)[number];

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  high: { label: '高', color: 'red' },
  medium: { label: '中', color: 'orange' },
  low: { label: '低', color: 'blue' },
};

interface ImprovementFormValues {
  action?: string;
  course?: string;
  deadline?: Dayjs;
  description?: string;
  expectedEffect?: string;
  owner?: string;
  priority?: 'high' | 'low' | 'medium';
  rootCause?: string;
  targetCode?: string;
  targetName?: string;
  title: string;
}

export function TeachingImprovementPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedCourseName: currentCourseName } = useCourseState();
  const [loading, setLoading] = useState(true);
  const [improvements, setImprovements] = useState<ImprovementData[]>([]);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [modalOpen, setModalOpen] = useState(false);
  const [createStep, setCreateStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<ImprovementFormValues>();
  const requestedImprovementId = useMemo(
    () => new URLSearchParams(location.search).get('selected'),
    [location.search],
  );

  // 从诊断页跳转而来时，自动打开创建表单并预填关联指标
  useEffect(() => {
    const payload = (location.state as {
      targetCode?: string;
      targetName?: string;
      summary?: string;
    } | null);
    if (!payload?.targetCode) return;

    form.setFieldsValue({
      targetCode: payload.targetCode,
      targetName: payload.targetName,
      title: `补充 ${payload.targetCode} ${payload.targetName ?? ''} 的教学支撑`,
      rootCause: payload.summary,
    });
    setModalOpen(true);
    setCreateStep(0);
  }, [location.state, form]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const data = await fetchImprovements(currentCourseName ?? undefined);
    if (data) {
      setImprovements(data);
      if (requestedImprovementId && data.some((item) => item.id === requestedImprovementId)) {
        setSelectedId(requestedImprovementId);
      } else if (data.length > 0 && !selectedId) {
        setSelectedId(data[0]!.id);
      }
    }
    setLoading(false);
  }, [selectedId, currentCourseName, requestedImprovementId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);
      const payload: CreateImprovementPayload = {
        title: values.title,
        description: values.description || '',
        course: values.course || currentCourseName || '数据结构',
        action: values.action || '',
        owner: values.owner || '',
        priority: values.priority || 'medium',
        targetCode: values.targetCode || null,
        targetName: values.targetName || null,
        rootCause: values.rootCause || null,
        expectedEffect: values.expectedEffect || null,
        deadline: values.deadline ? values.deadline.format('YYYY-MM-DD') : null,
      };
      const created = await createImprovement(payload);
      if (created) {
        setModalOpen(false);
        form.resetFields();
        setCreateStep(0);
        await loadData();
        setSelectedId(created.id);
      }
    } catch {
      // validation error
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    const updated = await updateImprovementStatus(id, status);
    if (updated) {
      setImprovements((prev) => prev.map((i) => (i.id === id ? updated : i)));
    }
  };

  const handleComplete = async (id: string) => {
    const result = await completeImprovement(id);
    if (!result) {
      message.error('自动复核失败，请稍后重试');
      return;
    }
    setImprovements((prev) =>
      prev.map((item) => (item.id === id ? result.improvement : item)),
    );
    if (result.verified) {
      message.success('复核通过，改进事项已关闭');
    } else {
      message.warning('复核未通过：请按提示补充材料或证据');
    }
  };

  const selected = improvements.find((i) => i.id === selectedId);

  const openCount = improvements.filter((i) => i.status === 'open').length;
  const inProgressCount = improvements.filter((i) => i.status === 'in-progress').length;
  const resolvedCount = improvements.filter((i) => i.status === 'resolved').length;
  const closedCount = improvements.filter((i) => i.status === 'closed').length;
  const highPriorityCount = improvements.filter((i) => i.priority === 'high').length;

  const openCreateModal = useCallback(() => {
    form.resetFields();
    setCreateStep(0);
    setModalOpen(true);
  }, [form]);

  const statusStepItems = useMemo(
    () =>
      STATUS_FLOW.map((status) => ({
        title: STATUS_CONFIG[status]!.label,
        description: '',
      })),
    [],
  );

  return (
    <main className="teaching-improvement-page mi-paper-bg">
      {/* ================== Hero ================== */}
      <header className="imp-hero">
        <div className="imp-hero-left">
          <div className="imp-hero-kicker">
            <span className="imp-kicker-accent">第 6 步</span>
            <span className="imp-kicker-divider" />
            <span className="imp-kicker-text">教学改进</span>
          </div>
          <h1 className="imp-hero-title">持续改进闭环</h1>
          <p className="imp-hero-lead">
            从诊断发现创建改进措施，跟踪执行状态，形成「发现缺口 → 制定措施 → 执行变更 → 验证效果」的完整闭环。
          </p>
        </div>
        <div className="imp-hero-cta">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            onClick={openCreateModal}
          >
            创建改进措施
          </Button>
          <span className="imp-hero-meta">
            共 {improvements.length} 项措施 · {highPriorityCount} 项高优先
          </span>
        </div>
      </header>

      {/* ================== 统计卡：不对称布局 ================== */}
      <section className="imp-stats-grid">
        {/* 主卡：深色渐变 + 光晕数字 */}
        <Card className="imp-stats-hero" variant="borderless">
          <div className="imp-stats-hero-inner">
            <span className="imp-stats-hero-label">改进措施总数</span>
            <div className="imp-stats-hero-number">{improvements.length}</div>
            <div className="imp-stats-hero-sub">
              <div className="imp-stats-hero-sub-item">
                <span className="imp-stats-hero-sub-num">{resolvedCount + closedCount}</span>
                <span className="imp-stats-hero-sub-label">已完成</span>
              </div>
              <div className="imp-stats-hero-sub-item">
                <span className="imp-stats-hero-sub-num">{openCount + inProgressCount}</span>
                <span className="imp-stats-hero-sub-label">进行中</span>
              </div>
              <div className="imp-stats-hero-sub-item">
                <span className="imp-stats-hero-sub-num">{highPriorityCount}</span>
                <span className="imp-stats-hero-sub-label">高优先</span>
              </div>
            </div>
          </div>
        </Card>

        {/* 小卡组 */}
        <div className="imp-stats-smalls">
          <Card className="imp-stat-small" variant="borderless">
            <div className="imp-stat-small-top">
              <div className="imp-stat-small-icon imp-stat-small-icon--open">
                <ClockCircleOutlined />
              </div>
              <span className="imp-stat-small-label">待处理</span>
            </div>
            <div className="imp-stat-small-number">{openCount}</div>
          </Card>

          <Card className="imp-stat-small" variant="borderless">
            <div className="imp-stat-small-top">
              <div className="imp-stat-small-icon imp-stat-small-icon--progress">
                <RocketOutlined />
              </div>
              <span className="imp-stat-small-label">进行中</span>
            </div>
            <div className="imp-stat-small-number">{inProgressCount}</div>
          </Card>

          <Card className="imp-stat-small" variant="borderless">
            <div className="imp-stat-small-top">
              <div className="imp-stat-small-icon imp-stat-small-icon--resolved">
                <CheckCircleOutlined />
              </div>
              <span className="imp-stat-small-label">已解决</span>
            </div>
            <div className="imp-stat-small-number">{resolvedCount}</div>
          </Card>

          <Card className="imp-stat-small" variant="borderless">
            <div className="imp-stat-small-top">
              <div className="imp-stat-small-icon imp-stat-small-icon--closed">
                <FileDoneOutlined />
              </div>
              <span className="imp-stat-small-label">已关闭</span>
            </div>
            <div className="imp-stat-small-number">{closedCount}</div>
          </Card>
        </div>
      </section>

      {/* ================== 主体：左列表 + 右详情 ================== */}
      <div className="imp-body">
        {/* 左侧列表 */}
        <Card
          title={`改进措施列表（${improvements.length}）`}
          size="small"
          className="imp-list-card"
        >
          {loading ? (
            <div className="imp-loading">
              <LoadingOutlined style={{ fontSize: 24 }} spin />
              <div className="imp-loading-text">正在加载改进措施…</div>
            </div>
          ) : improvements.length === 0 ? (
            <EmptyStateGuide
              title="还没有改进措施"
              description="从诊断发现的缺口创建改进措施，跟踪执行状态形成持续改进闭环"
              ctaText="去诊断"
              ctaPath="/diagnostics"
            />
          ) : (
            <div className="imp-list">
              {improvements.map((imp) => {
                const sc = (STATUS_CONFIG[imp.status] ?? STATUS_CONFIG.open)!;
                const pc = (PRIORITY_CONFIG[imp.priority] ?? PRIORITY_CONFIG.medium)!;
                const isSelected = selectedId === imp.id;
                return (
                  <div
                    key={imp.id}
                    className={`imp-list-item ${isSelected ? 'selected' : ''}`}
                    data-status={imp.status}
                    onClick={() => setSelectedId(imp.id)}
                  >
                    <div className="imp-list-item-header">
                      <Space size={6}>
                        <Badge status={sc.badge} />
                        <Tag color={pc.color} style={{ margin: 0, fontSize: 11 }}>
                          {pc.label}
                        </Tag>
                        {imp.targetCode && (
                          <Tag style={{ margin: 0, fontSize: 10, border: '1px solid var(--color-border-light)' }}>
                            {imp.targetCode}
                          </Tag>
                        )}
                      </Space>
                    </div>
                    <span className="imp-list-item-title">{imp.title}</span>
                    <div className="imp-list-item-meta">
                      {imp.course}
                      <span className="imp-dot" />
                      {imp.owner}
                      <span className="imp-dot" />
                      {sc.label}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* 右侧详情 */}
        <Card title="改进详情" size="small" className="imp-detail-card">
          {loading ? (
            <div className="imp-loading">
              <LoadingOutlined style={{ fontSize: 32 }} spin />
            </div>
          ) : selected ? (
            <div className="imp-detail">
              <div className="imp-detail-header">
                <Tag color={(STATUS_CONFIG[selected.status] ?? STATUS_CONFIG.open)!.color}>
                  {(STATUS_CONFIG[selected.status] ?? STATUS_CONFIG.open)!.label}
                </Tag>
                <Tag color={(PRIORITY_CONFIG[selected.priority] ?? PRIORITY_CONFIG.medium)!.color}>
                  {(PRIORITY_CONFIG[selected.priority] ?? PRIORITY_CONFIG.medium)!.label}优先
                </Tag>
                {selected.targetCode && <Tag color="red">{selected.targetCode}</Tag>}
              </div>

              <h3 className="imp-detail-title">{selected.title}</h3>

              {/* 来源关联 */}
              {(selected.targetCode || selected.targetName || selected.rootCause) && (
                <div className="imp-detail-section imp-detail-source-card">
                  <span className="imp-detail-section-label">
                    <LinkOutlined /> 来源关联
                  </span>
                  <div className="imp-detail-source-body">
                    <div className="imp-detail-source-tags">
                      {selected.targetCode && (
                        <Tag color="red" style={{ margin: 0 }}>
                          {selected.targetCode}
                        </Tag>
                      )}
                      {selected.targetName && (
                        <span className="imp-detail-source-name">{selected.targetName}</span>
                      )}
                    </div>
                    {selected.rootCause && (
                      <div className="imp-detail-source-text">{selected.rootCause}</div>
                    )}
                    <Button
                      type="link"
                      size="small"
                      icon={<LinkOutlined />}
                      onClick={() => navigate('/diagnostics')}
                      style={{ padding: 0, marginTop: 4 }}
                    >
                      查看对应诊断
                    </Button>
                  </div>
                </div>
              )}

              {selected.description && (
                <div className="imp-detail-section">
                  <span className="imp-detail-section-label">问题描述</span>
                  <div className="imp-detail-section-text">{selected.description}</div>
                </div>
              )}

              <div className="imp-detail-section">
                <span className="imp-detail-section-label">改进措施</span>
                <div className="imp-detail-section-text imp-detail-section-text--action">
                  {selected.action}
                </div>
              </div>

              {selected.expectedEffect && (
                <div className="imp-detail-section">
                  <span className="imp-detail-section-label">预期效果</span>
                  <div className="imp-detail-section-text imp-detail-section-text--effect">
                    {selected.expectedEffect}
                  </div>
                </div>
              )}

              <div className="imp-detail-meta">
                <Space size={16} wrap>
                  <span className="imp-detail-meta-text">责任人：{selected.owner}</span>
                  {selected.deadline && (
                    <span className="imp-detail-meta-text">截止：{selected.deadline}</span>
                  )}
                  <span className="imp-detail-meta-text">课程：{selected.course}</span>
                  {selected.createdAt && (
                    <span className="imp-detail-meta-text">创建：{selected.createdAt}</span>
                  )}
                </Space>
              </div>

              <div className="imp-detail-actions">
                <Steps
                  className="imp-status-steps"
                  current={STATUS_FLOW.indexOf(selected.status as ImprovementStatus)}
                  onChange={(idx) => {
                    if (!selected) return;
                    const next = STATUS_FLOW[idx];
                    if (!next) return;
                    void handleStatusChange(selected.id, next);
                  }}
                  items={statusStepItems}
                  size="small"
                />
                {selected.status !== 'closed' && (
                  <Button
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    onClick={() => void handleComplete(selected.id)}
                  >
                    标记完成
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="imp-empty">
              <div className="imp-empty-icon">
                <FileDoneOutlined />
              </div>
              <div className="imp-empty-text">选择左侧措施查看详情</div>
            </div>
          )}
        </Card>
      </div>

      {/* ================== 创建 Modal：分步表单 ================== */}
      <Modal
        title={<span className="imp-modal-title">创建改进措施</span>}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        width={560}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Steps
            className="imp-create-steps"
            current={createStep}
            items={[{ title: '基本信息' }, { title: '详细内容' }]}
            size="small"
          />

          {createStep === 0 && (
            <div className="imp-form-step">
              <Form.Item
                name="title"
                label="标题"
                rules={[{ required: true, message: '请输入标题' }]}
              >
                <Input placeholder="如：补充 CT-5 实验项目覆盖" />
              </Form.Item>
              <Space size={16} wrap>
                <Form.Item name="course" label="课程" initialValue={currentCourseName ?? '数据结构'}>
                  <Input style={{ width: 160 }} />
                </Form.Item>
                <Form.Item name="owner" label="责任人" rules={[{ required: true, message: '请输入责任人' }]}>
                  <Input style={{ width: 140 }} placeholder="如：张老师" />
                </Form.Item>
              </Space>
              <Space size={16} wrap>
                <Form.Item name="priority" label="优先级" initialValue="medium">
                  <Select
                    style={{ width: 100 }}
                    options={[
                      { value: 'high', label: '高' },
                      { value: 'medium', label: '中' },
                      { value: 'low', label: '低' },
                    ]}
                  />
                </Form.Item>
                <Form.Item name="deadline" label="截止日期">
                  <DatePicker style={{ width: 150 }} />
                </Form.Item>
              </Space>
            </div>
          )}

          {createStep === 1 && (
            <div className="imp-form-step">
              <Form.Item name="action" label="改进措施" rules={[{ required: true, message: '请输入改进措施' }]}>
                <Input.TextArea rows={2} placeholder="具体的改进措施" />
              </Form.Item>
              <Form.Item name="description" label="问题描述">
                <Input.TextArea rows={2} placeholder="描述发现的问题" />
              </Form.Item>
              <Form.Item name="rootCause" label="根因分析">
                <Input.TextArea rows={2} placeholder="分析问题根因" />
              </Form.Item>
              <Form.Item name="expectedEffect" label="预期效果">
                <Input.TextArea rows={2} placeholder="预期改进效果" />
              </Form.Item>
              <Space size={16}>
                <Form.Item name="targetCode" label="目标编码">
                  <Input style={{ width: 150 }} placeholder="如：GR-3" />
                </Form.Item>
                <Form.Item name="targetName" label="目标名称">
                  <Input style={{ width: 200 }} placeholder="如：设计/开发解决方案" />
                </Form.Item>
              </Space>
            </div>
          )}

          <div className="imp-modal-footer">
            {createStep === 0 ? (
              <>
                <Button onClick={() => setModalOpen(false)}>取消</Button>
                <Button
                  type="primary"
                  onClick={async () => {
                    try {
                      await form.validateFields(['title', 'course', 'owner']);
                      setCreateStep(1);
                    } catch {
                      // validation error
                    }
                  }}
                >
                  下一步
                </Button>
              </>
            ) : (
              <>
                <Button onClick={() => setCreateStep(0)}>上一步</Button>
                <Button onClick={() => setModalOpen(false)}>取消</Button>
                <Button type="primary" loading={submitting} onClick={handleCreate}>
                  创建
                </Button>
              </>
            )}
          </div>
        </Form>
      </Modal>

      <NextStepBanner currentPath="/improvements" />
    </main>
  );
}
