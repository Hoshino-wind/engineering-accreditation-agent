import {
  DownloadOutlined,
  InfoCircleOutlined,
  PlayCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Col,
  Drawer,
  Empty,
  message,
  Progress,
  Row,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';

import { useAbilityGraphCoverage } from '../../../entities/ability-graph';
import type {
  CompetencyCoverageData,
  CoverageData,
  RequirementCoverageData,
} from '../../../shared/api/graphClient';
import {
  type EvaluationRunData,
  downloadEvaluationAudit,
  runEvaluation,
} from '../../../shared/api/evaluationsClient';
import { EmptyStateGuide } from '../../../widgets/empty-state-guide';
import { NextStepBanner } from '../../../widgets/next-step-banner/ui/NextStepBanner';
import { useCourseState } from '../../../shared/course/useCourseState';

import './attainmentEvaluationPage.css';

const { Paragraph, Text, Title } = Typography;

/**
 * 按课程名过滤覆盖率数据。
 *
 * 过滤逻辑：
 * - 能力指标：只保留 supporters 中包含该课程的指标
 * - 毕业要求：重算覆盖率（达标指标数 / 总指标数），支持课程列表更新
 * - 总览统计：重算 overallCoverageRate / coveredCount / partialCount / gapCount
 */
function filterCoverageByCourse(
  coverage: CoverageData,
  courseName: string | null,
): CoverageData {
  if (!courseName) return coverage;

  const filteredComps = coverage.competencies.filter((c) =>
    c.supporters.includes(courseName),
  );

  // 按 requirementCode 分组重算
  const compsByReq = new Map<string, CompetencyCoverageData[]>();
  for (const comp of filteredComps) {
    const list = compsByReq.get(comp.requirementCode) ?? [];
    list.push(comp);
    compsByReq.set(comp.requirementCode, list);
  }

  const filteredReqs: RequirementCoverageData[] = coverage.requirements.map(
    (req) => {
      const comps = compsByReq.get(req.code) ?? [];
      const coveredCount = comps.filter((c) => c.status === 'covered').length;
      const competencyCount = comps.length;
      const coverageRate = competencyCount > 0 ? coveredCount / competencyCount : 0;
      const status: RequirementCoverageData['status'] =
        coverageRate >= 1 ? 'covered' : coverageRate > 0 ? 'partial' : 'gap';
      const supportingCourses = Array.from(
        new Set(comps.flatMap((c) => c.supporters)),
      );
      const strongSupportCount = comps.reduce(
        (sum, c) => sum + c.strongCount,
        0,
      );
      return {
        ...req,
        competencyCount,
        coveredCount,
        coverageRate,
        status,
        supportingCourses,
        strongSupportCount,
      };
    },
  );

  const coveredCount = filteredComps.filter((c) => c.status === 'covered').length;
  const partialCount = filteredComps.filter((c) => c.status === 'partial').length;
  const gapCount = filteredComps.filter((c) => c.status === 'gap').length;
  const overallCoverageRate =
    filteredComps.length > 0 ? coveredCount / filteredComps.length : 0;

  return {
    ...coverage,
    competencies: filteredComps,
    requirements: filteredReqs,
    coveredCount,
    partialCount,
    gapCount,
    overallCoverageRate,
  };
}

// 后端权威状态（domain/coverage.py）→ 展示态
// covered=达标 / partial=部分达成（预警）/ gap=不达标
const STATUS_STYLE: Record<
  'covered' | 'partial' | 'gap',
  { color: string; label: string; tagColor: string }
> = {
  covered: { color: '#52c41a', label: '达标', tagColor: 'success' },
  partial: { color: '#faad14', label: '部分达成', tagColor: 'warning' },
  gap: { color: '#ff4d4f', label: '不达标', tagColor: 'error' },
};

interface RequirementRow {
  req: RequirementCoverageData;
  competencies: CompetencyCoverageData[];
}

export function AttainmentEvaluationPage() {
  const { coverage: rawCoverage, loading } = useAbilityGraphCoverage();
  const { selectedCourseName: currentCourseName } = useCourseState();

  // 按当前选中课程过滤覆盖率数据
  const coverage = useMemo(
    () => (rawCoverage ? filterCoverageByCourse(rawCoverage, currentCourseName) : null),
    [rawCoverage, currentCourseName],
  );

  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [drawerComp, setDrawerComp] = useState<CompetencyCoverageData | null>(null);
  const [evaluationRun, setEvaluationRun] = useState<EvaluationRunData | null>(null);
  const [runningEvaluation, setRunningEvaluation] = useState(false);
  const [exportingAudit, setExportingAudit] = useState(false);

  // 默认展开所有毕业要求行
  useEffect(() => {
    if (coverage) {
      setExpandedKeys(coverage.requirements.map((r) => r.code));
    }
  }, [coverage]);

  // 按毕业要求聚合其下属能力指标（后端已给出 requirementCode 关联）
  const rows = useMemo<RequirementRow[]>(() => {
    if (!coverage) return [];
    const byReq = new Map<string, CompetencyCoverageData[]>();
    for (const comp of coverage.competencies) {
      const list = byReq.get(comp.requirementCode) ?? [];
      list.push(comp);
      byReq.set(comp.requirementCode, list);
    }
    return coverage.requirements.map((req) => ({
      req,
      competencies: byReq.get(req.code) ?? [],
    }));
  }, [coverage]);

  const handleRunEvaluation = async () => {
    setRunningEvaluation(true);
    try {
      const result = await runEvaluation('rules-v1');
      if (!result) {
        message.error('评价运行失败，请确认后端服务已启动且图谱数据可读取');
        return;
      }
      setEvaluationRun(result);
      message.success('达成度评价已完成，并写入审计记录');
    } finally {
      setRunningEvaluation(false);
    }
  };

  const handleExportAudit = async () => {
    if (!evaluationRun) {
      message.warning('请先运行一次达成度评价');
      return;
    }
    setExportingAudit(true);
    try {
      const ok = await downloadEvaluationAudit(evaluationRun.id);
      if (!ok) {
        message.error('审计文件导出失败，请确认后端服务可用');
        return;
      }
      message.success('评价审计文件已导出');
    } finally {
      setExportingAudit(false);
    }
  };

  const reqColumns = [
    {
      title: '毕业要求',
      key: 'req',
      width: 260,
      render: (_: unknown, record: RequirementRow) => (
        <Space size={6}>
          <Tag color={STATUS_STYLE[record.req.status].tagColor}>
            {record.req.code}
          </Tag>
          <Text strong>{record.req.name}</Text>
        </Space>
      ),
    },
    {
      title: '覆盖率',
      key: 'coverageRate',
      width: 170,
      render: (_: unknown, record: RequirementRow) => (
        <Progress
          percent={Math.round(record.req.coverageRate * 100)}
          strokeColor={STATUS_STYLE[record.req.status].color}
          size="small"
          format={(p) => `${p}%`}
        />
      ),
    },
    {
      title: '状态',
      key: 'status',
      width: 96,
      render: (_: unknown, record: RequirementRow) => (
        <Tag color={STATUS_STYLE[record.req.status].tagColor}>
          {STATUS_STYLE[record.req.status].label}
        </Tag>
      ),
    },
    {
      title: '达标能力指标',
      key: 'compCount',
      width: 120,
      render: (_: unknown, record: RequirementRow) => (
        <Text>
          {record.req.coveredCount}/{record.req.competencyCount}
        </Text>
      ),
    },
    {
      title: '支撑课程',
      key: 'courses',
      render: (_: unknown, record: RequirementRow) =>
        record.req.supportingCourses.length > 0 ? (
          <Space size={4} wrap>
            {record.req.supportingCourses.map((c) => (
              <Tag key={c}>{c}</Tag>
            ))}
          </Space>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
  ];

  const compColumns = [
    {
      title: '能力指标',
      key: 'comp',
      width: 220,
      render: (_: unknown, record: CompetencyCoverageData) => (
        <Space size={6}>
          <Tag color={STATUS_STYLE[record.status].tagColor}>{record.code}</Tag>
          <Text>{record.name}</Text>
        </Space>
      ),
    },
    {
      title: '达成度',
      key: 'attainment',
      width: 150,
      render: (_: unknown, record: CompetencyCoverageData) => (
        <Progress
          percent={Math.round(record.attainment * 100)}
          strokeColor={STATUS_STYLE[record.status].color}
          size="small"
          format={(p) => `${p}%`}
        />
      ),
    },
    {
      title: '状态',
      key: 'status',
      width: 96,
      render: (_: unknown, record: CompetencyCoverageData) => (
        <Tag color={STATUS_STYLE[record.status].tagColor}>
          {STATUS_STYLE[record.status].label}
        </Tag>
      ),
    },
    {
      title: '支撑来源',
      key: 'supporters',
      width: 240,
      render: (_: unknown, record: CompetencyCoverageData) => (
        <Space size={4} wrap>
          {record.supporters.length > 0 ? (
            record.supporters.slice(0, 2).map((s) => (
              <Tag key={s} color="blue">
                {s}
              </Tag>
            ))
          ) : (
            <Text type="danger">无支撑</Text>
          )}
          {record.supporters.length > 2 && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              +{record.supporters.length - 2}
            </Text>
          )}
          {record.hasPendingReview && (
            <Tag color="orange">另有待审核支撑</Tag>
          )}
        </Space>
      ),
    },
    {
      title: '明细',
      key: 'detail',
      width: 80,
      render: (_: unknown, record: CompetencyCoverageData) => (
        <Button size="small" type="link" onClick={() => setDrawerComp(record)}>
          权重明细
        </Button>
      ),
    },
  ];

  // ── 加载 / 后端不可用 / 无数据 三态 ──────────────────────
  if (loading) {
    return (
      <main className="attainment-evaluation-page mi-paper-bg">
        <div className="attainment-loading">
          <Spin size="large" />
          <Text type="secondary">正在从后端计算达成度…</Text>
        </div>
      </main>
    );
  }

  if (!coverage) {
    return (
      <main className="attainment-evaluation-page mi-paper-bg">
        <EmptyStateGuide
          title="后端未连接，无法计算达成度"
          description="达成度由后端确定性算法实时计算。请启动后端服务后刷新本页。"
          ctaText="返回总览"
          ctaPath="/"
        />
        <NextStepBanner currentPath="/evaluations" />
      </main>
    );
  }

  if (coverage.competencies.length === 0) {
    return (
      <main className="attainment-evaluation-page mi-paper-bg">
        <EmptyStateGuide
          title="还没有可评价的能力指标"
          description="完成图谱构建并审核支撑关系后，系统会自动计算毕业要求达成度"
          ctaText="去图谱"
          ctaPath="/graph"
        />
        <NextStepBanner currentPath="/evaluations" />
      </main>
    );
  }

  return (
    <main className="attainment-evaluation-page mi-paper-bg">
      <div className="attainment-evaluation-page-header">
        <div>
          <div className="gv-plate-row">
            <span className="mi-module-plate">STEP · 06 · ATTAINMENT EVALUATION</span>
            <Tag color="gold">内置 2024 标准</Tag>
            <Tag color="green">后端权威计算</Tag>
          </div>
          <Title level={2} style={{ marginTop: 8 }}>达成度评价</Title>
          <Paragraph type="secondary">
            本页数值全部来自后端确定性算法，与「能力图谱」页的覆盖度口径完全一致：
            仅已审核通过（approved）的支撑关系计入，支撑强度按 strong=3 / medium=2 / weak=1 加权。
            能力指标累计强度达到 3 记为达标；毕业要求覆盖率 = 达标能力指标占比。
          </Paragraph>
        </div>
        <Space className="attainment-run-actions" size={10} wrap>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            loading={runningEvaluation}
            onClick={() => void handleRunEvaluation()}
          >
            运行评价
          </Button>
          <Button
            icon={<DownloadOutlined />}
            disabled={!evaluationRun}
            loading={exportingAudit}
            onClick={() => void handleExportAudit()}
          >
            导出审计
          </Button>
        </Space>
      </div>

      {/* 计算口径说明 */}
      <Alert
        className="attainment-formula-alert"
        type="info"
        showIcon
        icon={<InfoCircleOutlined />}
        message="达成度计算口径"
        description={
          <span>
            仅已审核通过（approved）的支撑关系参与计算；支撑强度按
            <strong> strong=3 · medium=2 · weak=1</strong> 加权，能力指标累计强度
            <strong> ≥3 记为达标</strong>；毕业要求覆盖率 = 达标能力指标占比。
          </span>
        }
      />

      {/* 总览 */}
      {evaluationRun && (
        <Card className="attainment-run-card mi-card" size="small">
          <Space size={18} wrap>
            <div>
              <Text type="secondary">评价运行</Text>
              <div className="attainment-run-value">{evaluationRun.id}</div>
            </div>
            <div>
              <Text type="secondary">规则版本</Text>
              <div className="attainment-run-value">{evaluationRun.ruleVersion}</div>
            </div>
            <div>
              <Text type="secondary">图谱版本</Text>
              <div className="attainment-run-value">{evaluationRun.graphVersion}</div>
            </div>
            <div>
              <Text type="secondary">输入快照</Text>
              <div className="attainment-run-value">
                {evaluationRun.inputSnapshotHash.slice(0, 12)}
              </div>
            </div>
          </Space>
        </Card>
      )}

      <Card className="attainment-stats mi-card" size="small">
        <Row gutter={24}>
          <Col>
            <Statistic
              title="总体覆盖率"
              value={Math.round(coverage.overallCoverageRate * 100)}
              suffix="%"
              styles={{
                value: {
                  color:
                    coverage.overallCoverageRate >= 0.8
                      ? '#52c41a'
                      : coverage.overallCoverageRate > 0
                        ? '#faad14'
                        : '#ff4d4f',
                },
              }}
            />
          </Col>
          <Col>
            <Statistic
              title="达标能力指标"
              value={coverage.coveredCount}
              suffix={`/ ${coverage.competencies.length}`}
              styles={{ value: { color: '#52c41a' } }}
            />
          </Col>
          <Col>
            <Statistic
              title="部分达成"
              value={coverage.partialCount}
              styles={{ value: { color: '#faad14' } }}
              prefix={<WarningOutlined />}
            />
          </Col>
          <Col>
            <Statistic
              title="缺口"
              value={coverage.gapCount}
              styles={{ value: { color: '#ff4d4f' } }}
              prefix={<WarningOutlined />}
            />
          </Col>
        </Row>
      </Card>

      {coverage.gapCount > 0 && (
        <Alert
          className="attainment-gap-alert"
          type="error"
          showIcon
          icon={<WarningOutlined />}
          title={`${coverage.gapCount} 项能力指标尚无有效支撑，请前往「教学改进」生成优化建议`}
        />
      )}

      {/* 毕业要求覆盖率环形总览 */}
      <Card title="毕业要求覆盖率总览" size="small" className="attainment-radar-card mi-card">
        <div className="attainment-ring-grid">
          {rows.map(({ req }) => {
            const pct = Math.round(req.coverageRate * 100);
            const color = STATUS_STYLE[req.status].color;
            return (
              <div key={req.code} className="attainment-ring-item">
                <Progress
                  type="circle"
                  percent={pct}
                  strokeColor={color}
                  size={72}
                  format={(p) => (
                    <span style={{ fontSize: 14, fontWeight: 700, color }}>{p}%</span>
                  )}
                />
                <div className="attainment-ring-label">
                  <Text style={{ fontSize: 11, textAlign: 'center', display: 'block' }}>
                    {req.code}
                  </Text>
                  <Text
                    style={{ fontSize: 10, textAlign: 'center', display: 'block' }}
                    type="secondary"
                  >
                    {req.name}
                  </Text>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* 毕业要求明细表（可展开能力指标） */}
      <Card title="毕业要求达成明细" size="small" className="attainment-req-table mi-card">
        <Table
          dataSource={rows}
          columns={reqColumns}
          rowKey={(r) => r.req.code}
          pagination={false}
          size="small"
          expandable={{
            expandedRowKeys: expandedKeys,
            onExpandedRowsChange: (keys) => setExpandedKeys(keys as string[]),
            expandedRowRender: (record) =>
              record.competencies.length > 0 ? (
                <Table
                  dataSource={record.competencies}
                  columns={compColumns}
                  rowKey={(c) => c.code}
                  pagination={false}
                  size="small"
                />
              ) : (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="该毕业要求下暂无能力指标"
                />
              ),
          }}
        />
      </Card>

      {/* 权重明细抽屉 */}
      <Drawer
        title={`${drawerComp?.code} ${drawerComp?.name} — 权重明细`}
        open={!!drawerComp}
        onClose={() => setDrawerComp(null)}
        width={420}
      >
        {drawerComp && (
          <div className="attainment-drawer">
            <div className="attainment-drawer-summary">
              <div>
                <Text type="secondary">达成度</Text>
                <div className="attainment-drawer-value">
                  {Math.round(drawerComp.attainment * 100)}%
                </div>
              </div>
              <div>
                <Text type="secondary">总强度</Text>
                <div className="attainment-drawer-value">
                  {drawerComp.totalStrength}
                </div>
              </div>
              <div>
                <Text type="secondary">状态</Text>
                <Tag color={STATUS_STYLE[drawerComp.status].tagColor}>
                  {STATUS_STYLE[drawerComp.status].label}
                </Tag>
              </div>
            </div>
            <div className="attainment-drawer-section">
              <Text strong>支撑课程</Text>
              {drawerComp.supporters.length > 0 ? (
                <Space size={[8, 8]} wrap>
                  {drawerComp.supporters.map((s) => (
                    <Tag key={s} color="blue">{s}</Tag>
                  ))}
                </Space>
              ) : (
                <Text type="danger">暂无支撑课程</Text>
              )}
            </div>
            <div className="attainment-drawer-section">
              <Text strong>强度分布</Text>
              <div className="attainment-drawer-distribution">
                <div className="attainment-drawer-dist-item">
                  <span className="attainment-drawer-dist-label">强支撑 strong</span>
                  <span className="attainment-drawer-dist-value">{drawerComp.strongCount}</span>
                </div>
                <div className="attainment-drawer-dist-item">
                  <span className="attainment-drawer-dist-label">中支撑 medium</span>
                  <span className="attainment-drawer-dist-value">{drawerComp.mediumCount}</span>
                </div>
                <div className="attainment-drawer-dist-item">
                  <span className="attainment-drawer-dist-label">弱支撑 weak</span>
                  <span className="attainment-drawer-dist-value">{drawerComp.weakCount}</span>
                </div>
              </div>
            </div>
            {drawerComp.hasPendingReview && (
              <Alert
                type="warning"
                showIcon
                message="存在待审核支撑"
                description="当前能力指标还有 AI 推断的待审核支撑关系，审核通过后将重新计算达成度。"
              />
            )}
          </div>
        )}
      </Drawer>

      <NextStepBanner currentPath="/evaluations" />
    </main>
  );
}
