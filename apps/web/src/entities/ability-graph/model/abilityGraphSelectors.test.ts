import { describe, expect, it } from 'vitest';

import { prototypeOnlyAbilityGraph } from './prototypeOnlyAbilityGraph';
import {
  getAbilityGraphCourseForCourseOutcome,
  getAbilityGraphNodeById,
  getNextAbilityGraphObjectVersion,
} from './abilityGraphSelectors';

describe('ability graph selectors', () => {
  it('按稳定 ID 读取图谱节点', () => {
    expect(
      getAbilityGraphNodeById(
        prototypeOnlyAbilityGraph,
        'course-outcome-ds-3',
      )?.code,
    ).toBe('CO-DS-3');
    expect(
      getAbilityGraphNodeById(
        prototypeOnlyAbilityGraph,
        'missing-node',
      ),
    ).toBeUndefined();
  });

  it('通过 defines 关系读取课程目标所属课程', () => {
    expect(
      getAbilityGraphCourseForCourseOutcome(
        prototypeOnlyAbilityGraph,
        'course-outcome-ds-3',
      )?.id,
    ).toBe('course-data-structures');
  });

  it.each([
    ['v1', 'v1.1'],
    ['v1.2', 'v1.3'],
    ['legacy', 'legacy-修订'],
  ])('生成对象修订版本：%s → %s', (current, expected) => {
    expect(getNextAbilityGraphObjectVersion(current)).toBe(expected);
  });
});
