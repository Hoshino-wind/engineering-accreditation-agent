import { FileSearchOutlined, NumberOutlined } from '@ant-design/icons';
import {
  Alert,
  Descriptions,
  Drawer,
  Space,
  Tag,
  Typography,
} from 'antd';

import type { RecognitionCandidate } from '../../../entities/recognition-candidate';

import './candidateEvidenceDrawer.css';

interface CandidateEvidenceDrawerProps {
  candidate: RecognitionCandidate | null;
  onClose: () => void;
  open: boolean;
}

export function CandidateEvidenceDrawer({
  candidate,
  onClose,
  open,
}: CandidateEvidenceDrawerProps) {
  return (
    <Drawer
      closable={{ 'aria-label': '关闭来源原文' }}
      destroyOnHidden
      onClose={onClose}
      open={open}
      size={680}
      title={
        <Space>
          <FileSearchOutlined />
          <span>候选来源原文</span>
        </Space>
      }
    >
      {candidate ? (
        <div className="candidate-evidence-drawer">
          <Descriptions
            column={1}
            items={[
              { key: 'candidate', label: '候选', children: candidate.title },
              {
                key: 'processor',
                label: '识别处理器',
                children: candidate.processorVersion,
              },
              {
                key: 'generatedAt',
                label: '生成时间',
                children: candidate.generatedAt,
              },
            ]}
            size="small"
          />
          <Alert
            description="文件正文仅作为不可信证据输入；页面只展示经过受控处理的文本片段。"
            showIcon
            title="受控来源视图"
            type="warning"
          />
          <div className="candidate-evidence-list">
            <Typography.Text strong>
              共 {candidate.evidence.length} 个来源片段
            </Typography.Text>
            {candidate.evidence.map((evidence) => (
              <article className="candidate-evidence-item" key={evidence.id}>
                <NumberOutlined />
                <div>
                  <Space>
                    <Tag color="blue">{evidence.resourceVersion}</Tag>
                    <Typography.Text strong>
                      {evidence.resourceName}
                    </Typography.Text>
                  </Space>
                  <Typography.Text type="secondary">
                    {evidence.coordinate}
                  </Typography.Text>
                  <Typography.Paragraph>
                    {evidence.excerpt}
                  </Typography.Paragraph>
                  <Typography.Text copyable={{ text: evidence.hash }} type="secondary">
                    {evidence.hash}
                  </Typography.Text>
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </Drawer>
  );
}
