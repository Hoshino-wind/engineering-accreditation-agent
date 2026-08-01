import { InfoCircleOutlined } from '@ant-design/icons';
import { Alert, Col, Row, Space, Spin, Tag, Typography } from 'antd';
import { useEffect, useState } from 'react';

import { prototypeOnlyAbilityGraph } from '../../../entities/ability-graph/model/prototypeOnlyAbilityGraph';
import {
  checkReportCompleteness,
  CompletenessCheckList,
  generateSelfEvaluationReport,
  ReportExportButton,
  ReportPreview,
} from '../../../features/generate-report';
import { SupportSummary } from '../../../widgets/support-summary';
import { SupportWorkbench } from '../../../widgets/support-workbench';

import './accreditationSupportPage.css';

const { Paragraph, Title, Text } = Typography;

export function AccreditationSupportPage() {
  const [sections, setSections] = useState<Awaited<ReturnType<typeof generateSelfEvaluationReport>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void generateSelfEvaluationReport(prototypeOnlyAbilityGraph)
      .then((result) => setSections(result))
      .finally(() => setLoading(false));
  }, []);

  const checks = checkReportCompleteness(sections);
  const allPassed = checks.every((c) => c.passed);

  if (loading) {
    return (
      <main className="accreditation-support-page">
        <div style={{ padding: '80px 0', textAlign: 'center' }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text type="secondary">AI 正在生成自评报告...</Text>
          </div>
        </div>
      </main>
    );
  }

  const aiModel = sections[0]?.aiModel;
  const aiLatency = sections[0]?.aiLatency;

  return (
    <main className="accreditation-support-page">
      <div className="accreditation-support-page-header">
        <div>
          <Space align="center" size={10}>
            <Title level={2}>工程认证支撑</Title>
            <Tag color="geekblue">M8 认证支撑</Tag>
            {aiModel && <Tag color="purple">AI 生成 · {aiModel}</Tag>}
            {aiLatency !== undefined && (
              <Text type="secondary">耗时 {Math.round(aiLatency)}ms</Text>
            )}
          </Space>
          <Paragraph type="secondary">
            从已确认的图谱、评价与改进事实生成可追溯、可校验的认证自评报告。
          </Paragraph>
        </div>
        <ReportExportButton disabled={!allPassed} sections={sections} />
      </div>

      <Alert
        className="accreditation-support-notice"
        description="报告章节按 2024 版认证标准毕业要求组织，数据来源于图谱(M2)、达成度评价(M6)和教学改进(M7)。未达成项需关联改进案例后方可导出。"
        icon={<InfoCircleOutlined />}
        showIcon
        title="报告生成规则：数据必须来自上游已确认事实"
        type="info"
      />

      <Row gutter={16}>
        <Col span={16}>
          <ReportPreview sections={sections} />
        </Col>
        <Col span={8}>
          <CompletenessCheckList checks={checks} />
        </Col>
      </Row>

      <SupportSummary />
      <SupportWorkbench />
    </main>
  );
}
