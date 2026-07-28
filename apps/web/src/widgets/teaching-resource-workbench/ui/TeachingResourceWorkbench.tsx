import { Col, Row } from 'antd';
import { useState } from 'react';

import {
  prototypeOnlyTeachingResources,
  type TeachingResource,
} from '../../../entities/teaching-resource';
import { useTeachingResourceFilters } from '../../../features/filter-teaching-resources';
import { SourceFragmentDrawer } from '../../../features/inspect-resource-source';
import { TeachingResourceDetail } from './TeachingResourceDetail';
import { TeachingResourceInventory } from './TeachingResourceInventory';

import './teachingResourceWorkbench.css';

export function TeachingResourceWorkbench() {
  const filters = useTeachingResourceFilters(prototypeOnlyTeachingResources);
  const [selectedResourceId, setSelectedResourceId] = useState(
    prototypeOnlyTeachingResources[0]?.id,
  );
  const [sourceDrawerOpen, setSourceDrawerOpen] = useState(false);

  const selectedResource =
    filters.resources.find(
      (resource) => resource.id === selectedResourceId,
    ) ??
    filters.resources[0] ??
    null;

  const handleSelect = (resource: TeachingResource) => {
    setSelectedResourceId(resource.id);
  };

  return (
    <>
      <Row className="teaching-resource-workbench" gutter={16} align="stretch">
        <Col span={17}>
          <TeachingResourceInventory
            course={filters.course}
            courses={filters.courses}
            keyword={filters.keyword}
            onCourseChange={filters.setCourse}
            onKeywordChange={filters.setKeyword}
            onResourceTypeChange={filters.setResourceType}
            onSelect={handleSelect}
            onStatusChange={filters.setStatus}
            resourceType={filters.resourceType}
            resources={filters.resources}
            selectedResourceId={selectedResource?.id}
            status={filters.status}
          />
        </Col>
        <Col span={7}>
          <TeachingResourceDetail
            onInspectSource={() => setSourceDrawerOpen(true)}
            resource={selectedResource}
          />
        </Col>
      </Row>
      <SourceFragmentDrawer
        onClose={() => setSourceDrawerOpen(false)}
        open={sourceDrawerOpen}
        resource={selectedResource}
      />
    </>
  );
}
