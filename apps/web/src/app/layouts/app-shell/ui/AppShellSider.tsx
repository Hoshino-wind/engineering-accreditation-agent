import {
  ExperimentOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { Layout, Menu, Typography } from 'antd';

import { appThemeTokens } from '../../../theme';
import { appShellMenuItems } from '../config/appShellRoutes';

const { Sider } = Layout;

interface AppShellSiderProps {
  onNavigate: (path: string) => void;
  selectedPath: string;
}

export function AppShellSider({
  onNavigate,
  selectedPath,
}: AppShellSiderProps) {
  return (
    <Sider className="app-sider" width={appThemeTokens.layout.sidebarWidth}>
      <div className="app-brand">
        <SafetyCertificateOutlined aria-hidden />
        <div>
          <div className="app-brand-title">工程认证智能体</div>
          <div className="app-brand-subtitle">实验教学能力图谱</div>
        </div>
      </div>
      <Menu
        items={appShellMenuItems}
        mode="inline"
        onClick={({ key }) => onNavigate(key)}
        selectedKeys={[selectedPath]}
        theme="light"
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
  );
}
