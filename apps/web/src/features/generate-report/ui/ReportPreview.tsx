import {
  CheckCircleFilled,
  CloseCircleFilled,
  FileTextOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import { Card, Collapse, Progress, Space, Tag, Typography } from 'antd';

import type { ReportSection } from '../model/generateReport';

import './reportPreview.css';

const { Text, Paragraph } = Typography;

const attainmentColor: Record<string, string> = {
  '支撑充分': 'success',
  '证据不足': 'warning',
  '无有效支撑': 'error',
};

interface ReportPreviewProps {
  sections: ReportSection[];
}

// 自评报告预览：按认证标准章节展示，含 AI 叙述文本
export function ReportPreview({ sections }: ReportPreviewProps) {
  const items = sections.map((section) => ({
    key: section.id,
    label: (
      <Space>
        <Text strong>{section.chapter} {section.title}</Text>
        <Tag color={attainmentColor[section.attainmentLabel]}>
          {section.attainmentLabel}
        </Tag>
        <Text type="secondary">材料覆盖率 {Math.round(section.attainment * 100)}%</Text>
        {section.narrative && (
          <Tag icon={<RobotOutlined />} color="purple">AI 生成</Tag>
        )}
      </Space>
    ),
    children: (
      <div className="report-section-detail">
        {section.narrative && (
          <div className="report-section-block">
            <Text type="secondary">AI 生成叙述</Text>
            <Paragraph style={{ background: '#fafafa', padding: 12, borderRadius: 4 }}>
              {section.narrative}
            </Paragraph>
          </div>
        )}
        <div className="report-section-block">
          <Text type="secondary">标准要求</Text>
          <Paragraph>{section.standardRef}</Paragraph>
        </div>
        <div className="report-section-block">
          <Text type="secondary">学校现状</Text>
          <Paragraph>{section.schoolStatus}</Paragraph>
        </div>
        <div className="report-section-block">
          <Text type="secondary">数据支撑</Text>
          <Paragraph>{section.dataEvidence}</Paragraph>
        </div>
        <div className="report-section-block">
          <Text type="secondary">材料支撑充分性</Text>
          <Progress
            percent={Math.round(section.attainment * 100)}
            status={section.attainmentLabel === '无有效支撑' ? 'exception' : undefined}
            strokeColor={
              section.attainmentLabel === '支撑充分'
                ? undefined
                : section.attainmentLabel === '证据不足'
                  ? '#faad14'
                  : '#ff4d4f'
            }
          />
        </div>
      </div>
    ),
  }));

  return (
    <Card
      className="report-preview-card"
      size="small"
      title={
        <Space>
          <FileTextOutlined />
          <span>自评报告预览</span>
          <Tag>{sections.length} 个章节</Tag>
          {sections[0]?.aiModel && (
            <Tag icon={<RobotOutlined />} color="purple">
              {sections[0].aiModel} · {Math.round(sections[0].aiLatency ?? 0)}ms
            </Tag>
          )}
        </Space>
      }
    >
      <Collapse defaultActiveKey={['RS-01', 'RS-06']} items={items} />
    </Card>
  );
}

interface CompletenessCheckListProps {
  checks: { id: string; label: string; passed: boolean; detail: string }[];
}

// 报告完整性检查清单
export function CompletenessCheckList({ checks }: CompletenessCheckListProps) {
  return (
    <Card className="report-completeness-card" size="small" title="导出前检查">
      <div className="report-completeness-list">
        {checks.map((check) => (
          <div className="report-completeness-item" key={check.id}>
            {check.passed ? (
              <CheckCircleFilled style={{ color: '#52c41a' }} />
            ) : (
              <CloseCircleFilled style={{ color: '#ff4d4f' }} />
            )}
            <div className="report-completeness-text">
              <Text strong={check.passed}>{check.label}</Text>
              <Text type="secondary">{check.detail}</Text>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
