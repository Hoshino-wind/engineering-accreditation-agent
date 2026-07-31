export type ModelDataPolicyKey = 'public' | 'internal' | 'sensitive';

export type ModelPolicyRoute =
  | 'approved-private-model'
  | 'local-only'
  | 'blocked';

export interface ModelDataPolicy {
  key: ModelDataPolicyKey;
  name: string;
  description: string;
  route: ModelPolicyRoute;
  redactBeforeModel: boolean;
  citationRequired: boolean;
}

export const modelPolicyRouteLabels: Record<ModelPolicyRoute, string> = {
  'approved-private-model': '批准的私有模型',
  'local-only': '仅校内部署模型',
  blocked: '禁止模型处理',
};
