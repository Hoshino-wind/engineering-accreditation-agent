export const prototypeOnlyOverviewMetrics = [
  {
    key: 'graphNodes',
    title: '正式图谱节点',
    value: 326,
    suffix: '个',
    detail: '覆盖 4 门课程、12 个实验',
    tone: 'default',
  },
  {
    key: 'graphEdges',
    title: '正式图谱关系',
    value: 418,
    suffix: '条',
    detail: '86% 已完成来源与审核',
    tone: 'default',
  },
  {
    key: 'candidates',
    title: '待审核候选',
    value: 27,
    suffix: '条',
    detail: '7 条为高影响关系',
    tone: 'warning',
  },
  {
    key: 'findings',
    title: '开放诊断问题',
    value: 8,
    suffix: '个',
    detail: '3 个阻断正式评价',
    tone: 'danger',
  },
] as const;
