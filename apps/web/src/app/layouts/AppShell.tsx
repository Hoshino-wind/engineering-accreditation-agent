import {
  ApartmentOutlined,
  BarChartOutlined,
  BookOutlined,
  DashboardOutlined,
  DeploymentUnitOutlined,
  ExperimentOutlined,
  FileDoneOutlined,
  FileSearchOutlined,
  FolderOpenOutlined,
  LogoutOutlined,
  RobotOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  ToolOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  Avatar,
  Breadcrumb,
  Dropdown,
  Layout,
  Menu,
  Space,
  Spin,
  Typography,
} from 'antd';
import type { MenuProps } from 'antd';
import { useEffect, useState, type ReactNode } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router';

import {
  clearAuth,
  getCachedMe,
  getToken,
  setCachedMe,
  type CachedUser,
} from '../../shared/auth/authStore';
import { browserEnv } from '../../shared/config/env';

interface MeSnakeCaseResponse {
  id: string;
  username: string;
  display_name: string;
  role: string;
  avatar_url?: string | null;
  created_at?: string;
}

function toCachedUser(me: MeSnakeCaseResponse): CachedUser {
  return {
    id: me.id,
    username: me.username,
    displayName: me.display_name,
    role: me.role,
    avatarUrl: me.avatar_url ?? undefined,
  };
}

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
      {
        key: '/agent',
        icon: <DeploymentUnitOutlined />,
        label: '智能体协作',
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
  '/agent': {
    areaName: '工作台',
    pageName: '智能体协作控制台',
  },
  '/graph': {
    areaName: '图谱建设',
    pageName: '实验教学能力图谱',
  },
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
  '/governance': {
    areaName: '系统',
    pageName: '系统治理',
  },
};

function roleToDisplayName(role: string): string {
  switch (role) {
    case 'admin':
      return '管理员';
    case 'teacher':
      return '课任老师';
    default:
      return role || '成员';
  }
}

const userDropdownItems: MenuProps['items'] = [
  {
    key: 'switch-account',
    icon: <LogoutOutlined />,
    label: '切换账号',
    onClick: () => {
      clearAuth();
      window.location.replace('/login');
    },
  },
  { type: 'divider' },
  {
    key: 'help',
    icon: <BookOutlined />,
    label: '帮助 / 文档',
    disabled: true,
  },
];

interface AppShellProps {
  children?: ReactNode;
}

export function AppShell(props: AppShellProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const routeBreadcrumb =
    routeBreadcrumbs[location.pathname] ?? defaultRouteBreadcrumb;

  const [me, setMe] = useState<CachedUser | null>(getCachedMe());
  const [loadingMe, setLoadingMe] = useState<boolean>(false);

  useEffect(() => {
    if (me) return;
    const token = getToken();
    if (!token) return;

    let cancelled = false;
    setLoadingMe(true);

    fetch(`${browserEnv.VITE_API_BASE_URL}/api/v1/auth/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (res) => {
        if (cancelled) return;
        if (!res.ok) {
          if (res.status === 401) {
            clearAuth();
            const next = encodeURIComponent(
              window.location.pathname + window.location.search,
            );
            window.location.replace(`/login?next=${next}`);
          }
          return;
        }
        const data = (await res.json()) as MeSnakeCaseResponse;
        const cached = toCachedUser(data);
        setCachedMe(cached);
        setMe(cached);
      })
      .catch(() => {
        if (cancelled) return;
      })
      .finally(() => {
        if (!cancelled) setLoadingMe(false);
      });

    return () => {
      cancelled = true;
    };
  }, [me]);

  const displayUser = me;
  const displayName = displayUser?.displayName || displayUser?.username || '';
  const roleLabel = displayUser ? roleToDisplayName(displayUser.role) : '';

  return (
    <Layout className="app-shell">
      <Sider className="app-sider" width={252}>
        <div className="app-brand">
          <div className="app-brand-mark">
            <SafetyCertificateOutlined aria-hidden />
          </div>
          <div className="app-brand-texts">
            <div className="app-brand-title">工程认证智能体</div>
            <div className="app-brand-subtitle">Accreditation Graph</div>
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
            <Typography.Text>电子信息工程（嵌入式）</Typography.Text>
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
                title: '电子信息工程（嵌入式）',
              },
              {
                title: routeBreadcrumb.areaName,
              },
              {
                title: routeBreadcrumb.pageName,
              },
            ]}
          />
          <Space size={16} align="center">
            <span className="app-status-pill">
              <span className="app-status-dot" />
              图谱 v0.3 草稿
            </span>
            <Dropdown
              menu={{ items: userDropdownItems }}
              placement="bottomRight"
              trigger={['click']}
              arrow
            >
              <Space
                size={10}
                align="center"
                className="app-user-trigger"
                style={{
                  cursor: 'pointer',
                  padding: '4px 8px 4px 4px',
                  borderRadius: 10,
                  transition: 'background-color 160ms ease',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor =
                    'rgba(59, 91, 219, 0.05)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor =
                    'transparent';
                }}
              >
                {loadingMe && !displayUser ? (
                  <Spin size="small" style={{ marginRight: 4 }} />
                ) : (
                  <Avatar
                    src={displayUser?.avatarUrl}
                    icon={<UserOutlined />}
                    size={32}
                    style={{
                      background:
                        'linear-gradient(135deg, #4c6fff 0%, #3b5bdb 55%, #2b4ee6 100%)',
                      boxShadow:
                        '0 3px 10px -2px rgba(59, 91, 219, 0.32), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
                      color: '#ffffff',
                    }}
                  />
                )}
                <div className="app-user">
                  <Typography.Text strong>
                    {loadingMe && !displayUser ? '加载中…' : displayName || '用户'}
                  </Typography.Text>
                  <Typography.Text type="secondary">
                    {loadingMe && !displayUser ? '认证身份' : roleLabel || '成员'}
                  </Typography.Text>
                </div>
              </Space>
            </Dropdown>
          </Space>
        </Header>
        <Content className="app-content">
          {props.children ?? <Outlet />}
        </Content>
      </Layout>
    </Layout>
  );
}
