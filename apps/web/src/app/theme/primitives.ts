export const colorPrimitives = {
  transparent: 'transparent',
  white: '#ffffff',
  layoutBase: '#edf7ff',
  layoutAccent: '#f9fcff',
  siderStart: '#f8fcff',
  siderEnd: '#e6f3ff',
  blue50: '#edf6ff',
  blue100: '#dbeeff',
  blue200: '#8fc4ff',
  blue500: '#1f79f4',
  blue600: '#0f63d8',
  blue700: '#0a4ca8',
  green50: '#e8faf5',
  green100: '#d5f4eb',
  green200: '#8edbc7',
  green500: '#18b890',
  green700: '#08775f',
  amber50: '#fff8e8',
  amber100: '#fff0cf',
  amber200: '#f2c879',
  amber500: '#ed8b19',
  amber800: '#7d4807',
  amber700: '#a35d08',
  red50: '#fff0f2',
  red500: '#e44f68',
  indigo50: '#eef0ff',
  indigo500: '#5e6ee8',
  purple50: '#f5efff',
  purple500: '#8c62dc',
  slate25: '#f9fcff',
  slate50: '#f3f9ff',
  slate75: '#eaf4fc',
  slate100: '#dfeefa',
  slate150: '#d3e4f0',
  slate200: '#c1d7e8',
  slate250: '#9fbfd6',
  slate500: '#708da5',
  slate600: '#526f88',
  slate650: '#3e5d77',
  slate700: '#234666',
  slate900: '#09284f',
  shadowBase: '#315f86',
  floatingShadowBase: '#2878d5',
} as const;

export const dimensionPrimitives = {
  desktopMinWidth: 1180,
  desktopTargetWidth: 1920,
  sidebarWidth: 234,
  headerHeight: 52,
  workbenchMaxWidth: 1720,
  workbenchHeaderHeight: 50,
  summaryCardHeight: 82,
  controlHeight: 36,
} as const;

export const radiusPrimitives = {
  small: 6,
  medium: 8,
  large: 10,
  extraLarge: 16,
} as const;

export const typographyPrimitives = {
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
  bodySize: 14,
  compactSize: 12,
  pageTitleSize: 22,
  summaryValueSize: 23,
} as const;

function withAlpha(hex: string, alphaPercent: number) {
  const normalizedHex = hex.replace('#', '');
  const red = Number.parseInt(normalizedHex.slice(0, 2), 16);
  const green = Number.parseInt(normalizedHex.slice(2, 4), 16);
  const blue = Number.parseInt(normalizedHex.slice(4, 6), 16);

  return `rgb(${red} ${green} ${blue} / ${alphaPercent}%)`;
}

export const effectPrimitives = {
  layoutBackground: `radial-gradient(circle at 60% 10%, ${colorPrimitives.transparent} 0, ${
    colorPrimitives.transparent
  } 156px, ${withAlpha(colorPrimitives.white, 72)} 157px, ${
    colorPrimitives.transparent
  } 159px), linear-gradient(130deg, ${colorPrimitives.transparent} 0%, ${
    colorPrimitives.transparent
  } 53%, ${withAlpha(colorPrimitives.blue500, 3)} 53.1%, ${
    colorPrimitives.transparent
  } 53.25%), radial-gradient(circle at 78% -8%, ${withAlpha(
    colorPrimitives.blue200,
    34,
  )} 0, ${colorPrimitives.transparent} 34rem), radial-gradient(circle at 6% 86%, ${withAlpha(
    colorPrimitives.green200,
    18,
  )} 0, ${colorPrimitives.transparent} 30rem), linear-gradient(${withAlpha(
    colorPrimitives.blue500,
    3,
  )} 1px, ${colorPrimitives.transparent} 1px), linear-gradient(90deg, ${withAlpha(
    colorPrimitives.blue500,
    3,
  )} 1px, ${colorPrimitives.transparent} 1px), linear-gradient(135deg, ${
    colorPrimitives.layoutBase
  } 0%, ${colorPrimitives.layoutAccent} 100%)`,
  siderBackground: `linear-gradient(180deg, ${withAlpha(
    colorPrimitives.siderStart,
    88,
  )} 0%, ${withAlpha(colorPrimitives.siderEnd, 72)} 100%)`,
  surfaceGlass: withAlpha(colorPrimitives.white, 72),
  surfaceGlassStrong: withAlpha(colorPrimitives.white, 90),
  focusRing: withAlpha(colorPrimitives.blue500, 30),
  primaryShadow: `0 0 0 1px ${withAlpha(
    colorPrimitives.blue500,
    24,
  )}, 0 8px 22px ${withAlpha(
    colorPrimitives.blue500,
    18,
  )}, inset 0 1px 0 ${withAlpha(colorPrimitives.white, 72)}`,
  cardShadow: `0 0 0 1px ${withAlpha(
    colorPrimitives.blue200,
    28,
  )}, 0 8px 24px ${withAlpha(
    colorPrimitives.shadowBase,
    10,
  )}, inset 0 1px 0 ${withAlpha(colorPrimitives.white, 88)}`,
  floatingShadow: `0 18px 48px ${withAlpha(
    colorPrimitives.shadowBase,
    14,
  )}, 0 0 0 1px ${withAlpha(
    colorPrimitives.blue200,
    22,
  )}, inset 0 1px 0 ${withAlpha(colorPrimitives.white, 82)}`,
  workbenchShadow: `0 16px 42px ${withAlpha(
    colorPrimitives.shadowBase,
    11,
  )}, inset 0 1px 0 ${withAlpha(colorPrimitives.white, 86)}`,
} as const;
