// Mock plugin for Vite dev server - provides mock API responses
// This file must be plain JavaScript (not TypeScript) because Vite's
// TypeScript transpilation cannot properly handle Node.js APIs like Buffer

const tokenStore = new Map();

function generateToken() {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = { sub: '1', username: 'admin', exp: Date.now() + 24 * 60 * 60 * 1000 };
  const base64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64');
  return `${base64(header)}.${base64(payload)}.mock_signature`;
}

const MOCK_USER = {
  id: 1,
  username: 'admin',
  nickname: '超级管理员',
  avatar: '',
  roles: ['super_admin'],
  permissions: ['*'],
};

// 生成模拟审计日志数据
function generateMockAuditLogs() {
  const modules = ['user', 'gene', 'auction', 'nft', 'competition', 'loft', 'system', 'detection'];
  const actions = ['create', 'update', 'delete', 'login', 'approve', 'reject', 'export'];
  const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
  const statusCodes = [200, 201, 400, 403, 404, 500];
  const operators = ['admin', 'zhangsan', 'lisi', 'wangwu'];
  const now = Date.now();
  const logs = [];

  for (let i = 0; i < 35; i++) {
    const method = methods[Math.floor(Math.random() * methods.length)];
    const statusCode = statusCodes[Math.floor(Math.random() * statusCodes.length)];
    const module = modules[Math.floor(Math.random() * modules.length)];
    const action = actions[Math.floor(Math.random() * actions.length)];
    const operator = operators[Math.floor(Math.random() * operators.length)];
    const duration = Math.floor(Math.random() * 500) + 10;

    logs.push({
      id: i + 1,
      admin_user_id: Math.floor(Math.random() * 5) + 1,
      admin_username: operator,
      module,
      action,
      method,
      path: `/api/${module}/${action}`,
      params: JSON.stringify({ id: i + 1, keyword: `test_${i}` }),
      request_body: method !== 'GET' ? JSON.stringify({ name: `item_${i}`, status: 1 }) : null,
      response_body: JSON.stringify({ code: 0, data: { id: i + 1 } }),
      duration_ms: duration,
      ip: `192.168.1.${Math.floor(Math.random() * 255) + 1}`,
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
      status_code: statusCode,
      created_at: now - i * 3600000,
    });
  }
  return logs;
}

// 生成模拟字典类型数据
const MOCK_DICT_TYPES = [
  { dict_type: 'competition_type', type_name: '赛事类型', item_count: 6 },
  { dict_type: 'pigeon_gender', type_name: '鸽子性别', item_count: 3 },
  { dict_type: 'nft_status', type_name: 'NFT状态', item_count: 5 },
  { dict_type: 'audit_status', type_name: '审核状态', item_count: 4 },
  { dict_type: 'loft_status', type_name: '公棚状态', item_count: 3 },
  { dict_type: 'user_level', type_name: '用户等级', item_count: 5 },
  { dict_type: 'agent_status', type_name: '代理状态', item_count: 3 },
];

// 生成模拟字典项数据
function buildMockDictItems() {
  const items = [];
  let id = 1;
  const now = Date.now();
  MOCK_DICT_TYPES.forEach((t) => {
    for (let i = 0; i < t.item_count; i++) {
      items.push({
        id: id++,
        dict_type: t.dict_type,
        type_name: t.type_name,
        item_code: `${t.dict_type}_${i + 1}`,
        item_name: `${t.type_name}项${i + 1}`,
        sort_order: i,
        status: i % 3 === 0 ? 1 : 0,
        remark: i % 3 === 0 ? '启用中' : '',
        created_at: now - id * 86400000,
        updated_at: now - id * 3600000,
      });
    }
  });
  return items;
}

