import { InfoCircleOutlined, UploadOutlined } from '@ant-design/icons';
import { useMemo, useState } from 'react';
import {
  Alert,
  App,
  Button,
  Space,
  Tag,
  Typography,
} from 'antd';

import {
  prototypeOnlyTeachingResources,
  useTeachingMaterialsQuery,
} from '../../../entities/teaching-resource';
import { useRetryTeachingMaterial } from '../../../features/retry-teaching-material';
import { UploadTeachingMaterialModal } from '../../../features/upload-teaching-material';
import { TeachingResourceSummary } from '../../../widgets/teaching-resource-summary';
import { TeachingResourceWorkbench } from '../../../widgets/teaching-resource-workbench';


const { Paragraph, Title } = Typography;

export function TeachingResourcesPage() {
  const { message } = App.useApp();
  const [uploadOpen, setUploadOpen] = useState(false);
  const materialsQuery = useTeachingMaterialsQuery();
  const retryMutation = useRetryTeachingMaterial();
  const offline = materialsQuery.isError;
  const resources = useMemo(
    () =>
      offline
        ? prototypeOnlyTeachingResources
        : (materialsQuery.data ?? []),
    [materialsQuery.data, offline],
  );

  const handleRetry = async (materialId: string) => {
    try {
      await retryMutation.mutateAsync(materialId);
      void message.success('已重新执行本地扫描与解析');
    } catch (error) {
      void message.error(
        error instanceof Error ? error.message : '材料重试失败',
      );
    }
  };

  return (
    <div className="teaching-resources-page">
      <div className="teaching-resources-page-header">
        <div>
          <Space align="center" size={10}>
            <Title level={2}>教学资源与材料</Title>
            <Tag color="geekblue">材料治理</Tag>
            <Tag color={offline ? 'warning' : 'success'}>
              {offline ? '离线示例' : `本地数据 ${resources.length}`}
            </Tag>
          </Space>
          <Paragraph type="secondary">
            把大纲、指导书、评分表和学生证据转为可定位、可授权的证据资源。
          </Paragraph>
        </div>
        <Button
          icon={<UploadOutlined />}
          onClick={() => setUploadOpen(true)}
          type="primary"
        >
          上传材料
        </Button>
      </div>

      <Alert
        className="teaching-resources-notice"
        description={
          offline
            ? '无法连接本地 API，当前只展示离线示例数据；启动 API 后可上传并执行真实扫描、OCR 与解析。'
            : materialsQuery.isLoading
              ? '正在读取本地 SQLite 材料清单。'
              : '文件会依次执行对象扫描、病毒扫描、内容解析与证据结构化；失败材料不会进入 M4。'
        }
        icon={<InfoCircleOutlined />}
        showIcon
        title={offline ? '本地材料服务未连接' : '本地材料治理流水线'}
        type={offline ? 'warning' : 'info'}
      />

      <TeachingResourceSummary resources={resources} />
      <TeachingResourceWorkbench
        onRetry={handleRetry}
        resources={resources}
        retryingResourceId={
          retryMutation.isPending ? retryMutation.variables : undefined
        }
      />
      <UploadTeachingMaterialModal
        onClose={() => setUploadOpen(false)}
        open={uploadOpen}
      />
    </div>
  );
}
