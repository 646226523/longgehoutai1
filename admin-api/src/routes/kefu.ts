/**
 * 客服公开路由
 * —— 无需鉴权（未登录用户也要能咨询客服）
 * —— CorpSecret 仅在后端 wecom 模块内部使用，绝不返回前端
 */
import { Router, Response } from 'express';
import { generateContactUrl } from '../modules/wecom';
import type { ApiResponse } from '../types';

const router = Router();

function ok<T>(res: Response, data: T): Response {
  return res.json({ code: 0, message: 'success', data } satisfies ApiResponse<T>);
}

// GET /api/kefu/contact-url?scene=xxx
// 生成企业微信客服链接，前端可用于 iframe 嵌入或跳转
router.get('/contact-url', async (req, res) => {
  const sceneRaw = String(req.query.scene ?? '');
  // 只允许字母数字下划线短横线，最多 32 字节
  const scene = /^[0-9a-zA-Z_-]{1,32}$/.test(sceneRaw) ? sceneRaw : undefined;

  try {
    const result = await generateContactUrl(scene);
    // 无论 enabled true/false，都返回 HTTP 200 让前端优雅降级
    ok(res, result);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[Kefu] contact-url 未知错误:', err);
    ok(res, { enabled: false, reason: '客服服务暂时不可用' });
  }
});

export default router;