export function mockApiPlugin() {
  return {
    name: 'mock-api',
    configureServer(server) {
      // POST /api/auth/login
      server.middlewares.use('/api/auth/login', (req, res, next) => {
        if (req.method !== 'POST') { next(); return; }
        let body = '';
        req.on('data', (chunk) => (body += chunk));
        req.on('end', () => {
          try {
            const { username, password } = JSON.parse(body);
            if (username === 'admin' && password === 'admin123') {
              const accessToken = generateToken();
              const refreshToken = generateToken();
              tokenStore.set(accessToken, { userId: 1, expireAt: Date.now() + 24 * 60 * 60 * 1000 });
              tokenStore.set(refreshToken, { userId: 1, expireAt: Date.now() + 7 * 24 * 60 * 60 * 1000 });
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ code: 0, message: '登录成功', data: { accessToken, refreshToken, expiresIn: 86400, user: MOCK_USER } }));
            } else {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ code: 1001, message: '用户名或密码错误', data: null }));
            }
          } catch {
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 400;
            res.end(JSON.stringify({ code: 400, message: '请求参数错误', data: null }));
          }
        });
      });

      // GET /api/auth/profile
      server.middlewares.use('/api/auth/profile', (req, res, next) => {
        if (req.method !== 'GET') { next(); return; }
        const authHeader = req.headers.authorization || '';
        const token = authHeader.replace('Bearer ', '');
        if (!token || !tokenStore.has(token)) {
          res.statusCode = 401;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ code: 401, message: '未授权或Token已过期', data: null }));
          return;
        }
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ code: 0, message: 'success', data: MOCK_USER }));
      });

      // POST /api/auth/refresh
      server.middlewares.use('/api/auth/refresh', (req, res, next) => {
        if (req.method !== 'POST') { next(); return; }
        let body = '';
        req.on('data', (chunk) => (body += chunk));
        req.on('end', () => {
          try {
            const { refreshToken: oldToken } = JSON.parse(body);
            if (tokenStore.has(oldToken)) tokenStore.delete(oldToken);
            const newAccessToken = generateToken();
            const newRefreshToken = generateToken();
            tokenStore.set(newAccessToken, { userId: 1, expireAt: Date.now() + 24 * 60 * 60 * 1000 });
            tokenStore.set(newRefreshToken, { userId: 1, expireAt: Date.now() + 7 * 24 * 60 * 60 * 1000 });
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ code: 0, message: '刷新成功', data: { accessToken: newAccessToken, refreshToken: newRefreshToken, expiresIn: 86400 } }));
          } catch {
            res.setHeader('Content-Type', 'application/json');
            res.statusCode = 400;
            res.end(JSON.stringify({ code: 400, message: '请求参数错误', data: null }));
          }
        });
      });

      // GET /api/admin/dashboard/overview
      server.middlewares.use('/api/admin/dashboard/overview', (req, res, next) => {
        if (req.method !== 'GET') { next(); return; }
        const authHeader = req.headers.authorization || '';
        const token = authHeader.replace('Bearer ', '');
        if (!token || !tokenStore.has(token)) {
          res.statusCode = 401;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ code: 401, message: '未授权', data: null }));
          return;
        }
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          code: 0, message: 'success',
          data: {
            summary: {
              gene_total: 1284, gene_trend: 12.5, gene_today: 23,
              nft_total: 856, nft_trend: 8.3, nft_today: 5,
              race_active: 3, race_trend: 0, race_today_start: 1,
              user_total: 2340, user_trend: 6.7, user_today: 12,
            },
            trend: {
              dates: ['8/1', '8/2', '8/3', '8/4', '8/5', '8/6', '8/7'],
              gene_new: [15, 18, 12, 23, 21, 19, 23],
              user_new: [8, 10, 6, 15, 12, 9, 12],
              nft_new: [2, 3, 1, 5, 4, 3, 5],
            },
            alerts: [
              { id: '1', level: 'warning', title: '赛事预警', time: '1小时前', link: '/competition/list' },
              { id: '2', level: 'success', title: 'NFT铸造正常', time: '3小时前', link: '/nft/list' },
              { id: '3', level: 'info', title: '提醒:2场赛事即将开赛', time: '5小时前', link: '/competition/list' },
            ],
            quick_entries: { gene_pending: 12, nft_pending: 5, race_active: 3, user_pending: 8 },
            port_analysis: {
              register: [
                { channel: '网页注册', value: 1234 },
                { channel: 'APP 注册', value: 856 },
                { channel: '小程序注册', value: 678 },
                { channel: '第三方 OAuth', value: 234 },
              ],
              login: [
                { channel: '网页登录', value: 2345 },
                { channel: 'APP 登录', value: 1856 },
                { channel: '小程序登录', value: 1234 },
                { channel: '扫码登录', value: 856 },
                { channel: '第三方登录', value: 456 },
              ],
            },
          },
        }));
      });

      // POST /api/upload - 文件上传接口
      server.middlewares.use('/api/upload', (req, res, next) => {
        if (req.method !== 'POST') { next(); return; }

        // 收集请求体以获取原始文件名
        const chunks = [];
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', () => {
          try {
            const bodyStr = Buffer.concat(chunks).toString('latin1');
            // 从 multipart/form-data 中提取原始文件名
            const match = bodyStr.match(/filename="([^"]+)"/);
            const originalName = match ? match[1] : 'upload.jpg';
            // 提取文件扩展名
            const dotIdx = originalName.lastIndexOf('.');
            const ext = dotIdx >= 0 ? originalName.slice(dotIdx).toLowerCase() : '.jpg';

            const mockUrl = `/uploads/mock_${Date.now()}${ext}`;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ code: 0, message: 'success', data: { url: mockUrl } }));
          } catch {
            const mockUrl = `/uploads/mock_${Date.now()}.jpg`;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ code: 0, message: 'success', data: { url: mockUrl } }));
          }
        });
      });

      // GET /api/system/audit-logs/modules - 审计模块下拉
      server.middlewares.use('/api/system/audit-logs/modules', (req, res, next) => {
        if (req.method !== 'GET') { next(); return; }
        const modules = ['user', 'gene', 'auction', 'nft', 'competition', 'loft', 'system', 'detection'];
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ code: 0, message: 'success', data: modules }));
      });

      // GET /api/system/audit-logs - 审计日志分页列表
      server.middlewares.use('/api/system/audit-logs', (req, res, next) => {
        if (req.method !== 'GET') { next(); return; }
        const url = new URL(req.url, 'http://localhost');
        const page = parseInt(url.searchParams.get('page') || '1', 10);
        const pageSize = parseInt(url.searchParams.get('pageSize') || '10', 10);
        const operator = url.searchParams.get('operator') || '';
        const moduleFilter = url.searchParams.get('module') || '';

        const allLogs = generateMockAuditLogs();
        let filtered = allLogs;
        if (operator) filtered = filtered.filter(l => l.admin_username?.includes(operator));
        if (moduleFilter) filtered = filtered.filter(l => l.module === moduleFilter);

        const total = filtered.length;
        const start = (page - 1) * pageSize;
        const list = filtered.slice(start, start + pageSize);

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ code: 0, message: 'success', data: { list, total } }));
      });

      // GET /api/system/dictionaries/types - 字典类型列表
      server.middlewares.use('/api/system/dictionaries/types', (req, res, next) => {
        if (req.method !== 'GET') { next(); return; }
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ code: 0, message: 'success', data: MOCK_DICT_TYPES }));
      });

      // GET /api/system/dictionaries - 字典项分页列表
      server.middlewares.use('/api/system/dictionaries', (req, res, next) => {
        if (req.method !== 'GET') { next(); return; }
        const url = new URL(req.url, 'http://localhost');
        const page = parseInt(url.searchParams.get('page') || '1', 10);
        const pageSize = parseInt(url.searchParams.get('pageSize') || '10', 10);
        const dictType = url.searchParams.get('dict_type') || '';
        const keyword = url.searchParams.get('keyword') || '';

        const allItems = buildMockDictItems();
        let filtered = allItems;
        if (dictType) filtered = filtered.filter(i => i.dict_type === dictType);
        if (keyword) filtered = filtered.filter(i =>
          i.item_code?.includes(keyword) || i.item_name?.includes(keyword)
        );

        const total = filtered.length;
        const start = (page - 1) * pageSize;
        const list = filtered.slice(start, start + pageSize);

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ code: 0, message: 'success', data: { list, total } }));
      });

      // 系统配置 Mock 数据
