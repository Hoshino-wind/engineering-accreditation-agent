import {
  InfoCircleOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Space,
  Tag,
  Tooltip,
  Typography,
} from 'antd';

import { AttainmentSummary } from '../../../widgets/attainment-summary';
import { AttainmentWorkbench } from '../../../widgets/attainment-workbench';

import './attainmentEvaluationPage.css';

const { Paragraph, Title } = Typography;

export function AttainmentEvaluationPage() {
  return (
    <main className="attainment-evaluation-page">
      <div className="attainment-evaluation-page-header">
        <div>
          <Space align="center" size={10}>
            <Title level={2}>达成度评价与统计</Title>
            <Tag color="geekblue">M6 达成度评价</Tag>
            <Tag>试点示例数据</Tag>
          </Space>
          <Paragraph type="secondary">
            固定图谱、策略、评分数据和样本范围，生成可复算的课程目标与能力达成结果。
          </Paragraph>
        </div>
        <Tooltip title="正式评价运行将在 M6 后端业务切片接入">
          <Button disabled icon={<PlayCircleOutlined />} type="primary">
            运行评价
          </Button>
        </Tooltip>
      </div>

      <Alert
        className="attainment-evaluation-notice"
        description="本次评价共 6 个评价对象，其中 4 个输入就绪、2 个被阻断；请优先处理阻断问题。正式数值仅由版本化确定性策略计算，AI 不参与数值生成。页面业务数量均为试点示例数据。"
        icon={<InfoCircleOutlined />}
        showIcon
        title="当前重点：先处理缺失输入，再确认可运行范围"
        type="warning"
      />

      <AttainmentSummary />
      <AttainmentWorkbench />
    </main>
  );
}
