import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';

export function GraphCheckIcon({
  status,
}: {
  status: 'pass' | 'blocked' | 'warning';
}) {
  if (status === 'pass') {
    return <CheckCircleOutlined className="graph-check-icon--pass" />;
  }
  if (status === 'blocked') {
    return <CloseCircleOutlined className="graph-check-icon--blocked" />;
  }
  return <WarningOutlined className="graph-check-icon--warning" />;
}