const MOCK_SYSTEM_CONFIGS = {
  groups: [
    {
      group: 'map',
      items: [
        { id: 1, config_key: 'map_provider', config_value: 'amap', name: '地图服务商', config_group: 'map', description: '选择使用的地图服务提供商', sort_order: 1, created_at: Date.now(), updated_at: Date.now() },
        { id: 2, config_key: 'amap_key', config_value: '', name: '高德地图 Key', config_group: 'map', description: '高德地图 JS API Key', sort_order: 2, created_at: Date.now(), updated_at: Date.now() },
        { id: 3, config_key: 'baidu_key', config_value: '', name: '百度地图 Key', config_group: 'map', description: '百度地图 AK', sort_order: 3, created_at: Date.now(), updated_at: Date.now() },
        { id: 4, config_key: 'tencent_key', config_value: '', name: '腾讯地图 Key', config_group: 'map', description: '腾讯地图 Key', sort_order: 4, created_at: Date.now(), updated_at: Date.now() },
      ],
    },
    {
      group: 'upload',
      items: [
        { id: 5, config_key: 'upload_max_size', config_value: '10', name: '上传文件最大尺寸(MB)', config_group: 'upload', description: '单个文件最大上传限制', sort_order: 1, created_at: Date.now(), updated_at: Date.now() },
        { id: 6, config_key: 'upload_allowed_ext', config_value: 'pdf,jpg,jpeg,png,doc,docx', name: '允许上传的文件类型', config_group: 'upload', description: '逗号分隔的文件扩展名', sort_order: 2, created_at: Date.now(), updated_at: Date.now() },
      ],
    },
    {
      group: 'business',
      items: [
        { id: 7, config_key: 'site_name', config_value: '龙鸽赛鸽管理系统', name: '站点名称', config_group: 'business', description: '显示在浏览器标题和侧边栏', sort_order: 1, created_at: Date.now(), updated_at: Date.now() },
        { id: 8, config_key: 'registration_enabled', config_value: 'true', name: '允许用户注册', config_group: 'business', description: '是否开启前台用户自助注册', sort_order: 2, created_at: Date.now(), updated_at: Date.now() },
        { id: 9, config_key: 'maintenance_mode', config_value: 'false', name: '维护模式', config_group: 'business', description: '开启后前台仅对管理员可见', sort_order: 3, created_at: Date.now(), updated_at: Date.now() },
      ],
    },
  ],
  list: [],
};
// 填充 list 字段
MOCK_SYSTEM_CONFIGS.list = MOCK_SYSTEM_CONFIGS.groups.flatMap((g) => g.items);

