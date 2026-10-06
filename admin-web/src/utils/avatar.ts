/**
 * 用户头像 URL 构建工具
 *
 * 支持三种有效头像格式：
 *   1. http(s)://  远程图
 *   2. /uploads/xxx 相对路径（vite proxy 自动转发到后端）
 *   3. data: base64 / SVG data URL
 *
 * 空值/非法值兜底 DiceBear 在线卡通头像。
 */

export interface Avatarable {
  avatar?: string | null;
  id?: number | string;
  nickname?: string;
  username?: string;
}

/** 生成用户头像 URL */
export function buildAvatarUrl(record: Avatarable): string {
  const avatar = record.avatar;
  if (avatar && typeof avatar === 'string') {
    // 真实头像: http(s)、相对路径 /uploads/xxx、data: base64/SVG 都可直接用
    if (avatar.startsWith('http') || avatar.startsWith('/') || avatar.startsWith('data:')) {
      return avatar;
    }
    // 其他非空字符串（如旧 SVG 占位符）也直接用
    return avatar;
  }
  // 空值 → DiceBear 兜底
  const seed = encodeURIComponent(`${record.id ?? 'anon'}-${record.nickname || record.username || 'user'}`);
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
}
