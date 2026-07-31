import type { ThemeConfig } from 'antd';

import { appThemeTokens } from './semantic';

const { color, effect, layout, radius, typography } = appThemeTokens;

export const antdTheme: ThemeConfig = {
  cssVar: {
    prefix: 'ea',
  },
  token: {
    colorPrimary: color.primary,
    colorSuccess: color.success,
    colorInfo: color.info,
    colorWarning: color.warning,
    colorError: color.error,
    colorBgLayout: color.layout,
    colorBgContainer: color.surface,
    colorBorder: color.border,
    colorBorderSecondary: color.borderSoft,
    colorText: color.text,
    colorTextSecondary: color.textSecondary,
    borderRadius: radius.large,
    borderRadiusLG: radius.extraLarge,
    controlHeight: layout.controlHeight,
    fontSize: typography.bodySize,
    fontFamily: typography.fontFamily,
  },
  components: {
    Button: {
      borderRadius: radius.medium,
      controlHeight: layout.controlHeight,
      fontWeight: 500,
      primaryShadow: effect.primaryShadow,
    },
    Card: {
      headerBg: color.transparent,
      headerFontSize: typography.bodySize,
    },
    Drawer: {
      colorBgElevated: color.surface,
    },
    Input: {
      activeBorderColor: color.primary,
      hoverBorderColor: color.primaryHover,
    },
    Layout: {
      bodyBg: color.layout,
      headerBg: color.surface,
      headerHeight: layout.headerHeight,
      siderBg: color.surfaceSider,
    },
    Menu: {
      groupTitleColor: color.textMuted,
      itemBg: color.transparent,
      itemColor: color.menuText,
      itemHoverBg: color.primarySurface,
      itemHoverColor: color.primaryTextHover,
      itemSelectedBg: color.primarySoft,
      itemSelectedColor: color.primaryText,
      itemBorderRadius: radius.medium,
    },
    Progress: {
      defaultColor: color.primary,
      remainingColor: color.borderSoft,
    },
    Table: {
      headerBg: color.surfaceSoft,
      headerColor: color.tableHeaderText,
      headerSplitColor: color.borderSoft,
      rowHoverBg: color.primarySurfaceHover,
      rowSelectedBg: color.selectionBackground,
      rowSelectedHoverBg: color.selectionHoverBackground,
      borderColor: color.borderTable,
      cellFontSize: 13,
      cellPaddingBlockSM: 8,
    },
    Tag: {
      defaultBg: color.surfaceSoft,
      defaultColor: color.textSecondary,
    },
    Tabs: {
      itemSelectedColor: color.primaryText,
      inkBarColor: color.primary,
    },
  },
};
