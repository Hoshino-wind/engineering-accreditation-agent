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
  Row,
  Segmented,
  Space,
  Statistic,
  Steps,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { useMemo, useState } from 'react';

import {
  type AbilityGraphEdge,
  type AbilityGraphNode,
  type AbilityGraphNodeKind,
  prototypeOnlyAbilityGraph,
  nodeKindPresentation,
} from '../../../entities/ability-graph';
import { AbilityGraphCanvas } from '../../../widgets/ability-graph-canvas';
import { AbilityReviewPanel } from '../../../widgets/ability-review-panel';
import './graphViewPage.css';

const { Paragraph, Text, Title } = Typography;

// 节点类型筛选选项
const NODE_KIND_OPTIONS: { label: string; value: AbilityGraphNodeKind }[] = [
  { label: '毕业要求', value: 'GraduationRequirement' },
  { label: '能力指标', value: 'Competency' },
  { label: '课程', value: 'Course' },
  { label: '实验项目', value: 'Experiment' },
  { label: '知识点', value: 'KnowledgePoint' },
  { label: '教学资源', value: 'TeachingResource' },
];

type FilterMode = 'all' | 'pending' | 'approved';

// 九步闭环流程状态条
// 体现 PRD：上传 → AI 提取 → 人工审核 → 建图 → 关联 → 路径 → 评价 → 改进 → 输出
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
  const { nodes: allNodes, edges: allEdges } = prototypeOnlyAbilityGraph;

  // 状态：节点类型筛选 / 关系状态筛选 / 节点搜索 / 选中节点 / 重新布局 / 审核后本地状态更新
  const [enabledKinds, setEnabledKinds] = useState<Set<AbilityGraphNodeKind>>(
    () => new Set(NODE_KIND_OPTIONS.map((o) => o.value)),
  );
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>();
  const [layoutVersion, setLayoutVersion] = useState(0);
  // 审核后的本地状态（Demo 用，后端接入后改为服务端返回）
  const [localEdges, setLocalEdges] = useState<AbilityGraphEdge[]>(allEdges);

  // 按节点类型 + 边审核状态过滤
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

    const edges = localEdges.filter((edge) => {
      if (!matchedNodeIds.has(edge.source) || !matchedNodeIds.has(edge.target)) {
        return false;
      }
      if (filterMode === 'pending') return edge.reviewStatus === 'pending';
      if (filterMode === 'approved') return edge.reviewStatus === 'approved';
      return true;
    });

    return { nodes, edges };
  }, [allNodes, localEdges, enabledKinds, filterMode, searchKeyword]);

  const selectedNode = useMemo(
    () => allNodes.find((n) => n.id === selectedNodeId) ?? null,
    [allNodes, selectedNodeId],
  );

  const handleNodeClick = (node: AbilityGraphNode) => {
    setSelectedNodeId(node.id);
  };

  const handleJumpToNode = (nodeId: string) => {
    setSelectedNodeId(nodeId);
  };

  // 本地状态下的审核操作（Demo 用）
  const handleApproveEdge = (edgeId: string) => {
    setLocalEdges((prev) =>
      prev.map((e) =>
        e.id === edgeId ? { ...e, reviewStatus: 'approved' as const } : e,
      ),
    );
  };
  const handleRejectEdge = (edgeId: string) => {
    setLocalEdges((prev) =>
      prev.map((e) =>
        e.id === edgeId ? { ...e, reviewStatus: 'rejected' as const } : e,
      ),
    );
  };
  const handleModifyEdge = (edgeId: string) => {
    setLocalEdges((prev) =>
      prev.map((e) =>
        e.id === edgeId ? { ...e, reviewStatus: 'modified' as const } : e,
      ),
    );
  };

  const pendingCount = localEdges.filter(
    (e) => e.reviewStatus === 'pending',
  ).length;
  const approvedCount = localEdges.filter(
    (e) => e.reviewStatus === 'approved',
  ).length;
  const aiCount = localEdges.filter((e) => e.sourceType === 'ai').length;

  return (
    <main className="graph-view-page">
      <div className="graph-view-page-header">
        <div>
          <Space align="center" size={10}>
            <Title level={2}>实验教学能力图谱</Title>
            <Tag color="geekblue">M2 能力图谱</Tag>
            <Tag color="gold">内置 2024 认证标准</Tag>
            <Tag>学校上传数据</Tag>
          </Space>
          <Paragraph type="secondary">
            系统内置 2024 版工程教育认证毕业要求与能力指标作为标准（金色边框节点），
            学校上传课程与实验材料后，AI 提取节点并与内置标准做支撑关系分析。
            橙色虚线为 AI 推荐待审核关系，教师确认后参与达成度评价；
            不满足标准覆盖要求的环节将进入 M7 教学改进流程。
          </Paragraph>
        </div>
        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => setLayoutVersion((v) => v + 1)}
          >
            重新布局
          </Button>
        </Space>
      </div>

      {/* 顶部统计条：图谱规模 + 流程状态 */}
      <Card className="graph-view-stats" size="small">
        <Row gutter={24} align="middle">
          <Col>
            <Statistic title="节点" value={allNodes.length} prefix={<NodeIndexOutlined />} />
          </Col>
          <Col>
            <Statistic title="关系总数" value={localEdges.length} />
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
          <Col flex="auto" className="graph-view-process-col">
            <Steps
              size="small"
              current={2}
              items={PROCESS_STEPS.map((s) => ({
                title: s.title,
                status: s.status,
                icon: s.icon,
              }))}
            />
          </Col>
        </Row>
      </Card>

      {/* 工具栏：节点类型筛选 + 关系状态 + 搜索 */}
      <Card className="graph-view-toolbar" size="small">
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Space size={16} wrap>
              <Space size={8}>
                <Text strong>节点类型：</Text>
                <Checkbox.Group
                  value={[...enabledKinds]}
                  onChange={(values) =>
                    setEnabledKinds(new Set<AbilityGraphNodeKind>(values))
                  }
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
                  value={filterMode}
                  onChange={(value) => setFilterMode(value as FilterMode)}
                  options={[
                    { label: '全部', value: 'all' },
                    { label: `仅待审核 (${pendingCount})`, value: 'pending' },
                    { label: '仅已通过', value: 'approved' },
                  ]}
                />
              </Space>
              <Space size={8}>
                <Input
                  allowClear
                  prefix={<SearchOutlined />}
                  placeholder="搜索节点编号 / 名称 / 描述"
                  style={{ width: 280 }}
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                />
              </Space>
            </Space>
          </Col>
          <Col>
            <Tooltip title="节点数 / 关系数（已按筛选过滤）">
              <Text type="secondary">
                节点 {filteredGraph.nodes.length} · 关系 {filteredGraph.edges.length}
              </Text>
            </Tooltip>
          </Col>
        </Row>
      </Card>

      {/* 主区域：左 70% 画布 + 右 30% 审核面板 */}
      <div className="graph-view-main">
        <Card
          className="graph-view-canvas-card"
          styles={{ body: { padding: 0, height: '100%' } }}
        >
          {filteredGraph.nodes.length === 0 ? (
            <Empty
              className="graph-view-empty"
              description="当前筛选条件下无可显示节点"
            />
          ) : (
            <AbilityGraphCanvas
              graph={filteredGraph}
              onNodeClick={handleNodeClick}
              selectedNodeId={selectedNodeId}
              layoutVersion={layoutVersion}
            />
          )}
        </Card>

        <Card
          className="graph-view-review-card"
          styles={{ body: { padding: 0, height: '100%' } }}
        >
          <AbilityReviewPanel
            node={selectedNode}
            edges={localEdges}
            nodes={allNodes}
            onJumpToNode={handleJumpToNode}
            onApproveEdge={handleApproveEdge}
            onRejectEdge={handleRejectEdge}
            onModifyEdge={handleModifyEdge}
          />
        </Card>
      </div>

      {/* 图例 */}
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
          <Text type="secondary">
            · 点击左侧节点 → 右侧审核面板 → 确认/修改/驳回 AI 关系
          </Text>
        </Space>
      </Card>

      {pendingCount > 0 && (
        <Alert
          className="graph-view-pending-notice"
          type="warning"
          showIcon
          message={`仍有 ${pendingCount} 条 AI 推荐关系待教师审核`}
          description="审核通过后才参与达成度计算，未审核的边在图谱中以橙色虚线展示。"
        />
      )}
    </main>
  );
}
