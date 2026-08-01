import { describe, expect, it } from 'vitest';

import { prototypeOnlyTeachingResources } from '../../../entities/teaching-resource';
import { filterTeachingResources } from './filterTeachingResources';

describe('filterTeachingResources', () => {
  it('filters by course, resource type and processing status', () => {
    const resources = filterTeachingResources(
      prototypeOnlyTeachingResources,
      {
        course: '单片机基础',
        keyword: '',
        resourceType: '评分表',
        status: 'failed',
      },
    );

    expect(resources.map((resource) => resource.id)).toEqual([
      'resource-mcu-rubric',
    ]);
  });

  it('matches names, file names, courses and owners with a trimmed keyword', () => {
    const resources = filterTeachingResources(
      prototypeOnlyTeachingResources,
      {
        course: 'all',
        keyword: '  赵老师 ',
        resourceType: 'all',
        status: 'all',
      },
    );

    expect(resources.map((resource) => resource.id)).toEqual([
      'resource-embedded-guide',
    ]);
  });
});
