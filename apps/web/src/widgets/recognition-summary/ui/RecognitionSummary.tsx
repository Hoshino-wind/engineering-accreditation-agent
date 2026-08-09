import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  FileSearchOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { Card, Col, Row, Space, Statistic, Typography } from 'antd';
import { useMemo } from 'react';

import type { RecognitionCandidate } from '../../../entities/recognition-candidate';

import './recognitionSummary.css';

interface RecognitionSummaryProps {
  candidates: RecognitionCandidate[];
}

/** 汇总统计全部由真实识别候选实时计算，审核写入后随之刷新。 */
export function RecognitionSummary({ candidates }: RecognitionSummaryProps) {
  const stats = useMemo(() => {
    const pending = candidates.filter(
      (c) => (c.reviewStatus ?? 'pending') === 'pending',
    ).length;
    const lowConfidence = candidates.filter((c) => c.confidence < 70).length;
    const conflicts = candidates.filter(
      (c) => c.risk === 'conflict' || Boolean(c.conflictMessage),
    ).length;
    const reviewed = candidates.filter(
      (c) => (c.reviewStatus ?? 'pending') !== 'pending',
    ).length;
    return [
      {
        detail: '等待教师审核',
        icon: FileSearchOutlined,
        key: 'pending',
        label: '待审核候选',
        suffix: '条',
        tone: 'blue',
        value: pending,
      },
      {
        detail: '置信度低于 70%',
        icon: ExclamationCircleOutlined,
        key: 'low-confidence',
        label: '低置信度',
        suffix: '条',
        tone: 'orange',
        value: lowConfidence,
      },
      {
        detail: '涉及重复或关系矛盾',
        icon: WarningOutlined,
        key: 'conflicts',
        label: '冲突候选',
        suffix: '条',
        tone: 'red',
        value: conflicts,
      },
      {
        detail: '已形成审核决定',
        icon: CheckCircleOutlined,
        key: 'reviewed',
        label: '累计已审核',
        suffix: '条',
        tone: 'green',
        value: reviewed,
      },
    ];
  }, [candidates]);

  return (
    <Row className="recognition-summary" gutter={16}>
      {stats.map((item) => (
        <Col key={item.key} span={6}>
          <Card size="small">
            <Space align="start" size={12}>
              <div
                className={`recognition-summary-icon recognition-summary-icon--${item.tone}`}
              >
                <item.icon />
              </div>
              <div>
                <Statistic
                  suffix={item.suffix}
                  title={item.label}
                  value={item.value}
                />
                <Typography.Text type="secondary">
                  {item.detail}
                </Typography.Text>
              </div>
            </Space>
          </Card>
        </Col>
      ))}
    </Row>
  );
}
