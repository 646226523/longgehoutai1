import { http, ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from './request';
import type { CurrentUser } from '../access';

// 登录请求参数
export interface LoginParams {
  username: string;
  password: string;
}

// 登录返回数据
export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// 登录接口
export async function login(params: LoginParams): Promise<LoginResult> {
  const data = await http.post<LoginResult>('/auth/login', params);
  // 存储 Token
  localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
  return data;
}

// 退出登录
export function logout(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  window.location.href = '/login';
}

// 获取当前用户信息(返回用户、角色、权限列表)
export async function getCurrentUser(): Promise<CurrentUser> {
  const data = await http.get<CurrentUser>('/auth/profile');
  return data;
}

// 刷新 Token
export async function refreshToken(): Promise<LoginResult> {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  const data = await http.post<LoginResult>('/auth/refresh', { refreshToken });
  localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
  if (data.refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
  return data;
}
