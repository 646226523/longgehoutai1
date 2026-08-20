export const TOKEN_DURATION_DEFAULT = 24 * 60 * 60;

export function setCookie(name: string, value: string, expiresInSeconds: number = TOKEN_DURATION_DEFAULT): void {
  const expires = new Date(Date.now() + expiresInSeconds * 1000);
  const cookieString = `${name}=${encodeURIComponent(value)}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
  document.cookie = cookieString;
}

export function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

export function deleteCookie(name: string): void {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}

export const ACCESS_TOKEN_COOKIE = 'admin_access_token';
export const REFRESH_TOKEN_COOKIE = 'admin_refresh_token';