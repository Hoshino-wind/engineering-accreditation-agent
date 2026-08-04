import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileDoneOutlined,
  FormOutlined,
  ReloadOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Empty,
  Input,
  message,
  Progress,
  Select,
  Space,
  Spin,
  Statistic,
  Tag,
  Typography,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

import {
  fetchImprovementTasks,
  updateImprovementTask,
  type ImprovementPriority,
  type ImprovementStatus,
  type ImprovementTaskResponse,
  type ImprovementTaskUpdateRequest,
} from '../../../shared/api/improvementsClient';

import './teachingImprovementPage.css';

const { Paragraph, Text, Title } = Typography;
const { TextArea } = Input;

const PRIORITY_CONFIG: Record<
  ImprovementPriority,
  { label: string; color: string }
> = {
  high: { label: '高优先级', color: 'red' },
  medium: { label: '中优先级', color: 'orange' },
  low: { label: '低优先级', color: 'blue' },
};

const STATUS_CONFIG: Record<
  ImprovementStatus,
  { label: string; color: string; percent: number }
> = {
  planned: { label: '已计划', color: 'default', percent: 25 },
  'in-progress': { label: '进行中', color: 'processing', percent: 55 },
  'awaiting-reevaluation': { label: '待复查', color: 'warning', percent: 80 },
  closed: { label: '已关闭', color: 'success', percent: 100 },
};

interface TaskDraft {
  title: string;
  course: string;
  targetNode: string;
  priority: ImprovementPriority;
  status: ImprovementStatus;
  owner: string;
  dueAt: string;
  actionTitle: string;
  actionDetail: string;
  verificationMethod: string;
  completionSummary: string;
  evidenceUri: string;
  reevaluationResult: string;
}

function draftFromTask(task: ImprovementTaskResponse): TaskDraft {
  return {
    title: task.title,
    course: task.course,
    targetNode: task.targetNode,
    priority: task.priority,
    status: task.status,
    owner: task.owner,
    dueAt: task.dueAt,
    actionTitle: task.actionTitle,
    actionDetail: task.actionDetail,
    verificationMethod: task.verificationMethod,
    completionSummary: task.completionSummary,
    evidenceUri: task.evidenceUri,
    reevaluationResult:
      task.reevaluationResult === null || task.reevaluationResult === undefined
        ? ''
        : String(task.reevaluationResult),
  };
}

function taskUpdateFromDraft(draft: TaskDraft): ImprovementTaskUpdateRequest {
  const reevaluationResult = draft.reevaluationResult.trim();
  return {
    title: draft.title,
    course: draft.course,
    targetNode: draft.targetNode,
    priority: draft.priority,
    status: draft.status,
    owner: draft.owner,
    dueAt: draft.dueAt,
    actionTitle: draft.actionTitle,
    actionDetail: draft.actionDetail,
    verificationMethod: draft.verificationMethod,
    completionSummary: draft.completionSummary,
    evidenceUri: draft.evidenceUri,
    reevaluationResult:
      reevaluationResult.length > 0 ? Number(reevaluationResult) : null,
  };
}

function suggestedDestination(task: ImprovementTaskResponse) {
  const raw = task.sourcePayload.suggestedDestination;
  return typeof raw === 'string' ? raw.toUpperCase() : '';
}

