import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { mockApiPlugin } from './server/mock';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    mockApiPlugin(),
  ],
  server: {
    port: 3014,
    // Mock 优先，如需要转发到真实后端可取消注释
    // proxy: {
    //   '/api': {
    //     target: 'http://localhost:3015',
    //     changeOrigin: true,
    //   },
    // },
  },
});
