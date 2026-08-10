import { useCallback } from 'react';
import { App } from 'antd';

export function useRequest() {
  const { message } = App.useApp();

  const request = useCallback(async <T>(
    fn: () => Promise<T>,
    options?: { successMessage?: string; errorMessage?: string }
  ): Promise<T | null> => {
    try {
      const result = await fn();
      if (options?.successMessage) {
        message.success(options.successMessage);
      }
      return result;
    } catch (err) {
      return null;
    }
  }, [message]);

  return { request, message };
}
