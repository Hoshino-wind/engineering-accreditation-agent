import { describe, expect, it } from 'vitest';

import type { WorkItem } from '../../../entities/work-item';
import { filterWorkItems } from './filterWorkItems';

const workItems: WorkItem[] = [
  {
    key: 'material-location-1',
    module: 'M3',
    priority: 'high',
    title: '单片机基础课程大纲待分类',
    course: '单片机基础',
    type: '材料处理',
    status: 'blocked',
    owner: '王老师',
    action: '重新分类材料',
    dueAt: '2026-03-15',
  },
  {
    key: 'candidate-review-1',
    module: 'M4',
    priority: 'high',
    title: '待审核关系候选',
    course: '单片机基础',
    type: '候选审核',
    status: 'pending',
    owner: '李老师',
    action: '审核关系候选',
    dueAt: '2026-03-20',
  },
  {
    key: 'diagnostic-finding-1',
    module: 'M5',
    priority: 'medium',
    title: '覆盖率缺口诊断',
    course: '数据结构与算法',
    type: '图谱诊断',
    status: 'pending',
    owner: '张老师',
    action: '处理诊断发现',
    dueAt: '2026-03-25',
  },
  {
    key: 'evaluation-policy-1',
    module: 'M6',
    priority: 'medium',
    title: '评价策略待确认',
    course: '嵌入式系统原理',
    type: '评价准备',
    status: 'blocked',
    owner: '赵老师',
    action: '确认评价策略',
    dueAt: '2026-03-28',
  },
  {
    key: 'improvement-change-1',
    module: 'M7',
    priority: 'medium',
    title: '改进措施复评',
    course: 'FPGA设计',
    type: '改进复评',
    status: 'processing',
    owner: '钱老师',
    action: '完成复评',
    dueAt: '2026-04-01',
  },
];

describe('filterWorkItems', () => {
  it('按课程关键字和状态筛选试点事项', () => {
    const result = filterWorkItems(workItems, {
      keyword: '单片机基础',
      status: 'pending',
      type: '候选审核',
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.key).toBe('candidate-review-1');
  });

  it('可按模块编号搜索待办', () => {
    const result = filterWorkItems(workItems, {
      keyword: 'M5',
      status: 'all',
      type: 'all',
    });

    expect(result.map((item) => item.key)).toEqual(['diagnostic-finding-1']);
  });

  it('空条件返回全部事项', () => {
    const result = filterWorkItems(workItems, {
      keyword: '',
      status: 'all',
      type: 'all',
    });

    expect(result).toEqual(workItems);
  });
});
