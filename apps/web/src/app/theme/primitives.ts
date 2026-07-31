export const colorPrimitives = {
  transparent: 'transparent',
  white: '#ffffff',
  layoutBase: '#f3f9ff',
  layoutAccent: '#ecfaf4',
  siderStart: '#f6fbff',
  siderEnd: '#eefaf5',
  blue50: '#eaf5ff',
  blue100: '#dcecff',
  blue200: '#83b5ef',
  blue500: '#2f73da',
  blue600: '#1d5fbf',
  blue700: '#1e5fae',
  green50: '#effaf5',
  green100: '#ddf6ea',
  green200: '#bde8d4',
  green500: '#2e9b76',
  green700: '#237b60',
  amber50: '#fffbed',
  amber100: '#fff7e6',
  amber200: '#efd79a',
  amber500: '#d58a18',
  amber800: '#6f5520',
  amber700: '#756643',
  red50: '#fff1f0',
  red500: '#d84f57',
  indigo50: '#f0f5ff',
  indigo500: '#2f54eb',
  purple50: '#f9f0ff',
  purple500: '#722ed1',
  slate25: '#f7fbfe',
  slate50: '#f5faff',
  slate75: '#eef7ff',
  slate100: '#e8f0f5',
  slate150: '#e5eef4',
  slate200: '#dce8f0',
  slate250: '#cfe0eb',
  slate500: '#7c92a6',
  slate600: '#60758a',
  slate650: '#49647d',
  slate700: '#35516b',
  slate900: '#17324d',
  shadowBase: '#305c80',
  floatingShadowBase: '#44708e',
} as const;

export const dimensionPrimitives = {
  desktopMinWidth: 1180,
  desktopTargetWidth: 1920,
  sidebarWidth: 216,
  headerHeight: 58,
  workbenchMaxWidth: 1720,
  workbenchHeaderHeight: 50,
  summaryCardHeight: 82,
  controlHeight: 36,
} as const;

export const radiusPrimitives = {
  small: 6,
  medium: 8,
  large: 10,
  extraLarge: 12,
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
  layoutBackground: `radial-gradient(circle at 92% 4%, ${withAlpha(
    colorPrimitives.green100,
    72,
  )}, ${colorPrimitives.transparent} 28rem), linear-gradient(135deg, ${
    colorPrimitives.layoutBase
  } 0%, ${colorPrimitives.layoutAccent} 100%)`,
  siderBackground: `linear-gradient(180deg, ${colorPrimitives.siderStart} 0%, ${colorPrimitives.siderEnd} 100%)`,
  surfaceGlass: withAlpha(colorPrimitives.white, 72),
  surfaceGlassStrong: withAlpha(colorPrimitives.white, 88),
  focusRing: withAlpha(colorPrimitives.blue500, 28),
  primaryShadow: `0 6px 16px ${withAlpha(colorPrimitives.blue500, 18)}`,
  cardShadow: `0 4px 16px ${withAlpha(colorPrimitives.shadowBase, 4)}`,
  floatingShadow: `0 8px 24px ${withAlpha(
    colorPrimitives.floatingShadowBase,
    8,
  )}`,
  workbenchShadow: `0 10px 28px ${withAlpha(
    colorPrimitives.shadowBase,
    8,
  )}`,
} as const;
