import { Router, Response } from 'express';
import db from '../../db';
import { authenticate, requirePermission } from '../../middlewares/auth';
import type { AuthedRequest, ApiResponse } from '../../types';
import adminRoutes from './admin';
import roleRoutes from './role';
import auditRoutes from './audit';
import configRoutes from './config';

const router = Router();

// 统一成功响应
function ok<T>(res: Response, data: T, message = 'success'): Response {
  const body: ApiResponse<T> = { code: 0, message, data };
  return res.json(body);
}

// 权限节点结构(供前端 Tree 渲染)
interface PermissionNode {
  id: number;
  code: string;
  name: string;
  module: string;
  type: string;
  description: string | null;
}

// 所有 system 接口均需登录鉴权
router.use(authenticate);

// GET /api/system/permissions - 全部权限列表(按模块分组)
router.get('/permissions', requirePermission('system:role:manage'), (_req: AuthedRequest, res: Response) => {
  const rows = db
    .prepare('SELECT id, code, name, module, type, description FROM permissions ORDER BY module, id')
    .all() as PermissionNode[];

  // 按模块分组
  const groups: Array<{ module: string; permissions: PermissionNode[] }> = [];
  const moduleMap = new Map<string, PermissionNode[]>();
  rows.forEach((r) => {
    if (!moduleMap.has(r.module)) {
      moduleMap.set(r.module, []);
      groups.push({ module: r.module, permissions: moduleMap.get(r.module)! });
    }
    moduleMap.get(r.module)!.push(r);
  });

  return ok(res, groups);
});

// 挂载子模块路由
router.use('/admins', adminRoutes); // /api/system/admins/*
router.use('/roles', roleRoutes); // /api/system/roles/*
router.use('/audit-logs', auditRoutes); // /api/system/audit-logs/*
router.use('/', configRoutes); // /api/system/configs/* 与 /api/system/dictionaries/*

export default router;
