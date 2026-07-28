import { describe, expect, it } from 'vitest';

import { prototypeOnlyWorkItems } from '../../../entities/work-item';
import { filterWorkItems } from './filterWorkItems';

describe('filterWorkItems', () => {
  it('按课程关键字和状态筛选试点事项', () => {
    const result = filterWorkItems(prototypeOnlyWorkItems, {
      keyword: '软件工程',
      status: 'pending',
      type: '候选审核',
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.key).toBe('candidate-review-1');
  });

  it('可按模块编号搜索待办', () => {
    const result = filterWorkItems(prototypeOnlyWorkItems, {
      keyword: 'M5',
      status: 'all',
      type: 'all',
    });

    expect(result.map((item) => item.key)).toEqual(['diagnostic-finding-1']);
  });

  it('空条件返回全部事项', () => {
    const result = filterWorkItems(prototypeOnlyWorkItems, {
      keyword: '',
      status: 'all',
      type: 'all',
    });

    expect(result).toEqual(prototypeOnlyWorkItems);
  });
});
