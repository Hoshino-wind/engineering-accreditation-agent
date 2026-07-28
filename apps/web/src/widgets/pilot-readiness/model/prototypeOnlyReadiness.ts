export const prototypeOnlyReadiness = [
  {
    key: 'graph-schema',
    module: 'M2',
    title: '图谱 Schema',
    description: '首版节点与关系约束已确认',
    status: 'success',
  },
  {
    key: 'materials',
    module: 'M3',
    title: '材料基线',
    description: '92 / 104 份材料可用于识别',
    status: 'processing',
  },
  {
    key: 'candidate-review',
    module: 'M4',
    title: '候选审核',
    description: '仍有 27 条候选等待人工决定',
    status: 'warning',
  },
  {
    key: 'evaluation-input',
    module: 'M6',
    title: '评价输入',
    description: '2 门课程缺失数据策略未确认',
    status: 'error',
  },
] as const;
