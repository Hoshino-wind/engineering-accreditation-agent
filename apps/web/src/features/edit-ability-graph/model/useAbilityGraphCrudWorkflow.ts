import { App } from 'antd';
import type { SetStateAction } from 'react';

import {
  abilityGraphNodeTypeLabels,
  getAbilityGraphNodeById,
  getAbilityGraphRelationDefinition,
  validateAbilityGraphEdge,
  type AbilityGraphEdge,
  type AbilityGraphNode,
  type AbilityGraphSourceRef,
  type AbilityGraphState,
} from '../../../entities/ability-graph';
import { recordWorkflowEvent } from '../../../entities/workflow-event';
import {
  createLocalId,
  getErrorMessage,
} from './editAbilityGraphHelpers';
import type {
  NewEdgeValues,
  NewNodeValues,
} from './editAbilityGraphTypes';

interface AbilityGraphCrudWorkflowOptions {
  graph: AbilityGraphState;
  materialSourceReferenceByKey: Map<string, AbilityGraphSourceRef>;
  saveGraphAsync: (
    update: SetStateAction<AbilityGraphState>,
  ) => Promise<unknown>;
  selectCourseOutcome: (nodeId: string) => void;
  setEdgeModalOpen: (open: boolean) => void;
  setNodeModalOpen: (open: boolean) => void;
  setSelectedNodeId: (nodeId: string) => void;
}

export function useAbilityGraphCrudWorkflow({
  graph,
  materialSourceReferenceByKey,
  saveGraphAsync,
  selectCourseOutcome,
  setEdgeModalOpen,
  setNodeModalOpen,
  setSelectedNodeId,
}: AbilityGraphCrudWorkflowOptions) {
  const { message } = App.useApp();

  const createNode = async (values: NewNodeValues) => {
    if (graph.version.status === 'published') {
      message.warning('已发布快照只读，请先创建图谱修订');
      return false;
    }

    const sourceReference = materialSourceReferenceByKey.get(
      values.sourceRefKey,
    );
    if (!sourceReference) {
      message.error('请选择材料与资源模块提供的有效证据片段');
      return false;
    }
    const nodeId = createLocalId('node');
    const nextNode: AbilityGraphNode = {
      id: nodeId,
      code: values.code,
      definition: values.definition,
      name: values.name,
      nodeVersionId: `${nodeId}:v0.1`,
      owner: values.owner,
      type: values.type,
      ...((values.type === 'ability' || values.type === 'skill') &&
      values.capabilityDomain &&
      values.capabilityLevel &&
      values.observableBehaviors
        ? {
            capability: {
              domain: values.capabilityDomain,
              cognitiveLevel: values.capabilityLevel,
              observableBehaviors: values.observableBehaviors,
            },
          }
        : {}),
      version: 'v0.1',
      status: 'draft',
      source: { ...sourceReference },
    };

    try {
      await saveGraphAsync((current) => ({
        ...current,
        impactDecisions: [],
        nodes: [...current.nodes, nextNode],
      }));
    } catch (error) {
      message.error(getErrorMessage(error, '对象保存失败'));
      return false;
    }
    setSelectedNodeId(nextNode.id);
    setNodeModalOpen(false);
    recordWorkflowEvent({
      module: 'M2',
      action: '创建图谱对象',
      objectId: nextNode.code,
      summary: `${abilityGraphNodeTypeLabels[nextNode.type]}“${nextNode.name}”已加入受控草稿`,
      actor: '王老师',
      status: 'pending',
    });
    message.success('对象已加入当前图谱草稿');
    return true;
  };

  const createEdge = async (values: NewEdgeValues) => {
    if (graph.version.status === 'published') {
      message.warning('已发布快照只读，请先创建图谱修订');
      return false;
    }

    const sourceReference = materialSourceReferenceByKey.get(
      values.sourceRefKey,
    );
    if (!sourceReference) {
      message.error('请选择材料与资源模块提供的有效证据片段');
      return false;
    }
    const sourceNode = getAbilityGraphNodeById(graph, values.sourceId);
    const targetNode = getAbilityGraphNodeById(graph, values.targetId);
    if (!sourceNode || !targetNode) {
      message.error('关系两端必须选择当前图谱中的有效对象');
      return false;
    }
    const edgeId = createLocalId('edge');
    const nextEdge: AbilityGraphEdge = {
      id: edgeId,
      edgeVersionId: `${edgeId}:v0.1`,
      relation: values.relation,
      sourceId: values.sourceId,
      sourceNodeVersionId: sourceNode.nodeVersionId,
      targetId: values.targetId,
      targetNodeVersionId: targetNode.nodeVersionId,
      ...(values.relation === 'supports' &&
      values.rationale &&
      values.targetBehaviors
        ? {
            capabilityMapping: {
              rationale: values.rationale,
              targetBehaviors: values.targetBehaviors,
            },
          }
        : {}),
      status: 'draft',
      reviewStatus: 'pending',
      effectiveCycle: values.effectiveCycle,
      source: { ...sourceReference },
    };
    const issues = validateAbilityGraphEdge(graph, nextEdge);
    if (issues.length > 0) {
      message.error(issues[0]?.message ?? '关系不符合当前 Schema');
      return false;
    }

    try {
      await saveGraphAsync((current) => ({
        ...current,
        edges: [...current.edges, nextEdge],
        impactDecisions: [],
      }));
    } catch (error) {
      message.error(getErrorMessage(error, '关系保存失败'));
      return false;
    }
    const target = getAbilityGraphNodeById(graph, nextEdge.targetId);
    if (target?.type === 'course-outcome') {
      selectCourseOutcome(target.id);
    }
    setEdgeModalOpen(false);
    recordWorkflowEvent({
      module: 'M2',
      action: '创建图谱关系',
      objectId: nextEdge.id,
      summary: `已按 Schema 创建“${getAbilityGraphRelationDefinition(nextEdge.relation)?.label ?? nextEdge.relation}”关系`,
      actor: '王老师',
      status: 'pending',
    });
    message.success('关系已加入草稿并等待发布确认');
    return true;
  };

  return { createEdge, createNode };
}
