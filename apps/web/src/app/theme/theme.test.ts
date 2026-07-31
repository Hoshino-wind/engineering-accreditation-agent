import { describe, expect, it } from 'vitest';

import { antdTheme } from './antdTheme';
import {
  appCssVariables,
  applyAppThemeCssVariables,
} from './cssVariables';
import { appThemeTokens } from './semantic';

describe('应用主题', () => {
  it('Ant Design 与应用 CSS 变量共享同一组语义 Token', () => {
    expect(antdTheme.token?.colorPrimary).toBe(appThemeTokens.color.primary);
    expect(appCssVariables['--app-primary']).toBe(
      appThemeTokens.color.primary,
    );
    expect(appCssVariables['--app-workbench-max-width']).toBe(
      `${appThemeTokens.layout.workbenchMaxWidth}px`,
    );
    expect(antdTheme.components?.Table?.rowSelectedBg).toBe(
      appThemeTokens.color.selectionBackground,
    );
    expect(appCssVariables['--app-selection-hover-bg']).toBe(
      appThemeTokens.color.selectionHoverBackground,
    );
  });

  it('在应用挂载前写入根节点 CSS 变量', () => {
    const target = document.createElement('div');

    applyAppThemeCssVariables(target);

    expect(target.style.getPropertyValue('--app-bg')).toBe(
      appThemeTokens.color.layout,
    );
    expect(target.style.getPropertyValue('--app-header-height')).toBe(
      `${appThemeTokens.layout.headerHeight}px`,
    );
  });
});
