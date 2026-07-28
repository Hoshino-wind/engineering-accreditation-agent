import {
  AimOutlined,
  ArrowRightOutlined,
  CheckSquareOutlined,
  CloseOutlined,
  NodeIndexOutlined,
} from '@ant-design/icons';
import {
  Card,
  Col,
  Empty,
  Row,
  Tag,
  Typography,
} from 'antd';

import type { DiagnosticFinding } from '../../../entities/diagnostic-finding';

interface DiagnosticFindingAnalysisProps {
  finding: DiagnosticFinding | null;
}

export function DiagnosticFindingAnalysis({
  finding,
}: DiagnosticFindingAnalysisProps) {
  if (!finding) {
    return (
      <Card
        className="diagnostic-finding-analysis"
        size="small"
        title="诊断依据与影响"
      >
        <Empty
          description="请选择一项诊断发现"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    );
  }

  return (
    <Card
      className="diagnostic-finding-analysis"
      size="small"
      title="诊断依据与影响"
    >
      <div className="diagnostic-broken-relation">
        <div className="diagnostic-relation-node">
          <Typography.Text type="secondary">来源对象</Typography.Text>
          <Typography.Text strong>{finding.sourceNode}</Typography.Text>
        </div>
        <div className="diagnostic-broken-edge">
          <CloseOutlined />
          <Typography.Text type="danger">
            缺少{finding.relationLabel}关系
          </Typography.Text>
        </div>
        <div className="diagnostic-relation-node diagnostic-relation-node--target">
          <Typography.Text type="secondary">目标对象</Typography.Text>
          <Typography.Text strong>{finding.targetNode}</Typography.Text>
        </div>
      </div>

      <section className="diagnostic-rule">
        <div className="diagnostic-section-heading">
          <Typography.Text strong>规则判定</Typography.Text>
          <Tag
            color={
              finding.rule.kind === 'deterministic' ? 'blue' : 'orange'
            }
          >
            {finding.rule.kind === 'deterministic'
              ? '确定性判定'
              : '语义辅助'}
          </Tag>
        </div>
        <div className="diagnostic-rule-id">
          <Typography.Text type="secondary">判定规则</Typography.Text>
          <Typography.Text code>
            {finding.rule.id} {finding.rule.version}
          </Typography.Text>
        </div>
        <Typography.Paragraph>
          {finding.rule.rationale}
        </Typography.Paragraph>
        <Typography.Text type="secondary">
          依据：{finding.rule.basis}
        </Typography.Text>
        <Typography.Text type="secondary">
          {finding.ruleSetVersion} · {finding.rule.runAt}
        </Typography.Text>
      </section>

      <section className="diagnostic-impact">
        <Typography.Text strong>影响范围</Typography.Text>
        <Row gutter={10}>
          <Col span={8}>
            <div className="diagnostic-impact-item">
              <AimOutlined />
              <div>
                <Typography.Text type="secondary">课程目标</Typography.Text>
                <Typography.Text strong>
                  {finding.impact.courseObjectives} 个
                </Typography.Text>
              </div>
            </div>
          </Col>
          <Col span={8}>
            <div className="diagnostic-impact-item">
              <NodeIndexOutlined />
              <div>
                <Typography.Text type="secondary">能力节点</Typography.Text>
                <Typography.Text strong>
                  {finding.impact.abilityNodes} 个
                </Typography.Text>
              </div>
            </div>
          </Col>
          <Col span={8}>
            <div className="diagnostic-impact-item">
              <CheckSquareOutlined />
              <div>
                <Typography.Text type="secondary">评价输入</Typography.Text>
                <Typography.Text strong>
                  {finding.impact.evaluationInputs} 项
                </Typography.Text>
              </div>
            </div>
          </Col>
        </Row>
      </section>

      <section className="diagnostic-path">
        <div className="diagnostic-section-heading">
          <Typography.Text strong>覆盖路径</Typography.Text>
          <Typography.Text type="secondary">
            红色为缺失或冲突位置
          </Typography.Text>
        </div>
        <div className="diagnostic-path-flow">
          {finding.path.map((step, index) => (
            <div className="diagnostic-path-segment" key={step.id}>
              <div
                className={[
                  'diagnostic-path-node',
                  step.tone
                    ? `diagnostic-path-node--${step.tone}`
                    : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <Typography.Text type="secondary">
                  {step.label}
                </Typography.Text>
                <Typography.Text strong>{step.detail}</Typography.Text>
              </div>
              {index < finding.path.length - 1 ? (
                step.brokenAfter ? (
                  <div className="diagnostic-path-edge diagnostic-path-edge--broken">
                    <CloseOutlined />
                  </div>
                ) : (
                  <ArrowRightOutlined className="diagnostic-path-edge" />
                )
              ) : null}
            </div>
          ))}
        </div>
      </section>
    </Card>
  );
}
