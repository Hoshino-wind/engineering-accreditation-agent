import {
  ApartmentOutlined,
  BarChartOutlined,
  DashboardOutlined,
  ExperimentOutlined,
  FileDoneOutlined,
  FolderOpenOutlined,
  FileSearchOutlined,
  RobotOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  SyncOutlined,
  ToolOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Avatar, Breadcrumb, Layout, Menu, Space, Tag, Typography } from 'antd';
import type { MenuProps } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router';

import './appShell.css';

const { Header, Content, Sider } = Layout;

const navigationItems: MenuProps['items'] = [
  {
    key: 'workspace',
    label: '工作台',
    type: 'group',
    children: [
      {
        key: '/',
        icon: <DashboardOutlined />,
        label: 'M1 总览与任务',
      },
    ],
  },
  {
    key: 'graph-building',
    label: '图谱建设',
    type: 'group',
    children: [
      {
        key: '/graph',
        icon: <ApartmentOutlined />,
        label: 'M2 能力图谱',
        disabled: true,
      },
      {
        key: '/resources',
        icon: <FolderOpenOutlined />,
        label: 'M3 教学资源',
      },
      {
        key: '/recognition',
        icon: <RobotOutlined />,
        label: 'M4 识别与审核',
      },
    ],
  },
  {
    key: 'analysis',
    label: '分析与评价',
    type: 'group',
    children: [
      {
        key: '/diagnostics',
        icon: <FileSearchOutlined />,
        label: 'M5 图谱诊断',
      },
      {
        key: '/evaluations',
        icon: <BarChartOutlined />,
        label: 'M6 达成度评价',
      },
    ],
  },
  {
    key: 'improvement',
    label: '改进与输出',
    type: 'group',
    children: [
      {
        key: '/improvements',
        icon: <ToolOutlined />,
        label: 'M7 教学改进',
      },
      {
        key: '/support',
        icon: <FileDoneOutlined />,
        label: 'M8 认证支撑',
      },
    ],
  },
  {
    key: 'governance',
    label: '系统',
    type: 'group',
    children: [
      {
        key: '/governance',
        icon: <SettingOutlined />,
        label: 'M9 系统治理',
        disabled: true,
      },
    ],
  },
];

interface RouteBreadcrumb {
  areaName: string;
  pageName: string;
}

const defaultRouteBreadcrumb: RouteBreadcrumb = {
  areaName: '实验教学能力图谱',
  pageName: '总览与任务',
};

const routeBreadcrumbs: Record<string, RouteBreadcrumb> = {
  '/': defaultRouteBreadcrumb,
  '/resources': {
    areaName: '图谱建设',
    pageName: '教学资源与材料',
  },
  '/recognition': {
    areaName: '图谱建设',
    pageName: '智能识别与映射审核',
  },
  '/diagnostics': {
    areaName: '分析与评价',
    pageName: '图谱分析与一致性诊断',
  },
  '/evaluations': {
    areaName: '分析与评价',
    pageName: '达成度评价与统计',
  },
  '/improvements': {
    areaName: '改进与输出',
    pageName: '教学优化与持续改进',
  },
  '/support': {
    areaName: '改进与输出',
    pageName: '工程认证支撑',
  },
};

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const routeBreadcrumb =
    routeBreadcrumbs[location.pathname] ?? defaultRouteBreadcrumb;

  return (
    <Layout className="app-shell">
      <Sider className="app-sider" width={232}>
        <div className="app-brand">
          <SafetyCertificateOutlined aria-hidden />
          <div>
            <div className="app-brand-title">工程认证智能体</div>
            <div className="app-brand-subtitle">实验教学能力图谱</div>
          </div>
        </div>
        <Menu
          items={navigationItems}
          mode="inline"
          onClick={({ key }) => navigate(key)}
          selectedKeys={[location.pathname]}
          theme="dark"
        />
        <div className="app-sider-footer">
          <ExperimentOutlined aria-hidden />
          <div>
            <Typography.Text>计算机科学与技术</Typography.Text>
            <Typography.Text type="secondary">
              2025—2026 学年试点
            </Typography.Text>
          </div>
        </div>
      </Sider>

      <Layout>
        <Header className="app-header">
          <Breadcrumb
            items={[
              {
                title: '计算机科学与技术',
              },
              {
                title: routeBreadcrumb.areaName,
              },
              {
                title: routeBreadcrumb.pageName,
              },
            ]}
          />
          <Space size={16}>
            <Tag color="blue" icon={<SyncOutlined />}>
              图谱 v0.3 草稿
            </Tag>
            <Space size={8}>
              <Avatar icon={<UserOutlined />} size="small" />
              <div className="app-user">
                <Typography.Text strong>王老师</Typography.Text>
                <Typography.Text type="secondary">专业负责人</Typography.Text>
              </div>
            </Space>
          </Space>
        </Header>
        <Content className="app-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
