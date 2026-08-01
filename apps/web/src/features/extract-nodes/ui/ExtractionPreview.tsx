import { CheckCircleOutlined, RobotOutlined, ThunderboltOutlined } from '@ant-design/icons';
import {
  Button,
  Checkbox,
  Drawer,
  Empty,
  List,
  Progress,
  Space,
  Spin,
  Statistic,
  Tag,
  Tooltip,
  Typography,
} from 'antd';

import type { UploadedMaterial } from '../../../entities/uploaded-material';
import type { ExtractedNode } from '../model/extractNodes';
import type { ExtractionTaskStatus } from '../model/useExtractionTask';

import './extractionPreview.css';

const { Text, Paragraph } = Typography;

const kindLabel: Record<string, { color: string; label: string }> = {
  Course: { color: 'blue', label: '课程' },
  Experiment: { color: 'green', label: '实验' },
  KnowledgePoint: { color: 'purple', label: '知识点' },
  TeachingResource: { color: 'orange', label: '资源' },
};

interface ExtractionPreviewProps {
  open: boolean;
  status: ExtractionTaskStatus;
  material: UploadedMaterial | null;
  nodes: ExtractedNode[];
  model?: string;
  usage?: { prompt_tokens: number; completion_tokens: number };
  latency?: number;
  selectedCount: number;
  onToggleNode: (nodeId: string) => void;
  onSelectAll: (selected: boolean) => void;
  onConfirm: (nodes: ExtractedNode[]) => void;
  onClose: () => void;
}

// AI 提取结果预览抽屉 —— 展示真实 LLM 调用细节
export function ExtractionPreview({
  open,
  status,
  material,
  nodes,
  model,
  usage,
  latency,
  selectedCount,
  onToggleNode,
  onSelectAll,
  onConfirm,
  onClose,
}: ExtractionPreviewProps) {
  return (
    <Drawer
      extra={
        status === 'done' && (
          <Space>
            <Button onClick={() => onSelectAll(true)} size="small">
              全选
            </Button>
            <Button onClick={() => onSelectAll(false)} size="small">
              全不选
            </Button>
          </Space>
        )
      }
      onClose={onClose}
      open={open}
      title={
        <Space>
          <RobotOutlined />
          <span>AI 节点提取</span>
          {material && <Tag>{material.fileName}</Tag>}
          {model && (
            <Tooltip title={`AI 模型：${model}`}>
              <Tag color="geekblue" icon={<ThunderboltOutlined />}>
                {model}
              </Tag>
            </Tooltip>
          )}
        </Space>
      }
      width={560}
    >
      {status === 'running' && (
        <div className="extraction-preview-loading">
          <Spin size="large" />
          <Paragraph type="secondary">
            正在调用 AI 分析材料内容，提取课程、实验、知识点节点...
          </Paragraph>
          <Progress percent={65} showInfo={false} status="active" />
        </div>
      )}

      {status === 'error' && (
        <Empty description="AI 提取失败，请稍后重试" />
      )}

      {status === 'done' && (
        <div className="extraction-preview-result">
          {/* AI 调用元数据 */}
          <div className="extraction-llm-meta">
            <Space size="large" wrap>
              {model && (
                <Statistic
                  title="AI 模型"
                  value={model}
                  valueStyle={{ fontSize: 13 }}
                />
              )}
              {usage && (
                <Statistic
                  title="Prompt Tokens"
                  value={usage.prompt_tokens}
                  valueStyle={{ fontSize: 13 }}
                />
              )}
              {usage && (
                <Statistic
                  title="Completion Tokens"
                  value={usage.completion_tokens}
                  valueStyle={{ fontSize: 13 }}
                />
              )}
              {latency !== undefined && (
                <Statistic
                  title="延迟"
                  value={`${Math.round(latency)}ms`}
                  valueStyle={{ fontSize: 13 }}
                />
              )}
            </Space>
          </div>

          <div className="extraction-preview-summary">
            <Text>
              AI 共提取 <Text strong>{nodes.length}</Text> 个节点，已选中{' '}
              <Text strong>{selectedCount}</Text> 个
            </Text>
          </div>

          <List
            dataSource={nodes}
            renderItem={(item) => {
              const kind = kindLabel[item.node.kind] ?? {
                color: 'default',
                label: item.node.kind,
              };
              return (
                <List.Item
                  className={`extraction-node-item ${item.selected ? 'extraction-node-selected' : ''}`}
                  onClick={() => onToggleNode(item.node.id)}
                >
                  <div className="extraction-node-content">
                    <Checkbox checked={item.selected} />
                    <div className="extraction-node-info">
                      <Space size={6}>
                        <Tag color={kind.color}>{kind.label}</Tag>
                        <Text strong>{item.node.name}</Text>
                        <Text type="secondary">({item.node.code})</Text>
                      </Space>
                      {item.node.description && (
                        <Paragraph
                          className="extraction-node-desc"
                          type="secondary"
                        >
                          {item.node.description}
                        </Paragraph>
                      )}
                      <div className="extraction-node-meta">
                        <Tag color={item.confidence >= 0.9 ? 'green' : item.confidence >= 0.8 ? 'orange' : 'red'}>
                          置信度 {Math.round(item.confidence * 100)}%
                        </Tag>
                        <Tooltip title="AI 提取时的原文摘录">
                          <Text className="extraction-node-excerpt" type="secondary">
                            「{item.sourceExcerpt}」
                          </Text>
                        </Tooltip>
                      </div>
                    </div>
                  </div>
                </List.Item>
              );
            }}
          />

          <div className="extraction-preview-actions">
            <Button
              disabled={selectedCount === 0}
              icon={<CheckCircleOutlined />}
              onClick={() => onConfirm(nodes.filter((n) => n.selected))}
              type="primary"
            >
              确认入库（{selectedCount} 个节点）
            </Button>
            <Button onClick={onClose}>全部丢弃</Button>
          </div>
        </div>
      )}
    </Drawer>
  );
}
