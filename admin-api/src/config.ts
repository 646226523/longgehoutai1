import dotenv from 'dotenv';

// 加载环境变量(从 .env 文件,.env 不存在时使用默认值)
dotenv.config();

// 应用配置(从环境变量读取,提供默认值)
export const config = {
  // 服务端口
  port: parseInt(process.env.PORT || '3015', 10),

  // JWT 配置
  jwt: {
    secret: process.env.JWT_SECRET || 'longge-admin-jwt-secret-default',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'longge-admin-jwt-refresh-secret-default',
    expiresIn: process.env.JWT_EXPIRES_IN || '2h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // 默认超管账号(首次初始化时使用)
  defaultAdmin: {
    username: process.env.DEFAULT_ADMIN_USERNAME || 'admin',
    password: process.env.DEFAULT_ADMIN_PASSWORD || 'admin123',
  },

  // 数据库文件路径
  dbPath: process.env.DB_PATH || 'data/admin.db',
};

export default config;
