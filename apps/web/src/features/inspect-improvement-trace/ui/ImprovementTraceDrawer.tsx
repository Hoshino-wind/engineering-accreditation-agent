import {
  CheckCircleFilled,
  FileTextOutlined,
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

import type { ImprovementCase } from '../../../entities/improvement-case';

import './improvementTraceDrawer.css';

interface ImprovementTraceDrawerProps {
  improvementCase: ImprovementCase | null;
  onClose: () => void;
  open: boolean;
}

export function ImprovementTraceDrawer({
  improvementCase,
  onClose,
  open,
}: ImprovementTraceDrawerProps) {
  return (
    <Drawer
      className="improvement-trace-drawer"
      onClose={onClose}
      open={open}
      size={560}
      title="完整来源与变更追溯"
    >
      {!improvementCase ? (
        <Empty description="未选择改进问题" />
      ) : (
        <>
          <Descriptions
            bordered
            column={1}
            items={[
              {
                key: 'issue',
                label: '改进问题',
                children: `${improvementCase.displayId} ${improvementCase.title}`,
              },
              {
                key: 'source',
                label: '来源对象',
                children: improvementCase.source.label,
              },
              {
                key: 'hash',
                label: '证据哈希',
                children: improvementCase.source.evidenceHash,
              },
              {
                key: 'baseline',
                label: '问题基线',
                children: improvementCase.baseline.toFixed(2),
              },
            ]}
            size="small"
          />

          <Divider titlePlacement="start">实际变更链</Divider>
          <Timeline
            items={[
              {
                content: (
                  <Space vertical size={2}>
                    <Typography.Text strong>来源事实确认</Typography.Text>
                    <Typography.Text type="secondary">
                      {improvementCase.source.objectId}
                    </Typography.Text>
                  </Space>
                ),
                icon: <LinkOutlined />,
              },
              {
                content: (
                  <Space vertical size={2}>
                    <Typography.Text strong>措施已批准</Typography.Text>
                    <Typography.Text type="secondary">
                      {improvementCase.action.title}
                    </Typography.Text>
                  </Space>
                ),
                icon: <CheckCircleFilled />,
              },
              ...improvementCase.changes.map((change) => ({
                content: (
                  <Space vertical size={2}>
                    <Space>
                      <Typography.Text strong>
                        {change.name} {change.version}
                      </Typography.Text>
                      <Tag
                        color={
                          change.status === 'approved'
                            ? 'success'
                            : 'purple'
                        }
                      >
                        {change.status === 'approved'
                          ? '已审核'
                          : '草稿'}
                      </Tag>
                    </Space>
                    <Typography.Text type="secondary">
                      变更对象 ID：{change.id}
                    </Typography.Text>
                  </Space>
                ),
                icon: <FileTextOutlined />,
              })),
              ...(improvementCase.reevaluation
                ? [
                    {
                      content: (
                        <Space vertical size={2}>
                          <Typography.Text strong>
                            复评运行 {improvementCase.reevaluation.runId}
                          </Typography.Text>
                          <Typography.Text type="secondary">
                            {improvementCase.reevaluation.cycle} ·{' '}
                            {improvementCase.reevaluation.policyVersion} ·
                            结果{' '}
                            {improvementCase.reevaluation.result.toFixed(
                              2,
                            )}
                          </Typography.Text>
                        </Space>
                      ),
                      icon: <CheckCircleFilled />,
                    },
                  ]
                : []),
            ]}
          />
        </>
      )}
    </Drawer>
  );
}