// GET /api/system/configs - 系统配置(按分组)
// PUT /api/system/configs/:key - 更新单个配置值
server.middlewares.use('/api/system/configs', (req, res, next) => {
  // Express 会剥离匹配的路径前缀:
  // 请求 /api/system/configs           → req.url = '/'        → pathParts = []
  // 请求 /api/system/configs/map_provider → req.url = '/map_provider' → pathParts = ['map_provider']
  const rawUrl = req.url || '/';
  const urlPath = rawUrl.split('?')[0];
  const pathParts = urlPath.split('/').filter(Boolean);
  const key = pathParts.length > 0 ? decodeURIComponent(pathParts[0]) : '';

  // PUT 请求: 更新单个配置 (URL 带 key)
  if (req.method === 'PUT') {
    if (!key) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ code: 400, message: '缺少配置键', data: null }));
      return;
    }
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      try {
        const parsed = JSON.parse(body || '{}');
        const config_value = parsed.config_value;
        let found = false;
        for (const g of MOCK_SYSTEM_CONFIGS.groups) {
          for (const item of g.items) {
            if (item.config_key === key) {
              item.config_value = config_value ?? '';
              item.updated_at = Date.now();
              found = true;
              break;
            }
          }
          if (found) break;
        }
        if (!found) {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ code: 404, message: '配置键不存在', data: null }));
          return;
        }
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ code: 0, message: '更新成功', data: null }));
      } catch {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ code: 400, message: '请求参数错误', data: null }));
      }
    });
    return;
  }

  // GET 请求: 返回配置列表 (URL 无 key)
  if (req.method === 'GET') {
    // req.url 已被剥离前缀，查询参数仍在
    const queryString = rawUrl.includes('?') ? rawUrl.split('?')[1] : '';
    const params = new URLSearchParams(queryString);
    const groupFilter = params.get('group') || '';
    let data = MOCK_SYSTEM_CONFIGS;
    if (groupFilter) {
      const filtered = MOCK_SYSTEM_CONFIGS.groups.filter((g) => g.group === groupFilter);
      data = { groups: filtered, list: filtered.flatMap((g) => g.items) };
    }
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ code: 0, message: 'success', data }));
    return;
  }

  // 其他方法放行
  next();
});

// GET /api/system/map-config - 地图配置
server.middlewares.use('/api/system/map-config', (req, res, next) => {
  if (req.method !== 'GET') { next(); return; }
  const mapGroup = MOCK_SYSTEM_CONFIGS.groups.find((g) => g.group === 'map');
  const items = mapGroup?.items || [];
  const getVal = (key) => items.find((i) => i.config_key === key)?.config_value ?? '';
  const data = {
    provider: getVal('map_provider'),
    amap_key: getVal('amap_key'),
    baidu_key: getVal('baidu_key'),
    tencent_key: getVal('tencent_key'),
  };
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ code: 0, message: 'success', data }));
});

