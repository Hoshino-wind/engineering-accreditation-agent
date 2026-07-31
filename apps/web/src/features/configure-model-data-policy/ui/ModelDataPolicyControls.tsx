import {
  Alert,
  Card,
  Select,
  Switch,
  Typography,
} from 'antd';

import {
  modelPolicyRouteLabels,
  type ModelPolicyRoute,
} from '../../../entities/model-data-policy';
import { usePrototypeOnlyModelDataPolicies } from '../model/usePrototypeOnlyModelDataPolicies';

import './modelDataPolicyControls.css';

const { Paragraph, Text } = Typography;

const routeOptions = Object.entries(modelPolicyRouteLabels).map(
  ([value, label]) => ({ label, value }),
);

export function ModelDataPolicyControls() {
  const { policies, updatePolicy } =
    usePrototypeOnlyModelDataPolicies();

  return (
    <div className="governance-policy-grid">
      {policies.map((policy) => (
        <Card
          className="governance-policy-card"
          key={policy.key}
          size="small"
          title={policy.name}
        >
          <Paragraph type="secondary">{policy.description}</Paragraph>
          <div className="governance-policy-field">
            <Text strong>模型路由</Text>
            <Select
              aria-label={`${policy.name}模型路由`}
              onChange={(route: ModelPolicyRoute) =>
                updatePolicy(policy.key, { route })
              }
              options={routeOptions}
              value={policy.route}
            />
          </div>
          <div className="governance-policy-toggle">
            <div>
              <Text strong>模型调用前脱敏</Text>
              <Text type="secondary">移除个人标识与不必要正文</Text>
            </div>
            <Switch
              aria-label={`${policy.name}模型调用前脱敏`}
              checked={policy.redactBeforeModel}
              onChange={(redactBeforeModel) =>
                updatePolicy(policy.key, { redactBeforeModel })
              }
            />
          </div>
          <div className="governance-policy-toggle">
            <div>
              <Text strong>强制来源引用</Text>
              <Text type="secondary">无来源结果只能作为人工草稿</Text>
            </div>
            <Switch
              aria-label={`${policy.name}强制来源引用`}
              checked={policy.citationRequired}
              onChange={(citationRequired) =>
                updatePolicy(policy.key, { citationRequired })
              }
            />
          </div>
          <Alert
            description={
              policy.route === 'blocked'
                ? '该级别数据不会发送给任何模型。'
                : `${modelPolicyRouteLabels[policy.route]} · ${
                    policy.redactBeforeModel
                      ? '先脱敏'
                      : '无需脱敏'
                  }`
            }
            showIcon
            type={policy.route === 'blocked' ? 'warning' : 'success'}
          />
        </Card>
      ))}
    </div>
  );
}
