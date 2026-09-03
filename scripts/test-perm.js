const http = require('http');

function request(method, path, token, body) {
  return new Promise((resolve) => {
    const url = new URL('http://localhost:3015' + path);
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    const data = body ? JSON.stringify(body) : null;
    if (data) headers['Content-Length'] = Buffer.byteLength(data);
    const req = http.request(
      { hostname: url.hostname, port: url.port, path: url.pathname + url.search, method, headers },
      (res) => {
        let d = '';
        res.on('data', (c) => (d += c));
        res.on('end', () => resolve({ status: res.statusCode, body: d }));
      }
    );
    req.on('error', (e) => resolve({ status: 0, body: e.message }));
    if (data) req.write(data);
    req.end();
  });
}

(async () => {
  console.log('=== 角色权限 Code 映射修复 — 接口隔离验证 ===\n');

  // 1. 超管登录
  const a1 = await request('POST', '/api/auth/login', null, { username: 'admin', password: 'admin123' });
  if (a1.status !== 200) { console.log('❌ 超管登录失败:', a1.body); return; }
  const adminToken = JSON.parse(a1.body).data.accessToken;
  console.log('✅ 超管登录成功');

  // 2. 获取权限列表，找目标权限 ID
  const a2 = await request('GET', '/api/system/permissions', adminToken);
  const pData = JSON.parse(a2.body).data;
  const groups = Array.isArray(pData) ? pData : pData?.groups || [];
  const findIds = (codes) => {
    const ids = {};
    groups.forEach((g) =>
      (g.permissions || []).forEach((p) => {
        if (codes.includes(p.code)) ids[p.code] = p.id;
      })
    );
    return ids;
  };
  const pIds = findIds(['detection:order:view', 'detection:report:view', 'detection:org:manage']);
  console.log('✅ 权限 ID 映射:', JSON.stringify(pIds));
  if (Object.keys(pIds).length < 3) {
    console.log('❌ 部分权限未找到，实际返回的 groups 数量:', groups.length);
    groups.forEach((g) => {
      (g.permissions || []).forEach((p) => {
        if (p.code.startsWith('detection')) console.log('   ', p.code, '-> id=' + p.id, 'type=' + p.type);
      });
    });
  }

  // 3. 创建角色
  const a3 = await request('POST', '/api/system/roles', adminToken, {
    name: '只读访客V2',
    code: 'viewer_v2_test',
    description: '仅预约订单+报告查看，不含检测机构',
    status: 1,
  });
  const roleId = JSON.parse(a3.body).data.id;
  console.log('✅ 角色创建成功, role_id=' + roleId);

  // 4. 分配权限（仅 order:view + report:view，不含 org:manage）
  await request('PUT', '/api/system/roles/' + roleId + '/permissions', adminToken, {
    permission_ids: [pIds['detection:order:view'], pIds['detection:report:view']],
  });
  console.log('✅ 权限已分配（order:view + report:view，不含 org:manage）');

  // 5. 创建测试管理员
  const a5 = await request('POST', '/api/system/admins', adminToken, {
    username: 'v2viewer',
    nickname: 'V2测试员',
    password: 'Test123456',
    phone: '13800000001',
    email: 'v2@test.com',
    status: 1,
    role_ids: [roleId],
  });
  console.log('✅ 测试管理员创建成功');

  // 6. 用 v2viewer 登录
  const a6 = await request('POST', '/api/auth/login', null, {
    username: 'v2viewer',
    password: 'Test123456',
  });
  const v2Token = JSON.parse(a6.body).data.accessToken;
  const profile = await request('GET', '/api/auth/profile', v2Token);
  const profData = JSON.parse(profile.body).data;
  console.log('✅ v2viewer 登录成功, permissions count:', profData?.permissions?.length);
  console.log('   permissions:', profData?.permissions?.filter((p) => p.startsWith('detection')).join(', '));

  // 7. 接口隔离测试
  console.log('\n--- 接口隔离测试 ---');
  const tests = [
    ['GET /api/detection/orders', 200, '预约订单 应可访问'],
    ['GET /api/detection/reports', 200, '检测报告 应可访问'],
    ['GET /api/detection/orgs', 403, '检测机构 应被拒绝（未授权）'],
    ['GET /api/gene/list', 403, '基因档案 应被拒绝（未授权）'],
    ['GET /api/detection/calendar', 200, '排期日历 应可访问（属订单模块）'],
  ];
  let allPass = true;
  for (const [desc, expect, note] of tests) {
    const [method, path] = desc.split(' ');
    const r = await request(method, path, v2Token);
    const ok = r.status === expect;
    if (!ok) allPass = false;
    console.log((ok ? '✅' : '❌') + ' ' + desc.padEnd(30) + '-> ' + r.status + '  ' + (ok ? note : '(期望 ' + expect + ')'));
  }
  console.log('\n' + (allPass ? '🎉 所有测试通过！接口隔离完全正确！' : '⚠️ 存在失败的测试项'));
})();
