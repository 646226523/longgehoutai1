import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { mockApiPlugin } from './server/mock-plugin.js';
export default defineConfig({
    plugins: [
        react(),
        mockApiPlugin(),
    ],
    server: {
        host: '0.0.0.0',
        port: 3014,
        strictPort: true,
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
        proxy: {
            '/api/auth': {
                target: 'http://localhost:3015',
                changeOrigin: true,
            },
            '/api/admin': {
                target: 'http://localhost:3015',
                changeOrigin: true,
            },
            '/api/system': {
                target: 'http://localhost:3015',
                changeOrigin: true,
            },
            '/api/detection': {
                target: 'http://localhost:3015',
                changeOrigin: true,
            },
            '/api/gene': {
                target: 'http://localhost:3015',
                changeOrigin: true,
            },
            '/api/auction': {
                target: 'http://localhost:3015',
                changeOrigin: true,
            },
            '/api/nft': {
                target: 'http://localhost:3015',
                changeOrigin: true,
            },
            '/api/competition': {
                target: 'http://localhost:3015',
                changeOrigin: true,
            },
            '/api/loft': {
                target: 'http://localhost:3015',
                changeOrigin: true,
            },
            '/api/arbitration': {
                target: 'http://localhost:3015',
                changeOrigin: true,
            },
            '/api/user': {
                target: 'http://localhost:3015',
                changeOrigin: true,
            },
            '/api/content': {
                target: 'http://localhost:3015',
                changeOrigin: true,
            },
            '/api/race': {
                target: 'http://localhost:3015',
                changeOrigin: true,
            },
            '/api/medias': {
                target: 'http://localhost:3015',
                changeOrigin: true,
            },
            '/api/upload': {
                target: 'http://localhost:3015',
                changeOrigin: true,
            },
            '/uploads': {
                target: 'http://localhost:3015',
                changeOrigin: true,
            },
            '/downloads': {
                target: 'http://localhost:3015',
                changeOrigin: true,
            },
        },
    },
    preview: {
        host: '127.0.0.1',
        port: 3014,
    },
});
