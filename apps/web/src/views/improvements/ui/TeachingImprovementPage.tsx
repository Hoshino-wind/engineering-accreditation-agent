import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  LoadingOutlined,
  RobotOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Badge,
  Button,
  Card,
  Divider,
  Empty,
  Space,
  Spin,
  Statistic,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { useEffect, useState } from 'react';

import {
  generateSuggestions,
  type ImprovementSuggestion,
  type SuggestionPriority,
  type SuggestionType,
} from '../../../features/generate-improvement-suggestion';
import { prototypeOnlyAbilityGraph } from '../../../entities/ability-graph';

import './teachingImprovementPage.css';

const { Paragraph, Text, Title } = Typography;

const TYPE_LABEL: Record<SuggestionType, { label: string; color: string }> = {
  gap: { label: '覆盖缺口', color: 'error' },
  weak: { label: '支撑不足', color: 'warning' },
  orphan: { label: '孤岛数据', color: 'warning' },
  pending: { label: '待审核', color: 'processing' },
};

const PRIORITY_LABEL: Record<SuggestionPriority, { label: string; color: string }> = {
  high: { label: '高优先', color: 'red' },
  medium: { label: '中优先', color: 'orange' },
  low: { label: '低优先', color: 'blue' },
};

export function TeachingImprovementPage() {
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<ImprovementSuggestion[]>([]);
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState<string | undefined>();

  // 首次加载时调用 AI 生成建议
  useEffect(() => {
    void generateSuggestions(prototypeOnlyAbilityGraph)
      .then((result) => {
        setSuggestions(result);
        const firstSuggestion = result[0];
        if (firstSuggestion) {
          setSelectedId(firstSuggestion.id);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const updateStatus = (id: string, status: string) => {
    setStatuses((prev) => ({ ...prev, [id]: status }));
  };

  const selected = suggestions.find((s) => s.id === selectedId);
  const acceptedCount = Object.values(statuses).filter(
    (s) => s === 'accepted',
  ).length;
  const rejectedCount = Object.values(statuses).filter(
    (s) => s === 'rejected',
  ).length;
  const pendingCount = suggestions.length - acceptedCount - rejectedCount;

  // 统计 AI 模型信息
  const aiModels = new Set(suggestions.map((s) => s.aiModel).filter(Boolean));
  const latencySamples = suggestions.filter((s) => s.aiLatency);
  const avgLatency = latencySamples.length > 0
    ? Math.round(
        latencySamples.reduce((sum, s) => sum + (s.aiLatency ?? 0), 0) /
          latencySamples.length,
      )
    : 0;

  return (
    <main className="teaching-improvement-page">
      <div className="teaching-improvement-page-header">
        <div>
          <Space align="center" size={10}>
            <Title level={2}>教学改进建议</Title>
            <Tag color="geekblue">M7 教学改进</Tag>
            <Tag color="gold" icon={<RobotOutlined />}>AI 智能生成</Tag>
          </Space>
          <Paragraph type="secondary">
            系统先通过图谱诊断识别缺口，再调用 AI 生成针对性改进建议。
            建议分为四类：覆盖缺口（无课程支撑）、支撑不足（强度不够）、
            孤岛数据（未关联标准）、待审核（AI 推荐关系未确认）。
          </Paragraph>
        </div>
      </div>

      {/* 总览 */}
      <Card className="improvement-stats" size="small">
        <Space size={32} wrap>
          <Statistic title="建议总数" value={suggestions.length} />
          <Statistic
            title="高优先级"
            value={suggestions.filter((s) => s.priority === 'high').length}
            valueStyle={{ color: '#ff4d4f' }}
          />
          <Statistic
            title="已采纳"
            value={acceptedCount}
            valueStyle={{ color: '#52c41a' }}
            prefix={<CheckCircleOutlined />}
          />
          <Statistic
            title="已拒绝"
            value={rejectedCount}
            valueStyle={{ color: '#8c8c8c' }}
            prefix={<CloseCircleOutlined />}
          />
          <Statistic
            title="待处理"
            value={pendingCount}
            valueStyle={{ color: '#faad14' }}
            prefix={<ClockCircleOutlined />}
          />
          {aiModels.size > 0 && (
            <>
              <Divider type="vertical" />
              <Tooltip title="本次调用使用的 AI 模型">
                <Tag color="geekblue" icon={<ThunderboltOutlined />}>
                  {Array.from(aiModels).join(', ')}
                </Tag>
              </Tooltip>
              {avgLatency > 0 && (
                <Tooltip title="AI 平均响应延迟">
                  <Tag color="cyan">
                    平均延迟 {avgLatency}ms
                  </Tag>
                </Tooltip>
              )}
            </>
          )}
        </Space>
      </Card>

      {!loading && suggestions.filter((s) => s.priority === 'high').length > 0 && (
        <Alert
          className="improvement-alert"
          type="error"
          showIcon
          icon={<ExclamationCircleOutlined />}
          message={`检测到 ${suggestions.filter((s) => s.priority === 'high').length} 项高优先级问题，建议优先处理覆盖缺口和待审核关系`}
        />
      )}

      <div className="improvement-body">
        {/* 左侧：建议列表 */}
        <Card
          title={`改进建议列表（${suggestions.length}）`}
          size="small"
          className="improvement-list-card"
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} />
              <Paragraph type="secondary" style={{ marginTop: 8 }}>
                AI 正在分析图谱诊断结果，生成改进建议...
              </Paragraph>
            </div>
          ) : suggestions.length === 0 ? (
            <Empty description="暂无改进建议，所有标准已覆盖" />
          ) : (
            <div className="improvement-list">
              {suggestions.map((sug) => {
                const currentStatus = statuses[sug.id] ?? 'pending';
                const isSelected = selectedId === sug.id;
                return (
                  <div
                    key={sug.id}
                    className={`improvement-list-item ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedId(sug.id)}
                  >
                    <div className="improvement-list-item-header">
                      <Space size={6}>
                        <Tag color={TYPE_LABEL[sug.type].color}>
                          {TYPE_LABEL[sug.type].label}
                        </Tag>
                        <Tag color={PRIORITY_LABEL[sug.priority].color}>
                          {PRIORITY_LABEL[sug.priority].label}
                        </Tag>
                        {sug.aiModel && (
                          <Tag color="geekblue" style={{ fontSize: 10 }}>
                            <RobotOutlined /> {sug.aiModel}
                          </Tag>
                        )}
                      </Space>
                      {currentStatus !== 'pending' && (
                        <Badge
                          status={
                            currentStatus === 'accepted' ? 'success' : 'error'
                          }
                          text={
                            currentStatus === 'accepted' ? '已采纳' : '已拒绝'
                          }
                        />
                      )}
                    </div>
                    <Text strong className="improvement-list-item-title">
                      {sug.title}
                    </Text>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* 右侧：建议详情 */}
        <Card
          title="建议详情"
          size="small"
          className="improvement-detail-card"
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <Spin size="large" />
            </div>
          ) : selected ? (
            <div className="improvement-detail">
              <div className="improvement-detail-header">
                <Space size={8}>
                  <Tag color={TYPE_LABEL[selected.type].color}>
                    {TYPE_LABEL[selected.type].label}
                  </Tag>
                  <Tag color={PRIORITY_LABEL[selected.priority].color}>
                    {PRIORITY_LABEL[selected.priority].label}
                  </Tag>
                  {selected.aiModel && (
                    <Tag color="geekblue" icon={<ThunderboltOutlined />}>
                      AI: {selected.aiModel}
                      {selected.aiLatency && ` · ${Math.round(selected.aiLatency)}ms`}
                    </Tag>
                  )}
                </Space>
              </div>

              <Title level={4} style={{ margin: '12px 0 8px' }}>
                {selected.title}
              </Title>

              {selected.targetRequirement && (
                <Paragraph>
                  <Text type="secondary">关联毕业要求：</Text>
                  <Tag color="red">
                    {selected.targetRequirement.code}{' '}
                    {selected.targetRequirement.name}
                  </Tag>
                </Paragraph>
              )}

              {selected.targetCompetency && (
                <Paragraph>
                  <Text type="secondary">关联能力指标：</Text>
                  <Tag color="orange">
                    {selected.targetCompetency.code}{' '}
                    {selected.targetCompetency.name}
                  </Tag>
                </Paragraph>
              )}

              <div className="improvement-detail-section">
                <Text strong>
                  <RobotOutlined /> AI 根因分析
                </Text>
                <Paragraph
                  type="secondary"
                  style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}
                >
                  {selected.problem}
                </Paragraph>
              </div>

              <div className="improvement-detail-section">
                <Text strong>
                  <RobotOutlined /> AI 改进建议
                </Text>
                <Paragraph
                  style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}
                >
                  {selected.suggestion}
                </Paragraph>
              </div>

              <div className="improvement-detail-section">
                <Text strong>预期效果</Text>
                <Paragraph
                  type="success"
                  style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}
                >
                  {selected.expectedEffect}
                </Paragraph>
              </div>

              <div className="improvement-detail-actions">
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={() => updateStatus(selected.id, 'accepted')}
                  disabled={statuses[selected.id] === 'accepted'}
                >
                  采纳
                </Button>
                <Button
                  danger
                  icon={<CloseCircleOutlined />}
                  onClick={() => updateStatus(selected.id, 'rejected')}
                  disabled={statuses[selected.id] === 'rejected'}
                >
                  拒绝
                </Button>
                <Button
                  icon={<ClockCircleOutlined />}
                  onClick={() => updateStatus(selected.id, 'deferred')}
                >
                  暂缓
                </Button>
              </div>
            </div>
          ) : (
            <Empty description="选择左侧建议查看详情" />
          )}
        </Card>
      </div>
    </main>
  );
}