// ==================== 检测机构 Mock 数据 ====================

// 检测项目类型字典
const MOCK_DETECTION_ITEM_TYPES = [
  { code: 'dna_paternity', name: 'DNA亲子鉴定' },
  { code: 'dna_variety', name: 'DNA品种鉴定' },
  { code: 'dna_gender', name: 'DNA性别鉴定' },
  { code: 'dna_race', name: 'DNA赛程性能检测' },
  { code: 'dna_health', name: 'DNA健康筛查' },
  { code: 'dna_ancestry', name: 'DNA血统分析' },
];

// 检测机构内存存储
let detectionOrgIdSeq = 4;
const detectionOrgStore = new Map();

// 预置 3 条示例机构数据
(function initDetectionOrgs() {
  const now = Date.now();
  detectionOrgStore.set(1, {
    id: 1, name: '信鸽DNA检测中心', code: 'LAB-2026-0801-001',
    contact: '张主任', phone: '13800138001', address: '上海市浦东新区张江高科技园区',
    location: JSON.stringify({ lng: 121.597, lat: 31.203, address: '上海市浦东新区张江高科技园区' }),
    qualification: null, projects: 'DNA亲子鉴定,DNA品种鉴定', status: 1,
    created_at: now - 5 * 86400000, updated_at: now - 2 * 3600000,
  });
  detectionOrgStore.set(2, {
    id: 2, name: '鲲鹏基因检测实验室', code: 'LAB-2026-0802-002',
    contact: '李经理', phone: '13900139002', address: '北京市海淀区中关村科技园区',
    location: JSON.stringify({ lng: 116.316, lat: 39.984, address: '北京市海淀区中关村科技园区' }),
    qualification: null, projects: 'DNA亲子鉴定,DNA性别鉴定,DNA血统分析', status: 1,
    created_at: now - 3 * 86400000, updated_at: now - 1 * 3600000,
  });
  detectionOrgStore.set(3, {
    id: 3, name: '赛鸽健康检测中心', code: 'LAB-2026-0805-003',
    contact: '王医生', phone: '13700137003', address: '广州市天河区生物科技园区',
    location: JSON.stringify({ lng: 113.361, lat: 23.124, address: '广州市天河区生物科技园区' }),
    qualification: null, projects: 'DNA健康筛查,DNA赛程性能检测', status: 2,
    created_at: now - 1 * 86400000, updated_at: now - 30 * 60000,
  });
})();

// 检测订单内存存储
let detectionOrderIdSeq = 3;
const detectionOrderStore = new Map();

(function initDetectionOrders() {
  const now = Date.now();
  detectionOrderStore.set(1, {
    id: 1, order_no: 'DT20260815001', user_name: '陈鸽友', phone: '13612345678',
    gene_profile_id: null, ring_number: '2024-CN-001234', test_org: '信鸽DNA检测中心',
    org_id: 1, project: 'DNA亲子鉴定', scheduled_date: '2026-08-20',
    status: 'pending', remark: '紧急检测', created_at: now - 2 * 86400000, updated_at: now - 1 * 3600000,
  });
  detectionOrderStore.set(2, {
    id: 2, order_no: 'DT20260818001', user_name: '刘鸽友', phone: '13587654321',
    gene_profile_id: null, ring_number: '2024-CN-005678', test_org: '鲲鹏基因检测实验室',
    org_id: 2, project: 'DNA品种鉴定', scheduled_date: null,
    status: 'confirmed', remark: '', created_at: now - 1 * 86400000, updated_at: now - 2 * 3600000,
  });
})();

// GET /api/detection/dict/item-types - 检测项目类型字典
server.middlewares.use('/api/detection/dict/item-types', (req, res, next) => {
  if (req.method !== 'GET') { next(); return; }
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ code: 0, message: 'success', data: MOCK_DETECTION_ITEM_TYPES }));
});

