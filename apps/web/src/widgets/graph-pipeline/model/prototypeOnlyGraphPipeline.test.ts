import { describe, expect, it } from 'vitest';

import {
  getPrimaryGraphPipelineStage,
  type GraphPipelineStage,
} from './prototypeOnlyGraphPipeline';

const stage = (
  key: string,
  status: GraphPipelineStage['status'],
): GraphPipelineStage => ({
  actionLabel: `处理 ${key}`,
  code: key,
  description: key,
  key,
  percent: 0,
  route: `/${key}`,
  status,
  title: key,
});

describe('getPrimaryGraphPipelineStage', () => {
  it('返回业务顺序中第一个尚未完成的阶段', () => {
    const result = getPrimaryGraphPipelineStage([
      stage('resources', 'complete'),
      stage('recognition', 'active'),
      stage('graph', 'blocked'),
    ]);

    expect(result?.key).toBe('recognition');
  });

  it('全部完成时返回最后一个阶段', () => {
    const result = getPrimaryGraphPipelineStage([
      stage('resources', 'complete'),
      stage('support', 'complete'),
    ]);

    expect(result?.key).toBe('support');
  });
});
