import axios, { type AxiosInstance, type AxiosRequestConfig, AxiosError } from 'axios';
import { getMessage } from '../utils/antd-app-instance';
// eslint-disable-next-line no-restricted-imports -- fallback 仅在 App 组件挂载前极端情况使用，正常请求链路均通过 <AntdApp> context 消费的 getMessage()
import { message as staticMessageFallback } from 'antd';

function showError(content: string) {
  try {
    getMessage().error(content);
  } catch {
    staticMessageFallback.error(content);
  }
}

// 后端 API 基础地址(通过 vite proxy 转发到 3015)
const BASE_URL = '/api';
const LOGIN_PATH = '/login';

// Token 在 localStorage 中的存储 key
export const ACCESS_TOKEN_KEY = 'admin_access_token';
export const REFRESH_TOKEN_KEY = 'admin_refresh_token';

// ---- 客户端公网 IP 缓存 ----
// 开发环境下浏览器无法自动传递公网 IP（Vite proxy 的 socket.remoteAddress 是 localhost），
// 因此前端启动时异步查询一次公网 IP，后续请求通过 X-Client-Public-IP 头传递给后端
let cachedPublicIp: string | null = null;
let publicIpFetchPromise: Promise<string | null> | null = null;

// localStorage 缓存 key
const PUBLIC_IP_CACHE_KEY = 'client_public_ip';

/**
 * 异步获取浏览器公网 IP，带超时和 fallback
 * 国内网络环境下，ifconfig.me 和 myip.ipip.net 可用
 * api.ipify.org 被墙 (ECONNRESET)，ipapi.co 被 Cloudflare 拦截 (403)
 */
