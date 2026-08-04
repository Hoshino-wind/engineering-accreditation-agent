import {
  ApartmentOutlined,
  CheckCircleOutlined,
  ClusterOutlined,
  CloudUploadOutlined,
  FileSearchOutlined,
  NodeIndexOutlined,
  ReloadOutlined,
  RobotOutlined,
  SearchOutlined,
  SolutionOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  Empty,
  Input,
  message,
  Row,
  Segmented,
  Space,
  Spin,
  Statistic,
  Steps,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';

import {
  type AbilityGraphData,
  type AbilityGraphEdge,
  type AbilityGraphNode,
  type AbilityGraphNodeKind,
  nodeKindPresentation,
} from '../../../entities/ability-graph';
import {
  fetchAbilityGraph,
  reviewGraphEdge,
} from '../../../shared/api/graphClient';
import { AbilityGraphCanvas } from '../../../widgets/ability-graph-canvas';
import { AbilityReviewPanel } from '../../../widgets/ability-review-panel';
import './graphViewPage.css';

const { Paragraph, Text, Title } = Typography;

const NODE_KIND_OPTIONS: { label: string; value: AbilityGraphNodeKind }[] = [
  { label: '毕业要求', value: 'GraduationRequirement' },
  { label: '能力指标', value: 'Competency' },
  { label: '课程', value: 'Course' },
  { label: '实验项目', value: 'Experiment' },
  { label: '知识点', value: 'KnowledgePoint' },
  { label: '教学资源', value: 'TeachingResource' },
];

type FilterMode = 'all' | 'pending' | 'approved';

const emptyGraph: AbilityGraphData = { nodes: [], edges: [] };

const PROCESS_STEPS = [
  { title: '数据上传', icon: <CloudUploadOutlined />, status: 'finish' as const },
  { title: 'AI 提取', icon: <RobotOutlined />, status: 'finish' as const },
  { title: '人工审核', icon: <SolutionOutlined />, status: 'process' as const },
  { title: '图谱构建', icon: <NodeIndexOutlined />, status: 'process' as const },
  { title: '关联分析', icon: <ApartmentOutlined />, status: 'wait' as const },
  { title: '路径梳理', icon: <ClusterOutlined />, status: 'wait' as const },
  { title: '达成度', icon: <ThunderboltOutlined />, status: 'wait' as const },
  { title: '改进建议', icon: <CheckCircleOutlined />, status: 'wait' as const },
  { title: '认证输出', icon: <FileSearchOutlined />, status: 'wait' as const },
];

export function GraphViewPage() {
  const [graph, setGraph] = useState<AbilityGraphData>(emptyGraph);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [enabledKinds, setEnabledKinds] = useState<Set<AbilityGraphNodeKind>>(
    () => new Set(NODE_KIND_OPTIONS.map((o) => o.value)),
  );
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>();
  const [layoutVersion, setLayoutVersion] = useState(0);

  const loadGraph = async () => {
    setLoading(true);
    setLoadError(undefined);
    try {
      const nextGraph = await fetchAbilityGraph();
      setGraph(nextGraph);
      setSelectedNodeId((current) =>
        current && nextGraph.nodes.some((node) => node.id === current)
          ? current
          : undefined,
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : '能力图谱加载失败';
      setLoadError(msg);
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadGraph();
  }, []);

  const { nodes: allNodes, edges: allEdges } = graph;

  const filteredGraph = useMemo(() => {
    const kw = searchKeyword.trim().toLowerCase();
    const matchedNodeIds = new Set(
      allNodes
        .filter((n) => enabledKinds.has(n.kind))
        .filter((n) => {
          if (!kw) return true;
          return (
            n.code.toLowerCase().includes(kw) ||
            n.name.toLowerCase().includes(kw) ||
            (n.description ?? '').toLowerCase().includes(kw)
          );
        })
        .map((n) => n.id),
    );

    const nodes = allNodes.filter((n) => matchedNodeIds.has(n.id));
    const edges = allEdges.filter((edge) => {
      if (!matchedNodeIds.has(edge.source) || !matchedNodeIds.has(edge.target)) {
        return false;
      }
      if (filterMode === 'pending') return edge.reviewStatus === 'pending';
      if (filterMode === 'approved') return edge.reviewStatus === 'approved';
      return true;
    });

    return { nodes, edges };
  }, [allNodes, allEdges, enabledKinds, filterMode, searchKeyword]);

  const selectedNode = useMemo(
    () => allNodes.find((n) => n.id === selectedNodeId) ?? null,
    [allNodes, selectedNodeId],
  );

  const handleNodeClick = (node: AbilityGraphNode) => {
    setSelectedNodeId(node.id);
  };

  const handleReviewEdge = async (
    edgeId: string,
    decision: 'accept' | 'modify' | 'reject',
  ) => {
    try {
      const updated = await reviewGraphEdge(edgeId, decision);
      setGraph((current) => ({
        ...current,
        edges: current.edges.map((edge) =>
          edge.id === updated.id ? updated : edge,
        ),
      }));
      message.success('图谱关系审核状态已更新');
    } catch (error) {
      const msg = error instanceof Error ? error.message : '图谱审核失败';
      message.error(msg);
    }
  };

  const pendingCount = allEdges.filter(
    (e) => e.reviewStatus === 'pending',
  ).length;
  const approvedCount = allEdges.filter(
    (e) => e.reviewStatus === 'approved',
  ).length;
  const aiCount = allEdges.filter((e) => e.sourceType === 'ai').length;

  return (
    <main className="graph-view-page">
      <div className="graph-view-page-header">
        <div>
          <Space align="center" size={10}>
            <Title level={2}>实验教学能力图谱</Title>
            <Tag color="geekblue">M2 能力图谱</Tag>
            <Tag color="green">服务端图谱</Tag>
          </Space>
          <Paragraph type="secondary">
            这里展示教师审核后的正式能力图谱。M4 中接受或修改的候选关系会写入图谱，
            被驳回的关系不会参与后续诊断、达成度和认证支撑计算。
          </Paragraph>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => void loadGraph()}>
            刷新数据
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => setLayoutVersion((v) => v + 1)}
          >
            重新布局
          </Button>
        </Space>
      </div>

      {loadError ? (
        <Alert
          className="graph-view-pending-notice"
          message="能力图谱加载异常"
          description={loadError}
          showIcon
          type="error"
        />
      ) : null}

      <Card className="graph-view-stats" size="small">
        <Row align="middle" gutter={24}>
          <Col>
            <Statistic title="节点" value={allNodes.length} prefix={<NodeIndexOutlined />} />
          </Col>
          <Col>
            <Statistic title="关系总数" value={allEdges.length} />
          </Col>
          <Col>
            <Statistic
              title="已通过"
              value={approvedCount}
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col>
            <Statistic
              title="待审核"
              value={pendingCount}
              valueStyle={{ color: '#fa8c16' }}
              prefix={<ThunderboltOutlined />}
            />
          </Col>
          <Col>
            <Statistic
              title="AI 推荐"
              value={aiCount}
              valueStyle={{ color: '#722ed1' }}
              prefix={<RobotOutlined />}
            />
          </Col>
          <Col className="graph-view-process-col" flex="auto">
            <Steps
              current={3}
              items={PROCESS_STEPS.map((s) => ({
                title: s.title,
                status: s.status,
                icon: s.icon,
              }))}
              size="small"
            />
          </Col>
        </Row>
      </Card>

      <Card className="graph-view-toolbar" size="small">
        <Row align="middle" gutter={16}>
          <Col flex="auto">
            <Space size={16} wrap>
              <Space size={8}>
                <Text strong>节点类型：</Text>
                <Checkbox.Group
                  onChange={(values) =>
                    setEnabledKinds(new Set<AbilityGraphNodeKind>(values))
                  }
                  value={[...enabledKinds]}
                >
                  {NODE_KIND_OPTIONS.map((option) => {
                    const presentation = nodeKindPresentation[option.value];
                    return (
                      <Checkbox key={option.value} value={option.value}>
                        <Tag color={presentation.color}>{option.label}</Tag>
                      </Checkbox>
                    );
                  })}
                </Checkbox.Group>
              </Space>
              <Space size={8}>
                <Text strong>关系状态：</Text>
                <Segmented
                  onChange={(value) => setFilterMode(value as FilterMode)}
                  options={[
                    { label: '全部', value: 'all' },
                    { label: `仅待审核 (${pendingCount})`, value: 'pending' },
                    { label: '仅已通过', value: 'approved' },
                  ]}
                  value={filterMode}
                />
              </Space>
              <Input
                allowClear
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="搜索节点编号 / 名称 / 描述"
                prefix={<SearchOutlined />}
                style={{ width: 280 }}
                value={searchKeyword}
              />
            </Space>
          </Col>
          <Col>
            <Tooltip title="节点数 / 关系数已按筛选条件过滤">
              <Text type="secondary">
                节点 {filteredGraph.nodes.length} / 关系 {filteredGraph.edges.length}
              </Text>
            </Tooltip>
          </Col>
        </Row>
      </Card>

      <div className="graph-view-main">
        <Card
          className="graph-view-canvas-card"
          styles={{ body: { padding: 0, height: '100%' } }}
        >
          {loading ? (
            <div className="graph-view-empty">
              <Spin size="large" />
            </div>
          ) : filteredGraph.nodes.length === 0 ? (
            <Empty
              className="graph-view-empty"
              description="当前筛选条件下无可显示节点"
            />
          ) : (
            <AbilityGraphCanvas
              graph={filteredGraph}
              layoutVersion={layoutVersion}
              onNodeClick={handleNodeClick}
              selectedNodeId={selectedNodeId}
            />
          )}
        </Card>

        <Card
          className="graph-view-review-card"
          styles={{ body: { padding: 0, height: '100%' } }}
        >
          <AbilityReviewPanel
            edges={allEdges}
            node={selectedNode}
            nodes={allNodes}
            onApproveEdge={(edgeId) => void handleReviewEdge(edgeId, 'accept')}
            onJumpToNode={setSelectedNodeId}
            onModifyEdge={(edgeId) => void handleReviewEdge(edgeId, 'modify')}
            onRejectEdge={(edgeId) => void handleReviewEdge(edgeId, 'reject')}
          />
        </Card>
      </div>

      <Card className="graph-view-legend" size="small">
        <Space size={16} wrap>
          <Text strong>图例：</Text>
          <Space size={6}>
            <span className="graph-view-legend-line graph-view-legend-approved" />
            <Text>已通过关系</Text>
          </Space>
          <Space size={6}>
            <span className="graph-view-legend-line graph-view-legend-pending" />
            <Text>AI 推荐待审核</Text>
          </Space>
          <Space size={6}>
            <span className="graph-view-legend-line graph-view-legend-selected" />
            <Text>选中节点关联</Text>
          </Space>
        </Space>
      </Card>

      {pendingCount > 0 ? (
        <Alert
          className="graph-view-pending-notice"
          description="待审核边不会参与后续达成度计算，必须由教师确认后进入正式图谱。"
          message={`仍有 ${pendingCount} 条 AI 推荐关系待教师审核`}
          showIcon
          type="warning"
        />
      ) : null}
    </main>
  );
}
