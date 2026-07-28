import {
  AimOutlined,
  ArrowRightOutlined,
  CheckSquareOutlined,
  NodeIndexOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Card,
  Col,
  Empty,
  Progress,
  Row,
  Tag,
  Typography,
} from 'antd';

import type { RecognitionCandidate } from '../../../entities/recognition-candidate';

interface CandidateComparisonProps {
  candidate: RecognitionCandidate | null;
}

export function CandidateComparison({
  candidate,
}: CandidateComparisonProps) {
  if (!candidate) {
    return (
      <Card
        className="candidate-comparison"
        size="small"
        title="候选与正式值对照"
      >
        <Empty
          description="请选择一条候选"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </Card>
    );
  }

  return (
    <Card
      className="candidate-comparison"
      size="small"
      title="候选与正式值对照"
    >
      <div className="candidate-relation-path">
        <div className="candidate-relation-node">
          <Typography.Text type="secondary">来源节点</Typography.Text>
          <Typography.Text strong>{candidate.sourceNode}</Typography.Text>
        </div>
        <div className="candidate-relation-edge">
          <Tag>{candidate.relation}</Tag>
          <ArrowRightOutlined />
        </div>
        <div className="candidate-relation-node candidate-relation-node--target">
          <Typography.Text type="secondary">目标节点</Typography.Text>
          <Typography.Text strong>{candidate.targetNode}</Typography.Text>
        </div>
      </div>

      <Row className="candidate-comparison-cards" gutter={12}>
        <Col span={14}>
          <section className="candidate-suggestion">
            <div className="candidate-section-heading">
              <Typography.Text strong>系统候选建议</Typography.Text>
              <Tag color="blue">置信度 {candidate.confidence}%</Tag>
            </div>
            <Progress
              percent={candidate.confidence}
              showInfo={false}
              size="small"
              status={candidate.confidence < 70 ? 'exception' : 'normal'}
            />
            <Typography.Paragraph>
              {candidate.explanation}
            </Typography.Paragraph>
            <Typography.Text type="secondary">
              {candidate.processorVersion} · {candidate.generatedAt}
            </Typography.Text>
          </section>
        </Col>
        <Col span={10}>
          <section className="candidate-formal-value">
            <Typography.Text strong>现有正式图谱</Typography.Text>
            {candidate.existingFormalValue ? (
              <div className="candidate-existing-relation">
                <Typography.Text>
                  {candidate.existingFormalValue.sourceNode}
                </Typography.Text>
                <Tag color="orange">
                  {candidate.existingFormalValue.relation}
                </Tag>
                <Typography.Text strong>
                  {candidate.existingFormalValue.targetNode}
                </Typography.Text>
                <Typography.Text type="secondary">
                  {candidate.existingFormalValue.version}
                </Typography.Text>
              </div>
            ) : (
              <Empty
                description="尚无对应关系"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </section>
        </Col>
      </Row>

      <section className="candidate-impact">
        <Typography.Text strong>影响范围</Typography.Text>
        <Row gutter={10}>
          <Col span={8}>
            <div className="candidate-impact-item">
              <AimOutlined />
              <div>
                <Typography.Text type="secondary">课程目标</Typography.Text>
                <Typography.Text strong>
                  {candidate.impact.courseObjectives} 个
                </Typography.Text>
              </div>
            </div>
          </Col>
          <Col span={8}>
            <div className="candidate-impact-item">
              <NodeIndexOutlined />
              <div>
                <Typography.Text type="secondary">能力节点</Typography.Text>
                <Typography.Text strong>
                  {candidate.impact.abilityNodes} 个
                </Typography.Text>
              </div>
            </div>
          </Col>
          <Col span={8}>
            <div className="candidate-impact-item">
              <CheckSquareOutlined />
              <div>
                <Typography.Text type="secondary">评分项</Typography.Text>
                <Typography.Text strong>
                  {candidate.impact.rubricItems} 个
                </Typography.Text>
              </div>
            </div>
          </Col>
        </Row>
      </section>

      {candidate.conflictMessage ? (
        <Alert
          description={candidate.conflictMessage}
          showIcon
          title="冲突提示"
          type="error"
        />
      ) : (
        <Alert
          description="结构、来源和引用校验通过，仍需教师确认业务语义。"
          showIcon
          title="候选校验通过"
          type="success"
        />
      )}
    </Card>
  );
}
