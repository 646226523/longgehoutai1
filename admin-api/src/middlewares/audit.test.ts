/**
 * audit.ts 纯函数单元测试
 * 覆盖：buildAuditSummary / buildDiff / extractObjectName / extractTargetId / extractTargetType
 *      / redactSensitive / fieldLabel / 映射表常量
 */
import { describe, it, expect } from 'vitest';
import {
  buildAuditSummary,
  buildDiff,
  extractObjectName,
  extractTargetId,
  extractTargetType,
  redactSensitive,
  fieldLabel,
  formatIp,
  getClientIp,
  resolveObjectName,
  MODULE_LABELS,
  ACTION_VERBS,
  FIELD_LABELS,
  OBJECT_TYPE_LABELS,
  NAME_KEYS,
} from '../middlewares/audit';
import type { DiffItem } from '../middlewares/audit';

// ==================== extractObjectName ====================
describe('extractObjectName — 智能提取对象名称', () => {
  it('从 responseBody.data 嵌套中提取 name', () => {
    expect(extractObjectName({ data: { name: 'VIP角色' } })).toBe('VIP角色');
  });
  it('从 responseBody.data 嵌套中提取 nickname', () => {
    expect(extractObjectName({ data: { nickname: '张三' } })).toBe('张三');
  });
  it('从 responseBody.data 嵌套中提取 username', () => {
    expect(extractObjectName({ data: { username: 'zhangsan' } })).toBe('zhangsan');
  });
  it('顶层直接找 name', () => {
    expect(extractObjectName({ name: '角色A' })).toBe('角色A');
  });
  it('data 嵌套优先于顶层', () => {
    expect(extractObjectName({ name: '顶层', data: { name: '嵌套' } })).toBe('嵌套');
  });
  it('null / undefined / 非对象 → null', () => {
    expect(extractObjectName(null)).toBeNull();
    expect(extractObjectName(undefined)).toBeNull();
    expect(extractObjectName('string')).toBeNull();
    expect(extractObjectName(123)).toBeNull();
  });
  it('空值和纯字符串视为无效', () => {
    expect(extractObjectName({ name: '' })).toBeNull();
    expect(extractObjectName({ data: { nickname: '   ' } })).toBeNull();
    expect(extractObjectName({ name: null as unknown as string })).toBeNull();
  });
  it('NAME_KEYS 包含常见命名字段（不含 id/code）', () => {
    // arrayContaining 只验证子集，不要求完全相等
    expect(NAME_KEYS).toEqual(
      expect.arrayContaining(['name', 'nickname', 'username', 'title']),
    );
    expect(NAME_KEYS).not.toContain('id');
    expect(NAME_KEYS).not.toContain('code');
  });
});

// ==================== extractTargetId ====================
describe('extractTargetId — 智能提取 target_id', () => {
  it('从 URL 参数提取数字', () => {
    expect(extractTargetId(null, '/api/system/roles/15')).toBe(15);
    expect(extractTargetId(null, '/api/system/admins/3')).toBe(3);
    expect(extractTargetId(null, '/api/system/roles/7/permissions')).toBe(7);
  });
  it('从 responseBody.data.id 提取', () => {
    expect(extractTargetId({ data: { id: 42 } }, '/api/system/roles')).toBe(42);
  });
  it('顶层 responseBody.id', () => {
    expect(extractTargetId({ id: 99 }, '/api/system/roles')).toBe(99);
  });
  it('无法提取 → null', () => {
    expect(extractTargetId(null, '/api/system/roles')).toBeNull();
    expect(extractTargetId({ data: { no_id: true } }, '/api/system/roles')).toBeNull();
  });
});

// ==================== extractTargetType ====================
describe('extractTargetType — 智能提取 target_type', () => {
  it('从 module 直接映射', () => {
    expect(extractTargetType('admin', '/api/system/admins/1', 'update')).toBe('admin');
    expect(extractTargetType('role', '/api/system/roles/1', 'update')).toBe('role');
    expect(extractTargetType('nft', '/api/nft/mint', 'create')).toBe('nft_asset');
  });
  it('path 关键词兜底（module 未直接映射时）', () => {
    // detection 已在 moduleToType 里直接映射 → 用 'unknown_mod' 触发 path 兜底
    expect(extractTargetType('unknown_mod', '/api/detection/org/1', 'create')).toBe('detection_org');
    expect(extractTargetType('unknown_mod', '/api/detection/order/1', 'create')).toBe('detection_order');
    expect(extractTargetType('unknown_mod', '/api/detection/report/1', 'create')).toBe('detection_report');
    expect(extractTargetType('unknown_mod', '/api/gene/test/1', 'create')).toBe('gene_test');
    expect(extractTargetType('unknown_mod', '/api/loft/pigeon/1', 'create')).toBe('loft_pigeon');
    expect(extractTargetType('unknown_mod', '/api/auction/item/1', 'create')).toBe('auction_item');
  });
  it('无法识别 → null', () => {
    expect(extractTargetType('unknown_module', '/api/foo/bar', 'action')).toBeNull();
  });
});

