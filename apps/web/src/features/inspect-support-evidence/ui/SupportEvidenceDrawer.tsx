import {
  CheckCircleFilled,
  FileSearchOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import {
  Descriptions,
  Divider,
  Drawer,
  Empty,
  Space,
  Tag,
  Timeline,
  Typography,
} from 'antd';

import type {
  SupportPackage,
  SupportPackageSection,
} from '../../../entities/support-package';

import './supportEvidenceDrawer.css';

interface SupportEvidenceDrawerProps {
  onClose: () => void;
  open: boolean;
  section: SupportPackageSection | null;
  supportPackage: SupportPackage | null;
}

export function SupportEvidenceDrawer({
  onClose,
  open,
  section,
  supportPackage,
}: SupportEvidenceDrawerProps) {
  return (
    <Drawer
      className="support-evidence-drawer"
      onClose={onClose}
      open={open}
      size={600}
      title="证据索引与版本追溯"
    >
      {!supportPackage || !section ? (
        <Empty description="未选择报告章节" />
      ) : (
        <>
          <Descriptions
            bordered
            column={1}
            items={[
              {
                key: 'package',
                label: '支撑包',
                children: `${supportPackage.displayId} ${supportPackage.version}`,
              },
              {
                key: 'template',
                label: '模板版本',
                children: `${supportPackage.template.name} ${supportPackage.template.version}`,
              },
              {
                key: 'section',
                label: '当前章节',
                children: `${section.code}. ${section.title}`,
              },
              {
                key: 'hash',
                label: '内容哈希',
                children: supportPackage.contentHash || '尚未生成',
              },
            ]}
            size="small"
          />

          <Divider titlePlacement="start">冻结来源快照</Divider>
          <Timeline
            items={supportPackage.sourceSnapshots.map((source) => ({
              content: (
                <Space vertical size={2}>
                  <Space>
                    <Typography.Text strong>
                      {source.module} {source.label}
                    </Typography.Text>
                    <Tag
                      color={
                        ['formal', 'confirmed'].includes(source.state)
                          ? 'success'
                          : 'warning'
                      }
                    >
                      {source.state === 'formal'
                        ? '正式'
                        : source.state === 'confirmed'
                          ? '已确认'
                          : source.state === 'unapproved'
                            ? '未批准'
                            : '未闭环'}
                    </Tag>
                  </Space>
                  <Typography.Text type="secondary">
                    {source.objectId} · {source.version} · {source.count} 项
                  </Typography.Text>
                </Space>
              ),
              icon:
                source.state === 'formal' ||
                source.state === 'confirmed' ? (
                  <CheckCircleFilled />
                ) : (
                  <FileSearchOutlined />
                ),
            }))}
          />

          <Divider titlePlacement="start">章节正式结论</Divider>
          {section.claims.map((claim) => (
            <div className="support-evidence-claim" key={claim.id}>
              <LinkOutlined />
              <div>
                <Typography.Paragraph>
                  {claim.text}
                </Typography.Paragraph>
                <Space size={4} wrap>
                  {claim.referenceIds.map((referenceId) => (
                    <Tag color="blue" key={referenceId}>
                      {referenceId}
                    </Tag>
                  ))}
                </Space>
              </div>
            </div>
          ))}
        </>
      )}
    </Drawer>
  );
}
