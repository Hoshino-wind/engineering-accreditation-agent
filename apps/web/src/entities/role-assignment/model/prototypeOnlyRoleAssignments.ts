import type { RoleAssignment } from './roleAssignment';

export const prototypeOnlyRoleAssignments: RoleAssignment[] = [
  {
    id: 'role-001',
    name: '王老师',
    account: 'wang@example.edu.cn',
    role: '专业负责人',
    scope: '计算机科学与技术 · 全部课程 · 2025—2026',
    status: 'active',
    lastActive: '今天 10:32',
  },
  {
    id: 'role-002',
    name: '李老师',
    account: 'li@example.edu.cn',
    role: '课程负责人',
    scope: '软件工程、计算机网络',
    status: 'active',
    lastActive: '今天 09:48',
  },
  {
    id: 'role-003',
    name: '张老师',
    account: 'zhang@example.edu.cn',
    role: '教师',
    scope: '数据结构 · 2025 秋',
    status: 'active',
    lastActive: '昨天 16:20',
  },
  {
    id: 'role-004',
    name: '陈老师',
    account: 'chen@example.edu.cn',
    role: '认证工作组',
    scope: '计算机科学与技术 · 认证支撑',
    status: 'pending',
    lastActive: '尚未登录',
  },
  {
    id: 'role-005',
    name: '刘老师',
    account: 'liu@example.edu.cn',
    role: '审计人员',
    scope: '只读 · 审计事件与导出记录',
    status: 'active',
    lastActive: '07-27 15:04',
  },
];
