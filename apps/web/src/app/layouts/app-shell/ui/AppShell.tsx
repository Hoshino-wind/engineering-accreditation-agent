import { Layout } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router';

import {
  getAppShellContentClassName,
  resolveAppShellRoute,
} from '../model/resolveAppShellRoute';
import { AppShellHeader } from './AppShellHeader';
import { AppShellSider } from './AppShellSider';

import '../../appShell.css';

const { Content } = Layout;

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const route = resolveAppShellRoute(location.pathname);
  const navigateTo = (path: string) => {
    void navigate(path);
  };

  return (
    <Layout className="app-shell" hasSider>
      <AppShellSider
        onNavigate={navigateTo}
        selectedPath={location.pathname}
      />
      <Layout>
        <AppShellHeader onNavigate={navigateTo} route={route} />
        <Content
          className={getAppShellContentClassName(location.pathname)}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
