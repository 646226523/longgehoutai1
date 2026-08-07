// 共享类型定义

import type { Request } from 'express';

// 管理员用户(数据库行)
export interface AdminUser {
  id: number;
  username: string;
  password: string;
  nickname: string;
  avatar: string | null;
  email: string | null;
  phone: string | null;
  status: number;
  last_login_at: number | null;
  created_at: number;
  updated_at: number;
}

// 角色
export interface Role {
  id: number;
  code: string;
  name: string;
  description: string | null;
  is_super: number;
  status: number;
  created_at: number;
  updated_at: number;
}

// 权限
export interface Permission {
  id: number;
  code: string;
  name: string;
  module: string;
  type: string;
  description: string | null;
  created_at: number;
}

// JWT Access Token 载荷
export interface JwtPayload {
  sub: number; // admin user id
  username: string;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

// 扩展 Express Request 类型,挂载当前用户信息
export interface AuthedRequest extends Request {
  adminUser?: {
    id: number;
    username: string;
    nickname: string;
    avatar: string | null;
    roles: string[];
    permissions: string[];
    isSuper: boolean;
  };
}

// 统一 API 响应结构
export interface ApiResponse<T = unknown> {
  code: number; // 0 成功,非 0 失败
  message: string;
  data: T;
}