export function TeachingImprovementPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tasks, setTasks] = useState<ImprovementTaskResponse[]>([]);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [draft, setDraft] = useState<TaskDraft | undefined>();

  const loadTasks = async (showMessage = false) => {
    setLoading(true);
    try {
      const result = await fetchImprovementTasks();
      setTasks(result);
      const diagnosticId = searchParams.get('diagnostic');
      const preferred =
        result.find((task) => task.sourceFindingId === diagnosticId) ?? result[0];
      setSelectedId((current) =>
        current && result.some((task) => task.id === current)
          ? current
          : preferred?.id,
      );
      if (showMessage) {
        message.success('已刷新整改任务');
      }
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : '整改任务加载失败';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTasks();
  }, []);

  const selected = tasks.find((task) => task.id === selectedId);

  useEffect(() => {
    setDraft(selected ? draftFromTask(selected) : undefined);
  }, [selected]);

  const stats = useMemo(() => {
    return {
      total: tasks.length,
      high: tasks.filter((task) => task.priority === 'high').length,
      inProgress: tasks.filter((task) => task.status === 'in-progress').length,
      awaiting: tasks.filter((task) => task.status === 'awaiting-reevaluation').length,
      closed: tasks.filter((task) => task.status === 'closed').length,
    };
  }, [tasks]);

  const patchTask = (task: ImprovementTaskResponse) => {
    setTasks((current) =>
      current.map((item) => (item.id === task.id ? task : item)),
    );
  };

  const handleSave = async () => {
    if (!selected || !draft) {
      return;
    }
    setSaving(true);
    try {
      const updated = await updateImprovementTask(
        selected.id,
        taskUpdateFromDraft(draft),
      );
      patchTask(updated);
      message.success('整改任务已保存');
    } catch (error) {
      const msg = error instanceof Error ? error.message : '整改任务保存失败';
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleStatus = async (status: ImprovementStatus) => {
    if (!selected) {
      return;
    }
    setSaving(true);
    try {
      const updated = await updateImprovementTask(selected.id, { status });
      patchTask(updated);
      setDraft(draftFromTask(updated));
      message.success(`任务状态已更新为：${STATUS_CONFIG[status].label}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : '状态更新失败';
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleGoSource = () => {
    if (!selected) {
      return;
    }
    const destination = suggestedDestination(selected);
    const indicator = selected.targetNode.split(' ', 1)[0] ?? selected.targetNode;
    const params = new URLSearchParams({
      diagnostic: selected.sourceFindingId ?? selected.id,
      indicator,
      course: selected.course,
    });
    if (destination === 'M3') {
      navigate(`/resources?${params.toString()}`);
      return;
    }
    if (destination === 'M4') {
      navigate(`/recognition?${params.toString()}`);
      return;
    }
    if (destination === 'M2') {
      navigate(`/graph?${params.toString()}`);
      return;
    }
    navigate(`/diagnostics?${params.toString()}`);
  };

  return (
    <main className="teaching-improvement-page">
      <div className="teaching-improvement-page-header">
        <div>
          <Space align="center" size={10} wrap>
            <Title level={2}>教学改进闭环</Title>
            <Tag color="geekblue">M7 教学改进</Tag>
            <Tag color="green">任务持久化</Tag>
          </Space>
          <Paragraph type="secondary">
            M7 接收 M5 图谱诊断转来的整改任务，记录负责人、截止时间、整改动作、完成证据和复查结果。
            它不负责重新诊断，而是负责把问题分派、推进和关闭。
          </Paragraph>
        </div>
        <Button icon={<ReloadOutlined />} onClick={() => void loadTasks(true)}>
          刷新任务
        </Button>
      </div>

      <Card className="improvement-stats" size="small">
        <Space size={32} wrap>
          <Statistic title="任务总数" value={stats.total} />
          <Statistic
            title="高优先级"
            value={stats.high}
            valueStyle={{ color: '#ff4d4f' }}
          />
          <Statistic
            prefix={<ClockCircleOutlined />}
            title="进行中"
            value={stats.inProgress}
            valueStyle={{ color: '#1677ff' }}
          />
          <Statistic
            prefix={<FileDoneOutlined />}
            title="待复查"
            value={stats.awaiting}
            valueStyle={{ color: '#faad14' }}
          />
          <Statistic
            prefix={<CheckCircleOutlined />}
            title="已关闭"
            value={stats.closed}
            valueStyle={{ color: '#52c41a' }}
          />
        </Space>
      </Card>

      <Alert
        className="improvement-alert"
        description="推荐顺序：在 M5 将诊断问题转为任务，在 M7 分配负责人并记录整改动作，整改后回到 M5 重新诊断，确认缺口消失后关闭任务。"
        icon={<ToolOutlined />}
        message="M7 是整改执行台，负责跟踪问题有没有被真正处理。"
        showIcon
        type="info"
      />

      <div className="improvement-body">
        <Card
          className="improvement-list-card"
          size="small"
          title={`整改任务列表（${tasks.length}）`}
        >
          {loading ? (
            <div className="improvement-loading">
              <Spin />
              <Paragraph type="secondary">正在读取整改任务...</Paragraph>
            </div>
          ) : tasks.length === 0 ? (
            <Empty
              description="暂无整改任务，请先到 M5 图谱诊断中选择问题并转为整改任务"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ) : (
            <div className="improvement-list">
              {tasks.map((task) => {
                const isSelected = selectedId === task.id;
                const status = STATUS_CONFIG[task.status];
                const priority = PRIORITY_CONFIG[task.priority];
                return (
                  <button
                    className={`improvement-list-item ${isSelected ? 'selected' : ''}`}
                    key={task.id}
                    onClick={() => setSelectedId(task.id)}
                    type="button"
                  >
                    <div className="improvement-list-item-header">
                      <Space size={6} wrap>
                        <Tag color={priority.color}>{priority.label}</Tag>
                        <Tag color={status.color}>{status.label}</Tag>
                      </Space>
                      <Text type="secondary">{task.displayId}</Text>
                    </div>
                    <Text strong className="improvement-list-item-title">
                      {task.title}
                    </Text>
                    <div className="improvement-list-item-meta">
                      <Text type="secondary">{task.course}</Text>
                      <Text type="secondary"> / {task.owner}</Text>
                      <Text type="secondary"> / 截止 {task.dueAt}</Text>
                    </div>
                    <Progress
                      percent={status.percent}
                      showInfo={false}
                      size="small"
                      status={task.status === 'closed' ? 'success' : 'active'}
                    />
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        <Card
          className="improvement-detail-card"
          size="small"
          title="任务详情"
          extra={
            selected ? (
              <Space size={8} wrap>
                <Button icon={<FormOutlined />} onClick={handleGoSource}>
                  回到来源处理
                </Button>
                <Button
                  icon={<ToolOutlined />}
                  onClick={() => navigate('/diagnostics')}
                >
                  回到 M5 复查
                </Button>
              </Space>
            ) : null
          }
        >
          {loading ? (
            <div className="improvement-loading">
              <Spin />
            </div>
          ) : selected && draft ? (
            <div className="improvement-detail">
              <Space size={8} wrap>
                <Tag color={PRIORITY_CONFIG[selected.priority].color}>
                  {PRIORITY_CONFIG[selected.priority].label}
                </Tag>
                <Tag color={STATUS_CONFIG[selected.status].color}>
                  {STATUS_CONFIG[selected.status].label}
                </Tag>
                <Tag>{selected.sourceLabel}</Tag>
              </Space>

              <div className="improvement-form-grid">
                <label>
                  <Text strong>任务标题</Text>
                  <Input
                    value={draft.title}
                    onChange={(event) =>
                      setDraft({ ...draft, title: event.target.value })
                    }
                  />
                </label>
                <label>
                  <Text strong>课程/范围</Text>
                  <Input
                    value={draft.course}
                    onChange={(event) =>
                      setDraft({ ...draft, course: event.target.value })
                    }
                  />
                </label>
                <label>
                  <Text strong>负责人</Text>
                  <Input
                    value={draft.owner}
                    onChange={(event) =>
                      setDraft({ ...draft, owner: event.target.value })
                    }
                  />
                </label>
                <label>
                  <Text strong>截止日期</Text>
                  <Input
                    type="date"
                    value={draft.dueAt}
                    onChange={(event) =>
                      setDraft({ ...draft, dueAt: event.target.value })
                    }
                  />
                </label>
                <label>
                  <Text strong>优先级</Text>
                  <Select
                    value={draft.priority}
                    onChange={(value) => setDraft({ ...draft, priority: value })}
                    options={[
                      { label: '高优先级', value: 'high' },
                      { label: '中优先级', value: 'medium' },
                      { label: '低优先级', value: 'low' },
                    ]}
                  />
                </label>
                <label>
                  <Text strong>状态</Text>
                  <Select
                    value={draft.status}
                    onChange={(value) => setDraft({ ...draft, status: value })}
                    options={[
                      { label: '已计划', value: 'planned' },
                      { label: '进行中', value: 'in-progress' },
                      { label: '待复查', value: 'awaiting-reevaluation' },
                      { label: '已关闭', value: 'closed' },
                    ]}
                  />
                </label>
              </div>

              <div className="improvement-detail-section">
                <Text strong>关联指标/问题</Text>
                <Paragraph type="secondary">{draft.targetNode}</Paragraph>
              </div>

              <div className="improvement-detail-section">
                <Text strong>整改动作</Text>
                <Input
                  value={draft.actionTitle}
                  onChange={(event) =>
                    setDraft({ ...draft, actionTitle: event.target.value })
                  }
                />
                <TextArea
                  autoSize={{ minRows: 4, maxRows: 8 }}
                  value={draft.actionDetail}
                  onChange={(event) =>
                    setDraft({ ...draft, actionDetail: event.target.value })
                  }
                />
              </div>

              <div className="improvement-detail-section">
                <Text strong>复查方法</Text>
                <TextArea
                  autoSize={{ minRows: 2, maxRows: 4 }}
                  value={draft.verificationMethod}
                  onChange={(event) =>
                    setDraft({ ...draft, verificationMethod: event.target.value })
                  }
                />
              </div>

              <div className="improvement-detail-section">
                <Text strong>完成说明 / 证据</Text>
                <TextArea
                  autoSize={{ minRows: 3, maxRows: 6 }}
                  placeholder="记录已补充的材料、已修改的关系、复查结论等"
                  value={draft.completionSummary}
                  onChange={(event) =>
                    setDraft({ ...draft, completionSummary: event.target.value })
                  }
                />
                <Input
                  placeholder="证据链接或材料版本，例如 material-xxx / v2"
                  value={draft.evidenceUri}
                  onChange={(event) =>
                    setDraft({ ...draft, evidenceUri: event.target.value })
                  }
                />
              </div>

              <div className="improvement-detail-section improvement-reevaluation-row">
                <label>
                  <Text strong>复查结果</Text>
                  <Input
                    placeholder="例如 0.82"
                    value={draft.reevaluationResult}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        reevaluationResult: event.target.value,
                      })
                    }
                  />
                </label>
                <Text type="secondary">
                  创建：{selected.createdAt.slice(0, 10)} / 更新：
                  {selected.updatedAt.slice(0, 10)}
                </Text>
              </div>

              <Space className="improvement-detail-actions" wrap>
                <Button
                  type="primary"
                  loading={saving}
                  icon={<CheckCircleOutlined />}
                  onClick={() => void handleSave()}
                >
                  保存任务
                </Button>
                <Button
                  loading={saving}
                  onClick={() => void handleStatus('in-progress')}
                >
                  开始处理
                </Button>
                <Button
                  loading={saving}
                  onClick={() => void handleStatus('awaiting-reevaluation')}
                >
                  提交复查
                </Button>
                <Button
                  loading={saving}
                  onClick={() => void handleStatus('closed')}
                >
                  关闭任务
                </Button>
              </Space>
            </div>
          ) : (
            <Empty description="选择左侧任务查看详情" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </Card>
      </div>
    </main>
  );
}
