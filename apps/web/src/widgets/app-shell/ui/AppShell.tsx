import {
  AuditOutlined,
  BarChartOutlined,
  BookOutlined,
  DashboardOutlined,
  ExperimentOutlined,
  FileSearchOutlined,
  SafetyCertificateOutlined,
  SyncOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Avatar, Breadcrumb, Layout, Menu, Space, Typography } from 'antd';
import type { MenuProps } from 'antd';
import type { PropsWithChildren } from 'react';

import './appShell.css';

const { Header, Content, Sider } = Layout;

const navigationItems: MenuProps['items'] = [
  {
    key: 'overview',
    icon: <DashboardOutlined />,
    label: '总览',
  },
  {
    key: 'materials',
    icon: <FileSearchOutlined />,
    label: '材料工作台',
    disabled: true,
  },
  {
    key: 'standards',
    icon: <BookOutlined />,
    label: '标准与培养体系',
    disabled: true,
  },
  {
    key: 'experiments',
    icon: <ExperimentOutlined />,
    label: '实验项目',
    disabled: true,
  },
  {
    key: 'mappings',
    icon: <SafetyCertificateOutlined />,
    label: '支撑关系',
    disabled: true,
  },
  {
    key: 'evaluations',
    icon: <BarChartOutlined />,
    label: '达成度评价',
    disabled: true,
  },
  {
    key: 'improvements',
    icon: <SyncOutlined />,
    label: '持续改进',
    disabled: true,
  },
  {
    key: 'audit',
    icon: <AuditOutlined />,
    label: '审计日志',
    disabled: true,
  },
];

export function AppShell({ children }: PropsWithChildren) {
  return (
    <Layout className="app-shell">
      <Sider className="app-sider" width={232}>
        <div className="app-brand">
          <SafetyCertificateOutlined aria-hidden />
          <span>工程认证智能体</span>
        </div>
        <Menu
          items={navigationItems}
          mode="inline"
          selectedKeys={['overview']}
          theme="dark"
        />
      </Sider>

      <Layout>
        <Header className="app-header">
          <Breadcrumb
            items={[
              {
                title: '计算机科学与技术',
              },
              {
                title: '2026 春季试点',
              },
            ]}
          />
          <Space size={10}>
            <Avatar icon={<UserOutlined />} />
            <Typography.Text strong>专业负责人</Typography.Text>
          </Space>
        </Header>
        <Content className="app-content">{children}</Content>
      </Layout>
    </Layout>
  );
}
