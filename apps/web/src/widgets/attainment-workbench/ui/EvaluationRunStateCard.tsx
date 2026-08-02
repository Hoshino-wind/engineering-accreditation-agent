import { Alert, Button, Card, Empty } from 'antd';

interface EvaluationRunStateCardProps {
  className: string;
  error?: string;
  loading: boolean;
  onRetry: () => void;
  title: string;
}

export function EvaluationRunStateCard({
  className,
  error,
  loading,
  onRetry,
  title,
}: EvaluationRunStateCardProps) {
  return (
    <Card
      className={className}
      loading={loading}
      size="small"
      title={title}
    >
      {error ? (
        <Alert
          action={
            <Button onClick={onRetry} size="small">
              重试
            </Button>
          }
          description={error}
          showIcon
          title="评价运行暂不可用"
          type="error"
        />
      ) : (
        <Empty
          description="请选择一项评价对象"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      )}
    </Card>
  );
}
