import {
  ArrowRightOutlined,
  CheckCircleOutlined,
  CloudUploadOutlined,
  ExclamationCircleOutlined,
  FileSearchOutlined,
  PlusOutlined,
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
  Progress,
  Row,
  Space,
  Spin,
  Statistic,
  Tag,
  Typography,
} from 'antd';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

import {
  type CompetencyCoverage,
  type CoverageStatus,
  type RequirementCoverage,
  analyzeCoverage,
  explainCompetencyGap,
  explainRequirementGap,
} from '../../../features/analyze-coverage';
import {
  filterGraphByCourse,
  useAbilityGraphData,
} from '../../../entities/ability-graph';
import { useCourseState } from '../../../shared/course/useCourseState';
import { DiagnosticWorkbench } from '../../../widgets/diagnostic-workbench';
import { EmptyStateGuide } from '../../../widgets/empty-state-guide';
import { NextStepBanner } from '../../../widgets/next-step-banner/ui/NextStepBanner';

import './graphDiagnosticsPage.css';

const { Paragraph, Text, Title } = Typography;

const STATUS_CONFIG: Record<
  CoverageStatus,
  { color: string; label: string; tone: string; tagColor: string }
> = {
  covered: {
    color: '#22c55e',
    label: '已覆盖',
    tone: 'ok',
    tagColor: 'success',
  },
  partial: {
    color: '#f59e0b',
    label: '部分覆盖',
    tone: 'warn',
    tagColor: 'warning',
  },
  gap: {
    color: '#ef4444',
    label: '缺口',
    tone: 'danger',
    tagColor: 'error',
  },
};

function statusPriority(status: CoverageStatus): number {
  if (status === 'gap') return 0;
  if (status === 'partial') return 1;
  return 2;
}

function coveragePercent(item: RequirementCoverage): number {
  return Math.round(item.coverageRate * 100);
}

function supportScore(item: CompetencyCoverage): number {
  return item.strongCount * 3 + item.mediumCount * 2 + item.weakCount;
}

function firstActionFor(item: CompetencyCoverage): string {
  if (item.hasPendingReview) {
    return '先回到第 2 步，把该指标点相关的 AI 推荐关系审核通过或驳回。';
  }
  if (item.status === 'gap') {
    return '回到第 1 步补充该指标点对应的课程大纲、实验指导书或评分依据，再重新提取。';
  }
  const materialCount = new Set(
    item.evidence.map((evidence) => evidence.materialId).filter(Boolean),
  ).size;
  if (materialCount < 2) {
    return '当前证据来源不足 2 份。请补充另一类独立材料，例如评分表、学生作品或实验报告。';
  }
  return '已有多份证据但累计强度不足 4 分，请补充更直接的评价依据或调整审核后的支撑强度。';
}

function formatSupporters(item: CompetencyCoverage): string {
  if (item.supporters.length === 0) return '暂无已审核支撑';
  return item.supporters.map((node) => node.name).join('、');
}

const STRENGTH_LABEL = {
  strong: '强支撑 · 3 分',
  medium: '中支撑 · 2 分',
  weak: '弱支撑 · 1 分',
} as const;

