import {
  ApartmentOutlined,
  BarChartOutlined,
  FileSearchOutlined,
  FolderOpenOutlined,
  LinkOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import {
  Button,
  Card,
  Empty,
  Space,
  Steps,
  Tag,
  Typography,
} from 'antd';

import {
  SupportPackageStatusTag,
  type SupportPackage,
  type SupportPackageSection,
  type SupportSourceModule,
  type SupportSourceState,
} from '../../../entities/support-package';

interface SupportPackageContentPanelProps {
  onInspectEvidence: () => void;
  onSectionSelect: (section: SupportPackageSection) => void;
  selectedSection: SupportPackageSection | null;
  supportPackage: SupportPackage | null;
}

const workflowCurrent: Record<SupportPackage['status'], number> = {
  approved: 4,
  'changes-required': 2,
  draft: 1,
  exported: 4,
  'ready-for-review': 3,
};

const sourceIcons: Record<SupportSourceModule, typeof ApartmentOutlined> = {
  M2: ApartmentOutlined,
  M3: FolderOpenOutlined,
  M5: FileSearchOutlined,
  M6: BarChartOutlined,
  M7: ToolOutlined,
};

const sourceStateView: Record<
  SupportSourceState,
  { color: string; label: string }
> = {
  confirmed: { color: 'success', label: '已确认' },
  formal: { color: 'success', label: '正式' },
  open: { color: 'warning', label: '未闭环' },
  unapproved: { color: 'warning', label: '未批准' },
};

export function SupportPackageContentPanel({
  onInspectEvidence,
  onSectionSelect,
  selectedSection,
  supportPackage,
}: SupportPackageContentPanelProps) {
  if (!supportPackage || !selectedSection) {
    return (
      <Card
        className="support-package-content-panel"
        size="small"
        title="章节预览与版本快照"
      >
        <Empty
          description="请选择一个支撑包"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    );
  }

  return (
    <Card
      className="support-package-content-panel"
      size="small"
      title="章节预览与版本快照"
    >
      <section className="support-package-heading">
        <Space align="center" size={8}>
          <Typography.Text strong>
            {supportPackage.displayId} {supportPackage.title}{' '}
            {supportPackage.version}
          </Typography.Text>
          <SupportPackageStatusTag status={supportPackage.status} />
        </Space>
        <Space size={14}>
          <Typography.Text type="secondary">
            课程：{supportPackage.course}
          </Typography.Text>
          <Typography.Text type="secondary">
            周期：{supportPackage.cycle}
          </Typography.Text>
          <Typography.Text type="secondary">
            模板：{supportPackage.template.name}{' '}
            {supportPackage.template.version}
          </Typography.Text>
        </Space>
      </section>

      <Steps
        current={workflowCurrent[supportPackage.status]}
        items={[
          { title: '版本固定' },
          { title: '章节生成' },
          { title: '完整校验' },
          { title: '审批' },
          { title: '导出' },
        ]}
        size="small"
      />

      <section className="support-source-strip">
        {supportPackage.sourceSnapshots.map((source) => {
          const SourceIcon = sourceIcons[source.module];
          const stateView = sourceStateView[source.state];

          return (
            <div key={source.id}>
              <SourceIcon />
              <div>
                <Typography.Text>
                  {source.module} {source.label}
                </Typography.Text>
                <Typography.Text type="secondary">
                  {source.module === 'M2' ? source.version : `${source.count} 项`}
                </Typography.Text>
                <Tag color={stateView.color}>{stateView.label}</Tag>
              </div>
            </div>
          );
        })}
      </section>

      <section className="support-sections">
        <Typography.Text strong>报告章节</Typography.Text>
        <div className="support-section-list">
          {supportPackage.sections.map((section) => (
            <button
              className={
                section.id === selectedSection.id
                  ? 'support-section-row support-section-row--selected'
                  : 'support-section-row'
              }
              key={section.id}
              onClick={() => onSectionSelect(section)}
              type="button"
            >
              <Typography.Text>{section.code}</Typography.Text>
              <Typography.Text>{section.title}</Typography.Text>
              <Typography.Text type="secondary">
                {section.referenceCount} 条引用
              </Typography.Text>
              <Tag color={section.status === 'ready' ? 'success' : 'error'}>
                {section.status === 'ready' ? '已就绪' : '阻断'}
              </Tag>
            </button>
          ))}
        </div>
      </section>

      <section className="support-document-preview">
        <div>
          <Typography.Text strong>
            {selectedSection.code}. {selectedSection.title}
          </Typography.Text>
          <Button
            icon={<LinkOutlined />}
            onClick={onInspectEvidence}
            size="small"
            type="link"
          >
            查看证据索引
          </Button>
        </div>
        <Typography.Paragraph>
          {selectedSection.summary}
        </Typography.Paragraph>
        {selectedSection.claims.map((claim) => (
          <div className="support-preview-claim" key={claim.id}>
            <Typography.Text>{claim.text}</Typography.Text>
            <Space size={4} wrap>
              {claim.referenceIds.map((referenceId) => (
                <Tag color="blue" key={referenceId}>
                  [{referenceId}]
                </Tag>
              ))}
            </Space>
          </div>
        ))}
      </section>
    </Card>
  );
}
