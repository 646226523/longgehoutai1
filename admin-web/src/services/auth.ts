import { http, ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from './request';
import type { CurrentUser } from '../access';
import { setCookie, getCookie, deleteCookie, ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE, TOKEN_DURATION_DEFAULT } from '../utils/cookie';

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
  setCookie(ACCESS_TOKEN_COOKIE, data.accessToken, data.expiresIn || TOKEN_DURATION_DEFAULT);
  setCookie(REFRESH_TOKEN_COOKIE, data.refreshToken, data.expiresIn || TOKEN_DURATION_DEFAULT);
  if (data.user) {
    localStorage.setItem(USER_INFO_KEY, JSON.stringify(data.user));
  }
  return data;
}

export function logout(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_INFO_KEY);
  deleteCookie(ACCESS_TOKEN_COOKIE);
  deleteCookie(REFRESH_TOKEN_COOKIE);
  window.location.href = '/login';
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const data = await http.get<CurrentUser>('/auth/profile');
  return data;
}

export async function refreshToken(): Promise<LoginResult> {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY) || getCookie(REFRESH_TOKEN_COOKIE);
  const data = await http.post<LoginResult>('/auth/refresh', { refreshToken });
  localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
  if (data.refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
    setCookie(REFRESH_TOKEN_COOKIE, data.refreshToken, data.expiresIn || 86400);
  }
  setCookie(ACCESS_TOKEN_COOKIE, data.accessToken, data.expiresIn || 86400);
  return data;
}

export function getStoredToken(): { accessToken: string | null; refreshToken: string | null } {
  let accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  let refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!accessToken) accessToken = getCookie(ACCESS_TOKEN_COOKIE);
  if (!refreshToken) refreshToken = getCookie(REFRESH_TOKEN_COOKIE);
  return { accessToken, refreshToken };
}

export function restoreTokenFromCookie(): boolean {
  const accessToken = getCookie(ACCESS_TOKEN_COOKIE);
  const refreshToken = getCookie(REFRESH_TOKEN_COOKIE);
  if (accessToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  }
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }
  return !!(accessToken || refreshToken);
}