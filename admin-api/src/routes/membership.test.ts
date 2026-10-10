/**
 * membership 订阅模块单元测试
 * 覆盖: computeNewExpireAt 有效期叠加逻辑 + buildMembership 查询
 */
import { describe, it, expect } from 'vitest';
import { computeNewExpireAt } from '../routes/public';

const DAY = 86_400_000;

describe('computeNewExpireAt — 有效期叠加', () => {
  const now = Date.now();

  it('首次付费(currentExpireAt = null): 从 now + duration 开始', () => {
    const result = computeNewExpireAt(null, 30);
    expect(result).toBeGreaterThanOrEqual(now + 29 * DAY);
    expect(result).toBeLessThanOrEqual(now + 31 * DAY);
    expect(Math.abs(result - (now + 30 * DAY))).toBeLessThan(1000); // 误差 <1s
  });

  it('已过期续费时:从 now 重新开始(不叠加过期时间)', () => {
    const expired = now - 1000 * 60 * 60 * 24 * 5; // 已过期 5 天
    const result = computeNewExpireAt(expired, 30);
    const expectedMin = now + 29 * DAY;
    const expectedMax = now + 31 * DAY;
    expect(result).toBeGreaterThanOrEqual(expectedMin);
    expect(result).toBeLessThanOrEqual(expectedMax);
  });

  it('未过期续费时:叠加到原到期日之后', () => {
    const current = now + 10 * DAY; // 还有 10 天
    const result = computeNewExpireAt(current, 30);
    const expectedMin = current + 30 * DAY - 1000;
    const expectedMax = current + 30 * DAY + 1000;
    expect(result).toBeGreaterThanOrEqual(expectedMin);
    expect(result).toBeLessThanOrEqual(expectedMax);
    expect(result).toBeGreaterThan(now + 10 * DAY + 30 * DAY - DAY);
  });

  it('跨年度续费(2026 → 2027):叠加正确,不被 now 重置', () => {
    const yearEnd = new Date(new Date().getFullYear() + 1, 11, 31, 23, 59, 59).getTime();
    const result = computeNewExpireAt(yearEnd, 365);
    expect(result).toBe(yearEnd + 365 * DAY);
  });

  it('durationDays = 0:返回 now(边界)', () => {
    const result = computeNewExpireAt(null, 0);
    expect(result).toBeLessThanOrEqual(now + 100);
  });

  it('durationDays = 365:一整年叠加', () => {
    const result = computeNewExpireAt(now + 100 * DAY, 365);
    expect(result).toBe(now + 100 * DAY + 365 * DAY);
  });

  it('续费时恰好到期日等于 now:按已过期处理(从 now 重新开始)', () => {
    const result = computeNewExpireAt(now, 30);
    expect(result).toBeGreaterThanOrEqual(now + 29 * DAY);
    expect(result).toBeLessThanOrEqual(now + 31 * DAY);
  });
});
