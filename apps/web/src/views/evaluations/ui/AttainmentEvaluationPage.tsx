import { ReloadOutlined, WarningOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Col,
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

import type { AbilityGraphData } from '../../../entities/ability-graph';
import {
  calculateAttainmentFromGraph,
  type CompetencyAttainment,
  type RequirementAttainment,
} from '../../../features/calculate-attainment/model/calculateAttainmentFromGraph';
import { fetchAbilityGraph } from '../../../shared/api/graphClient';

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

const emptyGraph: AbilityGraphData = { nodes: [], edges: [] };

function statusStyle(status: AttainmentStatus) {
  return STATUS_STYLE[status];
}

export function AttainmentEvaluationPage() {
  const [graph, setGraph] = useState<AbilityGraphData>(emptyGraph);
  const [loading, setLoading] = useState(true);

  const loadGraph = async () => {
    setLoading(true);
    try {
      setGraph(await fetchAbilityGraph());
    } catch (error) {
      const msg = error instanceof Error ? error.message : '达成度数据加载失败';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadGraph();
  }, []);

  const report = useMemo(() => calculateAttainmentFromGraph(graph), [graph]);

  const reqColumns = [
    {
      title: '毕业要求',
      dataIndex: 'code',
      key: 'code',
      width: 160,
      render: (_: string, record: RequirementAttainment) => {
        const style = statusStyle(record.status);
        return (
          <Space size={6}>
            <Tag color={style.tagColor}>{record.requirement.code}</Tag>
            <Text strong>{record.requirement.name}</Text>
          </Space>
        );
      },
    },
    {
      title: '达成度',
      dataIndex: 'attainment',
      key: 'attainment',
      width: 180,
      render: (val: number, record: RequirementAttainment) => {
        const style = statusStyle(record.status);
        return (
          <Progress
            format={(p) => `${p}%`}
            percent={Math.round(val * 100)}
            size="small"
            strokeColor={style.color}
          />
        );
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: AttainmentStatus) => {
        const style = statusStyle(status);
        return <Tag color={style.tagColor}>{style.label}</Tag>;
      },
    },
    {
      title: '能力指标',
      key: 'compCount',
      width: 120,
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
      width: 220,
      render: (_: unknown, record: CompetencyAttainment) => {
        const style = statusStyle(record.status);
        return (
          <Space size={6}>
            <Tag color={style.tagColor}>{record.competency.code}</Tag>
            <Text>{record.competency.name}</Text>
          </Space>
        );
      },
    },
    {
      title: '达成度',
      key: 'attainment',
      width: 160,
      render: (_: unknown, record: CompetencyAttainment) => {
        const style = statusStyle(record.status);
        return (
          <Progress
            format={(p) => `${p}%`}
            percent={Math.round(record.attainment * 100)}
            size="small"
            strokeColor={style.color}
          />
        );
      },
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (_: unknown, record: CompetencyAttainment) => {
        const style = statusStyle(record.status);
        return <Tag color={style.tagColor}>{style.label}</Tag>;
      },
    },
    {
      title: '支撑来源',
      key: 'contributors',
      render: (_: unknown, record: CompetencyAttainment) =>
        record.contributions.length > 0 ? (
          <Space size={4} wrap>
            {record.contributions.map((c, i) => (
              <Tag color="blue" key={`${record.competency.id}-${i}`}>
                {c.node?.code} {c.node?.name} ({c.strength}{' '}
                {Math.round(c.value * 100)}%)
              </Tag>
            ))}
          </Space>
        ) : (
          <Text type="danger">无已审核支撑</Text>
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
            <Tag color="green">基于正式图谱</Tag>
          </Space>
          <Paragraph type="secondary">
            当前达成度以 M2 中已审核通过的支撑关系为输入。待审核或驳回关系不会计入计算；
            后续 1.0 阶段会继续接入真实成绩和评价材料。
          </Paragraph>
        </div>
        <Button icon={<ReloadOutlined />} onClick={() => void loadGraph()}>
          刷新评价
        </Button>
      </div>

      {loading ? (
        <Card>
          <Spin />
        </Card>
      ) : null}

      <Card className="attainment-stats" size="small">
        <Row gutter={24}>
          <Col>
            <Statistic
              suffix="%"
              title="总体达成度"
              value={Math.round(report.overallAttainment * 100)}
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
              prefix={<WarningOutlined />}
              title="预警"
              value={report.warningCount}
              valueStyle={{ color: '#faad14' }}
            />
          </Col>
          <Col>
            <Statistic
              prefix={<WarningOutlined />}
              title="不达标"
              value={report.gapCount}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Col>
        </Row>
      </Card>

      {report.gapCount > 0 ? (
        <Alert
          className="attainment-gap-alert"
          icon={<WarningOutlined />}
          message={`${report.gapCount} 条毕业要求暂未达标，可进入 M7 生成教学改进建议`}
          showIcon
          type="error"
        />
      ) : null}

      <Card
        className="attainment-radar-card"
        size="small"
        title="毕业要求达成度总览"
      >
        <div className="attainment-ring-grid">
          {report.requirements.map((ra) => {
            const pct = Math.round(ra.attainment * 100);
            const style = statusStyle(ra.status);
            return (
              <div className="attainment-ring-item" key={ra.requirement.id}>
                <Progress
                  format={(p) => (
                    <span style={{ color: style.color, fontSize: 14, fontWeight: 700 }}>
                      {p}%
                    </span>
                  )}
                  percent={pct}
                  size={72}
                  strokeColor={style.color}
                  type="circle"
                />
                <div className="attainment-ring-label">
                  <Text style={{ display: 'block', fontSize: 11, textAlign: 'center' }}>
                    {ra.requirement.code}
                  </Text>
                  <Text
                    style={{ display: 'block', fontSize: 10, textAlign: 'center' }}
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

      <Card
        className="attainment-req-table"
        size="small"
        title="毕业要求达成度明细"
      >
        <Table
          columns={reqColumns}
          dataSource={report.requirements}
          expandable={{
            expandedRowRender: (record) => (
              <Table
                columns={compColumns}
                dataSource={record.competencies}
                pagination={false}
                rowKey={(c) => c.competency.id}
                size="small"
              />
            ),
          }}
          pagination={false}
          rowKey={(r) => r.requirement.id}
          size="small"
        />
      </Card>
    </main>
  );
}
