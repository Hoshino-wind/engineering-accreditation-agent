import { describe, expect, it } from 'vitest';

import { filterWorkItems } from './filterWorkItems';
import { prototypeOnlyWorkItems } from './prototypeOnlyWorkItems';

describe('filterWorkItems', () => {
  it('按课程关键字和状态筛选试点事项', () => {
    const result = filterWorkItems(prototypeOnlyWorkItems, {
      keyword: '软件工程',
      status: 'processing',
      type: 'all',
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.key).toBe('mapping-review-1');
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
