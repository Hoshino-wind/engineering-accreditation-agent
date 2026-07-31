import {
  ApartmentOutlined,
  BarChartOutlined,
  DashboardOutlined,
  FileDoneOutlined,
  FileSearchOutlined,
  FolderOpenOutlined,
  RobotOutlined,
  SettingOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import type { MenuProps } from 'antd';
import type { ReactNode } from 'react';

export type AppShellContentMode = 'default' | 'workbench';

export interface AppShellRouteDefinition {
  areaName: string;
  contentMode: AppShellContentMode;
  menuIcon: ReactNode;
  menuLabel: string;
  pageName: string;
  path: string;
}

interface AppShellNavigationGroup {
  key: string;
  label: string;
  routes: readonly AppShellRouteDefinition[];
}

const overviewRoute: AppShellRouteDefinition = {
  areaName: '实验教学能力图谱',
  contentMode: 'default',
  menuIcon: <DashboardOutlined />,
  menuLabel: '工作总览',
  pageName: '总览与任务',
  path: '/',
};

export const appShellNavigationGroups: readonly AppShellNavigationGroup[] = [
  {
    key: 'workspace',
    label: '我的工作',
    routes: [overviewRoute],
  },
  {
    key: 'graph-building',
    label: '构建能力图谱',
    routes: [
      {
        areaName: '构建能力图谱',
        contentMode: 'workbench',
        menuIcon: <FolderOpenOutlined />,
        menuLabel: '材料与资源',
        pageName: '教学资源与材料',
        path: '/resources',
      },
      {
        areaName: '构建能力图谱',
        contentMode: 'workbench',
        menuIcon: <RobotOutlined />,
        menuLabel: '识别审核',
        pageName: '智能识别与映射审核',
        path: '/recognition',
      },
      {
        areaName: '构建能力图谱',
        contentMode: 'workbench',
        menuIcon: <ApartmentOutlined />,
        menuLabel: '正式能力图谱',
        pageName: '实验教学能力图谱',
        path: '/graph',
      },
    ],
  },
  {
    key: 'analysis',
    label: '分析与评价',
    routes: [
      {
        areaName: '分析与评价',
        contentMode: 'workbench',
        menuIcon: <FileSearchOutlined />,
        menuLabel: '能力诊断',
        pageName: '图谱分析与一致性诊断',
        path: '/diagnostics',
      },
      {
        areaName: '分析与评价',
        contentMode: 'workbench',
        menuIcon: <BarChartOutlined />,
        menuLabel: '达成度评价',
        pageName: '达成度评价与统计',
        path: '/evaluations',
      },
    ],
  },
  {
    key: 'improvement',
    label: '改进闭环',
    routes: [
      {
        areaName: '改进闭环',
        contentMode: 'workbench',
        menuIcon: <ToolOutlined />,
        menuLabel: '教学改进',
        pageName: '教学优化与持续改进',
        path: '/improvements',
      },
      {
        areaName: '改进闭环',
        contentMode: 'workbench',
        menuIcon: <FileDoneOutlined />,
        menuLabel: '认证输出',
        pageName: '工程认证支撑',
        path: '/support',
      },
    ],
  },
  {
    key: 'governance',
    label: '系统',
    routes: [
      {
        areaName: '系统',
        contentMode: 'workbench',
        menuIcon: <SettingOutlined />,
        menuLabel: '系统治理',
        pageName: '身份、权限与审计',
        path: '/governance',
      },
    ],
  },
];

export const appShellRoutes: readonly AppShellRouteDefinition[] =
  appShellNavigationGroups.flatMap((group) => group.routes);

export const defaultAppShellRoute = overviewRoute;

export const appShellMenuItems: MenuProps['items'] =
  appShellNavigationGroups.map((group) => ({
    children: group.routes.map((route) => ({
      icon: route.menuIcon,
      key: route.path,
      label: route.menuLabel,
    })),
    key: group.key,
    label: group.label,
    type: 'group',
  }));
