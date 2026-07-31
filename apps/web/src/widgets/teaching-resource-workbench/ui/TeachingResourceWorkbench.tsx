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

interface TeachingResourceWorkbenchProps {
  onRetry?: (materialId: string) => void;
  resources?: TeachingResource[];
  retryingResourceId?: string;
}

export function TeachingResourceWorkbench({
  onRetry,
  resources = prototypeOnlyTeachingResources,
  retryingResourceId,
}: TeachingResourceWorkbenchProps) {
  const filters = useTeachingResourceFilters(resources);
  const [selectedResourceId, setSelectedResourceId] = useState(
    resources[0]?.id,
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
            onRetry={onRetry}
            resource={selectedResource}
            retrying={retryingResourceId === selectedResource?.id}
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