// ==================== buildAuditSummary ====================
describe('buildAuditSummary — 生成中文业务摘要', () => {
  const baseParams = {
    adminUsername: 'admin',
    adminNickname: '超级管理员',
    module: 'role',
    action: 'update',
    path: '/api/system/roles/7',
    responseBody: { data: { name: 'VIP角色' } },
    statusCode: 200,
  };

  it('登录类特殊处理 →「登录了系统」', () => {
    expect(
      buildAuditSummary({ ...baseParams, module: 'auth', action: 'login' }),
    ).toBe('超级管理员 登录了系统');
  });

  it('有 objectName + 类型 → 完整业务句', () => {
    const summary = buildAuditSummary(baseParams);
    expect(summary).toContain('超级管理员');
    expect(summary).toContain('修改了');
    expect(summary).toContain('角色');
    expect(summary).toContain('VIP角色');
  });

  it('失败操作附加错误标记', () => {
    const summary = buildAuditSummary({ ...baseParams, statusCode: 400 });
    expect(summary).toContain('失败');
    expect(summary).toContain('HTTP 400');
  });

  it('成功操作不附加失败标记', () => {
    const summary = buildAuditSummary({ ...baseParams, statusCode: 200 });
    expect(summary).not.toContain('失败');
    expect(summary).not.toContain('HTTP');
  });

  it('无 responseBody / 无 targetName → 仅 operator + verb', () => {
    const summary = buildAuditSummary({
      adminUsername: 'admin',
      module: 'admin',
      action: 'delete',
      path: '/api/system/admins/5',
    });
    expect(summary).toContain('删除了管理员');
  });

  it('显式 objectName 覆盖 responseBody 提取', () => {
    const summary = buildAuditSummary({
      ...baseParams,
      targetName: '显式角色名',
      responseBody: { data: { name: '从响应提取' } },
    });
    expect(summary).toContain('显式角色名');
    expect(summary).not.toContain('从响应提取');
  });

  it('无 nickname fallback 到 username', () => {
    expect(
      buildAuditSummary({
        adminUsername: 'admin',
        adminNickname: null,
        module: 'auth',
        action: 'login',
        path: '/api/auth/login',
      }),
    ).toBe('admin 登录了系统');
  });

  it('未知 module/action 有合理 fallback', () => {
    const summary = buildAuditSummary({
      adminUsername: 'admin',
      module: 'unknown_mod',
      action: 'weird_action',
      path: '/api/unknown',
    });
    expect(summary).toContain('admin');
    expect(summary.length).toBeGreaterThan(5);
  });

  it('admin 模块 create → 新增了管理员「xxx」', () => {
    const summary = buildAuditSummary({
      adminUsername: 'admin',
      module: 'admin',
      action: 'create',
      path: '/api/system/admins',
      responseBody: { data: { nickname: '张三' } },
      statusCode: 201,
    });
    expect(summary).toContain('新增了管理员');
    expect(summary).toContain('张三');
  });

  it('admin 模块 reset_password → 重置了密码「xxx」', () => {
    const summary = buildAuditSummary({
      adminUsername: 'admin',
      module: 'admin',
      action: 'reset_password',
      path: '/api/system/admins/5/reset-password',
      targetName: '张三',
    });
    expect(summary).toContain('重置了密码');
    expect(summary).toContain('张三');
  });
});

