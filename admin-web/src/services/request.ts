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

// 是否正在刷新 Token(避免并发刷新)
let isRefreshing = false;
// 等待 Token 刷新完成的请求队列
let pendingQueue: Array<() => void> = [];

// axios 实例
const request: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 5000,
});

// 请求拦截器:自动携带 Token
request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
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
        return res.data;
      }
      showError(res.message || '请求失败');
      return Promise.reject(new Error(res.message || '请求失败'));
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
