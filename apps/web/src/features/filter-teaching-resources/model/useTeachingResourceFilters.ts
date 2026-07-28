import { useMemo, useState } from 'react';

import type {
  TeachingResource,
  TeachingResourceStatus,
  TeachingResourceType,
} from '../../../entities/teaching-resource';
import { filterTeachingResources } from './filterTeachingResources';

export function useTeachingResourceFilters(source: TeachingResource[]) {
  const [course, setCourse] = useState('all');
  const [keyword, setKeyword] = useState('');
  const [resourceType, setResourceType] = useState<
    TeachingResourceType | 'all'
  >('all');
  const [status, setStatus] = useState<TeachingResourceStatus | 'all'>('all');

  const resources = useMemo(
    () =>
      filterTeachingResources(source, {
        course,
        keyword,
        resourceType,
        status,
      }),
    [course, keyword, resourceType, source, status],
  );

  const courses = useMemo(
    () => Array.from(new Set(source.map((resource) => resource.course))),
    [source],
  );

  return {
    course,
    courses,
    keyword,
    resourceType,
    resources,
    setCourse,
    setKeyword,
    setResourceType,
    setStatus,
    status,
  };
}