async function fetchPublicIp(): Promise<string | null> {
  if (cachedPublicIp) return cachedPublicIp;
  if (publicIpFetchPromise) return publicIpFetchPromise;

  // 独立 axios 实例 —— 不能走 request 实例（它在 fetchPublicIp 之后才创建），
  // 但请求的是相对路径 /api/__public-ip，浏览器会基于当前 origin 拼接，
  // 在开发环境下自动走 Vite proxy → 后端 Node.js → ifconfig.me，完全避开浏览器 CORS
  const publicIpClient = axios.create({ timeout: 4000 });

  const sources = [
    // 优先后端代理 —— 完全绕开 CORS
    // /api/__public-ip 由 mock-plugin 手动代理到后端, 绕开 Connect 前缀剥离问题
    () =>
      publicIpClient.get('/api/__public-ip').then((r) => {
        // 后端返回 { code: 0, message: 'success', data: '119.126.114.228' }
        const body = r.data;
        const ip = typeof body === 'string' ? body : body?.data ?? body;
        return typeof ip === 'string' && ipv4Regex.test(ip.trim()) ? ip.trim() : null;
      }),
    // Fallback 1: ifconfig.me —— 已验证国内可用，返回纯文本 IP
    () =>
      axios
        .get('https://ifconfig.me/ip', { timeout: 3000 })
        .then((r) => (typeof r.data === 'string' ? r.data.trim() : null)),
    // Fallback 2: myip.ipip.net —— 返回格式 "当前 IP：119.126.114.228  来自于：..."
    () =>
      axios.get('https://myip.ipip.net', { timeout: 3000 }).then((r) => {
        const text = typeof r.data === 'string' ? r.data : '';
        const match = text.match(/\d{1,3}(\.\d{1,3}){3}/);
        return match ? match[0] : null;
      }),
    // Fallback 3: api.ip.sb —— 纯 JSON API
    () =>
      axios
        .get('https://api.ip.sb/geoip', { timeout: 3000 })
        .then((r) => r.data?.ip),
  ];

  const ipv4Regex = /^\d{1,3}(\.\d{1,3}){3}$/;
  const sourceNames = ['后端代理 /api/__public-ip', 'ifconfig.me', 'myip.ipip.net', 'api.ip.sb'];

  publicIpFetchPromise = (async () => {
    const startTime = Date.now();
    for (let i = 0; i < sources.length; i++) {
      const source = sources[i];
      const sourceName = sourceNames[i];
      const isFirstSource = i === 0;
      try {
        const t0 = Date.now();
        const ip = await source();
        const cost = Date.now() - t0;
        if (ip && typeof ip === 'string' && ipv4Regex.test(ip.trim())) {
          cachedPublicIp = ip.trim();
          // 写入 localStorage 缓存（有效期 24 小时）
          try {
            localStorage.setItem(
              PUBLIC_IP_CACHE_KEY,
              JSON.stringify({ ip: cachedPublicIp, ts: Date.now() })
            );
          } catch {
            /* localStorage 可能不可用 */
          }
          // eslint-disable-next-line no-console
          if (isFirstSource) {
            console.info(
              `[HTTP] 通过后端代理获取公网 IP: ${cachedPublicIp} (耗时: ${cost}ms, 总耗时: ${Date.now() - startTime}ms)`
            );
          } else {
            console.info(
              `[HTTP] 检测到浏览器公网 IP: ${cachedPublicIp} (来源: ${sourceName}, 耗时: ${cost}ms, 总耗时: ${Date.now() - startTime}ms)`
            );
          }
          return cachedPublicIp;
        }
        // eslint-disable-next-line no-console
        console.warn(`[HTTP] ${sourceName} 返回无效 IP: ${JSON.stringify(ip)} (耗时: ${cost}ms)`);
        if (isFirstSource) {
          // eslint-disable-next-line no-console
          console.info('[HTTP] 后端代理返回无效 IP，降级到外部源获取公网 IP');
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn(
          `[HTTP] ${sourceName} 获取失败: ${(err as Error).message} (耗时: ${Date.now() - startTime}ms)`
        );
        if (isFirstSource) {
          // eslint-disable-next-line no-console
          console.info('[HTTP] 后端代理不可用，降级到外部源获取公网 IP');
        }
      }
    }
    // 所有源都失败 — 尝试用 localStorage 旧缓存
    try {
      const cached = localStorage.getItem(PUBLIC_IP_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as { ip: string; ts: number };
        if (parsed.ip && ipv4Regex.test(parsed.ip.trim())) {
          // eslint-disable-next-line no-console
          console.warn(
            `[HTTP] 所有公网 IP 源不可用，使用 localStorage 缓存: ${parsed.ip} (缓存时间: ${new Date(parsed.ts).toLocaleString()})`
          );
          return parsed.ip.trim();
        }
      }
    } catch {
      /* 解析失败 */
    }
    // 彻底失败
    // eslint-disable-next-line no-console
    console.warn('[HTTP] 无法获取浏览器公网 IP，审计日志将无法记录真实 IP');
    return null;
  })();

  return publicIpFetchPromise;
}

// 模块加载时立即开始异步获取公网 IP（不阻塞主线程）
void fetchPublicIp();

// 是否正在刷新 Token(避免并发刷新)
let isRefreshing = false;
// 等待 Token 刷新完成的请求队列
let pendingQueue: Array<() => void> = [];

// axios 实例
const request: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 5000,
});

