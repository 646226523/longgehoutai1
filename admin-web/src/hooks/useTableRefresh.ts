import dayjs from 'dayjs';
import { useCallback, useRef, useState } from 'react';
import type { ActionType } from '@ant-design/pro-components';
import type { MessageInstance } from 'antd/es/message/interface';

interface UseTableRefreshOptions {
  showToast?: boolean;
  successMessage?: string;
  errorMessage?: string;
  onSuccess?: () => void;
  onError?: (err: unknown) => void;
  messageApi?: MessageInstance;
}

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 150;
const MIN_LOADING_DURATION = 400;

export function useTableRefresh(
  actionRef: React.MutableRefObject<ActionType | undefined>,
  options?: UseTableRefreshOptions,
) {
  const {
    showToast = true,
    successMessage = '刷新成功',
    errorMessage = '刷新失败',
    onSuccess,
    onError,
    messageApi,
  } = options ?? {};

  const [refreshing, setRefreshing] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<number | null>(null);
  const refreshingRef = useRef(false);

  const waitForActionRef = useCallback(async (): Promise<ActionType | null> => {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      if (actionRef.current) {
        return actionRef.current;
      }
      if (attempt < MAX_RETRIES - 1) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }
    return null;
  }, [actionRef]);

  const handleRefresh = useCallback(async () => {
    if (refreshingRef.current) {
      return;
    }

    refreshingRef.current = true;
    setRefreshing(true);
    setTableLoading(true);

    const startTime = Date.now();

    try {
      const action = await waitForActionRef();
      if (!action) {
        if (showToast && messageApi) {
          messageApi.warning('表格尚未就绪，请稍后再试');
        }
      } else {
        await action.reload();
        if (showToast && messageApi) {
          messageApi.success(successMessage);
        }
        setLastRefreshTime(Date.now());
        onSuccess?.();
      }
    } catch (err) {
      if (showToast && messageApi) {
        messageApi.error(errorMessage);
      }
      onError?.(err);
    } finally {
      // Ensure minimum loading duration for visual feedback
      const elapsed = Date.now() - startTime;
      const remaining = MIN_LOADING_DURATION - elapsed;
      if (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining));
      }
      refreshingRef.current = false;
      setRefreshing(false);
      setTableLoading(false);
    }
  }, [actionRef, waitForActionRef, showToast, successMessage, errorMessage, onSuccess, onError, messageApi]);

  const formatTime = useCallback((time: number | null): string => {
    if (time === null) {
      return '尚未刷新';
    }
    return dayjs(time).format('YYYY-MM-DD HH:mm:ss');
  }, []);

  return {
    refreshing,
    tableLoading,
    lastRefreshTime,
    handleRefresh,
    formatTime,
  };
}
