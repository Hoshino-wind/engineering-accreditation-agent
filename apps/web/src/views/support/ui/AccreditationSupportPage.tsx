import { InfoCircleOutlined } from '@ant-design/icons';
import { Alert, Space, Tag, Typography } from 'antd';

import {
  CreateSupportPackage,
  usePrototypeOnlySupportPackages,
} from '../../../features/create-support-package';
import { SupportSummary } from '../../../widgets/support-summary';
import { SupportWorkbench } from '../../../widgets/support-workbench';

const { Paragraph, Title } = Typography;

export function AccreditationSupportPage() {
  const { createPackage, localPackageCount, packages } =
    usePrototypeOnlySupportPackages();

  return (
    <div className="accreditation-support-page">
      <div className="accreditation-support-page-header">
        <div>
          <Space align="center" size={10}>
            <Title level={2}>工程认证支撑</Title>
            <Tag color="geekblue">受控输出</Tag>
            <Tag>试点示例数据</Tag>
            {localPackageCount > 0 ? (
              <Tag color="default">本地草稿 {localPackageCount}</Tag>
            ) : null}
          </Space>
          <Paragraph type="secondary">
            从已确认的图谱、评价与改进事实生成可追溯、可校验的认证支撑材料。
          </Paragraph>
        </div>
        <CreateSupportPackage onCreate={createPackage} />
      </div>

      <Alert
        className="accreditation-support-notice"
        description="当前 5 个支撑包中，2 个需要修正、1 个待复核、1 个已批准；未批准评价、未闭环改进或失效引用必须返回事实所属模块处理后才能导出。页面业务数量均为试点示例数据。"
        icon={<InfoCircleOutlined />}
        showIcon
        title="当前重点：报告不能覆盖上游正式事实"
        type="warning"
      />

      <SupportSummary />
      <SupportWorkbench packages={packages} />
    </div>
  );
}
