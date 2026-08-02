import { appThemeTokens } from './semantic';

type AppCssVariableName = `--app-${string}`;

const { color, effect, layout, radius, typography } = appThemeTokens;

export const appCssVariables = {
  '--app-desktop-min-width': `${layout.desktopMinWidth}px`,
  '--app-desktop-target-width': `${layout.desktopTargetWidth}px`,
  '--app-sidebar-width': `${layout.sidebarWidth}px`,
  '--app-header-height': `${layout.headerHeight}px`,
  '--app-workbench-max-width': `${layout.workbenchMaxWidth}px`,
  '--app-workbench-header-height': `${layout.workbenchHeaderHeight}px`,
  '--app-summary-card-height': `${layout.summaryCardHeight}px`,
  '--app-font-family': typography.fontFamily,
  '--app-page-title-size': `${typography.pageTitleSize}px`,
  '--app-summary-value-size': `${typography.summaryValueSize}px`,
  '--app-radius-small': `${radius.small}px`,
  '--app-radius-medium': `${radius.medium}px`,
  '--app-radius-large': `${radius.large}px`,
  '--app-radius-extra-large': `${radius.extraLarge}px`,
  '--app-bg': color.layout,
  '--app-surface': color.surface,
  '--app-surface-soft': color.surfaceSoft,
  '--app-border': color.border,
  '--app-border-soft': color.borderSoft,
  '--app-border-strong': color.borderStrong,
  '--app-text': color.text,
  '--app-text-secondary': color.textSecondary,
  '--app-text-muted': color.textMuted,
  '--app-text-inverse': color.textInverse,
  '--app-primary': color.primary,
  '--app-primary-hover': color.primaryHover,
  '--app-primary-text': color.primaryText,
  '--app-primary-text-hover': color.primaryTextHover,
  '--app-primary-border': color.primaryBorder,
  '--app-primary-soft': color.primarySoft,
  '--app-primary-surface': color.primarySurface,
  '--app-primary-surface-hover': color.primarySurfaceHover,
  '--app-selection-bg': color.selectionBackground,
  '--app-selection-hover-bg': color.selectionHoverBackground,
  '--app-success': color.success,
  '--app-success-text': color.successText,
  '--app-success-soft': color.successSoft,
  '--app-success-border': color.successBorder,
  '--app-warning': color.warning,
  '--app-warning-soft': color.warningSoft,
  '--app-warning-icon-soft': color.warningIconSoft,
  '--app-warning-border': color.warningBorder,
  '--app-warning-text': color.warningText,
  '--app-warning-text-secondary': color.warningTextSecondary,
  '--app-error': color.error,
  '--app-error-soft': color.errorSoft,
  '--app-accent-indigo': color.accentIndigo,
  '--app-accent-indigo-soft': color.accentIndigoSoft,
  '--app-accent-purple': color.accentPurple,
  '--app-accent-purple-soft': color.accentPurpleSoft,
  '--app-layout-background': effect.layoutBackground,
  '--app-sider-background': effect.siderBackground,
  '--app-surface-glass': effect.surfaceGlass,
  '--app-surface-glass-strong': effect.surfaceGlassStrong,
  '--app-focus-ring': effect.focusRing,
  '--app-primary-shadow': effect.primaryShadow,
  '--app-card-shadow': effect.cardShadow,
  '--app-floating-shadow': effect.floatingShadow,
  '--app-shadow': effect.workbenchShadow,
} satisfies Record<AppCssVariableName, string>;

export function applyAppThemeCssVariables(target: HTMLElement) {
  Object.entries(appCssVariables).forEach(([name, value]) => {
    target.style.setProperty(name, value);
  });
}
