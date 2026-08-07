import { createContext, useContext } from 'react';
import type { CurrentUser } from './access';

// 当前用户上下文:由 App.tsx 的 RequireAuth 提供,供布局与页面消费
export const CurrentUserContext = createContext<CurrentUser | null>(null);

// 在函数组件中获取当前登录用户
export const useCurrentUser = (): CurrentUser | null => {
  return useContext(CurrentUserContext);
};
