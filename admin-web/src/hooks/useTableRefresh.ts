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

  const handleRefresh = useCallback(async () => {
    if (refreshingRef.current) {
      return;
    }

    refreshingRef.current = true;
    setRefreshing(true);
    setTableLoading(true);

    try {
      await actionRef.current?.reload();
      if (showToast && messageApi) {
        messageApi.success(successMessage);
      }
      setLastRefreshTime(Date.now());
      onSuccess?.();
    } catch (err) {
      if (showToast && messageApi) {
        messageApi.error(errorMessage);
      }
      onError?.(err);
    } finally {
      refreshingRef.current = false;
      setRefreshing(false);
      setTableLoading(false);
    }
  }, [actionRef, showToast, successMessage, errorMessage, onSuccess, onError, messageApi]);

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
