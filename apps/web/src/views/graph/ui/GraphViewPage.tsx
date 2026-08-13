import {
  AimOutlined,
  LoadingOutlined,
  NodeIndexOutlined,
  ReloadOutlined,
  SearchOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Input,
  message,
  Row,
  Segmented,
  Select,
  Space,
  Spin,
  Statistic,
  Switch,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router';

import {
  type AbilityGraphEdge,
  type AbilityGraphNode,
  type AbilityGraphNodeKind,
  filterGraphByCourse,
  nodeKindPresentation,
  useAbilityGraphCoverage,
  useAbilityGraphData,
} from '../../../entities/ability-graph';
import {
  AbilityGraphCanvas,
  type AbilityGraphPreviewEdge,
} from '../../../widgets/ability-graph-canvas';
import { GraphSidePanel } from '../../../widgets/graph-side-panel';
import { EmptyStateGuide } from '../../../widgets/empty-state-guide';
import { NextStepBanner } from '../../../widgets/next-step-banner/ui/NextStepBanner';
import { useCourseState } from '../../../shared/course/useCourseState';
import {
  ALL_COURSES,
  setSelectedCourseId,
  subscribeCourseListChanged,
} from '../../../shared/course/courseStore';
import { fetchPipelineStatus } from '../../../shared/api/pipelineClient';
import './graphViewPage.css';

const { Paragraph, Text, Title } = Typography;

// 节点类型筛选选项（顺序即画布从左到右的列序）
const NODE_KIND_OPTIONS: { label: string; value: AbilityGraphNodeKind }[] = [
  { label: '毕业要求', value: 'GraduationRequirement' },
  { label: '能力指标', value: 'Competency' },
  { label: '课程', value: 'Course' },
  { label: '实验项目', value: 'Experiment' },
  { label: '知识点', value: 'KnowledgePoint' },
  { label: '教学资源', value: 'TeachingResource' },
];

type FilterMode = 'all' | 'pending' | 'approved';

export function GraphViewPage() {
  const location = useLocation();
  const { graph, loading: graphLoading, source, refresh: refreshGraph } = useAbilityGraphData();
  const {
    coverage,
    loading: coverageLoading,
    refresh: refreshCoverage,
  } = useAbilityGraphCoverage();
  const { selectedCourseName: currentCourseName } = useCourseState();

  // 按当前选中课程过滤图谱（全部课程模式则不过滤）
  const courseGraph = useMemo(
    () => filterGraphByCourse(graph, currentCourseName),
    [graph, currentCourseName],
  );
  const { nodes: initialNodes, edges: initialEdges } = courseGraph;
  const hasSchoolGraph = initialNodes.some((node) => node.origin === 'school');

  // 本地边状态：就地审核后即时更新，避免整图刷新
  const [localEdges, setLocalEdges] = useState<AbilityGraphEdge[]>(initialEdges);

  // 课程切换或图谱刷新后重置 localEdges
  useEffect(() => {
    setLocalEdges(initialEdges);
  }, [initialEdges]);

  // 状态：节点类型筛选 / 关系状态筛选 / 节点搜索 / 选中节点 / 重新布局 / 侧栏 Tab
  const [enabledKinds, setEnabledKinds] = useState<Set<AbilityGraphNodeKind>>(
    () => new Set(NODE_KIND_OPTIONS.map((o) => o.value)),
  );
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>();
  const [layoutVersion, setLayoutVersion] = useState(0);
  const [sidebarTab, setSidebarTab] = useState<'candidates' | 'gaps' | 'node'>(
    'candidates',
  );
  // 侧栏展开某条候选时，画布上预览这条关系将连接的两个节点
  const [previewEdge, setPreviewEdge] = useState<AbilityGraphPreviewEdge | null>(
    null,
  );

  // 链路追踪模式：开启后点击节点会高亮经过它的全部上下游链路
  const [traceMode, setTraceMode] = useState(false);
  const [tracePath, setTracePath] = useState<{
    nodeIds: Set<string>;
    edgeIds: Set<string>;
  } | null>(null);

  // 子图模式：开启后只显示从起点出发、按方向/深度可达的路径（其他节点完全隐藏）
  // 当同时指定了终点 endId，改为"起点→终点最短路径单链"模式：仅保留两点间最短路径上的节点/边
  type SubgraphDirection = 'downstream' | 'upstream' | 'both';
  const [subgraphMode, setSubgraphMode] = useState(false);
  const [subgraphStartId, setSubgraphStartId] = useState<string | undefined>();
  const [subgraphEndId, setSubgraphEndId] = useState<string | undefined>();
  const [subgraphDirection, setSubgraphDirection] = useState<SubgraphDirection>('downstream');
  const [subgraphDepth, setSubgraphDepth] = useState<number | 'all'>('all');

  // Pipeline 处理状态轮询：上传材料后自动感知处理进度，完成时自动刷新图谱
  const [pipelineInfo, setPipelineInfo] = useState<{ stage: string; message: string } | null>(null);
  const prevStageRef = useRef<string>('idle');

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      if (cancelled) return;
      const result = await fetchPipelineStatus();
      if (cancelled) return;

      if (result) {
        // 仅 uploading / extracting 算"AI 正在处理"（reviewing 是等待人工审核，不是 AI 在干活）
        const isProcessing = result.stage === 'extracting' || result.stage === 'uploading';
        const wasProcessing = prevStageRef.current === 'extracting' || prevStageRef.current === 'uploading';
        prevStageRef.current = result.stage;

        if (isProcessing) {
          setPipelineInfo({ stage: result.stage, message: result.message });
        } else {
          setPipelineInfo(null);
          if (wasProcessing) {
            // AI 提取/推断刚完成 → 自动刷新图谱
            refreshGraph();
            refreshCoverage();
            message.success('材料处理完成，图谱已更新');
          }
        }
      }

      timer = setTimeout(poll, 3000);
    };

    void poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [refreshGraph, refreshCoverage]);

  // 课程列表变化时（新增/删除/重命名）自动刷新图谱和覆盖度
  useEffect(() => {
    const unsubscribe = subscribeCourseListChanged(() => {
      refreshGraph();
      refreshCoverage();
    });
    return unsubscribe;
  }, [refreshGraph, refreshCoverage]);

  // 从批量审核页跳转而来时，自动在图谱中预览该候选关系
  useEffect(() => {
    const previewCandidate = (location.state as { previewCandidate?: { sourceNode: string; targetNode: string } } | null)
      ?.previewCandidate;
    if (!previewCandidate) return;

    const sourceId = initialNodes.find((n) => n.name === previewCandidate.sourceNode)?.id;
    const targetId = initialNodes.find((n) => n.name === previewCandidate.targetNode)?.id;
    if (sourceId && targetId) {
      setPreviewEdge({ sourceId, targetId });
      setSidebarTab('candidates');
    }
  }, [location.state, initialNodes]);

  // Candidate ids must come from the review API; edge ids are graph-local ids.
  const edgeCandidateMap = useMemo<Record<string, string>>(() => ({}), []);

  const handlePreviewEdge = (edge: AbilityGraphPreviewEdge | null) => {
    setPreviewEdge(edge);
  };

  // 按节点类型 + 边审核状态过滤
  const filteredGraph = useMemo(() => {
    const kw = searchKeyword.trim().toLowerCase();
    let matchedNodeIds = new Set(
      initialNodes
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

    // 子图模式：从起点按方向/深度做 BFS，保留可达节点
    if (subgraphMode && subgraphStartId && matchedNodeIds.has(subgraphStartId)) {
      // 模式 A：同时指定了终点 → 求最短路径单链（仅保留 start→end 最短路径上的节点/边）
      if (subgraphEndId && matchedNodeIds.has(subgraphEndId) && subgraphEndId !== subgraphStartId) {
        const maxDepth = subgraphDepth === 'all' ? 9999 : subgraphDepth;
        const parent: Record<string, { node: string; edgeId: string } | null> = {
          [subgraphStartId]: null,
        };
        const level: Record<string, number> = { [subgraphStartId]: 0 };
        const queue: string[] = [subgraphStartId];
        let found = false;
        while (queue.length > 0 && !found) {
          const cur = queue.shift()!;
          const curLevel = level[cur] ?? 0;
          if (cur === subgraphEndId) {
            found = true;
            break;
          }
          if (curLevel >= maxDepth) continue;
          for (const edge of localEdges) {
            // 下游：edge.source -> edge.target
            if (
              (subgraphDirection === 'downstream' || subgraphDirection === 'both') &&
              edge.source === cur &&
              !(edge.target in parent) &&
              matchedNodeIds.has(edge.target)
            ) {
              parent[edge.target] = { node: cur, edgeId: edge.id };
              level[edge.target] = curLevel + 1;
              queue.push(edge.target);
            }
            // 上游：edge.target -> edge.source（谁支撑我）
            if (
              (subgraphDirection === 'upstream' || subgraphDirection === 'both') &&
              edge.target === cur &&
              !(edge.source in parent) &&
              matchedNodeIds.has(edge.source)
            ) {
              parent[edge.source] = { node: cur, edgeId: edge.id };
              level[edge.source] = curLevel + 1;
              queue.push(edge.source);
            }
          }
        }
        if (found) {
          // 回溯：从 end 一步步走 parent 回到 start，收集节点与边
          const pathNodes = new Set<string>();
          let walk: string | undefined = subgraphEndId;
          while (walk != null) {
            pathNodes.add(walk);
            const parentEntry: { node: string; edgeId: string } | null | undefined =
              parent[walk];
            if (!parentEntry) break;
            walk = parentEntry.node;
          }
          pathNodes.add(subgraphStartId);
          matchedNodeIds = pathNodes;
        } else {
          // 起点→终点无可达路径：只保留起点，画布显示空态提示更直观
          matchedNodeIds = new Set([subgraphStartId]);
        }
      } else {
        // 模式 B：只指定起点 → 传统 BFS，保留从起点出发所有可达节点（当前实现）
        const maxDepth = subgraphDepth === 'all' ? 9999 : subgraphDepth;
        const visited = new Set<string>([subgraphStartId]);
        // level: 起点 = 0，直连 = 1，两跳 = 2 ...
        const level: Record<string, number> = { [subgraphStartId]: 0 };
        const queue: string[] = [subgraphStartId];
        while (queue.length > 0) {
          const cur = queue.shift()!;
          const curLevel = level[cur] ?? 0;
          if (curLevel >= maxDepth) continue;
          for (const edge of localEdges) {
            // 下游：edge.source -> edge.target
            if (
              (subgraphDirection === 'downstream' || subgraphDirection === 'both') &&
              edge.source === cur &&
              !visited.has(edge.target) &&
              matchedNodeIds.has(edge.target)
            ) {
              visited.add(edge.target);
              level[edge.target] = curLevel + 1;
              queue.push(edge.target);
            }
            // 上游：edge.target -> edge.source（谁支撑我）
            if (
              (subgraphDirection === 'upstream' || subgraphDirection === 'both') &&
              edge.target === cur &&
              !visited.has(edge.source) &&
              matchedNodeIds.has(edge.source)
            ) {
              visited.add(edge.source);
              level[edge.source] = curLevel + 1;
              queue.push(edge.source);
            }
          }
        }
        matchedNodeIds = visited;
      }
    }

    const nodes = initialNodes.filter((n) => matchedNodeIds.has(n.id));

    const edges = localEdges.filter((edge) => {
      if (!matchedNodeIds.has(edge.source) || !matchedNodeIds.has(edge.target)) {
        return false;
      }
      if (filterMode === 'pending') return edge.reviewStatus === 'pending';
      if (filterMode === 'approved') return edge.reviewStatus === 'approved';
      return true;
    });

    return { nodes, edges };
  }, [
    initialNodes,
    localEdges,
    enabledKinds,
    filterMode,
    searchKeyword,
    subgraphMode,
    subgraphStartId,
    subgraphEndId,
    subgraphDirection,
    subgraphDepth,
  ]);

  // 链路追踪：从选中节点出发，BFS 遍历上下游所有可达节点与边
  useEffect(() => {
    if (!traceMode || !selectedNodeId) {
      setTracePath(null);
      return;
    }
    const edges = filteredGraph.edges;
    const visitedNodes = new Set<string>([selectedNodeId]);
    const visitedEdges = new Set<string>();
    const queue = [selectedNodeId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const edge of edges) {
        if (edge.source === current && !visitedNodes.has(edge.target)) {
          visitedNodes.add(edge.target);
          visitedEdges.add(edge.id);
          queue.push(edge.target);
        }
        if (edge.target === current && !visitedNodes.has(edge.source)) {
          visitedNodes.add(edge.source);
          visitedEdges.add(edge.id);
          queue.push(edge.source);
        }
      }
    }
    // 补充：两端节点都在路径中的边也标记（处理环/交叉场景）
    for (const edge of edges) {
      if (visitedNodes.has(edge.source) && visitedNodes.has(edge.target)) {
        visitedEdges.add(edge.id);
      }
    }
    setTracePath({ nodeIds: visitedNodes, edgeIds: visitedEdges });
  }, [traceMode, selectedNodeId, filteredGraph]);

  const selectedNode = useMemo(
    () => initialNodes.find((n) => n.id === selectedNodeId) ?? null,
    [initialNodes, selectedNodeId],
  );

  const handleNodeClick = (node: AbilityGraphNode) => {
    setSelectedNodeId(node.id);
    setSidebarTab('node');
  };

  const handleJumpToNode = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    setSidebarTab('node');
  };

  // 侧栏审核决定写入后：图谱 + 覆盖度同屏刷新
  const handleGraphChanged = () => {
    refreshGraph();
    refreshCoverage();
  };

  const pendingCount = localEdges.filter(
    (e) => e.kind === 'SUPPORTS' && e.reviewStatus === 'pending',
  ).length;

  // 覆盖度指标（后端确定性计算：仅 approved 边计入，strong=3/medium=2/weak=1 加权）
  const coverageRate = coverage
    ? `${(coverage.overallCoverageRate * 100).toFixed(0)}%`
    : '—';

  return (
    <main className="graph-view-page mi-paper-bg">
      <div className="graph-view-page-header">
        <div>
          <div className="gv-plate-row">
            <span className="mi-module-plate">STEP · 02 · ABILITY GRAPH</span>
            {source === 'api' ? (
              <Tag color="green">后端实时图谱 · 含识别中心审核投影</Tag>
            ) : (
              <Tag color="orange">后端未连接 · 等待数据加载</Tag>
            )}
            <Tag color="gold">内置 2024 认证标准</Tag>
          </div>
          <Title level={2} style={{ marginTop: 8 }}>实验教学能力图谱</Title>
          <Paragraph type="secondary">
            金色徽标节点为内置认证标准，其余节点由学校上传材料经 AI 提取生成。
            琥珀虚线是 AI 推荐、尚待审核的关系；实线为已确认关系——
            只有后者参与覆盖度与达成度计算。
          </Paragraph>
        </div>
        <div className="graph-view-page-header-actions">
          <Button
            icon={<ReloadOutlined />}
            onClick={() => setLayoutVersion((v) => v + 1)}
          >
            重新布局
          </Button>
        </div>
      </div>

      {pipelineInfo && (
        <Alert
          type="info"
          showIcon
          icon={<LoadingOutlined spin />}
          message={`AI 正在处理材料… ${pipelineInfo.message}`}
          description="图谱将在处理完成后自动更新"
          style={{ marginBottom: 12 }}
        />
      )}

      {graphLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
          <Spin size="large" />
        </div>
      ) : !hasSchoolGraph ? (
        <EmptyStateGuide
          title="还没有材料生成的图谱"
          description="系统已加载认证标准模板；上传教学材料并完成关系审核后，课程、实验项目和支撑关系才会显示在这里。"
          ctaText="去上传材料"
          ctaPath="/resources"
        />
      ) : (
        <>
          {/* 统计条：精简为 4 个核心指标 */}
          <Card className="graph-view-stats mi-card" size="small">
            <Row gutter={24} align="middle" justify="space-between" wrap={false}>
              <Col>
                <Statistic
                  title="节点"
                  value={initialNodes.length}
                  prefix={<NodeIndexOutlined />}
                />
              </Col>
              <Col>
                <Statistic title="关系总数" value={initialEdges.length} />
              </Col>
              <Col>
                <Statistic
                  title="需审核"
                  value={pendingCount}
                  styles={{ value: { color: pendingCount > 0 ? '#e8930c' : undefined } }}
                  prefix={<ThunderboltOutlined />}
                />
              </Col>
              <Col flex="auto" className="graph-view-coverage-col">
                <Row gutter={16} align="middle" wrap={false}>
                  <Col>
                    <Statistic
                      title="能力覆盖率"
                      value={coverageRate}
                      prefix={<AimOutlined />}
                    />
                  </Col>
                  <Col className="graph-view-coverage-meta">
                    <Text type="secondary">
                      已覆盖 {coverage ? coverage.coveredCount : '—'} / {coverage ? coverage.competencies.length : '—'}
                    </Text>
                    <Text
                      type={coverage && coverage.gapCount > 0 ? 'danger' : 'secondary'}
                      className="graph-view-gap-text"
                    >
                      缺口 {coverage ? coverage.gapCount : '—'}
                    </Text>
                  </Col>
                </Row>
              </Col>
            </Row>
          </Card>

          {/* 工具栏：节点类型 + 关系状态 + 搜索，紧凑横向排布 */}
          <Card className="graph-view-toolbar mi-card mi-card--amber" size="small">
            <Row gutter={12} align="middle" wrap={false}>
              <Col flex="none">
                <Space size={4}>
                  <Text strong type="secondary">节点类型</Text>
                  <Select<AbilityGraphNodeKind[]>
                    mode="multiple"
                    allowClear
                    placeholder="选择节点类型"
                    value={[...enabledKinds]}
                    onChange={(values) =>
                      setEnabledKinds(new Set<AbilityGraphNodeKind>(values))
                    }
                    options={NODE_KIND_OPTIONS.map((option) => {
                      const presentation = nodeKindPresentation[option.value];
                      return {
                        value: option.value,
                        label: (
                          <Space size={4}>
                            <span
                              className="graph-view-kind-dot"
                              style={{ background: presentation.color }}
                            />
                            {option.label}
                          </Space>
                        ),
                      };
                    })}
                    style={{ minWidth: 180, width: 'auto' }}
                  />
                </Space>
              </Col>
              <Col flex="none">
                <Space size={4}>
                  <Text strong type="secondary">关系状态</Text>
                  <Segmented
                    value={filterMode}
                    onChange={(value) => setFilterMode(value as FilterMode)}
                    options={[
                      { label: '全部', value: 'all' },
                      { label: `待审核 ${pendingCount}`, value: 'pending' },
                      { label: '已通过', value: 'approved' },
                    ]}
                  />
                </Space>
              </Col>
              <Col flex="auto" style={{ minWidth: 200 }}>
                <Input
                  allowClear
                  prefix={<SearchOutlined />}
                  placeholder="搜索节点编号 / 名称 / 描述"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                />
              </Col>
              <Col flex="none">
                <Space size={6}>
                  <Text strong type="secondary">链路追踪</Text>
                  <Switch
                    size="small"
                    checked={traceMode}
                    onChange={(checked) => {
                      setTraceMode(checked);
                      if (!checked) setTracePath(null);
                    }}
                  />
                  {traceMode && tracePath && (
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {tracePath.nodeIds.size} 节点 · {tracePath.edgeIds.size} 关系
                    </Text>
                  )}
                </Space>
              </Col>
              <Col flex="none" className="graph-view-subgraph-col">
                <Space size={8} wrap style={{ justifyContent: 'flex-end' }}>
                  <Text strong type="secondary" style={{ color: '#b08d57' }}>
                    单路径模式
                  </Text>
                  <Switch
                    size="small"
                    checked={subgraphMode}
                    onChange={(checked) => {
                      setSubgraphMode(checked);
                      if (!checked) {
                        setSubgraphStartId(undefined);
                        setSubgraphEndId(undefined);
                      } else if (!subgraphStartId && initialNodes.length > 0) {
                        // 默认选第一个节点，避免空起点导致完全无显示
                        setSubgraphStartId(initialNodes[0]?.id);
                      }
                    }}
                  />
                  {subgraphMode && (
                    <>
                      <Select
                        size="small"
                        placeholder="起点"
                        showSearch
                        allowClear
                        optionFilterProp="label"
                        value={subgraphStartId}
                        style={{ minWidth: 180 }}
                        onChange={(val) => {
                          setSubgraphStartId(val);
                          if (val === subgraphEndId) setSubgraphEndId(undefined);
                        }}
                        options={initialNodes
                          .filter((n) => enabledKinds.has(n.kind))
                          .map((n) => {
                            const presentation = nodeKindPresentation[n.kind];
                            return {
                              value: n.id,
                              label: `${n.code ? n.code + ' / ' : ''}${n.name}`,
                              title: n.description,
                              kind: n.kind,
                              presentation,
                            };
                          })}
                        optionRender={(option) => {
                          const presentation =
                            option.data.presentation ?? nodeKindPresentation['KnowledgePoint'];
                          const kind = option.data.kind;
                          const kindLabel = NODE_KIND_OPTIONS.find((o) => o.value === kind)?.label ?? kind;
                          return (
                            <Space size={6}>
                              <span
                                className="graph-view-kind-dot"
                                style={{ background: presentation.color }}
                              />
                              <Text style={{ fontSize: 12 }}>{option.label}</Text>
                              <Tag color="blue" style={{ marginLeft: 'auto' }}>
                                {kindLabel}
                              </Tag>
                            </Space>
                          );
                        }}
                      />
                      {subgraphEndId ? (
                        <Tag color="gold" style={{ margin: 0, padding: '0 8px' }}>
                          →
                        </Tag>
                      ) : (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          →（可选终点）
                        </Text>
                      )}
                      <Select
                        size="small"
                        placeholder="终点（可选，走单线）"
                        showSearch
                        allowClear
                        optionFilterProp="label"
                        value={subgraphEndId}
                        style={{ minWidth: 200 }}
                        onChange={(val) => setSubgraphEndId(val)}
                        disabled={!subgraphStartId}
                        options={initialNodes
                          .filter((n) => enabledKinds.has(n.kind) && n.id !== subgraphStartId)
                          .map((n) => {
                            const presentation = nodeKindPresentation[n.kind];
                            return {
                              value: n.id,
                              label: `${n.code ? n.code + ' / ' : ''}${n.name}`,
                              title: n.description,
                              kind: n.kind,
                              presentation,
                            };
                          })}
                        optionRender={(option) => {
                          const presentation =
                            option.data.presentation ?? nodeKindPresentation['KnowledgePoint'];
                          const kind = option.data.kind;
                          const kindLabel = NODE_KIND_OPTIONS.find((o) => o.value === kind)?.label ?? kind;
                          return (
                            <Space size={6}>
                              <span
                                className="graph-view-kind-dot"
                                style={{ background: presentation.color }}
                              />
                              <Text style={{ fontSize: 12 }}>{option.label}</Text>
                              <Tag color="blue" style={{ marginLeft: 'auto' }}>
                                {kindLabel}
                              </Tag>
                            </Space>
                          );
                        }}
                      />
                      <Segmented
                        size="small"
                        value={subgraphDirection}
                        onChange={(v) => setSubgraphDirection(v as SubgraphDirection)}
                        options={[
                          { label: '← 谁支撑我', value: 'upstream' },
                          { label: '双向', value: 'both' },
                          { label: '我支撑谁 →', value: 'downstream' },
                        ]}
                      />
                      <Segmented
                        size="small"
                        value={String(subgraphDepth)}
                        onChange={(v) =>
                          setSubgraphDepth(v === 'all' ? 'all' : Number(v))
                        }
                        options={[
                          { label: '1 层', value: '1' },
                          { label: '2 层', value: '2' },
                          { label: '3 层', value: '3' },
                          { label: '全部', value: 'all' },
                        ]}
                      />
                    </>
                  )}
                </Space>
              </Col>
              <Col flex="none">
                <Tooltip title="节点数 / 关系数（已按筛选过滤）">
                  <Text type="secondary">
                    节点 {filteredGraph.nodes.length} · 关系 {filteredGraph.edges.length}
                  </Text>
                </Tooltip>
              </Col>
            </Row>
          </Card>

          {/* 主区域：画布 + 节点关系面板 */}
          <div className="graph-view-main">
            <Card
              className="graph-view-canvas-card mi-card"
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
                  previewEdge={previewEdge}
                  tracePath={tracePath}
                />
              )}
            </Card>

            <Card
              className="graph-view-review-card mi-card mi-card--amber"
              styles={{ body: { padding: 0, height: '100%' } }}
            >
              <GraphSidePanel
                node={selectedNode}
                edges={localEdges}
                nodes={initialNodes}
                onEdgesChanged={setLocalEdges}
                edgeCandidateMap={edgeCandidateMap}
                coverage={coverage}
                coverageLoading={coverageLoading}
                activeTab={sidebarTab}
                onActiveTabChange={setSidebarTab}
                onJumpToNode={handleJumpToNode}
                onGraphChanged={handleGraphChanged}
                onPreviewEdge={handlePreviewEdge}
              />
            </Card>
          </div>

          {/* 图例 + 列序说明 */}
          <Card className="graph-view-legend mi-card" size="small">
            <Space size={16} wrap>
              <Space size={6}>
                <span className="graph-view-legend-line graph-view-legend-approved" />
                <Text>已通过关系（计入覆盖度）</Text>
              </Space>
              <Space size={6}>
                <span className="graph-view-legend-line graph-view-legend-pending" />
                <Text>AI 推荐待审核</Text>
              </Space>
              <Space size={6}>
                <span className="graph-view-legend-line graph-view-legend-selected" />
                <Text>选中节点关联</Text>
              </Space>
              <Space size={6}>
                <span
                  className="graph-view-legend-line"
                  style={{
                    background: '#38b2ac',
                    height: '2.5px',
                    boxShadow: '0 0 3px rgba(56,178,172,0.45)',
                  }}
                />
                <Text>链路追踪路径</Text>
              </Space>
              <Space size={6}>
                <span className="graph-view-legend-line graph-view-legend-preview" />
                <Text>侧栏展开候选时的预览关系</Text>
              </Space>
              <span className="graph-view-legend-divider" />
              <Space size={6} className="graph-view-col-order">
                <Text type="secondary">列序：</Text>
                {NODE_KIND_OPTIONS.map((option, index) => {
                  const presentation = nodeKindPresentation[option.value];
                  return (
                    <Space key={option.value} size={4}>
                      {index > 0 && (
                        <Text type="secondary" style={{ fontSize: 11 }}>→</Text>
                      )}
                      <span
                        className="graph-view-col-order-dot"
                        style={{ background: presentation.color }}
                      />
                      <Text style={{ fontSize: 12 }}>{option.label}</Text>
                    </Space>
                  );
                })}
              </Space>
            </Space>
          </Card>
        </>
      )}

      {pendingCount > 0 && (
        <Alert
          className="graph-view-pending-notice"
          type="warning"
          showIcon
          title={`仍有 ${pendingCount} 条 AI 推荐关系待审核`}
          description="在右侧「待审候选」面板点击卡片展开详情：画布会同步预览这条关系将连接的两个节点，可对照周边支撑再决定采纳或驳回；采纳的关系即刻投影回图谱并计入覆盖度。"
        />
      )}
      <NextStepBanner currentPath="/graph" />
    </main>
  );
}
