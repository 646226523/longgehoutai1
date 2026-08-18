var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
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
            var _this = this;
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
            // GET /api/gene/profiles/check-ring - 检查足环号唯一性
            server.middlewares.use('/api/gene/profiles/check-ring', function (req, res) {
                if (req.method === 'GET') {
                    var url = new URL(req.url, 'http://localhost');
                    var ring_number = url.searchParams.get('ring_number') || '';
                    var exists = ring_number.startsWith('CN-2020') || ring_number === 'CN-2026-01-000001';
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ code: 0, message: 'success', data: { exists: exists } }));
                }
            });
            // GET /api/gene/owners - 搜索鸽主
            var MOCK_OWNERS = [
                { id: 1, name: '北京赵氏铭家', phone: '13800008888' },
                { id: 2, name: '上海李记鸽舍', phone: '13900007777' },
                { id: 3, name: '广州鹏程鸽业', phone: '13700006666' },
                { id: 4, name: '深圳鸿鹄鸽舍', phone: '13600005555' },
                { id: 5, name: '杭州西湖鸽苑', phone: '13500004444' },
            ];
            server.middlewares.use('/api/gene/owners', function (req, res) {
                if (req.method === 'GET') {
                    var url = new URL(req.url, 'http://localhost');
                    var keyword_1 = (url.searchParams.get('keyword') || '').toLowerCase();
                    var filtered = keyword_1
                        ? MOCK_OWNERS.filter(function (o) { return o.name.toLowerCase().includes(keyword_1); })
                        : MOCK_OWNERS;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ code: 0, message: 'success', data: filtered }));
                }
            });
            // GET /api/gene/profiles/search - 搜索基因档案(供父/母选择器)
            var MOCK_GENE_PROFILES = [
                { id: 1, ring_number: 'CN-2024-01-123456', name: '灰精灵', gender: 'male', breed: '詹森', color: '灰', eye_color: '黄眼', achievement: '500KM 冠军', owner_name: '北京赵氏铭家', owner_id: 1, photo_url: '' },
                { id: 2, ring_number: 'CN-2024-02-234567', name: '闪电侠', gender: 'male', breed: '贺尔梅斯', color: '雨点', eye_color: '砂眼', achievement: '300KM 亚军', owner_name: '上海李记鸽舍', owner_id: 2, photo_url: '' },
                { id: 3, ring_number: 'CN-2025-01-345678', name: '白雪公主', gender: 'female', breed: '盖比', color: '白', eye_color: '牛眼', achievement: '', owner_name: '广州鹏程鸽业', owner_id: 3, photo_url: '' },
                { id: 4, ring_number: 'CN-2025-03-456789', name: '冠军号', gender: 'male', breed: '凡龙', color: '灰', eye_color: '黄眼', achievement: '1000KM 冠军', owner_name: '深圳鸿鹄鸽舍', owner_id: 4, photo_url: '' },
                { id: 5, ring_number: 'CN-2023-01-567890', name: '老将军', gender: 'male', breed: '胡本', color: '石板', eye_color: '砂眼', achievement: '多次入赏', owner_name: '北京赵氏铭家', owner_id: 1, photo_url: '' },
                { id: 6, ring_number: 'CN-2023-02-678901', name: '金凤凰', gender: 'female', breed: '杨阿腾', color: '红轮', eye_color: '黄眼', achievement: '', owner_name: '杭州西湖鸽苑', owner_id: 5, photo_url: '' },
                { id: 7, ring_number: 'CN-2026-01-789012', name: '新希望', gender: 'male', breed: '詹森', color: '雨点', eye_color: '砂眼', achievement: '', owner_name: '上海李记鸽舍', owner_id: 2, photo_url: '' },
                { id: 8, ring_number: 'CN-2026-02-890123', name: '月光女神', gender: 'female', breed: '盖比', color: '花', eye_color: '牛眼', achievement: '地方赛 4 名', owner_name: '广州鹏程鸽业', owner_id: 3, photo_url: '' },
                { id: 9, ring_number: 'CN-2025-04-901234', name: '疾风', gender: 'male', breed: '贺尔梅斯', color: '灰', eye_color: '黄眼', achievement: '', owner_name: '深圳鸿鹄鸽舍', owner_id: 4, photo_url: '' },
                { id: 10, ring_number: 'CN-2024-05-012345', name: '乌云', gender: 'female', breed: '凡龙', color: '石板', eye_color: '砂眼', achievement: '公棚决赛 12 名', owner_name: '杭州西湖鸽苑', owner_id: 5, photo_url: '' },
            ];
            server.middlewares.use('/api/gene/profiles/search', function (req, res) {
                if (req.method === 'GET') {
                    var url = new URL(req.url, 'http://localhost');
                    var keyword_2 = (url.searchParams.get('keyword') || '').toLowerCase();
                    var filtered = keyword_2
                        ? MOCK_GENE_PROFILES.filter(function (p) {
                            return p.ring_number.toLowerCase().includes(keyword_2) || p.name.toLowerCase().includes(keyword_2);
                        })
                        : MOCK_GENE_PROFILES;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ code: 0, message: 'success', data: filtered }));
                }
            });
            // POST /api/upload - 上传图片
            server.middlewares.use('/api/upload', function (req, res) {
                if (req.method === 'POST') {
                    req.on('data', function () { });
                    req.on('end', function () {
                        var mockUrl = "/uploads/mock_".concat(Date.now(), ".jpg");
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({ code: 0, message: 'success', data: { url: mockUrl } }));
                    });
                }
            });
            // ============ 基因档案 Mock 数据存储 ============
            var GENE_PROFILES_STORE = [
                {
                    id: 1,
                    ring_number: 'CN-2024-01-123456',
                    name: '灰精灵',
                    gender: 'male',
                    breed: '詹森',
                    bloodline: '詹森 × 凡龙',
                    owner_name: '北京赵氏铭家',
                    owner_phone: '13800008888',
                    color: '灰',
                    eye_color: '砂眼',
                    birth_date: '2024-01-15',
                    gene_sequence: 'GENE-A-001',
                    qr_code: '/uploads/qrcode_1.png',
                    photo_url: '',
                    status: 1,
                    created_at: Date.now() - 86400000 * 30,
                    updated_at: Date.now() - 86400000 * 5,
                    sire_id: null,
                    dam_id: null,
                    sire_ring: null,
                    sire_name: null,
                    dam_ring: null,
                    dam_name: null,
                },
                {
                    id: 2,
                    ring_number: 'CN-2024-02-234567',
                    name: '闪电侠',
                    gender: 'male',
                    breed: '贺尔梅斯',
                    bloodline: '贺尔梅斯 × 詹森',
                    owner_name: '上海李记鸽舍',
                    owner_phone: '13900007777',
                    color: '雨点',
                    eye_color: '黄眼',
                    birth_date: '2024-02-20',
                    gene_sequence: 'GENE-A-002',
                    qr_code: '/uploads/qrcode_2.png',
                    photo_url: '',
                    status: 1,
                    created_at: Date.now() - 86400000 * 20,
                    updated_at: Date.now() - 86400000 * 3,
                    sire_id: null,
                    dam_id: null,
                    sire_ring: null,
                    sire_name: null,
                    dam_ring: null,
                    dam_name: null,
                },
                {
                    id: 3,
                    ring_number: 'CN-2026-01-000001',
                    name: '冠军号',
                    gender: 'male',
                    breed: '盖比',
                    bloodline: '盖比 × 贺尔梅斯',
                    owner_name: '广州鹏程鸽业',
                    owner_phone: '13700006666',
                    color: '白',
                    eye_color: '牛眼',
                    birth_date: '2026-01-01',
                    gene_sequence: 'GENE-A-003',
                    qr_code: '/uploads/qrcode_3.png',
                    photo_url: '',
                    status: 1,
                    created_at: Date.now() - 86400000 * 10,
                    updated_at: Date.now() - 86400000 * 1,
                    sire_id: null,
                    dam_id: null,
                    sire_ring: null,
                    sire_name: null,
                    dam_ring: null,
                    dam_name: null,
                },
            ];
            var geneProfileIdCounter = 4;
            // GET /api/gene/profiles/:id/tests - 获取基因检测记录
            server.middlewares.use('/api/gene/profiles', function (req, res, next) {
                if (req.method === 'GET') {
                    var url = new URL(req.url, 'http://localhost');
                    var pathname = url.pathname;
                    // 匹配 /api/gene/profiles/:id/tests
                    var testsMatch = pathname.match(/^\/api\/gene\/profiles\/(\d+)\/tests\/?$/);
                    if (testsMatch) {
                        var profileId = parseInt(testsMatch[1], 10);
                        var MOCK_TESTS = [
                            {
                                id: 1,
                                gene_profile_id: profileId,
                                test_org: '中国农业科学院',
                                project: '基因身份鉴定',
                                report_no: 'GENE-2024-001',
                                result: '样本合格，基因位点匹配度 99.99%',
                                report_url: '/uploads/report_1.pdf',
                                test_date: '2024-06-15',
                                created_at: Date.now() - 86400000 * 30,
                            },
                            {
                                id: 2,
                                gene_profile_id: profileId,
                                test_org: '北京信鸽检测中心',
                                project: '亲缘关系鉴定',
                                report_no: 'GENE-2024-002',
                                result: '亲缘关系确认：父本匹配率 99.8%',
                                report_url: '/uploads/report_2.pdf',
                                test_date: '2024-07-20',
                                created_at: Date.now() - 86400000 * 15,
                            },
                            {
                                id: 3,
                                gene_profile_id: profileId,
                                test_org: '深圳华大基因',
                                project: '全基因组测序',
                                report_no: null,
                                result: '正在检测中...',
                                report_url: null,
                                test_date: null,
                                created_at: Date.now() - 86400000 * 3,
                            },
                        ];
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({ code: 0, message: 'success', data: MOCK_TESTS }));
                        return; // 重要：直接返回，不继续传递
                    }
                }
                next(); // 不匹配时继续传递给下一个中间件
            });
            // GET /api/gene/profiles - 基因档案分页列表
            // 支持?id=xxx 单条查询,支持 PUT/DELETE 通过 ?_method=... 或 POST /api/gene/profiles/:id
            server.middlewares.use('/api/gene/profiles', function (req, res) {
                if (req.method === 'GET') {
                    var url = new URL(req.url, 'http://localhost');
                    var idParam = url.searchParams.get('id');
                    // 单条查询
                    if (idParam) {
                        var id_1 = parseInt(idParam, 10);
                        var item = GENE_PROFILES_STORE.find(function (p) { return p.id === id_1; });
                        if (!item) {
                            res.statusCode = 404;
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ code: 404, message: '未找到档案', data: null }));
                            return;
                        }
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({ code: 0, message: 'success', data: item }));
                        return;
                    }
                    // 列表查询
                    var page = parseInt(url.searchParams.get('current') || '1', 10);
                    var pageSize = parseInt(url.searchParams.get('pageSize') || '10', 10);
                    var ringKeyword_1 = (url.searchParams.get('ring_number') || '').toLowerCase();
                    var ownerKeyword_1 = (url.searchParams.get('owner_name') || '').toLowerCase();
                    var bloodlineKeyword_1 = (url.searchParams.get('bloodline') || '').toLowerCase();
                    var statusFilter = url.searchParams.get('status');
                    var filtered = GENE_PROFILES_STORE.slice();
                    if (ringKeyword_1)
                        filtered = filtered.filter(function (p) { return p.ring_number.toLowerCase().includes(ringKeyword_1); });
                    if (ownerKeyword_1)
                        filtered = filtered.filter(function (p) { return p.owner_name.toLowerCase().includes(ownerKeyword_1); });
                    if (bloodlineKeyword_1)
                        filtered = filtered.filter(function (p) { return (p.bloodline || '').toLowerCase().includes(bloodlineKeyword_1); });
                    if (statusFilter !== null && statusFilter !== '') {
                        var statusNum_1 = parseInt(statusFilter, 10);
                        if (!isNaN(statusNum_1))
                            filtered = filtered.filter(function (p) { return p.status === statusNum_1; });
                    }
                    var total = filtered.length;
                    var start = (page - 1) * pageSize;
                    var list = filtered.slice(start, start + pageSize);
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({
                        code: 0,
                        message: 'success',
                        data: { list: list, total: total },
                    }));
                }
                else if (req.method === 'POST') {
                    // 如果 URL 含有 /:id,则作为 PUT/DELETE 处理
                    var url = new URL(req.url, 'http://localhost');
                    var pathname = url.pathname;
                    var idMatch = pathname.match(/^\/api\/gene\/profiles\/(\d+)\/?$/);
                    if (idMatch) {
                        var id_2 = parseInt(idMatch[1], 10);
                        var body_3 = '';
                        req.on('data', function (chunk) { return body_3 += chunk; });
                        req.on('end', function () {
                            try {
                                var idx = GENE_PROFILES_STORE.findIndex(function (p) { return p.id === id_2; });
                                if (idx === -1) {
                                    res.statusCode = 404;
                                    res.setHeader('Content-Type', 'application/json');
                                    res.end(JSON.stringify({ code: 404, message: '未找到档案', data: null }));
                                    return;
                                }
                                var updates = JSON.parse(body_3);
                                GENE_PROFILES_STORE[idx] = __assign(__assign(__assign({}, GENE_PROFILES_STORE[idx]), updates), { id: id_2, updated_at: Date.now() });
                                res.setHeader('Content-Type', 'application/json');
                                res.end(JSON.stringify({ code: 0, message: 'success', data: null }));
                            }
                            catch (_a) {
                                res.statusCode = 400;
                                res.setHeader('Content-Type', 'application/json');
                                res.end(JSON.stringify({ code: 400, message: '请求参数错误', data: null }));
                            }
                        });
                        return;
                    }
                    // 新增基因档案
                    var body_4 = '';
                    req.on('data', function (chunk) { return body_4 += chunk; });
                    req.on('end', function () {
                        try {
                            var newProfile = JSON.parse(body_4);
                            var id = geneProfileIdCounter++;
                            var created = __assign(__assign({}, newProfile), { id: id, qr_code: "/uploads/qrcode_".concat(id, ".png"), created_at: Date.now(), updated_at: Date.now(), sire_ring: null, sire_name: null, dam_ring: null, dam_name: null });
                            GENE_PROFILES_STORE.unshift(created);
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({
                                code: 0,
                                message: 'success',
                                data: { id: id },
                            }));
                        }
                        catch (_a) {
                            res.statusCode = 400;
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ code: 400, message: '请求参数错误', data: null }));
                        }
                    });
                }
                else if (req.method === 'PUT' || req.method === 'DELETE') {
                    // Express 会剥离已匹配前缀,用 originalUrl 获取完整路径
                    var fullUrl = req.originalUrl || req.url;
                    var url = new URL(fullUrl, 'http://localhost');
                    var pathname = url.pathname;
                    var segments = pathname.split('/').filter(Boolean);
                    // 最后一段应为数字 ID,如 /api/gene/profiles/1 -> segments = ['api','gene','profiles','1']
                    var lastSeg = segments[segments.length - 1];
                    var id_3 = parseInt(lastSeg, 10);
                    var isValidId = !isNaN(id_3) && String(id_3) === lastSeg && segments.length >= 4 && segments[0] === 'api' && segments[1] === 'gene' && segments[2] === 'profiles';
                    if (!isValidId) {
                        res.statusCode = 404;
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({ code: 404, message: '路径不存在', pathname: pathname, segments: segments }));
                        return;
                    }
                    if (req.method === 'PUT') {
                        var body_5 = '';
                        req.on('data', function (chunk) { return body_5 += chunk; });
                        req.on('end', function () {
                            try {
                                var idx = GENE_PROFILES_STORE.findIndex(function (p) { return p.id === id_3; });
                                if (idx === -1) {
                                    res.statusCode = 404;
                                    res.setHeader('Content-Type', 'application/json');
                                    res.end(JSON.stringify({ code: 404, message: '未找到档案', data: null }));
                                    return;
                                }
                                var updates = JSON.parse(body_5);
                                GENE_PROFILES_STORE[idx] = __assign(__assign(__assign({}, GENE_PROFILES_STORE[idx]), updates), { id: id_3, updated_at: Date.now() });
                                res.setHeader('Content-Type', 'application/json');
                                res.end(JSON.stringify({ code: 0, message: 'success', data: null }));
                            }
                            catch (_a) {
                                res.statusCode = 400;
                                res.setHeader('Content-Type', 'application/json');
                                res.end(JSON.stringify({ code: 400, message: '请求参数错误', data: null }));
                            }
                        });
                    }
                    else {
                        var idx = GENE_PROFILES_STORE.findIndex(function (p) { return p.id === id_3; });
                        if (idx === -1) {
                            res.statusCode = 404;
                            res.setHeader('Content-Type', 'application/json');
                            res.end(JSON.stringify({ code: 404, message: '未找到档案', data: null }));
                            return;
                        }
                        GENE_PROFILES_STORE.splice(idx, 1);
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({ code: 0, message: 'success', data: null }));
                    }
                }
            });
            // GET /api/gene/dicts - 获取字典数据
            server.middlewares.use('/api/gene/dicts', function (req, res) {
                if (req.method === 'GET') {
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({
                        code: 0,
                        message: 'success',
                        data: {
                            colors: ['灰', '雨点', '白', '红轮', '花', '石板', '其他'],
                            eye_colors: ['黄眼', '砂眼', '牛眼'],
                            genders: [
                                { label: '雄', value: 'male' },
                                { label: '雌', value: 'female' },
                                { label: '未知', value: 'unknown' },
                            ],
                            statuses: [
                                { label: '正常', value: 1 },
                                { label: '停用', value: 0 },
                            ],
                            breeds: ['詹森', '贺尔梅斯', '盖比', '凡龙', '胡本', '杨阿腾'],
                            bloodlines: ['詹森 × 凡龙', '贺尔梅斯 × 詹森', '盖比 × 贺尔梅斯', '詹森 × 胡本', '杨阿腾 × 凡龙', '盖比 × 凡龙'],
                        },
                    }));
                }
            });
            // ============ NFT 资产 Mock 数据存储 ============
            var STATUS_META = {
                draft: { status: 'draft', label: '草稿' },
                pending: { status: 'pending', label: '待审核' },
                approved: { status: 'approved', label: '审核通过' },
                minting: { status: 'minting', label: '上链中' },
                minted: { status: 'minted', label: '已上链' },
                failed: { status: 'failed', label: '上链失败' },
                rejected: { status: 'rejected', label: '已驳回' },
            };
            var NFT_ASSETS_STORE = [];
            var NFT_ASSET_ID_SEQ = 1;
            var NFT_TASKS_STORE = [];
            var NFT_TASK_ID_SEQ = 1;
            function todayStartTs() {
                var d = new Date();
                d.setHours(0, 0, 0, 0);
                return d.getTime();
            }
            function randomHex(len) {
                try {
                    var arr = new Uint8Array(Math.ceil(len / 2));
                    crypto.getRandomValues(arr);
                    var hex = Array.from(arr).map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
                    return hex.slice(0, len).padEnd(len, '0').toLowerCase();
                }
                catch (_a) {
                    var s = '';
                    while (s.length < len)
                        s += Math.random().toString(16).slice(2);
                    return s.slice(0, len).padEnd(len, '0').toLowerCase();
                }
            }
            function readJsonBody(req) {
                return new Promise(function (resolve) {
                    var raw = '';
                    req.on('data', function (chunk) { raw += chunk; });
                    req.on('end', function () {
                        try {
                            resolve(raw ? JSON.parse(raw) : {});
                        }
                        catch (_a) {
                            resolve({});
                        }
                    });
                });
            }
            function sendJson(res, data, code, message) {
                if (code === void 0) { code = 0; }
                if (message === void 0) { message = 'success'; }
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ code: code, message: message, data: data }));
            }
            function toPublicAsset(item) {
                var meta = STATUS_META[item.status] || STATUS_META.draft;
                var geneBrief = item._geneBrief || null;
                var base = {
                    id: item.id,
                    token_id: item.token_id || null,
                    gene_profile_id: item.gene_profile_id || null,
                    name: item.name,
                    description: item.description || null,
                    image_url: item.image_url || null,
                    metadata: typeof item.metadata === 'string' ? item.metadata : (item.metadata != null ? JSON.stringify(item.metadata) : null),
                    owner_name: item.owner_name || '',
                    status: meta.status,
                    status_label: meta.label,
                    contract_address: item.contract_address || null,
                    tx_hash: item.tx_hash || null,
                    minted_at: item.minted_at || null,
                    created_at: item.created_at,
                    updated_at: item.updated_at,
                    gene_profile: geneBrief,
                };
                return base;
            }
            function toPublicTask(task) {
                var asset = task._assetRef || NFT_ASSETS_STORE.find(function (a) { return a.id === task.nft_asset_id; });
                return {
                    id: task.id,
                    nft_asset_id: task.nft_asset_id,
                    status: task.status,
                    retry_count: task.retry_count | 0,
                    error_msg: task.error_msg || null,
                    tx_hash: task.tx_hash || null,
                    contract_address: task.contract_address || null,
                    started_at: task.started_at || null,
                    finished_at: task.finished_at || null,
                    created_at: task.created_at,
                    block_current: task.block_current | 0,
                    block_target: task.block_target | 12,
                    asset_name: asset ? asset.name : null,
                    token_id: asset ? asset.token_id || null : null,
                    owner_name: asset ? asset.owner_name || '' : null,
                };
            }
            function scheduleMintTask(task) {
                if (task._timerId) {
                    clearInterval(task._timerId);
                    task._timerId = null;
                }
                setTimeout(function startStep() {
                    task.status = 'executing';
                    task.started_at = Date.now();
                    if (task._assetRef)
                        task._assetRef.status = 'minting';
                    task._timerId = setInterval(function tick() {
                        var r = Math.random();
                        var err = null;
                        if (r < 0.1)
                            err = 'Gas 不足';
                        else if (r < 0.2)
                            err = '网络拥堵';
                        else if (r < 0.25)
                            err = '合约异常';
                        if (err) {
                            var isRecoverable = err === 'Gas 不足' || err === '网络拥堵';
                            if (isRecoverable && (task.retry_count | 0) < 3) {
                                task.retry_count = (task.retry_count | 0) + 1;
                                var tryNum = task.retry_count | 0;
                                clearInterval(task._timerId);
                                task._timerId = null;
                                task.error_msg = err + '，30s 后自动重试第 ' + tryNum + ' 次';
                                setTimeout(function retryStart() {
                                    task.error_msg = null;
                                    task.status = 'executing';
                                    task.block_current = Math.max(0, (task.block_current | 0) - 2);
                                    task._timerId = setInterval(tick, 1000);
                                }, 30000);
                                return;
                            }
                            else {
                                task.status = 'failed';
                                task.error_msg = err;
                                task.finished_at = Date.now();
                                if (task._assetRef) {
                                    task._assetRef.status = 'failed';
                                    task._assetRef.tx_hash = null;
                                }
                                clearInterval(task._timerId);
                                task._timerId = null;
                                return;
                            }
                        }
                        var target = task.block_target | 12;
                        task.block_current = Math.min((task.block_current | 0) + 1, target);
                        var block = task.block_current | 0;
                        if (block < 6) {
                            task.status = 'executing';
                        }
                        else if (block < target) {
                            task.status = 'confirming';
                        }
                        else if (block === target) {
                            task.status = 'completed';
                            task.finished_at = Date.now();
                            task.tx_hash = '0x' + randomHex(40);
                            task.contract_address = '0x' + randomHex(40);
                            if (task._assetRef) {
                                task._assetRef.status = 'minted';
                                task._assetRef.tx_hash = task.tx_hash;
                                task._assetRef.contract_address = task.contract_address;
                                task._assetRef.minted_at = Date.now();
                                if (!task._assetRef.token_id)
                                    task._assetRef.token_id = '#' + (1023 + task.id);
                            }
                            clearInterval(task._timerId);
                            task._timerId = null;
                        }
                    }, 1000);
                }, 500);
            }
            // ============ 种子初始化：10 pending + 2 minting + 18 completed + 5 rejected ============
            function initSeedData(params) {
                var _a, _b, _c, _d, _e;
                if (params === void 0) { params = {}; }
                var PENDING_COUNT = Number((_a = params.pending) !== null && _a !== void 0 ? _a : 10);
                var MINTING_COUNT = Number((_b = params.minting) !== null && _b !== void 0 ? _b : 2);
                var COMPLETED_COUNT = Number((_c = params.completed) !== null && _c !== void 0 ? _c : 18);
                var REJECTED_COUNT = Number((_d = params.rejected) !== null && _d !== void 0 ? _d : 5);
                var FAILED_COUNT = Number((_e = params.failed) !== null && _e !== void 0 ? _e : 5);
                NFT_ASSETS_STORE.length = 0;
                NFT_TASKS_STORE.length = 0;
                NFT_ASSET_ID_SEQ = 1;
                NFT_TASK_ID_SEQ = 1;
                var now = Date.now();
                var ts = todayStartTs();
                var pigeonNames = [
                    '灰精灵', '闪电侠', '白雪公主', '冠军号', '老将军', '金凤凰',
                    '新希望', '月光女神', '疾风', '乌云', '红霸王', '蓝宝石',
                    '天狼星', '北极光', '银河一号', '风暴使者', '太阳之子', '幻影骑士',
                    '极速先锋', '王者归来', '不败神话', '东方明珠', '天骄一号', '荣耀之星',
                    '战神号', '雷霆万钧', '绝代双骄', '凤凰涅槃'
                ];
                var breeds = ['詹森', '贺尔梅斯', '盖比', '凡龙', '胡本', '杨阿腾'];
                var colors = ['灰', '雨点', '白', '石板', '红轮', '花'];
                var owners = ['北京赵氏铭家', '上海李记鸽舍', '广州鹏程鸽业', '深圳鸿鹄鸽舍', '杭州西湖鸽苑'];
                function makeAsset(override) {
                    if (override === void 0) { override = {}; }
                    var idx = NFT_ASSET_ID_SEQ;
                    var geneIdx = ((idx - 1) % MOCK_GENE_PROFILES.length);
                    var gene = MOCK_GENE_PROFILES[geneIdx];
                    var name = pigeonNames[(idx - 1) % pigeonNames.length] + ' #' + idx;
                    var record = __assign({ id: NFT_ASSET_ID_SEQ++, token_id: null, gene_profile_id: (gene === null || gene === void 0 ? void 0 : gene.id) || null, name: name, description: "\u8D5B\u9E3D ".concat(name, "\uFF0C\u54C1\u7CFB ").concat(breeds[idx % breeds.length], "\uFF0C\u7FBD\u8272 ").concat(colors[idx % colors.length]), image_url: idx % 2 === 0
                            ? '/鸽子1.jpg'
                            : (idx % 3 === 0 ? '/鸽子2.jpg' : '/鸽子3.jpg'), metadata: {
                            breed: breeds[idx % breeds.length],
                            color: colors[idx % colors.length],
                            gender: idx % 2 === 0 ? 'male' : 'female',
                            birth_year: 2023 + (idx % 3),
                            custom_attrs: [
                                { key: '赛绩', value: "".concat(500 - idx * 10, "KM \u7B2C").concat(idx % 20 + 1, "\u540D") },
                                { key: '【自定义】血统等级', value: 'S级', custom: true },
                            ]
                        }, owner_name: owners[idx % owners.length], status: 'pending', contract_address: null, tx_hash: null, minted_at: null, created_at: now - (idx * 3600 * 1000), updated_at: now - (idx * 1800 * 1000), _geneBrief: gene ? {
                            id: gene.id, ring_number: gene.ring_number,
                            name: gene.name, owner_name: gene.owner_name || ''
                        } : null }, override);
                    NFT_ASSETS_STORE.push(record);
                    return record;
                }
                function makeTask(asset, override) {
                    if (override === void 0) { override = {}; }
                    var task = __assign({ id: NFT_TASK_ID_SEQ++, nft_asset_id: asset.id, status: 'pending', retry_count: 0, error_msg: null, tx_hash: null, contract_address: null, started_at: null, finished_at: null, created_at: now - (3600 * 1000), block_current: 0, block_target: 12, _assetRef: asset }, override);
                    NFT_TASKS_STORE.push(task);
                    return task;
                }
                // 3 pending 资产（不建 task）
                for (var i = 0; i < PENDING_COUNT; i++)
                    makeAsset({ status: 'pending' });
                // MINTING_COUNT minting 资产（进入上链中）
                for (var i = 0; i < MINTING_COUNT; i++) {
                    var a = makeAsset({ status: 'minting' });
                    var t = makeTask(a, {
                        status: i === 0 ? 'confirming' : 'executing',
                        started_at: now - 10000,
                        block_current: i === 0 ? 7 : 3,
                        block_target: 12
                    });
                    scheduleMintTask(t);
                }
                // COMPLETED_COUNT completed/minted 资产
                for (var i = 0; i < COMPLETED_COUNT; i++) {
                    var txh = '0x' + randomHex(40);
                    var ca = '0x' + randomHex(40);
                    var created = ts + 1000 * (i * 300 + 600);
                    var finished = created + 1000 * (30 + (i % 7) * 5);
                    var a = makeAsset({
                        status: 'minted',
                        tx_hash: txh,
                        contract_address: ca,
                        minted_at: finished,
                        token_id: '#' + (2000 + i),
                        approved_at: created
                    });
                    makeTask(a, {
                        status: 'completed',
                        tx_hash: txh,
                        contract_address: ca,
                        created_at: created,
                        started_at: created + 800,
                        finished_at: finished,
                        block_current: 12,
                        block_target: 12
                    });
                }
                // REJECTED_COUNT rejected 资产
                for (var i = 0; i < REJECTED_COUNT; i++) {
                    makeAsset({
                        status: 'rejected',
                        rejected_at: now - (i + 1) * 7200 * 1000,
                        rejected_by: 'admin',
                        audit_remark: i === 0
                            ? '信息不完整，缺少赛绩记录'
                            : (i === 1 ? '基因档案资料不匹配' : '足环号无法核实，请重新提交')
                    });
                }
                // FAILED_COUNT failed 任务（completed Tab 显示失败）
                for (var i = 0; i < FAILED_COUNT; i++) {
                    var a = makeAsset({ status: 'failed' });
                    makeTask(a, {
                        status: 'failed',
                        retry_count: Math.min(i, 3),
                        error_msg: i % 2 === 0 ? '合约异常：out of gas' : '网络拥堵，交易超时',
                        created_at: ts + 2000 * (i + 10),
                        started_at: ts + 2000 * (i + 10) + 500,
                        finished_at: ts + 2000 * (i + 10) + 15000,
                        block_current: 3 + i,
                        block_target: 12
                    });
                }
            }
            initSeedData();
            // 手动重置 mock 种子数据（POST /api/nft/assets/seed-reset?pending=10&rejected=5...）
            server.middlewares.use('/api/nft/assets/seed-reset', function (req, res) { return __awaiter(_this, void 0, void 0, function () {
                var url, params, query, _i, _a, _b, k, v, _c, _d, _e, k, v;
                return __generator(this, function (_f) {
                    try {
                        url = new URL(req.url || '/', 'http://localhost');
                        params = {};
                        query = Object.fromEntries(url.searchParams.entries());
                        for (_i = 0, _a = Object.entries(query); _i < _a.length; _i++) {
                            _b = _a[_i], k = _b[0], v = _b[1];
                            params[k] = v;
                        }
                        if (req.method === 'POST' && req.body) {
                            for (_c = 0, _d = Object.entries(req.body || {}); _c < _d.length; _c++) {
                                _e = _d[_c], k = _e[0], v = _e[1];
                                params[k] = v;
                            }
                        }
                        initSeedData(params);
                        res.statusCode = 200;
                        res.end(JSON.stringify({
                            code: 0,
                            message: 'seed reset ok',
                            data: {
                                pending: NFT_ASSETS_STORE.filter(function (x) { return x.status === 'pending'; }).length,
                                minting: NFT_ASSETS_STORE.filter(function (x) { return x.status === 'minting'; }).length,
                                completed: NFT_ASSETS_STORE.filter(function (x) { return x.status === 'minted'; }).length,
                                rejected: NFT_ASSETS_STORE.filter(function (x) { return x.status === 'rejected'; }).length,
                                failed: NFT_ASSETS_STORE.filter(function (x) { return x.status === 'failed'; }).length,
                                tasks: NFT_TASKS_STORE.length
                            }
                        }));
                    }
                    catch (e) {
                        res.statusCode = 500;
                        res.end(JSON.stringify({ code: -1, message: String(e) }));
                    }
                    return [2 /*return*/];
                });
            }); });
            // NFT 资产路由（合并处理，避免 prefix strip 导致 req.url 判断失效）
            server.middlewares.use('/api/nft/assets', function (req, res, next) { return __awaiter(_this, void 0, void 0, function () {
                var method, stripped, url, page, pageSize, name_1, status_1, owner_name_1, list, total, start, paged, body_6, now, gene, geneBrief, record, match, id, action, idx, item, detail, body_7, patch, _i, _a, k, gene;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            method = req.method || 'GET';
                            stripped = (req.url || '/').split('?')[0].replace(/\/+$/, '') || '/';
                            if (!(stripped === '' || stripped === '/')) return [3 /*break*/, 3];
                            if (method === 'GET') {
                                url = new URL(req.url || '/', 'http://localhost');
                                page = Number(url.searchParams.get('page') || 1);
                                pageSize = Number(url.searchParams.get('pageSize') || 10);
                                name_1 = (url.searchParams.get('name') || '').trim();
                                status_1 = (url.searchParams.get('status') || '').trim();
                                owner_name_1 = (url.searchParams.get('owner_name') || '').trim();
                                list = NFT_ASSETS_STORE.slice().sort(function (a, b) { return b.created_at - a.created_at; });
                                if (name_1)
                                    list = list.filter(function (i) { return i.name && i.name.toLowerCase().includes(name_1.toLowerCase()); });
                                if (status_1)
                                    list = list.filter(function (i) { return i.status === status_1; });
                                if (owner_name_1)
                                    list = list.filter(function (i) { return (i.owner_name || '').includes(owner_name_1); });
                                total = list.length;
                                start = (page - 1) * pageSize;
                                paged = list.slice(start, start + pageSize).map(toPublicAsset);
                                sendJson(res, { list: paged, total: total });
                                return [2 /*return*/];
                            }
                            if (!(method === 'POST')) return [3 /*break*/, 2];
                            return [4 /*yield*/, readJsonBody(req)];
                        case 1:
                            body_6 = _b.sent();
                            now = Date.now();
                            gene = MOCK_GENE_PROFILES.find(function (p) { return String(p.id) === String(body_6.gene_profile_id); });
                            geneBrief = gene ? { id: gene.id, ring_number: gene.ring_number, name: gene.name, owner_name: gene.owner_name || '' } : null;
                            record = {
                                id: NFT_ASSET_ID_SEQ++,
                                token_id: null,
                                gene_profile_id: body_6.gene_profile_id || null,
                                name: body_6.name || '',
                                description: body_6.description || null,
                                image_url: body_6.image_url || null,
                                metadata: body_6.metadata || {},
                                owner_name: body_6.owner_name || (gene ? gene.owner_name : '') || '',
                                status: 'draft',
                                contract_address: null,
                                tx_hash: null,
                                minted_at: null,
                                created_at: now,
                                updated_at: now,
                                _geneBrief: geneBrief,
                            };
                            NFT_ASSETS_STORE.unshift(record);
                            sendJson(res, { id: record.id });
                            return [2 /*return*/];
                        case 2:
                            next && next();
                            return [2 /*return*/];
                        case 3:
                            match = stripped.match(/^\/(\d+)(\/(submit|resubmit))?$/);
                            if (!match) {
                                next && next();
                                return [2 /*return*/];
                            }
                            id = Number(match[1]);
                            action = match[3] || null;
                            idx = NFT_ASSETS_STORE.findIndex(function (i) { return i.id === id; });
                            item = idx >= 0 ? NFT_ASSETS_STORE[idx] : null;
                            if (action === 'submit') {
                                if (method !== 'POST') {
                                    res.statusCode = 405;
                                    sendJson(res, null, 405, 'Method Not Allowed');
                                    return [2 /*return*/];
                                }
                                if (!item) {
                                    res.statusCode = 404;
                                    sendJson(res, null, 404, '未找到资产');
                                    return [2 /*return*/];
                                }
                                item.status = 'pending';
                                item.updated_at = Date.now();
                                sendJson(res, null);
                                return [2 /*return*/];
                            }
                            if (action === 'resubmit') {
                                if (method !== 'POST') {
                                    res.statusCode = 405;
                                    sendJson(res, null, 405, 'Method Not Allowed');
                                    return [2 /*return*/];
                                }
                                if (!item) {
                                    res.statusCode = 404;
                                    sendJson(res, null, 404, '未找到资产');
                                    return [2 /*return*/];
                                }
                                if (item.status !== 'rejected') {
                                    res.statusCode = 400;
                                    sendJson(res, null, 400, '仅驳回状态资产可重新提交审核');
                                    return [2 /*return*/];
                                }
                                item.status = 'pending';
                                item.audit_remark = null;
                                item.rejected_at = null;
                                item.rejected_by = null;
                                item.updated_at = Date.now();
                                sendJson(res, null);
                                return [2 /*return*/];
                            }
                            if (method === 'GET') {
                                if (!item) {
                                    res.statusCode = 404;
                                    sendJson(res, null, 404, '未找到资产');
                                    return [2 /*return*/];
                                }
                                detail = __assign(__assign({}, toPublicAsset(item)), { transfers: [], mint_task: null, chain_status: { token_id: item.token_id, contract_address: item.contract_address, tx_hash: item.tx_hash, minted_at: item.minted_at, status: item.status, status_label: item.status_label } });
                                sendJson(res, detail);
                                return [2 /*return*/];
                            }
                            if (!(method === 'PUT')) return [3 /*break*/, 5];
                            if (!item) {
                                res.statusCode = 404;
                                sendJson(res, null, 404, '未找到资产');
                                return [2 /*return*/];
                            }
                            return [4 /*yield*/, readJsonBody(req)];
                        case 4:
                            body_7 = _b.sent();
                            patch = {};
                            for (_i = 0, _a = ['gene_profile_id', 'name', 'description', 'image_url', 'metadata', 'owner_name']; _i < _a.length; _i++) {
                                k = _a[_i];
                                if (Object.prototype.hasOwnProperty.call(body_7, k))
                                    patch[k] = body_7[k];
                            }
                            if (body_7.gene_profile_id) {
                                gene = MOCK_GENE_PROFILES.find(function (p) { return String(p.id) === String(body_7.gene_profile_id); });
                                if (gene)
                                    patch._geneBrief = { id: gene.id, ring_number: gene.ring_number, name: gene.name, owner_name: gene.owner_name || '' };
                            }
                            patch.updated_at = Date.now();
                            NFT_ASSETS_STORE[idx] = __assign(__assign({}, item), patch);
                            sendJson(res, null);
                            return [2 /*return*/];
                        case 5:
                            if (method === 'DELETE') {
                                if (idx < 0) {
                                    res.statusCode = 404;
                                    sendJson(res, null, 404, '未找到资产');
                                    return [2 /*return*/];
                                }
                                NFT_ASSETS_STORE.splice(idx, 1);
                                sendJson(res, null);
                                return [2 /*return*/];
                            }
                            next && next();
                            return [2 /*return*/];
                    }
                });
            }); });
            // POST /api/nft/audit/:id/approve - 审核通过（进入上链队列）
            server.middlewares.use('/api/nft/audit', function (req, res, next) { return __awaiter(_this, void 0, void 0, function () {
                function doApproveOne(assetId) {
                    var assetIdx = NFT_ASSETS_STORE.findIndex(function (i) { return i.id === assetId && i.status === 'pending'; });
                    if (assetIdx < 0)
                        return null;
                    var it = NFT_ASSETS_STORE[assetIdx];
                    it.status = 'approved';
                    it.approved_at = Date.now();
                    it.updated_at = Date.now();
                    if (!it.token_id)
                        it.token_id = '#' + (1023 + NFT_TASK_ID_SEQ);
                    var taskRecord = {
                        id: NFT_TASK_ID_SEQ++,
                        nft_asset_id: it.id,
                        status: 'pending',
                        retry_count: 0,
                        error_msg: null,
                        tx_hash: null,
                        contract_address: null,
                        started_at: null,
                        finished_at: null,
                        created_at: Date.now(),
                        block_current: 0,
                        block_target: 12,
                        _assetRef: it,
                    };
                    NFT_TASKS_STORE.unshift(taskRecord);
                    scheduleMintTask(taskRecord);
                    return taskRecord;
                }
                var method, stripped, url, page, pageSize, name_2, owner_name_2, list, total, start, paged, ts_1, today_approved, completedToday, failedToday, durations, avg, body, ids, success, failed, _i, ids_1, id_4, r, body, ids, reason, success, failed, _loop_1, _a, ids_2, id_5, match, id, action, idx, item, taskRecord, body;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0:
                            method = req.method || 'GET';
                            stripped = (req.url || '/').split('?')[0].replace(/\/+$/, '') || '/';
                            if (stripped === '/list') {
                                if (method === 'GET') {
                                    url = new URL(req.url || '/', 'http://localhost');
                                    page = Number(url.searchParams.get('page') || 1);
                                    pageSize = Number(url.searchParams.get('pageSize') || 10);
                                    name_2 = (url.searchParams.get('name') || '').trim();
                                    owner_name_2 = (url.searchParams.get('owner_name') || '').trim();
                                    list = NFT_ASSETS_STORE.filter(function (i) { return i.status === 'pending'; });
                                    if (name_2)
                                        list = list.filter(function (i) { return i.name && i.name.toLowerCase().includes(name_2.toLowerCase()); });
                                    if (owner_name_2)
                                        list = list.filter(function (i) { return (i.owner_name || '').includes(owner_name_2); });
                                    list.sort(function (a, b) { return b.created_at - a.created_at; });
                                    total = list.length;
                                    start = (page - 1) * pageSize;
                                    paged = list.slice(start, start + pageSize).map(toPublicAsset);
                                    sendJson(res, { list: paged, total: total });
                                    return [2 /*return*/];
                                }
                                next && next();
                                return [2 /*return*/];
                            }
                            if (stripped === '/stats' && method === 'GET') {
                                ts_1 = todayStartTs();
                                today_approved = NFT_ASSETS_STORE.filter(function (a) { return a.approved_at && a.approved_at >= ts_1; }).length;
                                completedToday = NFT_TASKS_STORE.filter(function (t) { return t.status === 'completed' && t.finished_at && t.finished_at >= ts_1; });
                                failedToday = NFT_TASKS_STORE.filter(function (t) { return t.status === 'failed' && t.finished_at && t.finished_at >= ts_1; });
                                durations = completedToday.map(function (t) { return ((t.finished_at - t.created_at) / 1000) | 0; }).filter(function (n) { return n > 0; });
                                avg = durations.length ? (durations.reduce(function (a, b) { return a + b; }, 0) / durations.length) | 0 : 0;
                                sendJson(res, { today_approved: today_approved, today_mint_success: completedToday.length, today_mint_failed: failedToday.length, avg_duration_sec: avg });
                                return [2 /*return*/];
                            }
                            if (!(stripped === '/batch-approve' && method === 'POST')) return [3 /*break*/, 2];
                            return [4 /*yield*/, readJsonBody(req)];
                        case 1:
                            body = _b.sent();
                            ids = Array.isArray(body.ids) ? body.ids.map(Number).filter(Boolean) : [];
                            success = 0, failed = 0;
                            for (_i = 0, ids_1 = ids; _i < ids_1.length; _i++) {
                                id_4 = ids_1[_i];
                                r = doApproveOne(id_4);
                                if (r)
                                    success++;
                                else
                                    failed++;
                            }
                            sendJson(res, { total: ids.length, success: success, failed: failed });
                            return [2 /*return*/];
                        case 2:
                            if (!(stripped === '/batch-reject' && method === 'POST')) return [3 /*break*/, 4];
                            return [4 /*yield*/, readJsonBody(req)];
                        case 3:
                            body = _b.sent();
                            ids = Array.isArray(body.ids) ? body.ids.map(Number).filter(Boolean) : [];
                            reason = String(body.reject_reason || '');
                            success = 0, failed = 0;
                            _loop_1 = function (id_5) {
                                var idx_1 = NFT_ASSETS_STORE.findIndex(function (i) { return i.id === id_5 && i.status === 'pending'; });
                                if (idx_1 < 0) {
                                    failed++;
                                    return "continue";
                                }
                                var it = NFT_ASSETS_STORE[idx_1];
                                it.status = 'rejected';
                                it.rejected_at = Date.now();
                                it.rejected_by = 'admin';
                                it.audit_remark = reason;
                                it.updated_at = Date.now();
                                success++;
                            };
                            for (_a = 0, ids_2 = ids; _a < ids_2.length; _a++) {
                                id_5 = ids_2[_a];
                                _loop_1(id_5);
                            }
                            sendJson(res, { total: ids.length, success: success, failed: failed });
                            return [2 /*return*/];
                        case 4:
                            match = stripped.match(/^\/(\d+)\/(approve|reject)$/);
                            if (!match) {
                                next && next();
                                return [2 /*return*/];
                            }
                            id = Number(match[1]);
                            action = match[2];
                            idx = NFT_ASSETS_STORE.findIndex(function (i) { return i.id === id; });
                            if (idx < 0) {
                                res.statusCode = 404;
                                sendJson(res, null, 404, '未找到资产');
                                return [2 /*return*/];
                            }
                            item = NFT_ASSETS_STORE[idx];
                            if (!(action === 'approve')) return [3 /*break*/, 5];
                            if (item.status !== 'pending') {
                                res.statusCode = 400;
                                sendJson(res, null, 400, '资产不在待审核状态');
                                return [2 /*return*/];
                            }
                            taskRecord = doApproveOne(id);
                            if (!taskRecord) {
                                res.statusCode = 400;
                                sendJson(res, null, 400, '审核失败');
                                return [2 /*return*/];
                            }
                            sendJson(res, { task_id: taskRecord.id });
                            return [2 /*return*/];
                        case 5:
                            if (item.status !== 'pending') {
                                res.statusCode = 400;
                                sendJson(res, null, 400, '资产不在待审核状态');
                                return [2 /*return*/];
                            }
                            return [4 /*yield*/, readJsonBody(req)];
                        case 6:
                            body = _b.sent();
                            item.status = 'rejected';
                            item.rejected_at = Date.now();
                            item.rejected_by = 'admin';
                            item.audit_remark = (body === null || body === void 0 ? void 0 : body.audit_remark) || '';
                            item.updated_at = Date.now();
                            sendJson(res, null);
                            return [2 /*return*/];
                    }
                });
            }); });
            // NFT 上链任务路由
            server.middlewares.use('/api/nft/tasks', function (req, res, next) { return __awaiter(_this, void 0, void 0, function () {
                var method, stripped, url, page, pageSize, statusParam, nftAssetIdParam, statuses_1, nftAssetId_1, list, total, start, paged, retryMatch, taskId_1, task;
                return __generator(this, function (_a) {
                    method = req.method || 'GET';
                    stripped = (req.url || '/').split('?')[0].replace(/\/+$/, '') || '/';
                    if (stripped === '' || stripped === '/') {
                        if (method === 'GET') {
                            url = new URL(req.url || '/', 'http://localhost');
                            page = Number(url.searchParams.get('page') || 1);
                            pageSize = Number(url.searchParams.get('pageSize') || 10);
                            statusParam = (url.searchParams.get('status') || '').trim();
                            nftAssetIdParam = url.searchParams.get('nft_asset_id');
                            statuses_1 = statusParam ? statusParam.split(',').map(function (s) { return s.trim(); }).filter(Boolean) : null;
                            nftAssetId_1 = nftAssetIdParam ? Number(nftAssetIdParam) : null;
                            list = NFT_TASKS_STORE.slice().sort(function (a, b) { return b.created_at - a.created_at; });
                            if (statuses_1 && statuses_1.length)
                                list = list.filter(function (t) { return statuses_1.includes(t.status); });
                            if (nftAssetId_1)
                                list = list.filter(function (t) { return t.nft_asset_id === nftAssetId_1; });
                            total = list.length;
                            start = (page - 1) * pageSize;
                            paged = list.slice(start, start + pageSize).map(toPublicTask);
                            sendJson(res, { list: paged, total: total });
                            return [2 /*return*/];
                        }
                        next && next();
                        return [2 /*return*/];
                    }
                    retryMatch = stripped.match(/^\/(\d+)\/retry$/);
                    if (retryMatch) {
                        if (method !== 'POST') {
                            res.statusCode = 405;
                            sendJson(res, null, 405, 'Method Not Allowed');
                            return [2 /*return*/];
                        }
                        taskId_1 = Number(retryMatch[1]);
                        task = NFT_TASKS_STORE.find(function (t) { return t.id === taskId_1; });
                        if (!task) {
                            res.statusCode = 404;
                            sendJson(res, null, 404, '未找到任务');
                            return [2 /*return*/];
                        }
                        if (task.status !== 'failed') {
                            res.statusCode = 400;
                            sendJson(res, null, 400, '仅失败状态任务可重试');
                            return [2 /*return*/];
                        }
                        task.retry_count = (task.retry_count | 0) + 1;
                        task.status = 'pending';
                        task.block_current = 0;
                        task.error_msg = null;
                        task.finished_at = null;
                        if (task._assetRef) {
                            task._assetRef.status = 'minting';
                        }
                        scheduleMintTask(task);
                        sendJson(res, null);
                        return [2 /*return*/];
                    }
                    next && next();
                    return [2 /*return*/];
                });
            }); });
        },
    };
}
