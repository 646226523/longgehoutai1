import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button, Result, Space, Typography } from 'antd';
import { WarningOutlined } from '@ant-design/icons';

const { Paragraph } = Typography;

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({
      error,
      errorInfo,
    });
  }

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const description = this.state.error?.message || '应用程序发生了一个意外错误,请稍后重试。';

      return (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '100vh',
            width: '100%',
            background: '#f0f2f5',
          }}
        >
          <Result
            status="error"
            icon={<WarningOutlined />}
            title="页面发生错误"
            subTitle={description}
            extra={
              <Space>
                <Button type="primary" onClick={this.handleGoHome}>
                  返回首页
                </Button>
                <Button onClick={this.handleReload}>重新加载</Button>
              </Space>
            }
          >
            <Paragraph type="secondary" style={{ textAlign: 'center', marginTop: -16 }}>
              错误详情: {this.state.error?.toString()}
            </Paragraph>
          </Result>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;