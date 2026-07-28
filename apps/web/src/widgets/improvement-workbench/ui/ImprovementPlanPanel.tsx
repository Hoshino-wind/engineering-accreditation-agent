import {
  ApartmentOutlined,
  AuditOutlined,
  FileTextOutlined,
  LinkOutlined,
} from '@ant-design/icons';
import {
  Button,
  Card,
  Descriptions,
  Empty,
  Space,
  Steps,
  Tag,
  Typography,
} from 'antd';

import {
  ImprovementCaseStatusTag,
  type ImprovementCase,
} from '../../../entities/improvement-case';

interface ImprovementPlanPanelProps {
  improvementCase: ImprovementCase | null;
  onInspectTrace: () => void;
}

const workflowCurrent: Record<ImprovementCase['status'], number> = {
  'action-planned': 2,
  'awaiting-decision': 4,
  'awaiting-reevaluation': 4,
  closed: 4,
  diagnosing: 1,
  'in-progress': 3,
};

export function ImprovementPlanPanel({
  improvementCase,
  onInspectTrace,
}: ImprovementPlanPanelProps) {
  if (!improvementCase) {
    return (
      <Card
        className="improvement-plan-panel"
        size="small"
        title="改进方案与实际变更"
      >
        <Empty
          description="请选择一项改进问题"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    );
  }

  const teachingChanges = improvementCase.changes.filter(
    (change) => change.kind !== 'graph',
  );
  const graphChange = improvementCase.changes.find(
    (change) => change.kind === 'graph',
  );

  return (
    <Card
      className="improvement-plan-panel"
      size="small"
      title="改进方案与实际变更"
    >
      <section className="improvement-plan-heading">
        <Space align="center" size={8}>
          <Typography.Text strong>
            {improvementCase.displayId} {improvementCase.title}
          </Typography.Text>
          <ImprovementCaseStatusTag
            status={improvementCase.status}
          />
        </Space>
        <Space size={14}>
          <Typography.Text type="secondary">
            课程：{improvementCase.course}
          </Typography.Text>
          <Typography.Text type="secondary">
            来源：{improvementCase.source.label}
          </Typography.Text>
        </Space>
      </section>

      <Steps
        current={workflowCurrent[improvementCase.status]}
        items={[
          { title: '问题确认' },
          { title: '原因完成' },
          { title: '措施批准' },
          { title: '变更完成' },
          {
            title:
              improvementCase.status === 'closed'
                ? '复评已关闭'
                : '复评待判定',
          },
        ]}
        size="small"
      />

      <section className="improvement-plan-analysis">
        <Typography.Text strong>原因与措施</Typography.Text>
        <Descriptions
          bordered
          column={2}
          items={[
            {
              key: 'root-cause',
              label: '根因',
              span: 2,
              children: improvementCase.rootCause.summary,
            },
            {
              key: 'action',
              label: '改进措施',
              span: 2,
              children: improvementCase.action.title,
            },
            {
              key: 'owner',
              label: '负责人',
              children: improvementCase.action.owner,
            },
            {
              key: 'due',
              label: '截止日期',
              children: improvementCase.action.dueAt,
            },
            {
              key: 'target',
              label: '目标',
              children: improvementCase.action.target,
            },
            {
              key: 'verification',
              label: '验证方式',
              children: improvementCase.action.verificationMethod,
            },
          ]}
          size="small"
        />
      </section>

      <section className="improvement-change-section">
        <Typography.Text strong>实际教学变更</Typography.Text>
        {teachingChanges.length === 0 ? (
          <div className="improvement-change-empty">
            <Typography.Text type="secondary">
              尚未关联实际教学对象新版本
            </Typography.Text>
          </div>
        ) : (
          teachingChanges.map((change) => (
            <div className="improvement-change-row" key={change.id}>
              {change.kind === 'rubric' ? (
                <AuditOutlined className="improvement-change-icon--blue" />
              ) : (
                <FileTextOutlined className="improvement-change-icon--green" />
              )}
              <Typography.Text>
                {change.kind === 'rubric' ? '评分规则' : '教学资源'}：
                {change.name} {change.version}
              </Typography.Text>
              <Tag
                color={
                  change.status === 'approved' ? 'success' : 'purple'
                }
              >
                {change.status === 'approved' ? '已审核' : '草稿'}
              </Tag>
            </div>
          ))
        )}
      </section>

      <section className="improvement-change-section">
        <Typography.Text strong>图谱更新</Typography.Text>
        <div className="improvement-change-row">
          <ApartmentOutlined className="improvement-change-icon--purple" />
          <Typography.Text>
            {graphChange
              ? `图谱 ${graphChange.version} · ${
                  graphChange.status === 'approved' ? '已发布' : '草稿'
                }`
              : '尚未关联图谱新版本'}
          </Typography.Text>
          {graphChange && (
            <Tag color={graphChange.status === 'approved' ? 'success' : 'purple'}>
              {graphChange.status === 'approved' ? '已发布' : '待发布'}
            </Tag>
          )}
          <Button
            className="improvement-trace-link"
            icon={<LinkOutlined />}
            onClick={onInspectTrace}
            size="small"
            type="link"
          >
            查看完整来源与变更
          </Button>
        </div>
      </section>
    </Card>
  );
}