// GET /api/detection/orgs - 检测机构分页列表
server.middlewares.use('/api/detection/orgs', (req, res, next) => {
  if (req.method !== 'GET') { next(); return; }
  const url = new URL(req.url, 'http://localhost');
  // Connect 剥离匹配前缀后,pathname === '/' 表示精确匹配(无子路由)
  if (url.pathname !== '/') { next(); return; }
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = parseInt(url.searchParams.get('pageSize') || '10', 10);
  const keyword = url.searchParams.get('keyword') || '';
  const status = url.searchParams.get('status');

  let all = Array.from(detectionOrgStore.values());
  if (keyword) {
    const kw = keyword.toLowerCase();
    all = all.filter(o =>
      (o.name && o.name.toLowerCase().includes(kw)) ||
      (o.code && o.code.toLowerCase().includes(kw)) ||
      (o.contact && o.contact.toLowerCase().includes(kw))
    );
  }
  if (status !== null && status !== undefined && status !== '') {
    all = all.filter(o => String(o.status) === String(status));
  }

  // 排序: status DESC, created_at DESC
  all.sort((a, b) => (b.status - a.status) || (b.created_at - a.created_at));

  const total = all.length;
  const start = (page - 1) * pageSize;
  const list = all.slice(start, start + pageSize);

  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ code: 0, message: 'success', data: { list, total } }));
});

// POST /api/detection/orgs - 新增检测机构
server.middlewares.use('/api/detection/orgs', (req, res, next) => {
  if (req.method !== 'POST') { next(); return; }
  let body = '';
  req.on('data', (chunk) => (body += chunk));
  req.on('end', () => {
    try {
      const data = JSON.parse(body || '{}');
      const id = detectionOrgIdSeq++;
      const now = Date.now();
      detectionOrgStore.set(id, {
        id,
        name: (data.name || '').trim(),
        code: (data.code || '').trim(),
        contact: data.contact || null,
        phone: data.phone || null,
        address: data.address || null,
        location: data.location || null,
        qualification: data.qualification || null,
        projects: data.projects || '',
        status: data.status ?? 1,
        created_at: now,
        updated_at: now,
      });
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ code: 0, message: '新增成功', data: { id } }));
    } catch (e) {
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 400;
      res.end(JSON.stringify({ code: 400, message: '请求参数错误', data: null }));
    }
  });
});

// GET /api/detection/orgs/options - 机构下拉选项(仅合作中)
server.middlewares.use('/api/detection/orgs/options', (req, res, next) => {
  if (req.method !== 'GET') { next(); return; }
  const list = Array.from(detectionOrgStore.values())
    .filter(o => o.status === 1)
    .map(o => ({ id: o.id, name: o.name, code: o.code, projects: o.projects }));
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ code: 0, message: 'success', data: list }));
});

// GET /api/detection/orgs/:id - 机构详情
server.middlewares.use(/^\/api\/detection\/orgs\/(\d+)$/, (req, res, next) => {
  if (req.method !== 'GET') { next(); return; }
  const id = parseInt(req.url.split('/').pop(), 10);
  const org = detectionOrgStore.get(id);
  if (!org) {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 404;
    res.end(JSON.stringify({ code: 404, message: '检测机构不存在', data: null }));
    return;
  }
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ code: 0, message: 'success', data: org }));
});

// PUT /api/detection/orgs/:id - 编辑机构
server.middlewares.use(/^\/api\/detection\/orgs\/(\d+)$/, (req, res, next) => {
  if (req.method !== 'PUT') { next(); return; }
  const id = parseInt(req.url.split('/').pop(), 10);
  const existing = detectionOrgStore.get(id);
  if (!existing) {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 404;
    res.end(JSON.stringify({ code: 404, message: '检测机构不存在', data: null }));
    return;
  }
  let body = '';
  req.on('data', (chunk) => (body += chunk));
  req.on('end', () => {
    try {
      const data = JSON.parse(body || '{}');
      const now = Date.now();
      detectionOrgStore.set(id, {
        ...existing,
        name: (data.name || existing.name).trim(),
        code: (data.code || existing.code).trim(),
        contact: data.contact ?? existing.contact,
        phone: data.phone ?? existing.phone,
        address: data.address ?? existing.address,
        location: data.location ?? existing.location,
        qualification: data.qualification ?? existing.qualification,
        projects: data.projects ?? existing.projects,
        status: data.status ?? existing.status,
        updated_at: now,
      });
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ code: 0, message: '更新成功', data: null }));
    } catch (e) {
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 400;
      res.end(JSON.stringify({ code: 400, message: '请求参数错误', data: null }));
    }
  });
});

