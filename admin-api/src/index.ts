import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import cors from 'cors';
import { config } from './config';
import { initDatabase } from './db';
import authRoutes from './routes/auth';
import systemRoutes from './routes/system';
import geneRouter from './routes/gene';
import competitionRoutes from './routes/competition';
import loftRouter from './routes/loft';
import nftRouter from './routes/nft';
import detectionRouter from './routes/detection';
import userRouter from './routes/user';
import contentRouter from './routes/content';
import auctionRouter from './routes/auction';
import arbitrationRouter from './routes/arbitration';
import statisticsRouter from './routes/statistics';
import uploadRouter from './routes/upload';
import publicRouter from './routes/public';
import type { ApiResponse } from './types';

const app = express();
app.set('trust proxy', true);

// CORS 中间件:允许前端跨域访问
app.use(
  cors({
    origin: true, // 允许所有来源(生产环境应限制为具体域名)
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// 解析 JSON 请求体
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 请求日志中间件(简易)
app.use((req: Request, _res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// 健康检查接口
app.get('/api/health', (_req: Request, res: Response) => {
  const body: ApiResponse<{ status: string; uptime: number }> = {
    code: 0,
    message: 'success',
    data: { status: 'ok', uptime: process.uptime() },
  };
  res.json(body);
});

// 公开路由(无需鉴权):公网 IP 查询
app.use('/api', publicRouter);

// 挂载业务路由(全部加 /api 前缀)
app.use('/api/auth', authRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/gene', geneRouter);
app.use('/api/competition', competitionRoutes);
app.use('/api/loft', loftRouter);
app.use('/api/nft', nftRouter);
app.use('/api/detection', detectionRouter);
app.use('/api/user', userRouter);
app.use('/api/content', contentRouter);
app.use('/api/auction', auctionRouter);
app.use('/api/arbitration', arbitrationRouter);
app.use('/api/statistics', statisticsRouter);
app.use('/api', uploadRouter);

// 静态文件服务:下载目录
app.use('/downloads', express.static(path.join(__dirname, '..', 'downloads')));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// TODO: 后续按模块挂载其他业务路由
// app.use('/api/gene', geneRoutes);
// app.use('/api/nft', nftRoutes);
// app.use('/api/competition', competitionRoutes);
// ...

// 404 处理
app.use((req: Request, res: Response) => {
  const body: ApiResponse = {
    code: 404,
    message: `接口不存在: ${req.method} ${req.path}`,
    data: null,
  };
  res.status(404).json(body);
});

// 全局错误处理中间件
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  // eslint-disable-next-line no-console
  console.error('[ERROR]', err);
  const body: ApiResponse = {
    code: 500,
    message: err.message || '服务器内部错误',
    data: null,
  };
  res.status(500).json(body);
});

async function startServer() {
  try {
    await initDatabase();
    // eslint-disable-next-line no-console
    console.log('[INFO] 数据库初始化完成, 启动 HTTP 服务...');
    app.listen(config.port, () => {
      // eslint-disable-next-line no-console
      console.log(`
============================================
  赛鸽基因溯源平台 - 后台管理系统后端
  服务地址: http://localhost:${config.port}
  健康检查: http://localhost:${config.port}/api/health
  默认账号: ${config.defaultAdmin.username} / ${config.defaultAdmin.password}
============================================
      `);
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[FATAL] 数据库初始化失败, 服务无法启动:', err);
    process.exit(1);
  }
}

startServer();

export default app;
