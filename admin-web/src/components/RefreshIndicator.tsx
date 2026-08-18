import { LoadingOutlined } from '@ant-design/icons';
import { Space, Tooltip } from 'antd';

interface RefreshIndicatorProps {
  lastRefreshTime: number | null;
  formatTime: (time: number | null) => string;
  loading?: boolean;
}

const RefreshIndicator: React.FC<RefreshIndicatorProps> = ({
  lastRefreshTime,
  formatTime,
  loading = false,
}) => {
  const textStyle: React.CSSProperties = {
    color: 'rgba(0,0,0,0.45)',
    fontSize: 12,
  };

  if (loading) {
    return (
      <Tooltip title="正在刷新...">
        <span style={textStyle}>
          <Space size={4}>
            <LoadingOutlined spin />
            <span>正在刷新...</span>
          </Space>
        </span>
      </Tooltip>
    );
  }

  if (lastRefreshTime === null) {
    return (
      <span style={textStyle}>
        <Space size={4}>
          <span>尚未刷新</span>
        </Space>
      </span>
    );
  }

  return (
    <span style={textStyle}>
      <Space size={4}>
        <span>上次刷新: {formatTime(lastRefreshTime)}</span>
      </Space>
    </span>
  );
};

export default RefreshIndicator;