import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import '@wangeditor/editor/dist/css/style.css';
import App from './App';
import './index.css';

// 设置 dayjs 中文
dayjs.locale('zh-cn');

// Suppress Vite HMR connection noise in dev console
if (import.meta.env.DEV) {
  const VITE_NOISE_PATTERNS = [
    // 网络级错误：Vite 重启/断开时 HMR 客户端产生
    'net::ERR_CONNECTION_REFUSED',
    'net::ERR_ABORTED',
    'net::ERR_CONNECTION_RESET',
    // Vite HMR ping 机制：服务器关闭时的轮询失败
    '@vite/client',
  ];
  const isViteNoise = (msg: string) =>
    VITE_NOISE_PATTERNS.some((p) => msg.includes(p));

  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    if (isViteNoise(args.join(' '))) return;
    originalConsoleError.apply(console, args);
  };

  const originalConsoleWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    const msg = args.join(' ');
    // Vite 内部的 server connection lost 等信息
    if (msg.includes('[vite]') && (msg.includes('server connection lost') || msg.includes('Polling for restart'))) {
      return;
    }
    originalConsoleWarn.apply(console, args);
  };

  window.addEventListener('error', (e) => {
    if (e.message && isViteNoise(e.message)) {
      e.stopImmediatePropagation();
      return false;
    }
  }, true);
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ConfigProvider locale={zhCN} theme={{
      token: {
        colorPrimary: '#1677ff',
      },
    }}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <App />
      </BrowserRouter>
    </ConfigProvider>
  </React.StrictMode>
);