// ==================== buildDiff ====================
describe('buildDiff — 生成字段级变更对比', () => {
  it('null / undefined → 返回空数组', () => {
    expect(buildDiff(null, {})).toEqual([]);
    expect(buildDiff({} as any, null)).toEqual([]);
    expect(buildDiff(undefined as any, undefined as any)).toEqual([]);
  });

  it('同值 → 空数组', () => {
    expect(buildDiff({ name: 'A', status: 1 }, { name: 'A', status: 1 })).toEqual([]);
  });

  it('字段变更 → 正确捕获', () => {
    const before = { name: '旧名', status: 1 };
    const after = { name: '新名', status: 1 };
    const diffs: DiffItem[] = buildDiff(before, after);
    expect(diffs).toHaveLength(1);
    expect(diffs[0].field).toBe('name');
    expect(diffs[0].from).toBe('旧名');
    expect(diffs[0].to).toBe('新名');
  });

  it('只对比 after 里存在的 key（避免 before 有但 after 没传被误判）', () => {
    const before = { id: 7, name: 'VIP', status: 1, is_super: 0 };
    const after = { name: 'VIP2', status: 0 }; // 用户只提交这两个字段
    const diffs = buildDiff(before, after);
    // 只应包含 name 和 status，不应包含 id / is_super
    expect(diffs.length).toBeLessThanOrEqual(after ? Object.keys(after).length : 0);
    expect(diffs.find((d) => d.field === 'id')).toBeUndefined();
    expect(diffs.find((d) => d.field === 'is_super')).toBeUndefined();
  });

  it('忽略敏感/系统字段（id / password / created_at 等）', () => {
    const before = { id: 5, name: 'A', password: 'secret', created_at: 123 };
    const after = { name: 'B', password: 'new' };
    const diffs = buildDiff(before, after);
    expect(diffs.find((d) => d.field === 'id')).toBeUndefined();
    expect(diffs.find((d) => d.field === 'password')).toBeUndefined();
    expect(diffs.find((d) => d.field === 'created_at')).toBeUndefined();
    expect(diffs.find((d) => d.field === 'name')).toBeDefined();
  });

  it('值变为 null / undefined 也能捕获', () => {
    const before = { name: 'A', description: '旧描述' };
    const after = { name: 'A', description: null };
    const diffs = buildDiff(before, after);
    expect(diffs[0].field).toBe('description');
    expect(diffs[0].from).toBe('旧描述');
    expect(diffs[0].to).toBeNull();
  });

  it('label 使用中文字段名', () => {
    const before = { name: 'A', status: 1, description: '旧' };
    const after = { name: 'B', status: 0, description: '新' };
    const diffs = buildDiff(before, after);
    const nameDiff = diffs.find((d) => d.field === 'name');
    expect(nameDiff?.label).toBe('名称');
    const statusDiff = diffs.find((d) => d.field === 'status');
    expect(statusDiff?.label).toBe('状态');
  });
});

// ==================== redactSensitive ====================
describe('redactSensitive — 敏感字段脱敏', () => {
  it('password 字段脱敏', () => {
    const result = redactSensitive({ username: 'a', password: 'secret123' }) as Record<string, unknown>;
    expect(result.password).toBe('***');
    expect(result.username).toBe('a');
  });
  it('token 字段脱敏', () => {
    const result = redactSensitive({ token: 'abc.def.ghi' }) as Record<string, unknown>;
    expect(result.token).toBe('***');
  });
  it('嵌套对象也脱敏', () => {
    const result = redactSensitive({
      user: { username: 'a', password: 'secret' },
    }) as Record<string, any>;
    expect(result.user.password).toBe('***');
    expect(result.user.username).toBe('a');
  });
  it('数组里的对象也脱敏', () => {
    const result = redactSensitive([{ password: 'p1' }, { token: 't2' }]) as any[];
    expect(result[0].password).toBe('***');
    expect(result[1].token).toBe('***');
  });
  it('null / 非对象直接返回', () => {
    expect(redactSensitive(null)).toBeNull();
    expect(redactSensitive('string')).toBe('string');
    expect(redactSensitive(42)).toBe(42);
  });
});

// ==================== fieldLabel ====================
describe('fieldLabel — 字段名→中文标签', () => {
  it('内置字段有翻译', () => {
    expect(fieldLabel('name')).toBe('名称');
    expect(fieldLabel('status')).toBe('状态');
    expect(fieldLabel('description')).toBe('描述');
  });
  it('未知字段原样返回', () => {
    expect(fieldLabel('custom_field')).toBe('custom_field');
  });
  it('FIELD_LABELS 表有基础覆盖', () => {
    expect(FIELD_LABELS.name).toBe('名称');
    expect(FIELD_LABELS.status).toBe('状态');
    expect(FIELD_LABELS.username).toBe('用户名');
    expect(FIELD_LABELS.nickname).toBe('昵称');
  });
});

