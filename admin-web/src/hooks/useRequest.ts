import { useCallback } from 'react';
import { useAntdApp } from './useAntdApp';

export function useRequest() {
  const { message } = useAntdApp();

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