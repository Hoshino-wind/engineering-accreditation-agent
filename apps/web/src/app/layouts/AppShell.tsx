import {
  ApartmentOutlined,
  BarChartOutlined,
  BookOutlined,
  DashboardOutlined,
  DeploymentUnitOutlined,
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
import { useCourseState } from '../../shared/course/useCourseState';
import { useMajorState } from '../../shared/major/useMajorState';

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
import { PipelineProgress } from '../../widgets/pipeline-progress/ui/PipelineProgress';
import { fetchGraph } from '../../shared/api/graphClient';
import { CourseSwitcher } from '../../features/course-switcher/ui/CourseSwitcher';
import { MajorSwitcher } from '../../features/major-switcher/ui/MajorSwitcher';

interface GraphStats {
  nodeCount: number;
  edgeCount: number;
  pendingCount: number;
}

const { Header, Content, Sider } = Layout;

const navigationItems: MenuProps['items'] = [
  {
    key: 'overview',
    label: '总览',
    type: 'group',
    children: [
      {
        key: '/',
        icon: <DashboardOutlined />,
        label: '工作台',
      },
    ],
  },
  {
    key: 'flow',
    label: '分析动线 · 按步骤操作',
    type: 'group',
    children: [
      {
        key: '/resources',
        icon: <FolderOpenOutlined />,
        label: '① 上传教学材料',
      },
      {
        key: '/graph',
        icon: <ApartmentOutlined />,
        label: '② 能力图谱与关系审核',
      },
      {
        key: '/diagnostics',
        icon: <FileSearchOutlined />,
        label: '③ 图谱诊断',
      },
      {
        key: '/evaluations',
        icon: <BarChartOutlined />,
        label: '④ 达成度评价',
      },
      {
        key: '/improvements',
        icon: <ToolOutlined />,
        label: '⑤ 教学改进',
      },
      {
        key: '/support',
        icon: <FileDoneOutlined />,
        label: '⑥ 认证支撑',
      },
    ],
  },
  {
    key: 'advanced',
    label: '高级',
    type: 'group',
    children: [
      {
        key: '/agent',
        icon: <DeploymentUnitOutlined />,
        label: 'AI 运行观测台',
      },
      {
        key: '/recognition',
        icon: <RobotOutlined />,
        label: '批量审核 / 冲突处理',
      },
      {
        key: '/settings',
        icon: <SettingOutlined />,
        label: '模型设置',
      },
    ],
  },
];

interface RouteBreadcrumb {
  areaName: string;
  pageName: string;
}

const defaultRouteBreadcrumb: RouteBreadcrumb = {
  areaName: '总览',
  pageName: '工作台',
};

const routeBreadcrumbs: Record<string, RouteBreadcrumb> = {
  '/': defaultRouteBreadcrumb,
  '/agent': {
    areaName: '高级',
    pageName: 'AI 运行观测台',
  },
  '/resources': {
    areaName: '分析动线 · 第 1 步',
    pageName: '上传教学材料',
  },
  '/graph': {
    areaName: '分析动线 · 第 2 步',
    pageName: '能力图谱与关系审核',
  },
  '/recognition': {
    areaName: '高级',
    pageName: '批量审核 / 冲突处理',
  },
  '/settings': {
    areaName: '高级',
    pageName: '模型设置',
  },
  '/diagnostics': {
    areaName: '分析动线 · 第 3 步',
    pageName: '图谱诊断',
  },
  '/evaluations': {
    areaName: '分析动线 · 第 4 步',
    pageName: '达成度评价',
  },
  '/improvements': {
    areaName: '分析动线 · 第 5 步',
    pageName: '教学改进',
  },
  '/support': {
    areaName: '分析动线 · 第 6 步',
    pageName: '认证支撑',
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
    key: 'switch-major',
    icon: <BookOutlined />,
    label: '切换专业',
    onClick: () => {
      window.location.replace('/select-major');
    },
  },
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
    icon: <SafetyCertificateOutlined />,
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
  const courseState = useCourseState();
  const { majorName } = useMajorState();

  const [me, setMe] = useState<CachedUser | null>(getCachedMe());
  const [loadingMe, setLoadingMe] = useState<boolean>(false);
  // 切换专业后递增 refreshKey，强制路由内容重新挂载，以新的 X-Major-Id 拉取数据
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    let cancelled = false;
    if (!me) setLoadingMe(true);

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
  }, []);

  // 监听专业切换：递增 refreshKey，让路由容器以新 key 重新挂载，
  // 子页面会重新执行数据加载（此时 apiFetch 已带上新的 X-Major-Id）
  useEffect(() => {
    const handler = () => setRefreshKey((k) => k + 1);
    window.addEventListener('major-changed', handler);
    return () => window.removeEventListener('major-changed', handler);
  }, []);

  const displayUser = me;
  const displayName = displayUser?.displayName || displayUser?.username || '';
  const roleLabel = displayUser ? roleToDisplayName(displayUser.role) : '';

  const [graphStats, setGraphStats] = useState<GraphStats | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const graph = await fetchGraph();
      if (cancelled) return;
      if (!graph) {
        setGraphStats(null);
        return;
      }
      const pendingCount = graph.edges.filter(
        (e) => e.reviewStatus === 'pending',
      ).length;
      setGraphStats({
        nodeCount: graph.nodes.length,
        edgeCount: graph.edges.length,
        pendingCount,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
        {/* 专业切换器置于侧边栏最顶部：认证主体，地位高于课程切换器 */}
        <MajorSwitcher />
        <CourseSwitcher />
        <Menu
          items={navigationItems}
          mode="inline"
          onClick={({ key }) => navigate(key)}
          selectedKeys={[location.pathname]}
          theme="dark"
        />
      </Sider>

      <Layout>
        <Header className="app-header">
          <Breadcrumb
            items={[
              {
                title: majorName,
              },
              ...(courseState.selectedCourseName
                ? [
                    {
                      title: courseState.selectedCourseName,
                    },
                  ]
                : []),
              {
                title: routeBreadcrumb.areaName,
              },
              {
                title: routeBreadcrumb.pageName,
              },
            ]}
          />
          <div className="app-header-pipeline">
            <PipelineProgress />
          </div>
          <Space size={16} align="center">
            <span
              className={`app-status-pill${graphStats ? '' : ' app-status-pill--off'}`}
            >
              <span
                className={`app-status-dot${graphStats ? '' : ' app-status-dot--off'}`}
              />
              {graphStats
                ? `图谱 ${graphStats.nodeCount} 节点 · ${graphStats.edgeCount} 关系${
                    graphStats.pendingCount > 0
                      ? ` · ${graphStats.pendingCount} 待审`
                      : ''
                  }`
                : '后端未连接'}
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
          {/* key 随 refreshKey 变化，切换专业后强制子页面重新挂载并重新拉取数据 */}
          {props.children ?? <Outlet key={refreshKey} />}
        </Content>
      </Layout>
    </Layout>
  );
}
