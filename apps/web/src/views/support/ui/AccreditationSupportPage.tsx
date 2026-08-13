import {
  AuditOutlined,
  CheckCircleOutlined,
  FileProtectOutlined,
  FileSearchOutlined,
  InfoCircleOutlined,
  SafetyCertificateOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { Alert, Card, Col, Row, Space, Spin, Statistic, Tag, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';

import type { SupportPackage } from '../../../entities/support-package';
import {
  checkReportCompleteness,
  CompletenessCheckList,
  generateSelfEvaluationReport,
  ReportExportButton,
  ReportPreview,
  type ReportSection,
} from '../../../features/generate-report';
import { fetchFindings } from '../../../shared/api/diagnosticsClient';
import { fetchImprovements } from '../../../shared/api/improvementsClient';
import { fetchResources } from '../../../shared/api/resourcesClient';
import {
  fetchSupportReadiness,
  type SupportReadiness,
} from '../../../shared/api/supportClient';
import {
  useAbilityGraphData,
  filterGraphByCourse,
  type AbilityGraphData,
  type AbilityGraphNode,
} from '../../../entities/ability-graph';
import {
  fetchCandidates,
  type RecognitionCandidateDTO,
} from '../../../shared/api/recognitionClient';
import { EmptyStateGuide } from '../../../widgets/empty-state-guide';
import { SupportSummary } from '../../../widgets/support-summary';
import {
  assembleSupportPackages,
  SupportWorkbench,
} from '../../../widgets/support-workbench';
import { useCourseState } from '../../../shared/course/useCourseState';

import './accreditationSupportPage.css';

const { Paragraph, Title, Text } = Typography;

const HARD_READINESS_CHECK_CODES = new Set(['materials', 'evidence']);

function normalizeGraphRef(value: unknown): string {
  if (typeof value === 'string') return value.trim().toLowerCase();
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim().toLowerCase();
  }
  return '';
}

function nodeMatchesRef(node: AbilityGraphNode, normalizedRef: string): boolean {
  if (!normalizedRef) return false;
  return (
    normalizeGraphRef(node.id) === normalizedRef ||
    normalizeGraphRef(node.code) === normalizedRef ||
    normalizeGraphRef(node.name) === normalizedRef ||
    normalizeGraphRef(node.properties?.code) === normalizedRef ||
    normalizeGraphRef(node.properties?.name) === normalizedRef ||
    normalizeGraphRef(node.properties?.title) === normalizedRef ||
    normalizeGraphRef(node.properties?.label) === normalizedRef
  );
}

function candidateHasVisibleEndpoints(
  graph: AbilityGraphData,
  candidate: RecognitionCandidateDTO,
): boolean {
  const sourceRef = normalizeGraphRef(candidate.sourceNode);
  const targetRef = normalizeGraphRef(candidate.targetNode);
  return (
    graph.nodes.some((node) => nodeMatchesRef(node, sourceRef)) &&
    graph.nodes.some((node) => nodeMatchesRef(node, targetRef))
  );
}

export function AccreditationSupportPage() {
  const { graph, loading: graphLoading, source } = useAbilityGraphData();
  const { selectedCourseName: currentCourseName } = useCourseState();
  const filteredGraph = useMemo(
    () => filterGraphByCourse(graph, currentCourseName),
    [graph, currentCourseName],
  );
  const [sections, setSections] = useState<ReportSection[] | null>(null);
  const [packages, setPackages] = useState<SupportPackage[]>([]);
  const [readiness, setReadiness] = useState<SupportReadiness | null>();
  const [pendingReviewStats, setPendingReviewStats] = useState<{
    hidden: number;
    visible: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchSupportReadiness(currentCourseName).then((result) => {
      if (!cancelled) setReadiness(result);
    });
    return () => {
      cancelled = true;
    };
  }, [currentCourseName]);

  useEffect(() => {
    if (graphLoading || filteredGraph.nodes.length === 0) {
      setPendingReviewStats(null);
      return;
    }
    let cancelled = false;
    void fetchCandidates().then((result) => {
      if (cancelled) return;
      if (!result) {
        setPendingReviewStats(null);
        return;
      }
      const pending = result.filter(
        (candidate) =>
          (candidate.reviewStatus ?? 'pending') === 'pending' &&
          (!currentCourseName || candidate.course === currentCourseName),
      );
      const visible = pending.filter((candidate) =>
        candidateHasVisibleEndpoints(filteredGraph, candidate),
      ).length;
      setPendingReviewStats({
        visible,
        hidden: pending.length - visible,
      });
    });
    return () => {
      cancelled = true;
    };
  }, [currentCourseName, filteredGraph, graphLoading]);

  // 图谱就绪后：基于实时图谱生成自评报告，并用真实计数组装支撑包
  useEffect(() => {
    if (graphLoading || filteredGraph.nodes.length === 0) {
      return;
    }
    let cancelled = false;
    void (async () => {
      const result = await generateSelfEvaluationReport(filteredGraph);
      if (cancelled) return;
      setSections(result);

      const [resources, findings, improvements] = await Promise.all([
        fetchResources(),
        fetchFindings(),
        fetchImprovements(),
      ]);
      if (cancelled) return;

      // 按当前课程过滤数据（null = 全部课程，不过滤）
      const filterByCourse = <T extends { course: string }>(items: T[]) =>
        currentCourseName
          ? items.filter((item) => item.course === currentCourseName)
          : items;

      const filteredResources = resources
        ? filterByCourse(resources)
        : null;
      const filteredFindings = findings
        ? filterByCourse(findings)
        : null;
      const filteredImprovements = improvements
        ? improvements.filter((item) =>
            currentCourseName ? item.course === currentCourseName : true,
          )
        : null;

      const closedImprovements = filteredImprovements
        ? filteredImprovements.filter(
            (item) => item.status === 'resolved' || item.status === 'closed',
          ).length
        : null;

      setPackages(
        assembleSupportPackages({
          counts: {
            resources: filteredResources ? filteredResources.length : null,
            findings: filteredFindings ? filteredFindings.length : null,
            improvements: filteredImprovements
              ? filteredImprovements.length
              : null,
            closedImprovements,
          },
          graph: filteredGraph,
          graphSource: source,
          sections: result,
        }),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [filteredGraph, graphLoading, source, currentCourseName]);

  const checks = checkReportCompleteness(sections ?? [], source);
  const allPassed = checks.every((c) => c.passed);
  const hardBlockedChecks =
    readiness?.checks.filter(
      (check) => HARD_READINESS_CHECK_CODES.has(check.code) && !check.passed,
    ) ?? [];
  const visiblePendingReviewCount =
    pendingReviewStats?.visible ?? readiness?.pendingReviewCount ?? 0;
  const hiddenPendingReviewCount = pendingReviewStats?.hidden ?? 0;
  const softBlockedChecks = (
    readiness?.checks.filter(
      (check) => !HARD_READINESS_CHECK_CODES.has(check.code) && !check.passed,
    ) ?? []
  )
    .filter((check) => check.code !== 'reviews' || visiblePendingReviewCount > 0)
    .map((check) =>
      check.code === 'reviews'
        ? {
            ...check,
            detail: `${visiblePendingReviewCount} 条当前图谱范围内关系待审核`,
          }
        : check,
    );
  const hardServerReady = readiness != null && hardBlockedChecks.length === 0;
  const finalReady = allPassed && hardServerReady && softBlockedChecks.length === 0;
  const canExport = allPassed && hardServerReady;
  const reportBlockCount = checks.filter((check) => !check.passed).length;
  const scopeLabel = currentCourseName ? `课程「${currentCourseName}」` : '当前专业全部课程';

  if (graphLoading) {
    return (
      <main className="accreditation-support-page">
        <div style={{ padding: '80px 0', textAlign: 'center' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text type="secondary">正在加载能力图谱...</Text>
          </div>
        </div>
      </main>
    );
  }

  if (filteredGraph.nodes.length === 0) {
    return (
      <main className="accreditation-support-page">
        <EmptyStateGuide
          title={
            currentCourseName
              ? `「${currentCourseName}」暂无可生成报告的图谱数据`
              : '还没有可生成报告的图谱数据'
          }
          description={
            currentCourseName
              ? '该课程尚未上传教学材料或完成图谱构建，请切换至其他课程或返回"全部课程"视图'
              : '上传教学材料并完成图谱构建后，系统会基于实时图谱自动生成认证自评报告与支撑包'
          }
          ctaText="去上传材料"
          ctaPath="/resources"
        />
      </main>
    );
  }

  if (sections === null) {
    return (
      <main className="accreditation-support-page">
        <div style={{ padding: '80px 0', textAlign: 'center' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text type="secondary">
              AI 正在基于实时图谱生成自评报告...
            </Text>
          </div>
        </div>
      </main>
    );
  }

  const aiModel = sections[0]?.aiModel;
  const aiLatency = sections[0]?.aiLatency;

  return (
    <main className="accreditation-support-page mi-paper-bg">
      <div className="accreditation-support-page-header">
        <div>
          <div className="gv-plate-row">
            <span className="mi-module-plate">STEP · 06 · ACCREDITATION SUPPORT</span>
            {source === 'api' ? (
              <Tag color="cyan">报告基于后端实时图谱生成</Tag>
            ) : (
              <Tag color="orange">后端未连接 · 等待数据加载</Tag>
            )}
            {aiModel && <Tag color="purple">AI 生成 · {aiModel}</Tag>}
            {aiLatency !== undefined && (
              <Tag className="mi-tag mi-tag--soft">耗时 {Math.round(aiLatency)}ms</Tag>
            )}
          </div>
          <Title level={2} style={{ marginTop: 8 }}>认证支撑与报告导出</Title>
          <Paragraph type="secondary">
            汇总已确认的材料、图谱关系、诊断处置和教学改进记录，形成材料支撑报告草稿。
            当前报告不包含学生成绩与课程目标达成度，不能直接作为最终认证结论。
          </Paragraph>
        </div>
        <div className="accreditation-support-page-header-export">
          <ReportExportButton disabled={!canExport} sections={sections} />
        </div>
      </div>

      <Alert
        className="accreditation-support-notice"
        description="导出报告草稿需要材料与证据可追溯、报告章节完整；待审核候选、诊断处置和改进闭环会作为最终交付提醒展示，不再阻断草稿导出。"
        icon={<InfoCircleOutlined />}
        showIcon
        title={`当前范围：${scopeLabel}`}
        type="info"
      />

      {readiness === undefined ? (
        <Alert message="正在核验服务端支撑包就绪度" showIcon type="info" />
      ) : readiness === null ? (
        <Alert
          message="无法取得服务端就绪度结论，已暂停导出"
          showIcon
          type="warning"
        />
      ) : hardBlockedChecks.length > 0 ? (
        <Alert
          description={hardBlockedChecks
            .map((check) => check.detail)
            .join('；')}
          message="材料与证据校验未通过，暂不能导出"
          showIcon
          type="error"
        />
      ) : softBlockedChecks.length > 0 ? (
        <Alert
          description={softBlockedChecks
            .map((check) => check.detail)
            .join('；')}
          message="可以导出报告草稿，但最终交付前仍需完成收尾"
          showIcon
          type="warning"
        />
      ) : null}

      <section className="support-flow-strip">
        <div className="support-flow-step">
          <FileSearchOutlined />
          <span>材料证据</span>
        </div>
        <div className="support-flow-step">
          <AuditOutlined />
          <span>审核图谱</span>
        </div>
        <div className="support-flow-step">
          <CheckCircleOutlined />
          <span>关闭改进</span>
        </div>
        <div className="support-flow-step">
          <SafetyCertificateOutlined />
          <span>导出支撑</span>
        </div>
      </section>

      <section className="support-readiness-grid">
        <Card className="support-readiness-card support-readiness-card--primary" bordered={false}>
          <Space direction="vertical" size={4}>
            <Tag color={finalReady ? 'success' : canExport ? 'processing' : 'warning'}>
              {finalReady ? '最终可交付' : canExport ? '可导出草稿' : '暂不能导出'}
            </Tag>
            <div className="support-readiness-title">交付就绪状态</div>
            <div className="support-readiness-desc">
              {finalReady
                ? '当前数据已经通过服务端和报告完整性校验。'
                : canExport
                  ? '报告内容已完整，可以先导出草稿；最终提交前请处理右侧提醒。'
                  : '材料、证据或报告章节仍有硬性缺项，导出按钮会保持禁用。'}
            </div>
          </Space>
        </Card>
        <Card className="support-readiness-card" bordered={false}>
          <Statistic
            title="待审核关系"
            value={visiblePendingReviewCount}
            prefix={<AuditOutlined />}
            valueStyle={{ color: visiblePendingReviewCount ? '#d97706' : '#16a34a' }}
          />
          {hiddenPendingReviewCount > 0 && (
            <Text className="support-readiness-desc" type="secondary">
              已隐藏 {hiddenPendingReviewCount} 条范围外候选
            </Text>
          )}
        </Card>
        <Card className="support-readiness-card" bordered={false}>
          <Statistic
            title="待处理诊断"
            value={readiness?.pendingFindingCount ?? 0}
            prefix={<WarningOutlined />}
            valueStyle={{ color: readiness?.pendingFindingCount ? '#dc2626' : '#16a34a' }}
          />
        </Card>
        <Card className="support-readiness-card" bordered={false}>
          <Statistic
            title="未关闭改进"
            value={readiness?.openImprovementCount ?? 0}
            prefix={<CheckCircleOutlined />}
            valueStyle={{ color: readiness?.openImprovementCount ? '#d97706' : '#16a34a' }}
          />
        </Card>
        <Card className="support-readiness-card" bordered={false}>
          <Statistic
            title="材料 / 证据"
            value={`${readiness?.resourceCount ?? 0}/${readiness?.evidenceCount ?? 0}`}
            prefix={<FileProtectOutlined />}
          />
        </Card>
        <Card className="support-readiness-card" bordered={false}>
          <Statistic
            title="报告缺项"
            value={reportBlockCount + hardBlockedChecks.length}
            prefix={<FileSearchOutlined />}
            valueStyle={{ color: reportBlockCount + hardBlockedChecks.length ? '#dc2626' : '#16a34a' }}
          />
        </Card>
      </section>

      <section className="support-section-head">
        <div>
          <Title level={4}>自评报告</Title>
          <Paragraph type="secondary">
            按毕业要求生成报告章节，右侧显示导出前检查。检查未通过时，报告可以预览但不能导出。
          </Paragraph>
        </div>
      </section>

      <Row gutter={[16, 16]} className="support-report-grid">
        <Col xs={24} xl={16}>
          <ReportPreview sections={sections} />
        </Col>
        <Col xs={24} xl={8}>
          <CompletenessCheckList checks={checks} />
        </Col>
      </Row>

      <section className="support-section-head">
        <div>
          <Title level={4}>支撑材料包</Title>
          <Paragraph type="secondary">
            把报告章节对应的材料、证据、诊断和改进记录整理成可追溯包，用于答辩或归档。
          </Paragraph>
        </div>
      </section>

      <SupportSummary packages={packages} />
      <SupportWorkbench packages={packages} />
    </main>
  );
}
