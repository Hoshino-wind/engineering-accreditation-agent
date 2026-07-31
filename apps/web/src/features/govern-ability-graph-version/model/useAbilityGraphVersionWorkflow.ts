import { App } from 'antd';
import type { SetStateAction } from 'react';

import {
  canPublishAbilityGraph,
  getNextAbilityGraphObjectVersion,
  type AbilityGraphImpactAction,
  type AbilityGraphPublishCheck,
  type AbilityGraphState,
  type AbilityGraphWorkspace,
} from '../../../entities/ability-graph';
import { recordWorkflowEvent } from '../../../entities/workflow-event';

export interface AbilityGraphVersionWorkflowOptions {
  graph: AbilityGraphState;
  publishChecks: AbilityGraphPublishCheck[];
  publishGraph: () => Promise<unknown>;
  saveGraphAsync: (
    update: SetStateAction<AbilityGraphState>,
  ) => Promise<unknown>;
  setPublishModalOpen: (open: boolean) => void;
  startRevision: () => Promise<AbilityGraphWorkspace>;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function useAbilityGraphVersionWorkflow({
  graph,
  publishChecks,
  publishGraph,
  saveGraphAsync,
  setPublishModalOpen,
  startRevision,
}: AbilityGraphVersionWorkflowOptions) {
  const { message } = App.useApp();

  const startNodeRevision = async (nodeId: string) => {
    try {
      if (graph.version.status === 'published') {
        await startRevision();
      }
      await saveGraphAsync((current) => ({
        ...current,
        changeReviews: current.changeReviews.filter(
          (decision) =>
            decision.draftVersion !== current.version.name ||
            decision.changeId !== `node:${nodeId}`,
        ),
        impactDecisions: [],
        nodes: current.nodes.map((node) => {
          if (node.id !== nodeId) {
            return node;
          }
          const nextVersion = getNextAbilityGraphObjectVersion(
            node.version,
          );
          return {
            ...node,
            nodeVersionId: `${node.id}:${nextVersion}`,
            status: 'draft',
            version: nextVersion,
          };
        }),
      }));
      message.info('已创建对象修订，正式版本保持只读');
    } catch (error) {
      message.error(getErrorMessage(error, '创建对象修订失败'));
    }
  };

  const updateNode = async (
    nodeId: string,
    field: 'definition' | 'name',
    value: string,
  ) => {
    try {
      await saveGraphAsync((current) => ({
        ...current,
        changeReviews: current.changeReviews.filter(
          (decision) =>
            decision.draftVersion !== current.version.name ||
            decision.changeId !== `node:${nodeId}`,
        ),
        impactDecisions: [],
        nodes: current.nodes.map((node) =>
          node.id === nodeId && node.status === 'draft'
            ? { ...node, [field]: value }
            : node,
        ),
      }));
    } catch (error) {
      message.error(getErrorMessage(error, '保存对象修订失败'));
    }
  };

  const startGraphRevision = async () => {
    try {
      const workspace = await startRevision();
      const nextVersion = workspace.graph.version.name;
      recordWorkflowEvent({
        module: 'M2',
        action: '创建图谱修订',
        objectId: `graph-${nextVersion}`,
        summary: `${nextVersion} 草稿已基于 ${graph.version.name} 只读快照创建`,
        actor: '王老师',
        status: 'pending',
      });
      message.info(
        `已创建 ${nextVersion} 草稿，${graph.version.name} 保持只读`,
      );
    } catch (error) {
      message.error(getErrorMessage(error, '创建图谱修订失败'));
    }
  };

  const approveChange = async (changeId: string) => {
    try {
      await saveGraphAsync((current) => ({
        ...current,
        changeReviews: [
          ...current.changeReviews.filter(
            (decision) =>
              decision.draftVersion !== current.version.name ||
              decision.changeId !== changeId,
          ),
          {
            changeId,
            draftVersion: current.version.name,
            reviewer: '王老师',
            decidedAt: new Date().toISOString(),
          },
        ],
        edges: current.edges.map((edge) =>
          changeId === `edge:${edge.id}`
            ? { ...edge, reviewStatus: 'approved' as const }
            : edge,
        ),
      }));
    } catch (error) {
      message.error(getErrorMessage(error, '变更审核保存失败'));
      return;
    }
    recordWorkflowEvent({
      module: 'M2',
      action: '审核图谱变更',
      objectId: changeId,
      summary: `${graph.version.name} 的 ${changeId} 已逐项审核`,
      actor: '王老师',
      status: 'success',
    });
    message.success('本项变更已形成审核决定');
  };

  const resolveImpact = async (
    referenceId: string,
    action: AbilityGraphImpactAction,
  ) => {
    try {
      await saveGraphAsync((current) => ({
        ...current,
        impactDecisions: [
          ...current.impactDecisions.filter(
            (decision) =>
              decision.draftVersion !== current.version.name ||
              decision.referenceId !== referenceId,
          ),
          {
            referenceId,
            action,
            draftVersion: current.version.name,
            reviewer: '王老师',
            decidedAt: new Date().toISOString(),
          },
        ],
      }));
    } catch (error) {
      message.error(getErrorMessage(error, '下游影响处置保存失败'));
      return;
    }
    recordWorkflowEvent({
      module: 'M2',
      action: '处置图谱变更影响',
      objectId: referenceId,
      summary: `${graph.version.name} 的下游对象 ${referenceId} 已指定 ${action}`,
      actor: '王老师',
      status: 'pending',
    });
    message.success('已记录下游后续动作');
  };

  const publish = async () => {
    if (!canPublishAbilityGraph(publishChecks)) {
      message.error('仍有结构阻断，暂不能发布');
      return;
    }

    try {
      await publishGraph();
      setPublishModalOpen(false);
      recordWorkflowEvent({
        module: 'M2',
        action: '发布图谱版本',
        objectId: `graph-${graph.version.name}`,
        summary: `${graph.version.name} 已通过服务端门槛并发布`,
        actor: '王老师',
        status: 'success',
      });
      message.success(`图谱 ${graph.version.name} 已发布并写入正式快照`);
    } catch (error) {
      message.error(getErrorMessage(error, '图谱发布失败'));
    }
  };

  return {
    approveChange,
    publish,
    resolveImpact,
    startGraphRevision,
    startNodeRevision,
    updateNode,
  };
}