// ==================== 映射表常量 ====================
describe('映射表常量完整性', () => {
  it('MODULE_LABELS 覆盖主要模块', () => {
    ['admin', 'role', 'auth', 'gene', 'nft', 'competition', 'loft', 'auction'].forEach((m) => {
      expect(MODULE_LABELS[m]).toBeDefined();
      expect(typeof MODULE_LABELS[m]).toBe('string');
      expect(MODULE_LABELS[m].length).toBeGreaterThan(0);
    });
  });
  it('ACTION_VERBS 覆盖核心动作', () => {
    ['create', 'update', 'delete', 'login', 'export'].forEach((a) => {
      expect(ACTION_VERBS[a]).toBeDefined();
      expect(ACTION_VERBS[a]).toContain('了');
    });
  });
  it('OBJECT_TYPE_LABELS 覆盖常见对象类型', () => {
    ['admin', 'role', 'gene_profile', 'nft_asset', 'competition', 'loft'].forEach((t) => {
      expect(OBJECT_TYPE_LABELS[t]).toBeDefined();
    });
  });
});

// ==================== formatIp ====================
describe('formatIp', () => {
  it('null/undefined/空字符串 → null', () => {
    expect(formatIp(null)).toBeNull();
    expect(formatIp(undefined)).toBeNull();
    expect(formatIp('')).toBeNull();
    expect(formatIp('  ')).toBeNull();
  });

  it('::1 → localhost', () => {
    expect(formatIp('::1')).toBe('localhost');
    expect(formatIp('::')).toBe('localhost');
  });

  it('IPv4-mapped IPv6 → 提取 IPv4', () => {
    expect(formatIp('::ffff:192.168.1.100')).toBe('192.168.1.100');
    expect(formatIp('::ffff:8.8.8.8')).toBe('8.8.8.8');
  });

  it('多 IP 取首个非内网', () => {
    expect(formatIp('203.0.113.42, 10.0.0.1, 127.0.0.1')).toBe('203.0.113.42');
    expect(formatIp('203.0.113.42, ::ffff:10.0.0.1')).toBe('203.0.113.42');
  });

  it('全内网 fallback 第一个', () => {
    expect(formatIp('10.0.0.1, 192.168.1.1')).toBe('10.0.0.1');
    expect(formatIp('127.0.0.1, 10.0.0.1')).toBe('127.0.0.1');
  });

  it('单 IP 直通', () => {
    expect(formatIp('192.168.1.50')).toBe('192.168.1.50');
    expect(formatIp('8.8.8.8')).toBe('8.8.8.8');
  });

  it('IPv6 多跳之外的值保持原值', () => {
    expect(formatIp('2001:db8::1')).toBe('2001:db8::1');
  });

  it('带空格的多 IP', () => {
    expect(formatIp(' 203.0.113.42 , 10.0.0.1 ')).toBe('203.0.113.42');
  });
});

