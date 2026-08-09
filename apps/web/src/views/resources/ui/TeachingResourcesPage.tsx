import {
  CheckCircleOutlined,
  DeleteOutlined,
  InfoCircleOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  RobotOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Input,
  message,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';

import {
  MaterialStatusTag,
  type SuggestedCourseInfo,
  type UploadedMaterial,
  type UploadedMaterialCategory,
  type UploadedMaterialFileType,
  type UploadedMaterialStatus,
} from '../../../entities/uploaded-material';
import { InlineProcessingStatus } from '../../../features/extract-nodes';
import { useAutopilotTask } from '../../../features/run-autopilot';
import { UploadDropzone } from '../../../features/upload-material';
import {
  confirmSuggestedCourse,
  confirmMaterialHealthAction,
  deleteResource,
  fetchMaterialHealth,
  fetchMaterialHealthActions,
  fetchResource,
  fetchResources,
  uploadResource,
  UploadError,
  type MaterialHealth,
  type MaterialHealthAction,
  type UploadResourceResponse,
} from '../../../shared/api/resourcesClient';
import { emitCourseListChanged } from '../../../shared/course/courseStore';
import { useCourseState } from '../../../shared/course/useCourseState';
import { NextStepBanner } from '../../../widgets/next-step-banner/ui/NextStepBanner';
import { TeachingResourceSummary } from '../../../widgets/teaching-resource-summary';

import './teachingResourcesPage.css';

const { Paragraph, Title } = Typography;

// ============================================================
// 数据映射：后端 response → 前端 UploadedMaterial
// ============================================================

function mapBackendStatus(status: string): UploadedMaterialStatus {
  switch (status) {
    case 'ready':
      return 'extracted';
    case 'processing':
      return 'extracting';
    case 'failed':
      return 'failed';
    default:
      return 'pending';
  }
}

function mapBackendFormat(format: string): UploadedMaterialFileType {
  const lower = (format || '').toLowerCase();
  if (lower === 'pdf' || lower === 'docx' || lower === 'xlsx') {
    return lower;
  }
  return 'pdf';
}

function mapSuggestedCourse(
  raw: UploadResourceResponse['suggestedCourse'],
): SuggestedCourseInfo | null {
  if (!raw) return null;
  return {
    name: raw.name,
    code: raw.code ?? '',
    credits: raw.credits ?? null,
    description: raw.description ?? null,
    confidence: raw.confidence ?? 0.9,
    sourceExcerpt: raw.source_excerpt ?? null,
  };
}

function mapBackendResource(
  resp: UploadResourceResponse,
  fallbackCategory: UploadedMaterialCategory = '课程大纲',
): UploadedMaterial {
  const category: UploadedMaterialCategory = (
    ['培养方案', '课程大纲', '实验指导书', '试卷', '其他'].includes(
      resp.resourceType,
    )
      ? resp.resourceType
      : fallbackCategory
  ) as UploadedMaterialCategory;
  return {
    id: resp.id,
    fileName: resp.fileName || resp.name,
    fileType: mapBackendFormat(resp.format),
    category,
    uploadTime: resp.updatedAt,
    uploadedBy: resp.owner || '当前用户',
    status: mapBackendStatus(resp.status),
    fileSize: resp.size,
    fileUrl: '#',
    course: resp.course,
    suggestedCourse: mapSuggestedCourse(resp.suggestedCourse),
  };
}

// ============================================================
// 主组件
// ============================================================

export function TeachingResourcesPage() {
  const navigate = useNavigate();
  const [materials, setMaterials] = useState<UploadedMaterial[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [materialHealth, setMaterialHealth] = useState<MaterialHealth | null>(null);
  const [healthActions, setHealthActions] = useState<MaterialHealthAction[]>([]);
  const [confirmingHealthAction, setConfirmingHealthAction] = useState<string | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const autopilot = useAutopilotTask();
  const courseState = useCourseState();
  const [uploadCourse, setUploadCourse] = useState<string | undefined>();
  // 候选课程确认：每个待确认材料对应一个可编辑名称 + 提交状态
  const [editingNames, setEditingNames] = useState<Record<string, string>>({});
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const pollingTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // 当选中课程变化时，取当前课程名用于后端过滤 / 上传归属
  const currentCourseName = useMemo(
    () => courseState.selectedCourseName,
    [courseState.selectedCourseName],
  );
  const allCoursesMode = courseState.selectedCourseId === null;

  // 初始化 / 切课：拉取真实数据（按课程过滤）
  const loadMaterials = useCallback(async () => {
    setLoadingMaterials(true);
    const [remote, health, actions] = await Promise.all([
      fetchResources(currentCourseName),
      fetchMaterialHealth(),
      fetchMaterialHealthActions(),
    ]);
    setLoadFailed(remote === null);
    setMaterials(remote ? remote.map((r) => mapBackendResource(r)) : []);
    setMaterialHealth(health);
    setHealthActions(actions ?? []);
    setLoadingMaterials(false);
  }, [currentCourseName]);

  useEffect(() => {
    void loadMaterials();
  }, [loadMaterials]);

  // 组件卸载时清理所有轮询定时器
  useEffect(() => {
    const timers = pollingTimers.current;
    return () => {
      Object.values(timers).forEach((t) => clearTimeout(t));
    };
  }, []);

  // autopilot 分析，完成后展示结果摘要
  const handleRunAutopilot = async (record: UploadedMaterial) => {
    try {
      const result = await autopilot.run(record.id);
      message.success(
        `分析完成：${result.candidates_created} 条关系、${result.findings_created} 条诊断已生成`,
      );
      setSummaryOpen(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '自动分析失败，请稍后重试';
      message.error(msg);
    }
  };

  // 轮询单个资源，直到 AI 识别出候选课程或资源就绪（无候选）
  // 上传后 suggestedCourse 是异步写入的，需要前端拉取刷新
  const pollSuggestedCourse = useCallback((resourceId: string) => {
    let attempts = 0;
    const maxAttempts = 15; // 约 30 秒
    const tick = async () => {
      attempts += 1;
      const detail = await fetchResource(resourceId);
      if (detail) {
        const mapped = mapBackendResource(detail);
        // 候选课程已出现，或资源已就绪但无候选（说明材料非课程类）→ 停止轮询
        if (mapped.suggestedCourse || mapped.status === 'extracted') {
          setMaterials((prev) =>
            prev.map((m) => (m.id === resourceId ? { ...mapped, category: m.category } : m)),
          );
          if (mapped.suggestedCourse) {
            setEditingNames((prev) => ({
              ...prev,
              [resourceId]: mapped.suggestedCourse!.name,
            }));
            message.info(
              `AI 已识别候选课程「${mapped.suggestedCourse.name}」，请确认归属`,
            );
          }
          delete pollingTimers.current[resourceId];
          return;
        }
      }
      if (attempts < maxAttempts) {
        pollingTimers.current[resourceId] = setTimeout(tick, 2000);
      } else {
        delete pollingTimers.current[resourceId];
      }
    };
    pollingTimers.current[resourceId] = setTimeout(tick, 2000);
  }, []);

  // 上传 → 立即自动分析
  // 失败时不再走本地降级：明确报错，避免"似乎上传成功"的错觉
  // 课程上下文：
  //   - 已选具体课程 → 自动归属到该课程
  //   - 全部课程模式且未选课 → 裸传「未分类」，AI 异步识别候选课程后由老师确认
  const handleUpload = async (
    file: File,
    category: UploadedMaterialCategory,
  ) => {
    const course = currentCourseName ?? uploadCourse ?? '未分类';
    const nakedUpload = course === '未分类';
    const hide = message.loading(`${file.name} 上传中…`, 0);
    try {
      const resp = await uploadResource(file, course, category);
      hide();
      const newMaterial = mapBackendResource(resp, category);
      setMaterials((prev) => [newMaterial, ...prev]);
      void loadMaterials();
      if (nakedUpload) {
        message.success(
          `${file.name} 上传成功，AI 正在识别课程归属…`,
        );
        // 裸传：轮询候选课程，暂不自动触发 autopilot（等确认课程后再分析）
        pollSuggestedCourse(resp.id);
      } else {
        message.success(
          `${file.name} 已归属「${course}」，上传成功，AI 正在自动分析…`,
        );
        void handleRunAutopilot(newMaterial);
      }
    } catch (err) {
      hide();
      if (err instanceof UploadError) {
        if (err.kind === 'unauthorized') {
          message.error(err.message);
          const next = encodeURIComponent(
            window.location.pathname + window.location.search,
          );
          window.location.replace(`/login?next=${next}`);
          return;
        }
        message.error(err.message);
        return;
      }
      message.error(
        `${file.name} 上传失败：${err instanceof Error ? err.message : '未知错误'}`,
      );
    }
  };

  // 找到最适合进行 AI 自动分析的材料：已就绪且未在分析中
  const analyzableMaterial = materials.find(
    (m) => m.status === 'extracted' && m.id !== autopilot.loadingResourceId,
  );
  const isAnalyzing = autopilot.status === 'running';

  const handleGlobalAutopilot = () => {
    if (!analyzableMaterial) {
      message.info('暂无可分析材料，请先上传并等待提取完成');
      return;
    }
    void handleRunAutopilot(analyzableMaterial);
  };

  // 确认候选课程：调后端建课（同名复用）+ 回写材料归属，随后触发 autopilot 分析
  const handleConfirmCourse = async (record: UploadedMaterial) => {
    const name = (editingNames[record.id] ?? '').trim();
    if (!name) {
      message.warning('请输入课程名称');
      return;
    }
    setConfirmingId(record.id);
    try {
      const result = await confirmSuggestedCourse(record.id, {
        name,
        code: record.suggestedCourse?.code || undefined,
        credits: record.suggestedCourse?.credits ?? undefined,
        description: record.suggestedCourse?.description ?? undefined,
      });
      // 回写本地：清空候选、更新课程归属、状态保持就绪
      setMaterials((prev) =>
        prev.map((m) =>
          m.id === record.id
            ? { ...m, course: result.courseName, suggestedCourse: null }
            : m,
        ),
      );
      setEditingNames((prev) => {
        const next = { ...prev };
        delete next[record.id];
        return next;
      });
      message.success(`已创建课程「${result.courseName}」并归属材料`);
      emitCourseListChanged();
      // 刷新课程切换器列表，让新课程出现在侧边栏
      void courseState.refetch();
      // 确认课程后再触发 autopilot 分析
      void handleRunAutopilot({ ...record, course: result.courseName });
    } catch (e) {
      message.error(e instanceof Error ? e.message : '确认失败，请重试');
    } finally {
      setConfirmingId(null);
    }
  };

  // 忽略候选课程：清空 suggestedCourse，材料保持「未分类」，可手动分析
  const handleDismissSuggested = (record: UploadedMaterial) => {
    setMaterials((prev) =>
      prev.map((m) => (m.id === record.id ? { ...m, suggestedCourse: null } : m)),
    );
    setEditingNames((prev) => {
      const next = { ...prev };
      delete next[record.id];
      return next;
    });
    message.info(`已忽略建议，材料「${record.fileName}」保持未分类`);
  };

  // 删除教学资源：先调后端接口，成功后再移除本地状态
  const handleDelete = async (record: UploadedMaterial) => {
    try {
      await deleteResource(record.id);
      setMaterials((prev) => prev.filter((m) => m.id !== record.id));
      void loadMaterials();
      message.success(`${record.fileName} 已删除`);
    } catch (err) {
      message.error(
        err instanceof Error ? err.message : `${record.fileName} 删除失败`,
      );
    }
  };

  const handleConfirmHealthAction = async (action: MaterialHealthAction) => {
    const key = `${action.riskCode}-${action.resourceId ?? 'major'}`;
    setConfirmingHealthAction(key);
    try {
      const result = await confirmMaterialHealthAction(action);
      message.success(
        result.created ? '已创建改进事项' : '该风险已有处理中改进事项',
      );
      void navigate(
        `/improvements?selected=${encodeURIComponent(result.improvementId)}`,
      );
    } catch (error) {
      message.error(error instanceof Error ? error.message : '确认处理失败');
    } finally {
      setConfirmingHealthAction(null);
    }
  };

  // —— 动态 Alert 数据 ——
  const failedCount = materials.filter((m) => m.status === 'failed').length;
  const pendingCount = materials.filter(
    (m) => m.status === 'pending' || m.status === 'extracting',
  ).length;
  const hasAbnormal = failedCount > 0 || pendingCount > 0;

  // 候选课程确认区：仅展示有待确认 suggestedCourse 的材料
  const pendingSuggestions = materials.filter((m) => m.suggestedCourse != null);

  // ============================================================
  // 表格列：工业铭牌风格
  // ============================================================

  const columns: ColumnsType<UploadedMaterial> = [
    {
      title: '文件名',
      dataIndex: 'fileName',
      key: 'fileName',
      ellipsis: true,
      width: 300,
    },
    {
      title: '格式',
      dataIndex: 'fileType',
      key: 'fileType',
      width: 80,
      render: (type: string) => (
        <span className={`m3-file-tag m3-file-tag--${type}`}>
          {type.toUpperCase()}
        </span>
      ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 110,
      render: (v: string) => (
        <span className="m3-card-td-mono" style={{ color: 'var(--m3-ink-soft)' }}>
          {v}
        </span>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: UploadedMaterial['status']) => (
        <MaterialStatusTag status={status} />
      ),
    },
    {
      title: '提取节点',
      dataIndex: 'extractedNodeCount',
      key: 'extractedNodeCount',
      width: 90,
      render: (count?: number) =>
        count != null ? (
          <span className="m3-card-td-mono">
            {count}
            <span style={{ color: 'var(--m3-ink-faint)', marginLeft: 2 }}>
              个
            </span>
          </span>
        ) : (
          <span
            className="m3-card-td-mono"
            style={{ color: 'var(--m3-ink-faint)' }}
          >
            —
          </span>
        ),
    },
    {
      title: '上传时间',
      dataIndex: 'uploadTime',
      key: 'uploadTime',
      width: 150,
      render: (v: string) => (
        <span className="m3-card-td-mono">{v}</span>
      ),
    },
    {
      title: '处理进度',
      key: 'processingProgress',
      width: 180,
      render: (_, record) => {
        if (record.status === 'pending' || record.status === 'extracting') {
          return <InlineProcessingStatus materialId={record.id} />;
        }
        if (record.status === 'extracted') {
          return (
            <span className="m3-progress-text m3-progress-success">
              ◉ 已就绪
            </span>
          );
        }
        if (record.status === 'failed') {
          return (
            <span className="m3-progress-text m3-progress-error">
              ✕ 提取失败
            </span>
          );
        }
        return (
          <span
            className="m3-progress-text"
            style={{ color: 'var(--m3-ink-faint)' }}
          >
            —
          </span>
        );
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 140,
      render: (_, record) => {
        const analyzing =
          autopilot.status === 'running' &&
          autopilot.loadingResourceId === record.id;
        const failed = record.status === 'failed';

        if (analyzing) {
          return <span className="m3-analyzing-text">分析中</span>;
        }
        return (
          <span className="m3-actions">
            {failed && (
              <Button
                className="m3-btn-primary"
                icon={<ReloadOutlined />}
                onClick={() => handleRunAutopilot(record)}
                size="small"
                type="default"
              >
                重新分析
              </Button>
            )}
            <Popconfirm
              onConfirm={() => handleDelete(record)}
              title="确认删除该材料？"
              okText="删除"
              cancelText="取消"
            >
              <Button
                className="m3-btn-link m3-btn-danger"
                danger
                icon={<DeleteOutlined />}
                size="small"
                type="link"
              >
                删除
              </Button>
            </Popconfirm>
          </span>
        );
      },
    },
  ];

  // ============================================================
  // 渲染：工业风结构
  // ============================================================

  return (
    <main className="teaching-resources-page">
      {/* ---------- HEADER · 社论标题 + MODULE 铭牌 + AI 自动分析 ---------- */}
      <div className="teaching-resources-page-header">
        <div>
          <Space align="end" size={14}>
            <Title level={2} style={{ marginBottom: 0 }}>
              教学资源与材料
            </Title>
            <span className="m3-module-plate">M3 · Resources</span>
          </Space>
          <Paragraph type="secondary" style={{ marginTop: 8 }}>
            上传培养方案、课程大纲、实验指导书等教学文件，系统自动提取能力节点、构建支撑图谱，并完成初步差距诊断。
          </Paragraph>
        </div>
        <Button
          type="primary"
          size="large"
          icon={isAnalyzing ? <ThunderboltOutlined /> : <PlayCircleOutlined />}
          loading={isAnalyzing}
          onClick={handleGlobalAutopilot}
          disabled={!analyzableMaterial}
          className="m3-autopilot-btn"
        >
          {isAnalyzing ? 'AI 自动分析中…' : 'AI 自动分析'}
        </Button>
      </div>

      {/* ---------- ALERT · 后端加载失败 ---------- */}
      {loadFailed && (
        <Alert
          action={
            <Button onClick={() => void loadMaterials()} size="small">
              重试
            </Button>
          }
          className="teaching-resources-notice"
          description="无法连接后端资源服务，以下为空清单。请确认 API 服务已启动后重试。"
          showIcon
          title="材料清单加载失败"
          type="error"
        />
      )}

      {/* ---------- ALERT · 琥珀金警告（动态） ---------- */}
      {hasAbnormal && (
        <Alert
          className="teaching-resources-notice"
          description={`当前有 ${failedCount} 份材料提取失败，${pendingCount} 份材料等待处理；异常材料不会进入 M4 智能识别。`}
          icon={<InfoCircleOutlined />}
          showIcon
          title="材料治理状态：先处理异常，再进入能力识别"
          type="warning"
        />
      )}

      {materialHealth && (
        <Card className="m3-card m3-health-card" bordered={false}>
          <div className="m3-card-head">
            <div className="m3-card-title">
              <span className="m3-title-bullet" />
              材料健康度
              <span className="m3-title-count">Evidence Governance</span>
            </div>
            <Tag color={materialHealth.healthScore >= 80 ? 'green' : 'gold'}>
              {materialHealth.riskCount} 项风险
            </Tag>
          </div>
          <div className="m3-health-body">
            <div className="m3-health-score">
              <strong>{materialHealth.healthScore}</strong>
              <span>/ 100</span>
            </div>
            <div className="m3-health-metrics">
              <span>可用 {materialHealth.readyCount}</span>
              <span>处理中 {materialHealth.processingCount}</span>
              <span>失败 {materialHealth.failedCount}</span>
              <span>隔离 {materialHealth.quarantinedCount}</span>
            </div>
            {healthActions.length > 0 && (
              <div className="m3-health-actions">
                {healthActions.slice(0, 3).map((item, index) => (
                  <div
                    className="m3-health-action"
                    key={`${item.riskCode}-${item.resourceId ?? index}`}
                  >
                    <Tag color={item.priority === 'high' ? 'red' : 'gold'}>
                      {item.priority}
                    </Tag>
                    <span>{item.action}</span>
                    <div className="m3-health-action-controls">
                      <small>{item.ownerRole} · 人工确认</small>
                      <Button
                        size="small"
                        type="primary"
                        loading={
                          confirmingHealthAction ===
                          `${item.riskCode}-${item.resourceId ?? 'major'}`
                        }
                        onClick={() => void handleConfirmHealthAction(item)}
                      >
                        确认处理
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ---------- 上传卡片 ---------- */}
      <Card className="m3-card" bordered={false}>
        <div className="m3-card-head">
          <div className="m3-card-title">
            <span className="m3-title-bullet" />
            材料上传
            <span className="m3-title-count">Upload Documents</span>
          </div>
          <div className="m3-card-meta">SECTION · 01</div>
        </div>
        {/* 课程上下文提示条：选了具体课 → 绿色归属提示；全部课程 → 可选课程或裸传由 AI 识别 */}
        <div
          className={
            allCoursesMode
              ? 'm3-course-context m3-course-context--warn'
              : 'm3-course-context m3-course-context--ok'
          }
        >
          {allCoursesMode ? (
            <>
              <RobotOutlined />
              <span>未选课程时直接上传，AI 将自动识别材料归属的课程并生成候选，老师确认后即创建课程。</span>
              <span style={{ margin: '0 8px', color: 'var(--m3-ink-faint)' }}>|</span>
              <span>或手动指定：</span>
              <Select
                placeholder="选择课程（可选）"
                style={{ width: 200 }}
                value={uploadCourse}
                onChange={setUploadCourse}
                allowClear
                options={(courseState.courseList ?? []).map((c) => ({
                  value: c.name,
                  label: c.name,
                }))}
                showSearch
              />
            </>
          ) : (
            <>
              <CheckCircleOutlined />
              <span>
                当前课程：<strong>{currentCourseName}</strong>
                ，上传的所有材料将自动归属到该课程。
              </span>
            </>
          )}
        </div>
        <div className="m3-card-upload-body">
          <UploadDropzone onUpload={handleUpload} />
        </div>
      </Card>

      {/* ---------- AI 候选课程确认区 ---------- */}
      {pendingSuggestions.length > 0 && (
        <Card className="m3-card m3-card--suggested" bordered={false}>
          <div className="m3-card-head">
            <div className="m3-card-title">
              <span className="m3-title-bullet" />
              AI 识别的候选课程
              <span className="m3-title-count">{pendingSuggestions.length} 待确认</span>
            </div>
          </div>
          <div className="m3-card-table-body">
            {pendingSuggestions.map((record) => {
              const suggested = record.suggestedCourse!;
              const confPct = Math.round((suggested.confidence ?? 0.9) * 100);
              return (
                <div
                  key={record.id}
                  className="m3-suggested-course-row"
                >
                  <div className="m3-suggested-course-file">
                    <RobotOutlined className="m3-suggested-course-icon" />
                    <span className="m3-suggested-course-filename">{record.fileName}</span>
                  </div>

                  <div className="m3-suggested-course-evidence">
                    <span className="m3-suggested-course-label">AI 建议课程</span>
                    <span className="m3-suggested-course-name">{suggested.name}</span>
                    {suggested.code && (
                      <span className="m3-suggested-course-code">{suggested.code}</span>
                    )}
                    <span className="m3-confidence-pill">置信度 {confPct}%</span>
                    {suggested.sourceExcerpt && (
                      <span
                        className="m3-suggested-excerpt"
                        title={suggested.sourceExcerpt}
                      >
                        「{suggested.sourceExcerpt.slice(0, 60)}
                        {suggested.sourceExcerpt.length > 60 ? '…' : ''}」
                      </span>
                    )}
                  </div>

                  <div className="m3-suggested-course-actions">
                    <label className="m3-suggested-course-field-label">课程名称</label>
                    <Input
                      className="m3-suggested-course-input"
                      value={editingNames[record.id] ?? ''}
                      onChange={(e) =>
                        setEditingNames((prev) => ({
                          ...prev,
                          [record.id]: e.target.value,
                        }))
                      }
                      onPressEnter={() => void handleConfirmCourse(record)}
                    />
                    <Button
                      type="primary"
                      loading={confirmingId === record.id}
                      onClick={() => void handleConfirmCourse(record)}
                    >
                      确认归属
                    </Button>
                    <Button
                      className="m3-btn-link"
                      onClick={() => handleDismissSuggested(record)}
                    >
                      忽略
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* ---------- 材料列表卡片 ---------- */}
      <Card className="m3-card" bordered={false}>
        <div className="m3-card-head">
          <div className="m3-card-title">
            <span className="m3-title-bullet" />
            材料清单
            <span className="m3-title-count">{materials.length} items</span>
          </div>
          <div className="m3-card-meta">SECTION · 02</div>
        </div>
        <div className="m3-card-table-body">
          <Table
            columns={columns}
            dataSource={materials}
            loading={loadingMaterials}
            locale={{
              emptyText: loadingMaterials
                ? '加载中…'
                : '还没有教学材料。上传第一份材料后，AI 会自动提取节点并构建图谱。',
            }}
            pagination={{
              pageSize: 10,
              showSizeChanger: false,
              hideOnSinglePage: true,
            }}
            rowKey="id"
            size="middle"
          />
        </div>
      </Card>

      {/* ---------- Summary 统计 ---------- */}
      <TeachingResourceSummary materials={materials} />

      {/* ---------- 结果摘要 Modal ---------- */}
      <Modal
        centered
        footer={null}
        onCancel={() => setSummaryOpen(false)}
        open={summaryOpen}
        title={
          <Space>
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
            <span>AI 自动分析完成</span>
          </Space>
        }
        width={520}
      >
        <div className="m3-summary">
          <Paragraph type="secondary" style={{ marginBottom: 16 }}>
            已分析文件：{autopilot.result?.resource_name ?? '—'}
          </Paragraph>
          <div className="m3-summary-grid">
            <div className="m3-summary-item">
              <span className="m3-summary-label">提取节点</span>
              <span className="m3-summary-value">{autopilot.result?.nodes.length ?? '—'}</span>
            </div>
            <div className="m3-summary-item">
              <span className="m3-summary-label">候选关系</span>
              <span className="m3-summary-value">
                {autopilot.result?.relations.length ?? '—'}
              </span>
            </div>
            <div className="m3-summary-item">
              <span className="m3-summary-label">诊断发现</span>
              <span className="m3-summary-value">
                {autopilot.result?.findings.length ?? '—'}
              </span>
            </div>
            <div className="m3-summary-item">
              <span className="m3-summary-label">改进建议</span>
              <span className="m3-summary-value">
                {autopilot.result?.suggestions.length ?? '—'}
              </span>
            </div>
          </div>
          <div className="m3-summary-actions">
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={() => {
                setSummaryOpen(false);
                window.location.href = '/graph';
              }}
            >
              前往能力图谱查看
            </Button>
            <Button onClick={() => setSummaryOpen(false)}>关闭</Button>
          </div>
        </div>
      </Modal>

      {/* ---------- 下一步 Banner ---------- */}
      <NextStepBanner currentPath="/resources" />
    </main>
  );
}
