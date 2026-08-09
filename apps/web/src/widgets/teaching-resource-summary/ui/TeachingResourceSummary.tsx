import {
  CheckCircleOutlined,
  FileTextOutlined,
  NodeIndexOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { Card, Col, Row, Space, Statistic, Typography } from 'antd';
import { useMemo } from 'react';

import type { UploadedMaterial } from '../../../entities/uploaded-material';

import './teachingResourceSummary.css';

interface TeachingResourceSummaryProps {
  materials: UploadedMaterial[];
}

/** 汇总统计全部由真实材料清单实时计算，上传/删除/状态变化后随之刷新。 */
export function TeachingResourceSummary({
  materials,
}: TeachingResourceSummaryProps) {
  const stats = useMemo(() => {
    const total = materials.length;
    const courses = new Set(materials.map((m) => m.category)).size;
    const ready = materials.filter((m) => m.status === 'extracted').length;
    const readyRate = total > 0 ? Math.round((ready / total) * 100) : 0;
    const nodeCount = materials.reduce(
      (sum, m) => sum + (m.extractedNodeCount ?? 0),
      0,
    );
    const failed = materials.filter((m) => m.status === 'failed').length;
    const processing = materials.filter(
      (m) => m.status === 'pending' || m.status === 'extracting',
    ).length;
    return [
      {
        detail: total > 0 ? `覆盖 ${courses} 类材料` : '尚未上传材料',
        icon: FileTextOutlined,
        key: 'total',
        label: '纳管材料',
        suffix: '份',
        tone: 'blue',
        value: total,
      },
      {
        detail: `处理完成率 ${readyRate}%`,
        icon: CheckCircleOutlined,
        key: 'ready',
        label: '可引用材料',
        suffix: '份',
        tone: 'green',
        value: ready,
      },
      {
        detail: '由 AI 从材料中自动提取',
        icon: NodeIndexOutlined,
        key: 'nodes',
        label: '提取节点',
        suffix: '个',
        tone: 'geekblue',
        value: nodeCount,
      },
      {
        detail: `解析失败 ${failed} · 处理中 ${processing}`,
        icon: WarningOutlined,
        key: 'exceptions',
        label: '待处理异常',
        suffix: '项',
        tone: 'orange',
        value: failed + processing,
      },
    ];
  }, [materials]);

  return (
    <Row className="teaching-resource-summary" gutter={16}>
      {stats.map((item) => (
        <Col key={item.key} span={6}>
          <Card size="small">
            <Space align="start" size={12}>
              <div
                className={`teaching-resource-summary-icon teaching-resource-summary-icon--${item.tone}`}
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