// PATCH /api/detection/orgs/:id/status - 切换机构状态
server.middlewares.use(/^\/api\/detection\/orgs\/(\d+)\/status$/, (req, res, next) => {
  if (req.method !== 'PATCH') { next(); return; }
  const id = parseInt(req.url.split('/')[2], 10);
  const existing = detectionOrgStore.get(id);
  if (!existing) {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 404;
    res.end(JSON.stringify({ code: 404, message: '检测机构不存在', data: null }));
    return;
  }
  const nextStatus = existing.status === 1 ? 0 : 1;
  detectionOrgStore.set(id, { ...existing, status: nextStatus, updated_at: Date.now() });
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ code: 0, message: nextStatus === 1 ? '已启用' : '已停用', data: { status: nextStatus } }));
});

// GET /api/detection/orders - 检测订单分页列表
server.middlewares.use('/api/detection/orders', (req, res, next) => {
  if (req.method !== 'GET') { next(); return; }
  const url = new URL(req.url, 'http://localhost');
  // Connect 剥离匹配前缀后,pathname === '/' 表示精确匹配(无子路由)
  if (url.pathname !== '/') { next(); return; }
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = parseInt(url.searchParams.get('pageSize') || '10', 10);

  const all = Array.from(detectionOrderStore.values())
    .sort((a, b) => b.created_at - a.created_at);

  const total = all.length;
  const start = (page - 1) * pageSize;
  const list = all.slice(start, start + pageSize);

  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ code: 0, message: 'success', data: { list, total } }));
});

// GET /api/detection/orders/options - 订单下拉选项
server.middlewares.use('/api/detection/orders/options', (req, res, next) => {
  if (req.method !== 'GET') { next(); return; }
  const list = Array.from(detectionOrderStore.values())
    .sort((a, b) => b.created_at - a.created_at)
    .slice(0, 200)
    .map(o => ({
      id: o.id, order_no: o.order_no, user_name: o.user_name,
      phone: o.phone, ring_number: o.ring_number, project: o.project, status: o.status,
      org_id: o.org_id || null, test_org: o.test_org || '',
      gene_profile_id: o.gene_profile_id || null,
    }));
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ code: 0, message: 'success', data: list }));
});

// POST /api/detection/orders - 新增订单
server.middlewares.use('/api/detection/orders', (req, res, next) => {
  if (req.method !== 'POST') { next(); return; }
  let body = '';
  req.on('data', (chunk) => (body += chunk));
  req.on('end', () => {
    try {
      const data = JSON.parse(body || '{}');
      const id = detectionOrderIdSeq++;
      const now = new Date();
      const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
      const seq = String(detectionOrderStore.size + 1).padStart(3, '0');
      const order_no = `DT${ymd}${seq}`;
      const nowTs = Date.now();
      detectionOrderStore.set(id, {
        id, order_no,
        user_name: data.user_name || '',
        phone: data.phone || null,
        gene_profile_id: data.gene_profile_id || null,
        ring_number: data.ring_number || '',
        test_org: data.test_org || '',
        org_id: data.org_id || null,
        project: data.project || '',
        scheduled_date: data.scheduled_date || null,
        status: data.status || 'pending',
        remark: data.remark || null,
        created_at: nowTs,
        updated_at: nowTs,
      });
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ code: 0, message: '新增成功', data: { id, order_no } }));
    } catch (e) {
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 400;
      res.end(JSON.stringify({ code: 400, message: '请求参数错误', data: null }));
    }
  });
});

// ==================== 检测报告 Mock 数据 ====================

let detectionReportIdSeq = 1;
const detectionReportStore = new Map();

// 预置示例报告数据
(function initDetectionReports() {
  const now = Date.now();
  detectionReportStore.set(1, {
    id: 1, order_id: 1, gene_profile_id: null,
    report_no: 'REP-2026-0815-001',
    test_org: '信鸽DNA检测中心', project: 'DNA亲子鉴定',
    result: '确认该样本与所提供的父母样本存在亲缘关系，亲权概率 99.99%。',
    result_data: {
      match_result: 'match', match_percent: 99.99, loci_count: 16,
      conclusion: '确认该样本与所提供的父母样本存在亲缘关系，亲权概率 99.99%。',
    },
    report_url: null, test_date: '2026-08-15', status: 'published',
    created_at: now - 1 * 86400000,
  });
  detectionReportIdSeq = 2;
})();

