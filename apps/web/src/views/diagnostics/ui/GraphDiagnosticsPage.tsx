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

import { DiagnosticSummary } from '../../../widgets/diagnostic-summary';
import { DiagnosticWorkbench } from '../../../widgets/diagnostic-workbench';

import './graphDiagnosticsPage.css';

const { Paragraph, Title } = Typography;

export function GraphDiagnosticsPage() {
  return (
    <main className="graph-diagnostics-page">
      <div className="graph-diagnostics-page-header">
        <div>
          <Space align="center" size={10}>
            <Title level={2}>图谱分析与一致性诊断</Title>
            <Tag color="geekblue">M5 图谱诊断</Tag>
            <Tag>试点示例数据</Tag>
          </Space>
          <Paragraph type="secondary">
            基于固定图谱、材料和规则版本，定位覆盖缺口、材料冲突与结构风险。
          </Paragraph>
        </div>
        <Tooltip title="诊断运行将在 M5 后端业务切片接入">
          <Button disabled icon={<PlayCircleOutlined />} type="primary">
            运行诊断
          </Button>
        </Tooltip>
      </div>

      <Alert
        className="graph-diagnostics-notice"
        description="本次诊断共发现 23 项待确认问题，其中 5 项为高风险发现、8 项为覆盖缺口；请优先确认高风险断点，再分派材料补充、关系修正或教学改进。页面业务数量均为试点示例数据。"
        icon={<InfoCircleOutlined />}
        showIcon
        title="当前重点：先确认高风险断点，再分派整改"
        type="warning"
      />

      <DiagnosticSummary />
      <DiagnosticWorkbench />
    </main>
  );
}
