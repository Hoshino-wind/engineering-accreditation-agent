import {
  BellOutlined,
  CheckCircleOutlined,
  QuestionCircleOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  Avatar,
  Breadcrumb,
  Button,
  Divider,
  Drawer,
  Empty,
  Layout,
  Modal,
  Space,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { useState } from 'react';

import { useWorkflowEvents } from '../../../../entities/workflow-event';
import type { AppShellRouteDefinition } from '../config/appShellRoutes';

const { Header } = Layout;

interface AppShellHeaderProps {
  onNavigate: (path: string) => void;
  route: AppShellRouteDefinition;
}

export function AppShellHeader({
  onNavigate,
  route,
}: AppShellHeaderProps) {
  const workflowEvents = useWorkflowEvents();
  const [helpOpen, setHelpOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const navigateToGovernance = () => {
    setNotificationsOpen(false);
    onNavigate('/governance');
  };

  return (
    <>
      <Header className="app-header">
        <div className="app-header-navigation">
          <Breadcrumb
            items={[
              {
                title: '计算机科学与技术',
              },
              {
                title: route.areaName,
              },
              {
                title: route.pageName,
              },
            ]}
          />
        </div>
        <Space className="app-header-actions" size={10}>
          <Tag
            className="app-save-status"
            icon={<CheckCircleOutlined />}
          >
            草稿已保存
          </Tag>
          <Divider orientation="vertical" />
          <Tooltip title="帮助与快捷键">
            <Button
              aria-label="帮助与快捷键"
              icon={<QuestionCircleOutlined />}
              onClick={() => setHelpOpen(true)}
              type="text"
            />
          </Tooltip>
          <Tooltip title={`${workflowEvents.length} 条本地业务通知`}>
            <Button
              aria-label={`通知，${workflowEvents.length} 条`}
              icon={<BellOutlined />}
              onClick={() => setNotificationsOpen(true)}
              type="text"
            />
          </Tooltip>
          <Space size={8}>
            <Avatar icon={<UserOutlined />} size="small" />
            <div className="app-user">
              <Typography.Text strong>王老师</Typography.Text>
              <Typography.Text type="secondary">
                专业负责人
              </Typography.Text>
            </div>
          </Space>
        </Space>
      </Header>
      <Modal
        cancelButtonProps={{ style: { display: 'none' } }}
        okText="知道了"
        onCancel={() => setHelpOpen(false)}
        onOk={() => setHelpOpen(false)}
        open={helpOpen}
        title="使用帮助"
      >
        <Space orientation="vertical" size={12}>
          <Typography.Text>
            按“准备材料—识别审核—发布图谱—分析评价—教学改进—认证输出”推进；工作总览会始终提示当前最优先的下一步。
          </Typography.Text>
          <Typography.Text type="secondary">
            列表可用 Tab 聚焦，Enter 或空格选择；正式审核、评价和导出记录可在「系统治理」中追溯。
          </Typography.Text>
          <Typography.Text type="secondary">
            当前为可运行的本地模式。学校统一登录、对象存储和外部模型仍需要部署参数。
          </Typography.Text>
        </Space>
      </Modal>
      <Drawer
        extra={
          <Button onClick={navigateToGovernance} size="small">
            查看治理中心
          </Button>
        }
        onClose={() => setNotificationsOpen(false)}
        open={notificationsOpen}
        title="最近业务通知"
      >
        {workflowEvents.length === 0 ? (
          <Empty description="完成一次运行、审核或提交后，这里会显示通知" />
        ) : (
          <div className="app-notification-list">
            {workflowEvents.slice(0, 10).map((event) => (
              <article className="app-notification-item" key={event.id}>
                <Space>
                  <Tag color="blue">{event.module}</Tag>
                  <Typography.Text strong>
                    {event.action}
                  </Typography.Text>
                </Space>
                <Typography.Text type="secondary">
                  {event.summary}
                </Typography.Text>
                <Typography.Text type="secondary">
                  {new Date(event.timestamp).toLocaleString('zh-CN')}
                </Typography.Text>
              </article>
            ))}
          </div>
        )}
      </Drawer>
    </>
  );
}
