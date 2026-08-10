import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// 真实后端模式：所有 /api 请求转发到 admin-api (localhost:3015)。
// 如需要纯前端 Mock 独立运行，可改为启用 mockApiPlugin() 并注释 proxy。
// import { mockApiPlugin } from './server/mock';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // mockApiPlugin(),
  ],
  server: {
    port: 3014,
    proxy: {
      '/api': {
        target: 'http://localhost:3015',
        changeOrigin: true,
      },
    },
  },
});
