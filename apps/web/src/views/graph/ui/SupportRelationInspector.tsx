import { ArrowRightOutlined } from '@ant-design/icons';
import {
  Alert,
  Card,
  Descriptions,
  Empty,
  Space,
  Tag,
  Typography,
} from 'antd';

import type {
  AbilityGraphEdge,
  AbilityGraphNode,
  CourseOutcomeAlignment,
} from '../../../entities/ability-graph';

const { Text } = Typography;

interface SupportRelationInspectorProps {
  selectedAlignment?: CourseOutcomeAlignment;
  selectedSupportEdge?: AbilityGraphEdge;
  selectedSupportTarget?: AbilityGraphNode;
}

export function SupportRelationInspector({
  selectedAlignment,
  selectedSupportEdge,
  selectedSupportTarget,
}: SupportRelationInspectorProps) {
  return (
    <Card
      className="graph-workbench-panel graph-relation-inspector"
      extra={
        selectedSupportEdge ? (
          <Tag
            color={
              selectedSupportEdge.reviewStatus === 'approved'
                ? 'success'
                : 'warning'
            }
          >
            {selectedSupportEdge.reviewStatus === 'approved'
              ? '审核通过'
              : '待发布确认'}
          </Tag>
        ) : null
      }
      size="small"
      title="选中支撑关系"
    >
      {selectedSupportEdge &&
      selectedAlignment &&
      selectedSupportTarget ? (
        <Space orientation="vertical" size={14}>
          <div className="graph-canonical-relation">
            <Text code>{selectedAlignment.courseOutcome.code}</Text>
            <ArrowRightOutlined />
            <Text strong>SUPPORTS</Text>
            <ArrowRightOutlined />
            <Text code>{selectedSupportTarget.code}</Text>
          </div>
          <Descriptions
            column={1}
            items={[
              {
                key: 'meaning',
                label: '业务含义',
                children: '课程目标支撑专业产出，不代表已达成',
              },
              {
                key: 'material',
                label: '来源材料',
                children: `${selectedSupportEdge.source.material} ${selectedSupportEdge.source.version}`,
              },
              {
                key: 'coordinate',
                label: '来源坐标',
                children: selectedSupportEdge.source.coordinate,
              },
              {
                key: 'cycle',
                label: '生效周期',
                children: selectedSupportEdge.effectiveCycle,
              },
              {
                key: 'impact',
                label: '影响范围',
                children: `${selectedAlignment.directCriteria.length} 个评分项 · 1 门课程`,
              },
            ]}
            size="small"
          />
          <Alert
            description="浏览可以双向，权威存储始终使用 CourseOutcome SUPPORTS PerformanceIndicator；毕业要求通过 REFINES 指标点建立层级。"
            showIcon
            type="info"
          />
        </Space>
      ) : (
        <Empty
          description={
            selectedAlignment
              ? '当前课程目标尚未支撑选中的专业产出'
              : '请选择课程目标'
          }
        />
      )}
    </Card>
  );
}
