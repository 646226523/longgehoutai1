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
