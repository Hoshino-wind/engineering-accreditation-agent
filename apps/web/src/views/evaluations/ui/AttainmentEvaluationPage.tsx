import { InfoCircleOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Empty,
  Skeleton,
  Space,
  Tag,
  Typography,
} from 'antd';
import { useNavigate } from 'react-router';

import { useAttainmentEvaluationObjectsQuery } from '../../../entities/attainment-evaluation';
import { AttainmentSummary } from '../../../widgets/attainment-summary';
import {
  AttainmentPrimaryAction,
  AttainmentWorkbench,
} from '../../../widgets/attainment-workbench';
import { useAttainmentEvaluationRouteSelection } from '../model/useAttainmentEvaluationRouteSelection';

const { Paragraph, Title } = Typography;

export function AttainmentEvaluationPage() {
  const navigate = useNavigate();
  const objectsQuery = useAttainmentEvaluationObjectsQuery();
  const evaluations = objectsQuery.data?.items ?? [];
  const routeSelection = useAttainmentEvaluationRouteSelection(
    evaluations,
    objectsQuery.isSuccess,
  );
  const readyCount = evaluations.filter(
    (evaluation) => evaluation.readinessStatus === 'ready',
  ).length;
  const blockedCount = evaluations.length - readyCount;
  const selectedEvaluation = evaluations.find(
    (evaluation) =>
      evaluation.id === routeSelection.selectedEvaluationId,
  );

  return (
    <div className="attainment-evaluation-page">
      <div className="attainment-evaluation-page-header">
        <div>
          <Space align="center" size={10}>
            <Title level={2}>达成度评价与统计</Title>
            <Tag color="geekblue">确定性计算</Tag>
            <Tag>服务端试点评价</Tag>
          </Space>
          <Paragraph type="secondary">
            固定图谱、策略、评分数据和样本范围，生成可复算的课程目标与能力达成结果。
          </Paragraph>
        </div>
        <AttainmentPrimaryAction
          evaluation={selectedEvaluation}
          onCreated={(run) => {
            routeSelection.selectRun(run.id, run.runId);
          }}
          onNavigateToAbilityGraph={() => {
            void navigate('/graph');
          }}
          sourceRunId={routeSelection.selectedRunId}
        />
      </div>

      <Alert
        className="attainment-evaluation-notice"
        description={
          objectsQuery.isSuccess
            ? `当前服务端试点评价共 ${evaluations.length} 个评价对象，其中 ${readyCount} 个输入就绪、${blockedCount} 个被阻断；数值由版本化确定性规则生成，AI 不参与数值计算。`
            : '正在读取服务端评价对象、展示运行和确定性计算结果。'
        }
        icon={<InfoCircleOutlined />}
        showIcon
        title="当前重点：先处理缺失输入，再确认可运行范围"
        type="warning"
      />

      {objectsQuery.isPending ? (
        <Card>
          <Skeleton active paragraph={{ rows: 12 }} />
        </Card>
      ) : null}

      {objectsQuery.isError && !objectsQuery.data ? (
        <Alert
          action={
            <Button
              onClick={() => {
                void objectsQuery.refetch();
              }}
              size="small"
            >
              重试
            </Button>
          }
          description="无法读取评价对象权威读模型，当前页面不会回退到前端原型数据。"
          showIcon
          title="评价对象读取失败"
          type="error"
        />
      ) : null}

      {objectsQuery.isError && objectsQuery.data ? (
        <Alert
          action={
            <Button
              onClick={() => {
                void objectsQuery.refetch();
              }}
              size="small"
            >
              重新刷新
            </Button>
          }
          description="当前继续展示最近一次成功读取的数据。"
          showIcon
          title="评价对象刷新失败"
          type="warning"
        />
      ) : null}

      {objectsQuery.isSuccess && evaluations.length === 0 ? (
        <Card>
          <Empty description="当前周期暂无评价对象" />
        </Card>
      ) : null}

      {evaluations.length > 0 ? (
        <>
          <AttainmentSummary evaluations={evaluations} />
          <AttainmentWorkbench
            evaluations={evaluations}
            onRecoverPresentedRun={
              routeSelection.recoverPresentedRun
            }
            onNavigateToAbilityGraph={() => {
              void navigate('/graph');
            }}
            onSelectedEvaluationChange={
              routeSelection.selectEvaluation
            }
            selectedEvaluationId={
              routeSelection.selectedEvaluationId
            }
            selectedRunId={routeSelection.selectedRunId}
          />
        </>
      ) : null}
    </div>
  );
}
