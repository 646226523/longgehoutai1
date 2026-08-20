import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';
import App from './App';
import './index.css';

// 设置 dayjs 中文
dayjs.locale('zh-cn');

function shouldSuppressHmrError(args: unknown[]): boolean {
  const keywords = ['net::ERR_ABORTED', 'net::ERR_CONNECTION_REFUSED', 'net::ERR_FAILED', 'net::ERR_CANCELED'];
  const viteHmr = '@vite/client';
  for (const arg of args) {
    let text = '';
    if (arg instanceof Error) text = `${arg.message} ${arg.stack ?? ''}`;
    else if (arg !== null && arg !== undefined) text = String(arg);
    for (const kw of keywords) if (text.includes(kw)) return true;
    if (text.includes(viteHmr) && text.includes('ping')) return true;
  }
  return false;
}

if (import.meta.env.DEV) {
  const originalConsoleError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    if (shouldSuppressHmrError(args)) return;
    originalConsoleError(...args);
  };

  window.addEventListener('error', (e) => {
    const msg = e.message || String(e.error || '');
    const keywords = ['ERR_CONNECTION_REFUSED', 'ERR_ABORTED', 'ERR_FAILED', 'ERR_CANCELED'];
    if (keywords.some(k => msg.includes(k))) {
      e.stopImmediatePropagation();
      return false;
    }
  }, true);

  window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason;
    const args = [reason instanceof Error ? reason : new Error(String(reason))];
    if (shouldSuppressHmrError(args)) {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
  });
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
