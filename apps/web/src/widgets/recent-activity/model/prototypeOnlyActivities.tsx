import { CheckCircleOutlined, SyncOutlined } from '@ant-design/icons';

export const prototypeOnlyActivities = [
  {
    key: 'inventory',
    title: '完成实验资料结构盘点',
    description: '系统记录了文件类型与数量，不保存私有正文。',
    icon: <CheckCircleOutlined />,
    color: 'green',
  },
  {
    key: 'architecture',
    title: '确认模块化单体技术基线',
    description: 'React、FastAPI、PostgreSQL 与异步 Worker 独立部署。',
    icon: <CheckCircleOutlined />,
    color: 'green',
  },
  {
    key: 'scaffold',
    title: '建立基础工程与状态契约',
    description: '当前正在打通前端、API 和生成客户端。',
    icon: <SyncOutlined spin />,
    color: 'blue',
  },
] as const;
