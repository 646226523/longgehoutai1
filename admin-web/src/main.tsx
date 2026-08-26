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

// Suppress Vite HMR connection errors in console
if (import.meta.env.DEV) {
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    const msg = args.join(' ');
    if (
      msg.includes('net::ERR_CONNECTION_REFUSED') ||
      msg.includes('net::ERR_ABORTED') ||
      (msg.includes('@vite/client') && msg.includes('ping'))
    ) {
      return;
    }
    originalConsoleError.apply(console, args);
  };

  window.addEventListener('error', (e) => {
    if (
      e.message?.includes('ERR_CONNECTION_REFUSED') ||
      e.message?.includes('ERR_ABORTED')
    ) {
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
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ConfigProvider>
  </React.StrictMode>
);