// ==================== resolveObjectName ====================
describe('resolveObjectName', () => {
  it('Level 1: 显式 objectName 优先', () => {
    expect(resolveObjectName({ objectName: '显式角色名', module: 'role' })).toBe('显式角色名');
  });

  it('Level 2: 从 before 对象提取', () => {
    expect(resolveObjectName({
      module: 'role',
      before: { id: 7, name: '审核员', code: 'auditor', status: 1 },
    })).toBe('审核员');
  });

  it('Level 2: before 嵌套 data', () => {
    expect(resolveObjectName({
      before: { data: { title: '重要公告' } },
    })).toBe('重要公告');
  });

  it('Level 3: 从 responseBody.data 提取', () => {
    expect(resolveObjectName({
      responseBody: { code: 0, data: { title: '新品发布' } },
    })).toBe('新品发布');
  });

  it('Level 3: responseBody.data 无名称字段时 fallback 失败', () => {
    // responseBody.data 只有 id 和 code → 找不到名称 → 继续 fallback
    expect(resolveObjectName({
      responseBody: { data: { id: 99, code: 'SYSTEM' } },
      module: 'role',
      targetId: 99,
    })).toBe('角色权限#99');  // Level 4 兜底（MODULE_LABELS.role = '角色权限'）
  });

  it('Level 4: 全部 fallback 失败时用 "类型中文名#ID"', () => {
    expect(resolveObjectName({ module: 'role', targetId: 7 })).toBe('角色权限#7');
    expect(resolveObjectName({ module: 'admin', targetId: 123 })).toBe('管理员管理#123');
    expect(resolveObjectName({ module: 'user', targetId: 456 })).toBe('用户管理#456');
  });

  it('Level 4: 无 targetId 时只用类型名', () => {
    expect(resolveObjectName({ module: 'role' })).toBe('角色权限');
  });

  it('Level 4: module 不在映射表中时 fallback 用 module 名', () => {
    expect(resolveObjectName({ module: 'unknown_module', targetId: 5 })).toBe('unknown_module#5');
  });

  it('before 是简单 { permissions: [...] } 格式也能正常 fallback', () => {
    // 这种 before 没有 NAME_KEYS，会跳到 responseBody 或兜底
    expect(resolveObjectName({
      before: { permissions: [1, 2, 3] },
      module: 'role',
      targetId: 7,
    })).toBe('角色权限#7');
  });

  it('NAME_KEYS 不再包含 id/code', () => {
    // 确保 NAME_KEYS 里没有 id 和 code，这样 extractObjectName({ id: 7, code: 'X' }) 返回 null
    expect(NAME_KEYS).not.toContain('id');
    expect(NAME_KEYS).not.toContain('code');
    expect(NAME_KEYS).not.toContain('status');
    expect(NAME_KEYS).not.toContain('email');
    expect(NAME_KEYS).not.toContain('phone');
  });
});

// ==================== getClientIp ====================
describe('getClientIp — 从请求中提取客户端真实 IP', () => {
  it('X-Forwarded-For 链含公网IP → 取首个公网 IP', () => {
    expect(getClientIp({ headers: { 'x-forwarded-for': '119.126.114.228, 10.0.0.1, ::1' }, ip: '::1' })).toBe('119.126.114.228');
  });

  it('X-Forwarded-For 全内网 → 取第一个', () => {
    expect(getClientIp({ headers: { 'x-forwarded-for': '10.0.0.1, 192.168.1.1' }, ip: '::1' })).toBe('10.0.0.1');
  });

  it('无 X-Forwarded-For 有 X-Real-IP → 返回 X-Real-IP', () => {
    expect(getClientIp({ headers: { 'x-real-ip': '203.0.113.42' }, ip: '::1' })).toBe('203.0.113.42');
  });

  it('无 X-Forwarded-For 有 CF-Connecting-IP → 返回 Cloudflare IP', () => {
    expect(getClientIp({ headers: { 'cf-connecting-ip': '8.8.8.8' }, ip: '::1' })).toBe('8.8.8.8');
  });

  it('无代理头 → fallback 到 req.ip', () => {
    expect(getClientIp({ headers: {}, ip: '127.0.0.1', socket: { remoteAddress: '::ffff:127.0.0.1' } })).toBe('127.0.0.1');
  });

  it('所有都没有 → fallback 到 socket.remoteAddress', () => {
    expect(getClientIp({ headers: {}, socket: { remoteAddress: '::ffff:172.16.0.1' } })).toBe('::ffff:172.16.0.1');
  });

  it('大小写不敏感的 header', () => {
    expect(getClientIp({ headers: { 'X-Forwarded-For': '1.2.3.4' }, ip: '::1' })).toBe('1.2.3.4');
    expect(getClientIp({ headers: { 'CF-Connecting-IP': '5.6.7.8' }, ip: '::1' })).toBe('5.6.7.8');
  });

  it('X-Forwarded-For 是数组类型（Express 少数情况）', () => {
    expect(getClientIp({ headers: { 'x-forwarded-for': ['1.1.1.1', '10.0.0.1'] as unknown as string }, ip: '::1' })).toBe('1.1.1.1');
  });

  it('connection.remoteAddress 作为 socket 的兜底', () => {
    expect(getClientIp({ headers: {}, connection: { remoteAddress: '192.168.1.100' } })).toBe('192.168.1.100');
  });

  it('全部为空 → 返回 undefined', () => {
    expect(getClientIp({ headers: {} })).toBeUndefined();
  });

  it('X-Forwarded-For 含空格也能正确解析', () => {
    expect(getClientIp({ headers: { 'x-forwarded-for': ' 203.0.113.42 , ::1 ' }, ip: '::1' })).toBe('203.0.113.42');
  });
});
