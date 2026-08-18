import { Button, App, Space } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import type { ActionType } from '@ant-design/pro-components';
import { useTableRefresh } from '../hooks/useTableRefresh';
import RefreshIndicator from './RefreshIndicator';

interface RefreshButtonProps {
  actionRef: React.MutableRefObject<ActionType | undefined>;
  showIndicator?: boolean;
  showToast?: boolean;
  successMessage?: string;
  errorMessage?: string;
  onSuccess?: () => void;
  onError?: (err: unknown) => void;
  style?: React.CSSProperties;
  className?: string;
  size?: 'small' | 'middle' | 'large';
}

const RefreshButton = ({
  actionRef,
  showIndicator = true,
  showToast = true,
  successMessage,
  errorMessage,
  onSuccess,
  onError,
  style,
  className,
  size = 'middle',
}: RefreshButtonProps) => {
  const { message } = App.useApp();

  const { refreshing, lastRefreshTime, handleRefresh, formatTime } = useTableRefresh(
    actionRef,
    {
      showToast,
      successMessage,
      errorMessage,
      onSuccess,
      onError,
      messageApi: message,
    },
  );

  const button = (
    <Button
      size={size}
      icon={<ReloadOutlined spin={refreshing} />}
      loading={refreshing}
      onClick={handleRefresh}
      style={style}
      className={className}
    >
      刷新
    </Button>
  );

  if (!showIndicator) {
    return button;
  }

  return (
    <Space>
      {button}
      <RefreshIndicator
        lastRefreshTime={lastRefreshTime}
        formatTime={formatTime}
        loading={refreshing}
      />
    </Space>
  );
};

export default RefreshButton;