// 请求拦截器:自动携带 Token + 客户端公网 IP
request.interceptors.request.use(
  (config) => {
    config.headers = config.headers || {};

    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const ipv4Regex = /^\d{1,3}(\.\d{1,3}){3}$/;

    // 情况 1: 已有内存缓存 → 直接用（最快路径）
    if (cachedPublicIp) {
      config.headers['X-Client-Public-IP'] = cachedPublicIp;
      config.headers['X-Forwarded-For'] = cachedPublicIp;
      return config;
    }

    // 情况 2: localStorage 有有效缓存（24 小时内） → 先用缓存，后台刷新
    try {
      const cacheStr = localStorage.getItem(PUBLIC_IP_CACHE_KEY);
      if (cacheStr) {
        const cached = JSON.parse(cacheStr) as { ip: string; ts: number };
        const age = Date.now() - cached.ts;
        if (cached.ip && ipv4Regex.test(cached.ip.trim()) && age < 24 * 60 * 60 * 1000) {
          config.headers['X-Client-Public-IP'] = cached.ip.trim();
          config.headers['X-Forwarded-For'] = cached.ip.trim();
          // eslint-disable-next-line no-console
          console.info(`[HTTP] 使用 localStorage 缓存的公网 IP: ${cached.ip}，后台刷新中...`);
          // 后台刷新（不阻塞请求）
          void fetchPublicIp();
          return config;
        }
      }
    } catch {
      /* localStorage 不可用 */
    }

    // 情况 3: fetchPublicIp 正在进行中 → 等待它完成（Promise 链式复用）
    if (publicIpFetchPromise) {
      return publicIpFetchPromise
        .then((ip) => {
          if (ip) {
            config.headers['X-Client-Public-IP'] = ip;
            config.headers['X-Forwarded-For'] = ip;
          }
          return config;
        })
        .catch(() => config); // fetchPublicIp 失败也不阻止请求
    }

    // 情况 4: 完全没有 — 启动 fetchPublicIp，当前请求暂不带头
    // eslint-disable-next-line no-console
    console.info('[HTTP] 首次请求，启动公网 IP 获取（本次请求可能不带 IP 头）');
    void fetchPublicIp();
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器:统一错误处理
request.interceptors.response.use(
  (response) => {
    const res = response.data;
    // 后端统一返回 { code, message, data },code=0 表示成功
    if (res && typeof res.code !== 'undefined') {
      if (res.code === 0) {
        // code=0 视为成功，即使 data 为 null（如 PUT 保存类接口只返回 message）
        return res.data;
      }
      showError(res.message || '请求失败');
      return Promise.reject(new Error(res.message || '请求失败'));
    }
    // 防御:非标准响应格式(如 Vite proxy 异常、空 body、HTML 错误页等)
    if (res == null) {
      // eslint-disable-next-line no-console
      console.warn(`[HTTP] 非标准响应(res=${typeof res})，URL: ${response.config.url}，将返回 null 让调用方处理`);
    }
    return res;
  },
  async (error: AxiosError<{ code?: number; message?: string }>) => {
    const status = error.response?.status;
    const originalRequest = error.config as (AxiosRequestConfig & { _retry?: boolean }) | undefined;

    // 401:尝试用 refresh token 刷新
    if (status === 401 && originalRequest && !originalRequest._retry) {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      if (!refreshToken) {
        redirectToLogin();
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // 正在刷新,加入队列等待
        return new Promise((resolve, reject) => {
          pendingQueue.push(() => {
            originalRequest._retry = true;
            request(originalRequest).then(resolve).catch(reject);
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;
      try {
        const res = await axios.post('/api/auth/refresh', { refreshToken });
        const { accessToken, refreshToken: newRefreshToken } = res.data?.data ?? res.data;
        localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
        if (newRefreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);

        // 重放队列中的请求
        pendingQueue.forEach((cb) => cb());
        pendingQueue = [];
        return request(originalRequest);
      } catch (refreshErr) {
        pendingQueue = [];
        redirectToLogin();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    // 403:无权限
    if (status === 403) {
      showError('无权限访问该资源(403)');
      return Promise.reject(error);
    }

    // 网络级错误(无 HTTP 响应)
    if (!error.response) {
      const netCode = (error as any).code || '';
      // ERR_ABORTED 是浏览器导航/组件卸载时的正常行为,不显示错误
      if (netCode === 'ERR_ABORTED') {
        return Promise.reject(error);
      }
      if (['ECONNREFUSED', 'ETIMEDOUT', 'ERR_NETWORK'].includes(netCode)) {
        showError('后端服务连接失败,请检查后端服务是否启动');
      } else {
        showError('网络连接异常,请检查网络状态');
      }
      return Promise.reject(error);
    }

    const msg = error.response?.data?.message || error.message || '网络错误';
    showError(msg);
    return Promise.reject(error);
  }
);

// 跳转登录页(清空 Token)
function redirectToLogin() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  if (!window.location.pathname.startsWith(LOGIN_PATH)) {
    window.location.replace(LOGIN_PATH);
  }
}

// 类型对齐的 HTTP wrapper
// 响应拦截器已在运行时把 ApiResponse 解包为业务数据 T(见上 return res.data),
// 但 axios 默认类型仍为 AxiosResponse<T>。这里通过第二泛型参 R = T 让类型与运行时一致。
export const http = {
  get: <T>(url: string, config?: AxiosRequestConfig) =>
    request.get<T, T>(url, config) as unknown as Promise<T>,
  post: <T = any>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    request.post<T, T>(url, data, config) as unknown as Promise<T>,
  put: <T = any>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    request.put<T, T>(url, data, config) as unknown as Promise<T>,
  patch: <T = any>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    request.patch<T, T>(url, data, config) as unknown as Promise<T>,
  delete: <T = any>(url: string, config?: AxiosRequestConfig) =>
    request.delete<T, T>(url, config) as unknown as Promise<T>,
};

export default request;
