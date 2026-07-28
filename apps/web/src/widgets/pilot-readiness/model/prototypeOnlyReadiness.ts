export const prototypeOnlyReadiness = [
  {
    key: 'identity',
    title: '身份与权限',
    description: 'OIDC 对接信息待确认',
    status: 'processing',
  },
  {
    key: 'materials',
    title: '脱敏样本材料',
    description: '首批样本范围已盘点',
    status: 'success',
  },
  {
    key: 'policy',
    title: '评价策略样例',
    description: '需要提供可人工复算样例',
    status: 'warning',
  },
  {
    key: 'deployment',
    title: '校内部署边界',
    description: '数据库与对象存储待确认',
    status: 'processing',
  },
] as const;