// GET /api/detection/reports - 检测报告分页列表
server.middlewares.use('/api/detection/reports', (req, res, next) => {
  if (req.method !== 'GET') { next(); return; }
  const url = new URL(req.url, 'http://localhost');
  // 精确匹配: 子路由如 /:id 交给后面的处理器
  if (url.pathname !== '/') { next(); return; }

  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = parseInt(url.searchParams.get('pageSize') || '10', 10);
  const keyword = url.searchParams.get('report_no') || '';

  let all = Array.from(detectionReportStore.values()).sort((a, b) => b.created_at - a.created_at);
  if (keyword) {
    all = all.filter(r => r.report_no.includes(keyword));
  }
  const total = all.length;
  const list = all.slice((page - 1) * pageSize, page * pageSize).map(r => ({
    ...r,
    gene_profile: null,
    order: r.order_id ? { order_no: '' } : null,
  }));

  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ code: 0, message: 'success', data: { list, total } }));
});

// GET /api/detection/reports/:id - 报告详情
server.middlewares.use('/api/detection/reports', (req, res, next) => {
  if (req.method !== 'GET') { next(); return; }
  const url = new URL(req.url, 'http://localhost');
  const match = url.pathname.match(/^\/(\d+)$/);
  if (!match) { next(); return; }
  const id = parseInt(match[1], 10);
  const report = detectionReportStore.get(id);
  if (!report) {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 404;
    res.end(JSON.stringify({ code: 404, message: '报告不存在', data: null }));
    return;
  }
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ code: 0, message: 'success', data: { ...report, gene_profile: null } }));
});

// POST /api/detection/reports - 新增报告
server.middlewares.use('/api/detection/reports', (req, res, next) => {
  if (req.method !== 'POST') { next(); return; }
  let body = '';
  req.on('data', (chunk) => (body += chunk));
  req.on('end', () => {
    try {
      const data = JSON.parse(body || '{}');
      const id = detectionReportIdSeq++;
      const now = new Date();
      const nowTs = Date.now();
      detectionReportStore.set(id, {
        id,
        order_id: data.order_id || null,
        gene_profile_id: data.gene_profile_id || null,
        report_no: data.report_no || '',
        test_org: data.test_org || '',
        project: data.project || '',
        result: data.result || '',
        result_data: data.result_data || null,
        report_url: data.report_url || null,
        test_date: data.test_date || null,
        status: data.status || 'draft',
        created_at: nowTs,
      });
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ code: 0, message: '录入成功', data: { id } }));
    } catch (e) {
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 400;
      res.end(JSON.stringify({ code: 400, message: '请求参数错误', data: null }));
    }
  });
});

// PUT /api/detection/reports/:id - 更新报告
server.middlewares.use('/api/detection/reports', (req, res, next) => {
  if (req.method !== 'PUT') { next(); return; }
  const url = new URL(req.url, 'http://localhost');
  const match = url.pathname.match(/^\/(\d+)$/);
  if (!match) { next(); return; }
  const id = parseInt(match[1], 10);
  let body = '';
  req.on('data', (chunk) => (body += chunk));
  req.on('end', () => {
    try {
      const data = JSON.parse(body || '{}');
      const existing = detectionReportStore.get(id);
      if (!existing) {
        res.setHeader('Content-Type', 'application/json');
        res.statusCode = 404;
        res.end(JSON.stringify({ code: 404, message: '报告不存在', data: null }));
        return;
      }
      detectionReportStore.set(id, {
        ...existing,
        ...data,
        id,
        created_at: existing.created_at,
      });
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ code: 0, message: '更新成功', data: null }));
    } catch (e) {
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 400;
      res.end(JSON.stringify({ code: 400, message: '请求参数错误', data: null }));
    }
  });
});

// DELETE /api/detection/reports/:id - 删除报告
server.middlewares.use('/api/detection/reports', (req, res, next) => {
  if (req.method !== 'DELETE') { next(); return; }
  const url = new URL(req.url, 'http://localhost');
  const match = url.pathname.match(/^\/(\d+)$/);
  if (!match) { next(); return; }
  const id = parseInt(match[1], 10);
  detectionReportStore.delete(id);
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ code: 0, message: '删除成功', data: null }));
});

// Catch-all for other /api routes
server.middlewares.use('/api', (req, res, next) => {
  const skip = req.url?.startsWith('/api/auth') || req.url?.startsWith('/api/admin/dashboard') || req.url?.startsWith('/api/system/audit-logs') || req.url?.startsWith('/api/system/dictionaries') || req.url?.startsWith('/api/system/configs') || req.url?.startsWith('/api/detection');
  if (skip) { next(); return; }
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ code: 0, message: 'mock', data: null }));
});
    },
  };
}