export function GraphDiagnosticsPage() {
  const navigate = useNavigate();
  const { graph, loading: graphLoading, source, refresh } = useAbilityGraphData();
  const { selectedCourseName: currentCourseName } = useCourseState();
  const [selectedReqId, setSelectedReqId] = useState<string | undefined>();
  const [showWorkbench, setShowWorkbench] = useState(false);

  const courseGraph = useMemo(
    () => filterGraphByCourse(graph, currentCourseName),
    [graph, currentCourseName],
  );
  const report = useMemo(() => analyzeCoverage(courseGraph), [courseGraph]);
  const pendingSupportCount = useMemo(
    () =>
      courseGraph.edges.filter(
        (edge) => edge.kind === 'SUPPORTS' && edge.reviewStatus === 'pending',
      ).length,
    [courseGraph.edges],
  );
  const hasSchoolGraph = courseGraph.nodes.some(
    (node) => node.origin === 'school',
  );

  const requirements = useMemo(
    () =>
      [...report.requirements].sort(
        (a, b) =>
          statusPriority(a.status) - statusPriority(b.status) ||
          a.requirement.code.localeCompare(b.requirement.code),
      ),
    [report.requirements],
  );

  const problemCompetencies = useMemo(
    () =>
      report.competencies
        .filter((item) => item.status !== 'covered')
        .sort(
          (a, b) =>
            statusPriority(a.status) - statusPriority(b.status) ||
            a.competency.code.localeCompare(b.competency.code),
        ),
    [report.competencies],
  );

  const selectedRequirement =
    requirements.find((item) => item.requirement.id === selectedReqId) ??
    requirements.find((item) => item.status !== 'covered') ??
    requirements[0] ??
    null;

  const selectedRequirementIssues = selectedRequirement
    ? selectedRequirement.competencies.filter((item) => item.status !== 'covered')
    : [];

  const primaryIssue =
    selectedRequirementIssues[0] ?? problemCompetencies[0] ?? null;

  const overallPercent = Math.round(report.overallCoverageRate * 100);
  const coveredReqCount = report.requirements.filter(
    (item) => item.status === 'covered',
  ).length;

  return (
    <main className="graph-diagnostics-page mi-paper-bg">
      <section className="diagnostics-hero">
        <div>
          <Space size={8} wrap>
            <span className="mi-module-plate">STEP 03 · 图谱诊断</span>
            <Tag color={source === 'api' ? 'cyan' : 'default'}>
              {source === 'api' ? '数据来自实时图谱' : '等待后端图谱数据'}
            </Tag>
            {currentCourseName && <Tag color="blue">{currentCourseName}</Tag>}
          </Space>
          <Title level={2}>图谱诊断</Title>
          <Paragraph type="secondary">
            这一页只回答一个问题：第 2 步审核后的图谱，能不能支撑毕业要求。
            红色是完全缺支撑，黄色是证据不足，绿色是材料支撑达到当前规则门槛。
            这里不代表学生学习产出已经达成。
          </Paragraph>
        </div>
        <Button icon={<ReloadOutlined />} onClick={refresh}>
          刷新诊断
        </Button>
      </section>

      {graphLoading ? (
        <div className="diagnostics-loading">
          <Spin size="large" />
        </div>
      ) : !hasSchoolGraph ? (
        <EmptyStateGuide
          title="还没有可诊断的图谱"
          description="当前只加载了认证标准模板。先上传教学材料并完成关系审核，系统才能依据真实支撑关系计算覆盖缺口。"
          ctaText="去上传材料"
          ctaPath="/resources"
        />
      ) : (
        <>
          <Card className="diagnostics-summary-card mi-card" bordered={false}>
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} md={6}>
                <Statistic
                  title="总体覆盖率"
                  value={overallPercent}
                  suffix="%"
                  valueStyle={{
                    color:
                      overallPercent >= 80
                        ? '#16a34a'
                        : overallPercent >= 50
                          ? '#d97706'
                          : '#dc2626',
                  }}
                />
              </Col>
              <Col xs={24} md={6}>
                <Statistic
                  title="已覆盖毕业要求"
                  value={`${coveredReqCount}/${report.requirements.length}`}
                  prefix={<CheckCircleOutlined />}
                />
              </Col>
              <Col xs={24} md={6}>
                <Statistic
                  title="覆盖缺口"
                  value={problemCompetencies.length}
                  prefix={<WarningOutlined />}
                  valueStyle={{ color: problemCompetencies.length ? '#dc2626' : '#16a34a' }}
                />
              </Col>
              <Col xs={24} md={6}>
                <Statistic
                  title="孤立节点"
                  value={report.orphanNodes.length}
                  prefix={<FileSearchOutlined />}
                />
              </Col>
            </Row>
          </Card>

          <Alert
            className="diagnostics-rule-alert"
            type="info"
            showIcon
            message="诊断计算依据"
            description="只有教师审核通过的“实验/课程 → 能力指标”关系才计入：强支撑 3 分、中支撑 2 分、弱支撑 1 分；单个指标需累计达到 4 分，且证据来自至少 2 份不同材料，才标记为材料支撑充分。单份材料最多只能算部分覆盖。"
          />

          {pendingSupportCount > 0 ? (
            <Alert
              className="diagnostics-next-alert"
              type="warning"
              showIcon
              message={`诊断未定稿：仍有 ${pendingSupportCount} 条 AI 推断关系待审核`}
              description="请先回到第 2 步采纳或驳回这些关系。只有审核通过的关系才进入材料支撑充分性评价。"
              action={
                <Button
                  icon={<ArrowRightOutlined />}
                  onClick={() => navigate('/graph')}
                >
                  回图谱审核
                </Button>
              }
            />
          ) : primaryIssue ? (
            <Alert
              className="diagnostics-next-alert"
              type="warning"
              showIcon
              message={`当前最先处理：${primaryIssue.competency.code} ${primaryIssue.competency.name}`}
              description={firstActionFor(primaryIssue)}
              action={
                <Space wrap>
                  <Button
                    icon={<CloudUploadOutlined />}
                    onClick={() => navigate('/resources')}
                  >
                    补材料
                  </Button>
                  <Button
                    icon={<ArrowRightOutlined />}
                    onClick={() => navigate('/graph')}
                  >
                    回图谱审核
                  </Button>
                </Space>
              }
            />
          ) : (
            <Alert
              className="diagnostics-next-alert"
              type="success"
              showIcon
              message="当前已审核材料达到支撑充分性门槛"
              description="下一步应导入学生成绩、评分项和课程目标权重后计算真实达成度；当前绿色状态只说明材料关系证据较完整。"
            />
          )}

          <Row gutter={[16, 16]} className="diagnostics-main-grid">
            <Col xs={24} lg={9}>
              <Card
                className="diagnostics-panel mi-card"
                title="毕业要求覆盖情况"
                bordered={false}
              >
                <div className="diagnostics-requirement-list">
                  {requirements.map((item) => {
                    const config = STATUS_CONFIG[item.status];
                    const selected =
                      selectedRequirement?.requirement.id === item.requirement.id;
                    return (
                      <button
                        key={item.requirement.id}
                        className={`diagnostics-requirement-item diagnostics-requirement-item--${config.tone} ${
                          selected ? 'is-selected' : ''
                        }`}
                        type="button"
                        onClick={() => setSelectedReqId(item.requirement.id)}
                      >
                        <div className="diagnostics-requirement-row">
                          <Space size={8}>
                            <Tag color={config.tagColor}>{item.requirement.code}</Tag>
                            <Text strong>{item.requirement.name}</Text>
                          </Space>
                          <Tag color={config.tagColor}>{config.label}</Tag>
                        </div>
                        <Progress
                          percent={coveragePercent(item)}
                          showInfo
                          strokeColor={config.color}
                          size="small"
                        />
                        <Text type="secondary">
                          能力指标{' '}
                          {
                            item.competencies.filter(
                              (comp) => comp.status === 'covered',
                            ).length
                          }
                          /{item.competencies.length} 已覆盖
                        </Text>
                      </button>
                    );
                  })}
                </div>
              </Card>
            </Col>

            <Col xs={24} lg={15}>
              <Card
                className="diagnostics-panel mi-card"
                title={
                  selectedRequirement
                    ? `${selectedRequirement.requirement.code} ${selectedRequirement.requirement.name}`
                    : '指标详情'
                }
                bordered={false}
              >
                {selectedRequirement ? (
                  <div className="diagnostics-detail-stack">
                    <Paragraph type="secondary">
                      {selectedRequirement.requirement.description}
                    </Paragraph>

                    {selectedRequirement.status !== 'covered' && (
                      <div className="diagnostics-explain-box">
                        <ExclamationCircleOutlined />
                        <span>
                          {explainRequirementGap(selectedRequirement, courseGraph).summary}
                        </span>
                      </div>
                    )}

                    {selectedRequirement.competencies.map((item) => {
                      const config = STATUS_CONFIG[item.status];
                      const explanation =
                        item.status === 'covered'
                          ? null
                          : explainCompetencyGap(item, courseGraph);
                      return (
                        <div
                          key={item.competency.id}
                          className={`diagnostics-competency-card diagnostics-competency-card--${config.tone}`}
                        >
                          <div className="diagnostics-competency-head">
                            <Space size={8} wrap>
                              <Tag color={config.tagColor}>
                                {item.competency.code}
                              </Tag>
                              <Text strong>{item.competency.name}</Text>
                            </Space>
                            <Tag color={config.tagColor}>{config.label}</Tag>
                          </div>
                          <Paragraph type="secondary">
                            {item.competency.description}
                          </Paragraph>
                          <div className="diagnostics-support-line">
                            <span>支撑强度 {supportScore(item)}/3</span>
                            <span>支撑来源：{formatSupporters(item)}</span>
                          </div>
                          <div className="diagnostics-evidence-list">
                            <Text strong>计入依据</Text>
                            {item.evidence.length === 0 ? (
                              <Text type="secondary">
                                暂无审核通过的支撑证据，因此当前不计入覆盖。
                              </Text>
                            ) : (
                              item.evidence.map((evidence) => (
                                <div
                                  className="diagnostics-evidence-item"
                                  key={evidence.edgeId}
                                >
                                  <div className="diagnostics-evidence-head">
                                    <Space size={6} wrap>
                                      <Tag color="success">已审核通过</Tag>
                                      <Text strong>
                                        {evidence.sourceNode.code}{' '}
                                        {evidence.sourceNode.name}
                                      </Text>
                                    </Space>
                                    <Tag>{STRENGTH_LABEL[evidence.strength]}</Tag>
                                  </div>
                                  <div className="diagnostics-evidence-meta">
                                    <span>
                                      材料：{evidence.materialName ?? '旧数据未记录材料名'}
                                    </span>
                                    <span>
                                      版本：{evidence.materialVersion ?? '旧数据未记录版本'}
                                    </span>
                                    <span>
                                      置信度：
                                      {evidence.confidence == null
                                        ? '未记录'
                                        : `${Math.round(
                                            (evidence.confidence <= 1
                                              ? evidence.confidence * 100
                                              : evidence.confidence),
                                          )}%`}
                                    </span>
                                  </div>
                                  {evidence.reasoning && (
                                    <Text type="secondary">
                                      依据：{evidence.reasoning}
                                    </Text>
                                  )}
                                </div>
                              ))
                            )}
                          </div>
                          {explanation && (
                            <div className="diagnostics-action-box">
                              <div>{explanation.summary}</div>
                              <Space direction="vertical" size={4}>
                                {explanation.recommendations
                                  .slice(0, 2)
                                  .map((recommendation) => (
                                    <Text key={recommendation} type="secondary">
                                      <ToolOutlined /> {recommendation}
                                    </Text>
                                  ))}
                              </Space>
                              <Button
                                type="primary"
                                size="small"
                                icon={<PlusOutlined />}
                                onClick={() =>
                                  navigate('/improvements', {
                                    state: {
                                      targetCode: item.competency.code,
                                      targetName: item.competency.name,
                                      summary: explanation.summary,
                                    },
                                  })
                                }
                              >
                                创建改进措施
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <Empty description="暂无毕业要求数据" />
                )}
              </Card>
            </Col>
          </Row>

          <Card
            className="diagnostics-workbench-card mi-card"
            bordered={false}
            title="诊断发现处置"
            extra={
              <Button onClick={() => setShowWorkbench((value) => !value)}>
                {showWorkbench ? '收起处置台' : '展开处置台'}
              </Button>
            }
          >
            <Paragraph type="secondary">
              上面用于看清问题；这里用于正式处理诊断发现，比如确认问题、转入教学改进或忽略误报。
            </Paragraph>
            {showWorkbench && <DiagnosticWorkbench />}
          </Card>
        </>
      )}

      <NextStepBanner currentPath="/diagnostics" />
    </main>
  );
}
