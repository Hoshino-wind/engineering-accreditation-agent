import {
  WarningOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Card,
  Col,
  Progress,
  Row,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import { useMemo } from 'react';

import {
  calculateAttainmentFromGraph,
  type RequirementAttainment,
  type CompetencyAttainment,
} from '../../../features/calculate-attainment/model/calculateAttainmentFromGraph';
import { prototypeOnlyAbilityGraph } from '../../../entities/ability-graph';

import './attainmentEvaluationPage.css';

const { Paragraph, Text, Title } = Typography;

type AttainmentStatus = RequirementAttainment['status'];

const STATUS_STYLE: Record<
  AttainmentStatus,
  { color: string; label: string; tagColor: string }
> = {
  achieved: { color: '#52c41a', label: '达标', tagColor: 'success' },
  warning: { color: '#faad14', label: '预警', tagColor: 'warning' },
  gap: { color: '#ff4d4f', label: '不达标', tagColor: 'error' },
};

export function AttainmentEvaluationPage() {
  const report = useMemo(
    () => calculateAttainmentFromGraph(prototypeOnlyAbilityGraph),
    [],
  );

  // 雷达图数据（简易版：用 CSS conic-gradient 画进度环代替，不引入额外图表库）
  const reqColumns = [
    {
      title: '毕业要求',
      dataIndex: 'code',
      key: 'code',
      width: 100,
      render: (_: string, record: RequirementAttainment) => (
        <Space size={6}>
          <Tag color={STATUS_STYLE[record.status].tagColor}>
            {record.requirement.code}
          </Tag>
          <Text strong>{record.requirement.name}</Text>
        </Space>
      ),
    },
    {
      title: '达成度',
      dataIndex: 'attainment',
      key: 'attainment',
      width: 160,
      render: (val: number, record: RequirementAttainment) => (
        <Progress
          percent={Math.round(val * 100)}
          strokeColor={STATUS_STYLE[record.status].color}
          size="small"
          format={(p) => `${p}%`}
        />
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      render: (status: AttainmentStatus) => (
        <Tag color={STATUS_STYLE[status].tagColor}>
          {STATUS_STYLE[status].label}
        </Tag>
      ),
    },
    {
      title: '能力指标数',
      key: 'compCount',
      width: 100,
      render: (_: unknown, record: RequirementAttainment) => (
        <Text>
          {record.competencies.filter((c) => c.status === 'achieved').length}/
          {record.competencies.length}
        </Text>
      ),
    },
  ];

  const compColumns = [
    {
      title: '能力指标',
      key: 'comp',
      width: 200,
      render: (_: unknown, record: CompetencyAttainment) => (
        <Space size={6}>
          <Tag color={STATUS_STYLE[record.status].tagColor}>
            {record.competency.code}
          </Tag>
          <Text>{record.competency.name}</Text>
        </Space>
      ),
    },
    {
      title: '达成度',
      key: 'attainment',
      width: 140,
      render: (_: unknown, record: CompetencyAttainment) => (
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
      width: 80,
      render: (_: unknown, record: CompetencyAttainment) => (
        <Tag color={STATUS_STYLE[record.status].tagColor}>
          {STATUS_STYLE[record.status].label}
        </Tag>
      ),
    },
    {
      title: '支撑来源',
      key: 'contributors',
      render: (_: unknown, record: CompetencyAttainment) =>
        record.contributions.length > 0 ? (
          <Space size={4} wrap>
            {record.contributions.map((c, i) => (
              <Tag key={i} color="blue">
                {c.node?.code} {c.node?.name} ({c.strength} {Math.round(c.value * 100)}%)
              </Tag>
            ))}
          </Space>
        ) : (
          <Text type="danger">无支撑</Text>
        ),
    },
  ];

  return (
    <main className="attainment-evaluation-page">
      <div className="attainment-evaluation-page-header">
        <div>
          <Space align="center" size={10}>
            <Title level={2}>达成度评价</Title>
            <Tag color="geekblue">M6 达成度评价</Tag>
            <Tag color="gold">内置 2024 标准</Tag>
          </Space>
          <Paragraph type="secondary">
            基于学校上传数据与内置认证标准的支撑关系，计算每条毕业要求与能力指标的达成度。
            达成度 &ge; 70% 为达标，40%~70% 为预警，&lt; 40% 为不达标。
            Demo 阶段用 AI 置信度+支撑强度模拟，正式接入后用实际成绩数据替换。
          </Paragraph>
        </div>
      </div>

      {/* 总览 */}
      <Card className="attainment-stats" size="small">
        <Row gutter={24}>
          <Col>
            <Statistic
              title="总体达成度"
              value={Math.round(report.overallAttainment * 100)}
              suffix="%"
              valueStyle={{
                color:
                  report.overallAttainment >= 0.7
                    ? '#52c41a'
                    : report.overallAttainment >= 0.4
                      ? '#faad14'
                      : '#ff4d4f',
              }}
            />
          </Col>
          <Col>
            <Statistic
              title="达标数"
              value={report.requirements.filter((r) => r.status === 'achieved').length}
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col>
            <Statistic
              title="预警"
              value={report.warningCount}
              valueStyle={{ color: '#faad14' }}
              prefix={<WarningOutlined />}
            />
          </Col>
          <Col>
            <Statistic
              title="不达标"
              value={report.gapCount}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<WarningOutlined />}
            />
          </Col>
        </Row>
      </Card>

      {report.gapCount > 0 && (
        <Alert
          className="attainment-gap-alert"
          type="error"
          showIcon
          icon={<WarningOutlined />}
          message={`${report.gapCount} 条毕业要求达成度不达标，请前往 M7 教学改进生成优化建议`}
        />
      )}

      {/* 雷达图替代：达成度环形进度 */}
      <Card title="毕业要求达成度总览" size="small" className="attainment-radar-card">
        <div className="attainment-ring-grid">
          {report.requirements.map((ra) => {
            const pct = Math.round(ra.attainment * 100);
            const color = STATUS_STYLE[ra.status].color;
            return (
              <div key={ra.requirement.id} className="attainment-ring-item">
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
                    {ra.requirement.code}
                  </Text>
                  <Text
                    style={{ fontSize: 10, textAlign: 'center', display: 'block' }}
                    type="secondary"
                  >
                    {ra.requirement.name}
                  </Text>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* 毕业要求明细表 */}
      <Card title="毕业要求达成度明细" size="small" className="attainment-req-table">
        <Table
          dataSource={report.requirements}
          columns={reqColumns}
          rowKey={(r) => r.requirement.id}
          pagination={false}
          size="small"
          expandable={{
            expandedRowRender: (record) => (
              <Table
                dataSource={record.competencies}
                columns={compColumns}
                rowKey={(c) => c.competency.id}
                pagination={false}
                size="small"
              />
            ),
          }}
        />
      </Card>
    </main>
  );
}
