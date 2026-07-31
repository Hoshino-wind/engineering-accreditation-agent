export const prototypeOnlyOverviewMetrics = [
  {
    key: 'cultivationGaps',
    title: '缺少实验培养的能力',
    value: 3,
    suffix: '项',
    detail: '优先补齐实验与能力关系',
    tone: 'danger',
  },
  {
    key: 'assessmentGaps',
    title: '缺少直接评价的能力',
    value: 2,
    suffix: '项',
    detail: '评分项尚未关联能力或技能',
    tone: 'danger',
  },
  {
    key: 'blockedCourses',
    title: '暂不能评价的课程',
    value: 2,
    suffix: '门',
    detail: '图谱路径或评分输入仍不完整',
    tone: 'warning',
  },
  {
    key: 'reevaluations',
    title: '等待复评的改进',
    value: 2,
    suffix: '项',
    detail: '措施已完成，等待后续周期验证',
    tone: 'default',
  },
] as const;
