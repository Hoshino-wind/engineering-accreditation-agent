import type { WorkItem } from './workItem';

export const prototypeOnlyWorkItems: WorkItem[] = [
  {
    key: 'evidence-gap-1',
    title: '实验报告缺少评分项来源定位',
    course: '数据结构',
    type: '证据缺口',
    status: 'pending',
    owner: '张老师',
    updatedAt: '2026-07-28 10:32',
  },
  {
    key: 'mapping-review-1',
    title: '确认实验项目与课程目标 CT-3 的支撑关系',
    course: '软件工程',
    type: '关系审核',
    status: 'processing',
    owner: '李老师',
    updatedAt: '2026-07-28 09:15',
  },
  {
    key: 'policy-ready-1',
    title: '补充课程目标达成度缺失数据策略',
    course: '计算机网络',
    type: '评价准备',
    status: 'blocked',
    owner: '王老师',
    updatedAt: '2026-07-27 16:48',
  },
  {
    key: 'mapping-review-2',
    title: '复核评分项对能力要素的候选关系',
    course: '操作系统',
    type: '关系审核',
    status: 'pending',
    owner: '赵老师',
    updatedAt: '2026-07-27 14:20',
  },
];
