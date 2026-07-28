import type { ThemeConfig } from 'antd';

export const antdTheme: ThemeConfig = {
  token: {
    colorPrimary: '#1677ff',
    borderRadius: 6,
    colorBgLayout: '#f3f5f8',
    colorText: 'rgba(0, 0, 0, 0.88)',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
  },
  components: {
    Layout: {
      bodyBg: '#f3f5f8',
      headerBg: '#ffffff',
      siderBg: '#102a43',
    },
    Menu: {
      darkItemBg: '#102a43',
      darkSubMenuItemBg: '#102a43',
      darkItemSelectedBg: '#1677ff',
    },
    Table: {
      headerBg: '#fafafa',
      headerColor: 'rgba(0, 0, 0, 0.88)',
      rowHoverBg: '#f5faff',
    },
  },
};
