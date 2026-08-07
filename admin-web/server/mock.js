// Mock 用户数据
var MOCK_USER = {
    id: 1,
    username: 'admin',
    nickname: '超级管理员',
    avatar: '',
    roles: ['super_admin'],
    permissions: ['*'],
};
// 生成模拟 JWT (Base64)
function generateToken() {
    var header = { alg: 'HS256', typ: 'JWT' };
    var payload = {
        sub: '1',
        username: 'admin',
        exp: Date.now() + 24 * 60 * 60 * 1000,
    };
    var base64 = function (obj) { return Buffer.from(JSON.stringify(obj)).toString('base64'); };
    return "".concat(base64(header), ".").concat(base64(payload), ".mock_signature");
}
// Vite 中间件 Mock 插件
export function mockApiPlugin() {
    var tokenStore = new Map();
    return {
        name: 'vite-plugin-mock-api',
        configureServer: function (server) {
            server.middlewares.use('/api/auth/login', function (req, res) {
                if (req.method === 'POST') {
                    var body_1 = '';
                    req.on('data', function (chunk) { return body_1 += chunk; });
                    req.on('end', function () {
                        try {
                            var _a = JSON.parse(body_1), username = _a.username, password = _a.password;
                            if (username === 'admin' && password === 'admin123') {
                                var accessToken = generateToken();
                                var refreshToken = generateToken();
                                var expireAt = Date.now() + 24 * 60 * 60 * 1000;
                                tokenStore.set(accessToken, { userId: 1, expireAt: expireAt });
                                tokenStore.set(refreshToken, { userId: 1, expireAt: Date.now() + 7 * 24 * 60 * 60 * 1000 });
                                res.setHeader('Content-Type', 'application/json');
                                res.end(JSON.stringify({
                                    code: 0,
                                    message: '登录成功',
                                    data: {
                                        accessToken: accessToken,
                                        refreshToken: refreshToken,
                                        expiresIn: 86400,
                                    }
                                }));
                            }
                            else {
                                res.setHeader('Content-Type', 'application/json');
                                res.end(JSON.stringify({
                                    code: 1001,
                                    message: '用户名或密码错误',
                                    data: null
                                }));
                            }
                        }
                        catch (_b) {
                            res.setHeader('Content-Type', 'application/json');
                            res.statusCode = 400;
                            res.end(JSON.stringify({
                                code: 400,
                                message: '请求参数错误',
                                data: null
                            }));
                        }
                    });
                }
            });
            // GET /api/auth/profile - 获取用户信息
            server.middlewares.use('/api/auth/profile', function (req, res) {
                if (req.method === 'GET') {
                    var authHeader = req.headers.authorization || '';
                    var token = authHeader.replace('Bearer ', '');
                    if (!token || !tokenStore.has(token)) {
                        res.statusCode = 401;
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({
                            code: 401,
                            message: '未授权或Token已过期',
                            data: null
                        }));
                        return;
                    }
                    var tokenInfo = tokenStore.get(token);
                    if (Date.now() > tokenInfo.expireAt) {
                        tokenStore.delete(token);
                        res.statusCode = 401;
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({
                            code: 401,
                            message: 'Token已过期,请重新登录',
                            data: null
                        }));
                        return;
                    }
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({
                        code: 0,
                        message: 'success',
                        data: MOCK_USER
                    }));
                }
            });
            // POST /api/auth/refresh - 刷新Token
            server.middlewares.use('/api/auth/refresh', function (req, res) {
                if (req.method === 'POST') {
                    var body_2 = '';
                    req.on('data', function (chunk) { return body_2 += chunk; });
                    req.on('end', function () {
                        try {
                            var oldRefreshToken = JSON.parse(body_2).refreshToken;
                            // 清理旧 token
                            if (tokenStore.has(oldRefreshToken)) {
                                tokenStore.delete(oldRefreshToken);
                            }
                            // 生成新 token
                            var newAccessToken = generateToken();
                            var newRefreshToken = generateToken();
                            tokenStore.set(newAccessToken, { userId: 1, expireAt: Date.now() + 24 * 60 * 60 * 1000 });
                            tokenStore.set(newRefreshToken, { userId: 1, expireAt: Date.now() + 7 * 24 * 60 * 60 * 1000 });
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({
                                code: 0,
                                message: '刷新成功',
                                data: {
                                    accessToken: newAccessToken,
                                    refreshToken: newRefreshToken,
                                    expiresIn: 86400,
                                }
                            }));
                        }
                        catch (_a) {
                            res.statusCode = 400;
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({
                                code: 400,
                                message: '请求参数错误',
                                data: null
                            }));
                        }
                    });
                }
            });
            // GET /api/admin/dashboard/overview - Dashboard 数据
            server.middlewares.use('/api/admin/dashboard/overview', function (req, res) {
                if (req.method === 'GET') {
                    var authHeader = req.headers.authorization || '';
                    var token = authHeader.replace('Bearer ', '');
                    if (!token || !tokenStore.has(token)) {
                        res.statusCode = 401;
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({
                            code: 401,
                            message: '未授权',
                            data: null
                        }));
                        return;
                    }
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({
                        code: 0,
                        message: 'success',
                        data: {
                            summary: {
                                gene_total: 1284,
                                gene_trend: 12.5,
                                gene_today: 23,
                                nft_total: 856,
                                nft_trend: 8.3,
                                nft_today: 5,
                                race_active: 3,
                                race_trend: 0,
                                race_today_start: 1,
                                user_total: 2340,
                                user_trend: 6.7,
                                user_today: 12,
                            },
                            trend: {
                                dates: ['8/1', '8/2', '8/3', '8/4', '8/5', '8/6', '8/7'],
                                gene_new: [15, 18, 12, 23, 21, 19, 23],
                                user_new: [8, 10, 6, 15, 12, 9, 12],
                                nft_new: [2, 3, 1, 5, 4, 3, 5],
                            },
                            alerts: [
                                { id: '1', level: 'warning', title: '赛事预警:「冬季精英赛」报名不足100羽,距报名截止仅剩3天', time: '1小时前', link: '/competition/list' },
                                { id: '2', level: 'success', title: 'NFT铸造: 已连续3天铸造成功率达100%,系统运行稳定', time: '3小时前', link: '/nft/list' },
                                { id: '3', level: 'info', title: '提醒: 明日有2场赛事即将开赛,请关注参赛鸽状态', time: '5小时前', link: '/competition/list' },
                            ],
                            quick_entries: {
                                gene_pending: 12,
                                nft_pending: 5,
                                race_active: 3,
                                user_pending: 8,
                            },
                            port_analysis: {
                                register: [
                                    { channel: '网页注册', value: 1234, color: '#1677ff' },
                                    { channel: 'APP 注册', value: 856, color: '#52c41a' },
                                    { channel: '小程序注册', value: 678, color: '#faad14' },
                                    { channel: '第三方 OAuth', value: 234, color: '#722ed1' },
                                ],
                                login: [
                                    { channel: '网页登录', value: 2345, color: '#1677ff' },
                                    { channel: 'APP 登录', value: 1856, color: '#52c41a' },
                                    { channel: '小程序登录', value: 1234, color: '#faad14' },
                                    { channel: '扫码登录', value: 856, color: '#eb2f96' },
                                    { channel: '第三方登录', value: 456, color: '#722ed1' },
                                ],
                            },
                        }
                    }));
                }
            });
        },
    };
}
