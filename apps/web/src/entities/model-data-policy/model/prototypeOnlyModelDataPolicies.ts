import type { ModelDataPolicy } from './modelDataPolicy';

export const prototypeOnlyModelDataPolicies: ModelDataPolicy[] = [
  {
    key: 'public',
    name: '公开教学材料',
    description: '已公开的大纲、课程说明和无个人信息的制度文件。',
    route: 'approved-private-model',
    redactBeforeModel: false,
    citationRequired: true,
  },
  {
    key: 'internal',
    name: '校内教学材料',
    description: '实验指导书、评分规则和内部质量记录。',
    route: 'approved-private-model',
    redactBeforeModel: true,
    citationRequired: true,
  },
  {
    key: 'sensitive',
    name: '学生与敏感数据',
    description: '学生报告、成绩、个人标识和受限证据。',
    route: 'local-only',
    redactBeforeModel: true,
    citationRequired: true,
  },
];
