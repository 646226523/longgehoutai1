import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { mockApiPlugin } from './server/mock-plugin.js';

// 开发环境下缓存的浏览器公网 IP（由前端 request.ts 通过 X-Client-Public-IP 头传递）
// 这里保留 xfwd:true 让 http-proxy 注入 socket.remoteAddress 到 X-Forwarded-For 链
export default defineConfig({
  plugins: [
    react(),
    mockApiPlugin(),
  ],
  server: {
    host: '0.0.0.0',
    port: 3014,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3015',
        changeOrigin: true,
        // 开启 http-proxy 自动注入 X-Forwarded-For 等头
        // 开发环境浏览器从 localhost 请求 Vite，socket.remoteAddress 是 ::1
        // 真实公网 IP 由前端 request.ts 通过 X-Client-Public-IP 头传递
        xfwd: true,
      },
    },
    hmr: {
      host: 'localhost',
      port: 3014,
      clientPort: 3014,
      protocol: 'ws',
      overlay: false,
    },
    watch: {
      ignored: ['**/node_modules/**', '**/dist/**'],
    },
  },
  preview: {
    host: '127.0.0.1',
    port: 3014,
  },
});