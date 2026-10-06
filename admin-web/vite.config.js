import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { mockApiPlugin } from './server/mock-plugin.js';
// 开发环境下缓存的浏览器公网 IP（由前端 request.ts 通过 X-Client-Public-IP 头传递）
// 这里保留 xfwd:true 让 http-proxy 注入 socket.remoteAddress 到 X-Forwarded-For 链
export default defineConfig({
    resolve: {
        alias: {
            '@': path.resolve(__dirname, 'src'),
        },
    },
    plugins: [
        react(),
        mockApiPlugin(),
    ],
    server: {
        host: '0.0.0.0',
        port: 3014,
        strictPort: true,
        allowedHosts: ['.trycloudflare.com', '.loca.lt', '.ngrok.io'],
        // 在 Vite proxy 之前注入 CORS 中间件，修复 OPTIONS preflight 缺少 ACAO 头的问题
        configureServer(server) {
            server.middlewares.use('/api', (req, res, next) => {
                if (req.method === 'OPTIONS') {
                    const origin = req.headers.origin || '*';
                    res.setHeader('Access-Control-Allow-Origin', origin);
                    res.setHeader('Access-Control-Allow-Credentials', 'true');
                    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
                    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Client-Public-IP');
                    res.setHeader('Access-Control-Max-Age', '86400');
                    res.statusCode = 204;
                    res.end();
                    return;
                }
                next();
            });
        },
        proxy: {
            '/api': {
                target: 'http://localhost:3015',
                changeOrigin: true,
                // 开启 http-proxy 自动注入 X-Forwarded-For 等头
                // 开发环境浏览器从 localhost 请求 Vite，socket.remoteAddress 是 ::1
                // 真实公网 IP 由前端 request.ts 通过 X-Client-Public-IP 头传递
                xfwd: true,
            },
            // 上传图片静态资源代理 —— 后端用 express.static('/uploads') 托管
            // 不加这条会导致 Vite SPA fallback 返回 index.html (Content-Type: text/html)
            // 浏览器把 HTML 当图片解析 → 加载失败
            '/uploads': {
                target: 'http://localhost:3015',
                changeOrigin: true,
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
