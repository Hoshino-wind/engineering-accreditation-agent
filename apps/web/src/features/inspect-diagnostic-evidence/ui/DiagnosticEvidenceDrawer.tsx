import {
  FileSearchOutlined,
  NumberOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Descriptions,
  Drawer,
  Space,
  Tag,
  Typography,
} from 'antd';

import type { DiagnosticFinding } from '../../../entities/diagnostic-finding';

import './diagnosticEvidenceDrawer.css';

interface DiagnosticEvidenceDrawerProps {
  finding: DiagnosticFinding | null;
  onClose: () => void;
  open: boolean;
}

export function DiagnosticEvidenceDrawer({
  finding,
  onClose,
  open,
}: DiagnosticEvidenceDrawerProps) {
  return (
    <Drawer
      closable={{ 'aria-label': '关闭诊断依据' }}
      destroyOnHidden
      onClose={onClose}
      open={open}
      size={680}
      title={
        <Space>
          <FileSearchOutlined />
          <span>诊断来源与规则依据</span>
        </Space>
      }
    >
      {finding ? (
        <div className="diagnostic-evidence-drawer">
          <Descriptions
            column={1}
            items={[
              {
                key: 'finding',
                label: '诊断发现',
                children: finding.title,
              },
              {
                key: 'graphVersion',
                label: '图谱版本',
                children: finding.graphVersion,
              },
              {
                key: 'rule',
                label: '判定规则',
                children: `${finding.rule.id} ${finding.rule.version}`,
              },
              {
                key: 'runAt',
                label: '分析时间',
                children: finding.rule.runAt,
              },
            ]}
            size="small"
          />
          <Alert
            description={
              finding.rule.kind === 'deterministic'
                ? '该发现由版本化规则直接计算，原始图谱对象和材料片段均保留引用。'
                : '该发现包含语义辅助判断，只用于提示潜在冲突，必须由课程负责人确认。'
            }
            icon={<SafetyCertificateOutlined />}
            showIcon
            title={
              finding.rule.kind === 'deterministic'
                ? '确定性规则判定'
                : '受控语义辅助判定'
            }
            type={finding.rule.kind === 'deterministic' ? 'info' : 'warning'}
          />
          <div className="diagnostic-evidence-list">
            <Typography.Text strong>
              共 {finding.evidence.length} 个依据引用
            </Typography.Text>
            {finding.evidence.map((evidence) => (
              <article
                className="diagnostic-evidence-item"
                key={evidence.id}
              >
                <NumberOutlined />
                <div>
                  <Space>
                    <Tag color="blue">{evidence.objectVersion}</Tag>
                    <Typography.Text strong>
                      {evidence.objectName}
                    </Typography.Text>
                  </Space>
                  <Typography.Text type="secondary">
                    {evidence.coordinate}
                  </Typography.Text>
                  <Typography.Paragraph>
                    {evidence.excerpt}
                  </Typography.Paragraph>
                  <Typography.Text
                    copyable={{ text: evidence.hash }}
                    type="secondary"
                  >
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
