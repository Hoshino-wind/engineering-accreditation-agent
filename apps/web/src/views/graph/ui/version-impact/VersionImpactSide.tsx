import {
  ReloadOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import { Button, Card, Tag, Typography } from 'antd';

import {
  isAbilityGraphImpactResolved,
  type AbilityGraphImpact,
  type AbilityGraphImpactAction,
  type AbilityGraphPublishCheck,
  type AbilityGraphState,
} from '../../../../entities/ability-graph';
import { GraphCheckIcon } from '../GraphCheckIcon';
import { impactActionLabels } from './versionImpactMeta';

const { Text } = Typography;

interface VersionImpactSideProps {
  graph: AbilityGraphState;
  impacts: AbilityGraphImpact[];
  isPersisting: boolean;
  isPublished: boolean;
  onOpenPublish: () => void;
  onResolveImpact: (
    referenceId: string,
    action: AbilityGraphImpactAction,
  ) => void;
  publishChecks: AbilityGraphPublishCheck[];
  publishReady: boolean;
  resolvedImpactCount: number;
}

export function VersionImpactSide({
  graph,
  impacts,
  isPersisting,
  isPublished,
  onOpenPublish,
  onResolveImpact,
  publishChecks,
  publishReady,
  resolvedImpactCount,
}: VersionImpactSideProps) {
  return (
    <div className="graph-version-side">
      <Card
        className="graph-workbench-panel graph-impact-list"
        extra={
          isPublished ? (
            <Tag color="success">无待处置</Tag>
          ) : (
            <Tag
              color={
                resolvedImpactCount === impacts.length
                  ? 'success'
                  : 'warning'
              }
            >
              {resolvedImpactCount} / {impacts.length} 已处置
            </Tag>
          )
        }
        size="small"
        title="下游影响"
      >
        {impacts.length > 0 ? (
          impacts.map((impact) => {
            const resolved = isAbilityGraphImpactResolved(
              graph,
              impact.referenceId,
            );
            return (
              <div className="graph-impact-row" key={impact.id}>
                <span className="graph-impact-heading">
                  <Tag
                    color={
                      impact.severity === 'high' ? 'error' : 'warning'
                    }
                  >
                    {impact.module}
                  </Tag>
                  <Text code>{impact.objectCode}</Text>
                  <Tag color={resolved ? 'success' : 'error'}>
                    {resolved ? '已处置' : '待处置'}
                  </Tag>
                </span>
                <Text strong>{impact.label}</Text>
                <Text type="secondary">
                  {impact.reasons.slice(0, 2).join('；')}
                </Text>
                <Button
                  disabled={isPersisting || resolved}
                  icon={<ReloadOutlined />}
                  loading={isPersisting}
                  onClick={() =>
                    onResolveImpact(
                      impact.referenceId,
                      impact.suggestedAction,
                    )
                  }
                  size="small"
                >
                  {resolved
                    ? '已指定后续动作'
                    : impactActionLabels[impact.suggestedAction]}
                </Button>
              </div>
            );
          })
        ) : (
          <div className="graph-empty-state">当前变更未影响下游对象</div>
        )}
      </Card>

      <Card
        className="graph-workbench-panel graph-release-gate"
        extra={
          <Tag color={isPublished || publishReady ? 'success' : 'error'}>
            {isPublished ? '已锁定' : publishReady ? '可发布' : '有阻断'}
          </Tag>
        }
        size="small"
        title={isPublished ? '快照检查' : '发布门禁'}
      >
        <div className="graph-release-check-list">
          {publishChecks.map((check) => (
            <div className="graph-release-check" key={check.id}>
              <GraphCheckIcon status={check.status} />
              <span>
                <Text strong>{check.label}</Text>
                <Text type="secondary">{check.detail}</Text>
              </span>
            </div>
          ))}
        </div>
        <Button
          block
          disabled={!publishReady || isPublished || isPersisting}
          icon={<SafetyCertificateOutlined />}
          loading={isPersisting}
          onClick={onOpenPublish}
          type="primary"
        >
          {isPublished ? '已发布并锁定' : '打开最终发布确认'}
        </Button>
      </Card>
    </div>
  );
}
