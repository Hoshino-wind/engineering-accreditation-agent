import { InfoCircleOutlined } from '@ant-design/icons';
import { Alert, Col, Row, Spin, Tag, Typography } from 'antd';
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
import { useAbilityGraphData, filterGraphByCourse } from '../../../entities/ability-graph';
import { EmptyStateGuide } from '../../../widgets/empty-state-guide';
import { SupportSummary } from '../../../widgets/support-summary';
import {
  assembleSupportPackages,
  SupportWorkbench,
} from '../../../widgets/support-workbench';
import { useCourseState } from '../../../shared/course/useCourseState';

import './accreditationSupportPage.css';

const { Paragraph, Title, Text } = Typography;

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

  useEffect(() => {
    let cancelled = false;
    void fetchSupportReadiness(currentCourseName).then((result) => {
      if (!cancelled) setReadiness(result);
    });
    return () => {
      cancelled = true;
    };
  }, [currentCourseName]);

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
  const serverReady = readiness?.ready === true;

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
            <span className="mi-module-plate">STEP · 08 · ACCREDITATION</span>
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
          <Title level={2} style={{ marginTop: 8 }}>工程认证支撑</Title>
          <Paragraph type="secondary">
            从已确认的图谱、评价与改进事实生成可追溯、可校验的认证自评报告。
          </Paragraph>
        </div>
        <div className="accreditation-support-page-header-export">
          <ReportExportButton disabled={!allPassed || !serverReady} sections={sections} />
        </div>
      </div>

      <Alert
        className="accreditation-support-notice"
        description="报告章节按 2024 版认证标准毕业要求组织，数据来源于实时能力图谱、达成度评价和教学改进；支撑包快照随上游数据实时重算。未达成项需关联改进案例后方可导出。"
        icon={<InfoCircleOutlined />}
        showIcon
        title="报告生成规则：数据必须来自上游已确认事实"
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
      ) : !readiness.ready ? (
        <Alert
          description={readiness.checks
            .filter((check) => !check.passed)
            .map((check) => check.detail)
            .join('；')}
          message="服务端校验未通过"
          showIcon
          type="warning"
        />
      ) : null}

      <Row gutter={16}>
        <Col span={16}>
          <ReportPreview sections={sections} />
        </Col>
        <Col span={8}>
          <CompletenessCheckList checks={checks} />
        </Col>
      </Row>

      <SupportSummary packages={packages} />
      <SupportWorkbench packages={packages} />
    </main>
  );
}
