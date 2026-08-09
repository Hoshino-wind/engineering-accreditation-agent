import type { ThemeConfig } from 'antd';

export const antdTheme: ThemeConfig = {
  token: {
    colorPrimary: '#3b5bdb',
    colorInfo: '#3b5bdb',
    colorSuccess: '#0c9966',
    colorWarning: '#d97706',
    colorError: '#dc2626',
    colorLink: '#3b5bdb',

    borderRadius: 8,
    borderRadiusLG: 10,
    borderRadiusSM: 6,

    colorBgLayout: '#f6f7fb',
    colorBgContainer: '#ffffff',
    colorBgElevated: '#ffffff',
    colorText: '#11182e',
    colorTextSecondary: '#4a5266',
    colorTextTertiary: '#7a8194',
    colorTextDescription: '#4a5266',
    colorBorder: '#e4e6ee',
    colorBorderSecondary: '#eef0f5',

    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
    fontSize: 14,

    boxShadow: '0 1px 3px 0 rgba(17, 24, 46, 0.04), 0 1px 2px 0 rgba(17, 24, 46, 0.03)',
    boxShadowSecondary: '0 8px 24px -4px rgba(17, 24, 46, 0.12), 0 4px 8px -2px rgba(17, 24, 46, 0.06)',
    boxShadowTertiary: '0 1px 3px 0 rgba(17, 24, 46, 0.04), 0 1px 2px 0 rgba(17, 24, 46, 0.03)',

    wireframe: false,
  },
  components: {
    Layout: {
      bodyBg: '#f6f7fb',
      headerBg: '#ffffff',
      siderBg: '#0b1222',
      headerHeight: 60,
      headerPadding: '0 24px',
    },
    Menu: {
      darkItemBg: 'transparent',
      darkSubMenuItemBg: 'transparent',
      darkItemSelectedBg: 'rgba(59, 91, 219, 0.92)',
      darkItemHoverBg: 'rgba(255, 255, 255, 0.05)',
      darkItemColor: 'rgba(255, 255, 255, 0.66)',
      darkItemSelectedColor: '#ffffff',
      itemBorderRadius: 6,
      itemMarginInline: 8,
    },
    Card: {
      borderRadiusLG: 10,
      boxShadowTertiary: '0 1px 3px 0 rgba(17, 24, 46, 0.04), 0 1px 2px 0 rgba(17, 24, 46, 0.03)',
      paddingLG: 16,
    },
    Table: {
      headerBg: '#fafbfd',
      headerColor: '#4a5266',
      rowHoverBg: '#f5f7ff',
      borderColor: '#eef0f5',
      cellPaddingBlock: 12,
      cellPaddingInline: 16,
      headerSplitColor: 'transparent',
    },
    Statistic: {
      contentFontSize: 28,
      titleFontSize: 13,
    },
    Tag: {
      borderRadiusSM: 4,
      defaultBg: '#f1f2f7',
      defaultColor: '#4a5266',
    },
    Button: {
      borderRadius: 6,
      fontWeight: 500,
      primaryShadow: 'none',
      defaultShadow: 'none',
      dangerShadow: 'none',
    },
    Collapse: {
      headerBg: 'transparent',
      contentBg: '#ffffff',
      contentPadding: '0 16px',
    },
    Progress: {
      defaultColor: '#3b5bdb',
    },
    Segmented: {
      itemSelectedBg: '#ffffff',
      itemSelectedColor: '#11182e',
      trackBg: '#f1f2f7',
      borderRadius: 6,
      itemHoverBg: 'rgba(255, 255, 255, 0.5)',
    },
    Steps: {
      titleLineHeight: 22,
    },
    Input: {
      borderRadius: 6,
      activeShadow: '0 0 0 2px rgba(59, 91, 219, 0.12)',
    },
    Select: {
      borderRadius: 6,
    },
    Breadcrumb: {
      itemColor: '#7a8194',
      lastItemColor: '#11182e',
      linkColor: '#4a5266',
      linkHoverColor: '#3b5bdb',
      separatorColor: '#b4b8c4',
    },
    Alert: {
      borderRadiusLG: 10,
    },
    Tooltip: {
      borderRadius: 6,
    },
    Modal: {
      borderRadiusLG: 12,
    },
  },
};
