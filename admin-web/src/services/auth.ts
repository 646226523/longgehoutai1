import { http, ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from './request';
import type { CurrentUser } from '../access';

export interface LoginParams {
  username: string;
  password: string;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: number;
    username: string;
    nickname: string;
  };
}

export const USER_INFO_KEY = 'admin_user_info';

export async function login(params: LoginParams): Promise<LoginResult> {
  const data = await http.post<LoginResult>('/auth/login', params);
  localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
  if (data.user) {
    localStorage.setItem(USER_INFO_KEY, JSON.stringify(data.user));
  }
  return data;
}

export function logout(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_INFO_KEY);
  window.location.href = '/login';
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const data = await http.get<CurrentUser>('/auth/profile');
  return data;
}

export async function refreshToken(): Promise<LoginResult> {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  const data = await http.post<LoginResult>('/auth/refresh', { refreshToken });
  localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
  if (data.refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
  return data;
}
