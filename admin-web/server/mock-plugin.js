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

      // Catch-all for other /api routes
      server.middlewares.use('/api', (req, res, next) => {
        const skip = req.url?.startsWith('/api/auth') || req.url?.startsWith('/api/admin/dashboard');
        if (skip) { next(); return; }
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ code: 0, message: 'mock', data: null }));
      });
    },
  };
}