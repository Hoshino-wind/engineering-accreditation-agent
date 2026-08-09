/**
 * GraphSidePanel — 图谱页右侧联动侧栏。
 *
 * 三个 Tab：
 *  - 「待审候选」：识别库实时候选，直接在此采纳/驳回，决定实时投影回图谱并刷新覆盖度
 *  - 「覆盖缺口」：后端权威覆盖度诊断的缺口/部分达成清单，点击定位到图谱节点
 *  - 「节点详情」：原 AbilityReviewPanel，查看选中节点的关系与审核状态
 *
 * 所有数据均来自后端真实接口；审核写入失败时提示且不改动本地状态。
 */

import {
  ApartmentOutlined,
  AuditOutlined,
  CheckOutlined,
  CloseOutlined,
  DownOutlined,
  ReloadOutlined,
  UpOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Empty,
  message,
  Space,
  Spin,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

import {
  type AbilityGraphEdge,
  type AbilityGraphNode,
} from '../../../entities/ability-graph';
import {
  mapRecognitionCandidate,
  type RecognitionCandidate,
  useRecognitionCandidates,
} from '../../../entities/recognition-candidate';
import type {
  CompetencyCoverageData,
  CoverageData,
} from '../../../shared/api/graphClient';
import { reviewCandidate } from '../../../shared/api/recognitionClient';
import { AbilityReviewPanel } from '../../ability-review-panel';
import './graphSidePanel.css';

const { Paragraph, Text } = Typography;

export type GraphSidePanelTab = 'candidates' | 'gaps' | 'node';

export interface GraphSidePanelProps {
  /** 当前选中的图谱节点（节点详情 Tab 使用） */
  node: AbilityGraphNode | null;
  edges: AbilityGraphEdge[];
  nodes: AbilityGraphNode[];
  /** 图谱边的本地修改回调（就地审核后回写） */
  onEdgesChanged?: (next: AbilityGraphEdge[]) => void;
  /** 边 → 候选 ID 映射（用于就地审核写入后端） */
  edgeCandidateMap?: Record<string, string>;
  /** 后端权威覆盖度数据（缺口 Tab 使用） */
  coverage: CoverageData | null;
  coverageLoading: boolean;
  activeTab: GraphSidePanelTab;
  onActiveTabChange: (tab: GraphSidePanelTab) => void;
  /** 在图谱画布上定位并选中节点 */
  onJumpToNode: (nodeId: string) => void;
  /** 审核决定已写入后端，需要刷新图谱与覆盖度 */
  onGraphChanged: () => void;
  /** 在画布上预览某条候选关系将连接的两个节点；传 null 清除预览 */
  onPreviewEdge?: (edge: { sourceId: string; targetId: string } | null) => void;
}

/** 按编号或名称在图谱中定位节点；找不到时静默忽略 */
function useNodeLocator(nodes: AbilityGraphNode[], onJumpToNode: (id: string) => void) {
  return useMemo(() => {
    return (codeOrName: string) => {
      const hit = nodes.find(
        (n) => n.code === codeOrName || n.name === codeOrName,
      );
      if (hit) onJumpToNode(hit.id);
    };
  }, [nodes, onJumpToNode]);
}

const GAP_STATUS: Record<CompetencyCoverageData['status'], { color: string; label: string }> = {
  gap: { color: 'red', label: '缺口' },
  partial: { color: 'orange', label: '部分达成' },
  covered: { color: 'green', label: '已覆盖' },
};

export function GraphSidePanel({
  node,
  edges,
  nodes,
  onEdgesChanged,
  edgeCandidateMap,
  coverage,
  coverageLoading,
  activeTab,
  onActiveTabChange,
  onJumpToNode,
  onGraphChanged,
  onPreviewEdge,
}: GraphSidePanelProps) {
  const navigate = useNavigate();
  const locateNode = useNodeLocator(nodes, onJumpToNode);

  // 当前展开审核的候选：展开时在画布上预览这条关系将连接的两个节点
  const [activeCandidateId, setActiveCandidateId] = useState<string | null>(null);

  // 通过节点名称解析节点 id（候选里存的是名称），找不到返回 null
  const nodeIdByName = useMemo(() => {
    return (name: string): string | null => {
      const hit = nodes.find((n) => n.name === name);
      return hit ? hit.id : null;
    };
  }, [nodes]);

  // 待审候选：真实识别库数据
  const {
    candidates,
    loadFailed,
    loading: candidatesLoading,
    reload,
    updateCandidate,
  } = useRecognitionCandidates();

  const pendingCandidates = useMemo(
    () =>
      candidates.filter((c) => (c.reviewStatus ?? 'pending') === 'pending'),
    [candidates],
  );

  // 覆盖缺口：后端权威计算（仅 approved 边计入）
  const gapCompetencies = useMemo(() => {
    if (!coverage) return [];
    return coverage.competencies
      .filter((c) => c.status === 'gap' || c.status === 'partial')
      .sort((a, b) => a.requirementCode.localeCompare(b.requirementCode));
  }, [coverage]);

  const handleDecision = async (
    candidate: RecognitionCandidate,
    decision: 'accept' | 'reject',
  ) => {
    const updated = await reviewCandidate(candidate.id, decision);
    if (!updated) {
      message.error('审核写入失败：请确认后端已连接后重试');
      return;
    }
    updateCandidate(mapRecognitionCandidate(updated));
    message.success(
      decision === 'accept'
        ? `已采纳「${candidate.title}」，支撑关系已计入覆盖度`
        : '已驳回，该关系不计入覆盖度',
    );
    // 决定已写入：清除预览并刷新图谱与覆盖度
    setActiveCandidateId(null);
    onPreviewEdge?.(null);
    onGraphChanged();
  };

  // 展开 / 收起某条候选：展开时让画布预览这条关系将连接的两个节点
  const toggleCandidate = (candidate: RecognitionCandidate) => {
    const nextId = activeCandidateId === candidate.id ? null : candidate.id;
    setActiveCandidateId(nextId);
    if (nextId) {
      const sourceId = nodeIdByName(candidate.sourceNode);
      const targetId = nodeIdByName(candidate.targetNode);
      if (sourceId && targetId) {
        onPreviewEdge?.({ sourceId, targetId });
      }
    } else {
      onPreviewEdge?.(null);
    }
  };

  // 查看某个端点节点的上下文（它的已有支撑关系），跳到节点详情 Tab
  const viewNodeContext = (name: string) => {
    const id = nodeIdByName(name);
    if (id) onJumpToNode(id);
  };

  // 切换 Tab：离开待审候选时清除画布预览
  const handleTabChange = (key: GraphSidePanelTab) => {
    if (key !== 'candidates') {
      setActiveCandidateId(null);
      onPreviewEdge?.(null);
    }
    onActiveTabChange(key);
  };

  const renderCandidate = (candidate: RecognitionCandidate) => {
    const expanded = activeCandidateId === candidate.id;
    return (
      <div
        key={candidate.id}
        className={`gsp-candidate${expanded ? ' gsp-candidate--expanded' : ''}`}
      >
        <div
          className="gsp-candidate-head"
          onClick={() => toggleCandidate(candidate)}
          role="button"
        >
          <div className="gsp-candidate-title">{candidate.title}</div>
          <span className="gsp-candidate-toggle">
            {expanded ? <UpOutlined /> : <DownOutlined />}
          </span>
        </div>
        <div className="gsp-candidate-meta">
          <Tag color={candidate.risk === 'highImpact' ? 'orange' : 'default'}>
            {candidate.risk === 'highImpact' ? '高影响' : '常规'}
          </Tag>
          <Tag color="blue">置信 {candidate.confidence}%</Tag>
          <Tag>{candidate.course}</Tag>
          <Tag color="purple">{candidate.relation}</Tag>
        </div>
        <div className="gsp-candidate-path">
          <Text
            className="gsp-candidate-path-node"
            onClick={(e) => {
              e.stopPropagation();
              locateNode(candidate.sourceNode);
            }}
          >
            {candidate.sourceNode}
          </Text>
          <span className="gsp-candidate-path-arrow">→</span>
          <Text
            className="gsp-candidate-path-node"
            onClick={(e) => {
              e.stopPropagation();
              locateNode(candidate.targetNode);
            }}
          >
            {candidate.targetNode}
          </Text>
        </div>

        {expanded && (
          <div className="gsp-candidate-detail">
            <div className="gsp-candidate-preview-hint">
              画布上已用琥珀色虚线预览这条关系将连接的两个节点
            </div>
            {candidate.explanation && (
              <Paragraph className="gsp-candidate-explanation" type="secondary">
                <Text strong style={{ fontSize: 12 }}>AI 依据：</Text>
                {candidate.explanation}
              </Paragraph>
            )}
            {candidate.evidence.map((ev) => (
              <div key={ev.id} className="gsp-candidate-evidence-block">
                <div className="gsp-candidate-evidence-meta">
                  <Tag style={{ fontSize: 11, lineHeight: '18px' }}>
                    {ev.coordinate}
                  </Tag>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {ev.resourceName}
                  </Text>
                </div>
                <Paragraph className="gsp-candidate-evidence" type="secondary">
                  {ev.excerpt}
                </Paragraph>
              </div>
            ))}
            <div className="gsp-candidate-context-actions">
              <Button
                size="small"
                icon={<ApartmentOutlined />}
                onClick={() => viewNodeContext(candidate.sourceNode)}
              >
                查看源节点支撑
              </Button>
              <Button
                size="small"
                icon={<ApartmentOutlined />}
                onClick={() => viewNodeContext(candidate.targetNode)}
              >
                查看目标节点支撑
              </Button>
            </div>
          </div>
        )}

        <div className="gsp-candidate-actions">
          <Button
            size="small"
            type="primary"
            icon={<CheckOutlined />}
            onClick={() => void handleDecision(candidate, 'accept')}
          >
            采纳
          </Button>
          <Button
            size="small"
            danger
            icon={<CloseOutlined />}
            onClick={() => void handleDecision(candidate, 'reject')}
          >
            驳回
          </Button>
        </div>
      </div>
    );
  };

  const renderGapItem = (comp: CompetencyCoverageData) => {
    const status = GAP_STATUS[comp.status];
    return (
      <div
        key={comp.code}
        className="gsp-gap-item"
        onClick={() => locateNode(comp.code)}
        role="button"
      >
        <div className="gsp-gap-item-head">
          <Tag color="default">{comp.requirementCode}</Tag>
          <Tag color={status.color}>{status.label}</Tag>
          {comp.hasPendingReview && <Tag color="gold">有待审支撑</Tag>}
        </div>
        <div className="gsp-gap-item-name">
          <Text strong>{comp.code}</Text> · {comp.name}
        </div>
        <div className="gsp-gap-item-detail">
          <Text type="secondary">
            支撑强度 {comp.totalStrength}/3 · {comp.supporterCount} 门课程
            {comp.supporters.length > 0 ? `：${comp.supporters.join('、')}` : ''}
          </Text>
        </div>
      </div>
    );
  };

  const items = [
    {
      key: 'candidates',
      label: (
        <span className="gsp-tab-label">
          待审候选
          <span className="gsp-tab-badge gsp-tab-badge--amber">
            {pendingCandidates.length}
          </span>
        </span>
      ),
      children: (
        <div className="gsp-pane">
          {candidatesLoading ? (
            <div className="gsp-pane-center">
              <Spin size="small" />
              <Text type="secondary" style={{ fontSize: 12 }}>
                加载识别库候选…
              </Text>
            </div>
          ) : loadFailed ? (
            <Alert
              type="error"
              showIcon
              title="候选加载失败"
              description="无法连接识别库接口，请确认后端已启动。"
              action={
                <Button size="small" icon={<ReloadOutlined />} onClick={() => void reload()}>
                  重试
                </Button>
              }
            />
          ) : pendingCandidates.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <Space direction="vertical" size={4}>
                  <Text type="secondary">待审候选已清空</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    采纳的关系已计入覆盖度，可在下方「覆盖缺口」查看结果
                  </Text>
                </Space>
              }
            />
          ) : (
            <>
              <Paragraph className="gsp-pane-note" type="secondary">
                在此直接采纳 / 驳回 AI 识别的关系，决定实时投影回图谱并重新计算覆盖度。
              </Paragraph>
              {pendingCandidates.map(renderCandidate)}
              <Button
                className="gsp-pane-footer-btn"
                type="link"
                icon={<AuditOutlined />}
                onClick={() => navigate('/recognition')}
              >
                候选较多？前往批量审核 / 冲突处理
              </Button>
            </>
          )}
        </div>
      ),
    },
    {
      key: 'gaps',
      label: (
        <span className="gsp-tab-label">
          覆盖缺口
          <span className="gsp-tab-badge gsp-tab-badge--danger">
            {gapCompetencies.length}
          </span>
        </span>
      ),
      children: (
        <div className="gsp-pane">
          {coverageLoading ? (
            <div className="gsp-pane-center">
              <Spin size="small" />
              <Text type="secondary" style={{ fontSize: 12 }}>
                计算覆盖度…
              </Text>
            </div>
          ) : !coverage ? (
            <Alert
              type="error"
              showIcon
              title="覆盖度不可用"
              description="无法连接后端计算服务，请确认后端已启动。"
            />
          ) : gapCompetencies.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <Text type="secondary">所有能力指标点均已覆盖，无缺口</Text>
              }
            />
          ) : (
            <>
              <Paragraph className="gsp-pane-note" type="secondary">
                覆盖度由后端确定性计算：仅已审核通过的关系计入，强支撑 3 分 / 中 2 分 / 弱 1 分，满分 3 分即视为覆盖。点击条目可定位到图谱节点。
              </Paragraph>
              {gapCompetencies.map(renderGapItem)}
            </>
          )}
        </div>
      ),
    },
    {
      key: 'node',
      label: (
        <span className="gsp-tab-label">
          节点详情
          {node && <span className="gsp-tab-badge gsp-tab-badge--dot" />}
        </span>
      ),
      children: (
        <AbilityReviewPanel
          node={node}
          edges={edges}
          nodes={nodes}
          edgeCandidateMap={edgeCandidateMap}
          onJumpToNode={onJumpToNode}
          onReviewed={(edgeId, decision) => {
            const nextEdges = edges.map((e) =>
              e.id === edgeId
                ? { ...e, reviewStatus: decision === 'approved' ? ('approved' as const) : ('rejected' as const) }
                : e,
            );
            onEdgesChanged?.(nextEdges);
            // 同步刷新候选列表
            const candidateId = edgeCandidateMap?.[edgeId];
            const matchedCandidate = candidates.find((c) => c.id === candidateId);
            if (candidateId && matchedCandidate) {
              updateCandidate({
                ...matchedCandidate,
                reviewStatus: decision === 'approved' ? 'accepted' : 'rejected',
              });
            }
            onGraphChanged();
          }}
        />
      ),
    },
  ];

  return (
    <div className="graph-side-panel">
      <Tabs
        activeKey={activeTab}
        onChange={(key) => handleTabChange(key as GraphSidePanelTab)}
        items={items}
        size="small"
      />
    </div>
  );
}
