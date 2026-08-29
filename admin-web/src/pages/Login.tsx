import { LockOutlined, UserOutlined, WarningOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { Alert, App, Modal, Typography } from 'antd';
import { LoginForm, ProFormText } from '@ant-design/pro-components';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { login } from '../services/auth';

const { Text } = Typography;

const CAROUSEL_IMAGES = [
  '/鸽子1.jpg',
  '/鸽子2.jpg',
  '/鸽子3.jpg',
  '/鸽子4.jpg',
];

const Login = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [forgotModalOpen, setForgotModalOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % CAROUSEL_IMAGES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = async (values: { username: string; password: string }) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const result = await login(values);
      message.success('登录成功');
      navigate('/', { replace: true });
      void result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : '登录失败';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    setForgotModalOpen(true);
  };

  const handleBackToLogin = () => {
    setForgotModalOpen(false);
    message.info('请输入您的登录密码继续登录');
  };

  const handleRecoverPassword = () => {
    setForgotModalOpen(false);
    navigate('/forgot-password');
  };

  return (
    <>
      <style>{`
        .login-split-root {
          min-height: 100vh;
          display: flex;
          background: #f0f2f5;
        }

        .login-left {
          width: 52%;
          position: relative;
          overflow: hidden;
        }

        .login-right {
          width: 48%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: rgb(249, 246, 240);
          padding: 40px 20px;
        }

        .login-carousel {
          position: absolute;
          inset: 0;
        }

        .login-carousel-slide {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
          transition: opacity 0.8s ease-in-out;
        }

        .login-carousel-slide.active {
          opacity: 1;
        }

        .login-carousel-slide img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .login-gradient-overlay {
          position: absolute;
          top: 0;
          bottom: 0;
          left: 0;
          width: calc(100% + 100px);
          right: -100px;
          background: linear-gradient(to left,
            rgba(255,255,255,0.98) 0%,
            rgba(255,255,255,0.85) 15%,
            rgba(255,255,255,0.5) 35%,
            rgba(255,255,255,0.15) 55%,
            transparent 75%);
          pointer-events: none;
          box-shadow: inset -40px 0 80px -20px rgba(255,255,255,0.3);
          z-index: 3;
        }

        .login-brand {
          text-align: center;
          margin-bottom: 32px;
          color: #1a1a1a;
          max-width: 420px;
        }

        .login-brand-title {
          font-size: 28px;
          font-weight: 700;
          margin: 0 0 8px 0;
          letter-spacing: 1px;
          line-height: 1.3;
          color: #2c3e50;
        }

        .login-brand-subtitle {
          font-size: 14px;
          color: #7f8c8d;
          margin: 0;
          line-height: 1.6;
        }

        .login-dots {
          position: absolute;
          bottom: 32px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 10px;
          z-index: 5;
        }

        .login-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: rgba(255,255,255,0.5);
          cursor: pointer;
          transition: all 0.3s ease;
          border: none;
          padding: 0;
        }

        .login-dot.active {
          background: #1677ff;
          width: 28px;
          border-radius: 5px;
        }

        .login-glass-card {
          width: 420px;
          max-width: 100%;
          background: rgba(255,255,255,0.85);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.15);
          padding: 36px 32px;
        }

        .login-logo-area {
          text-align: center;
          margin-bottom: 24px;
        }

        .login-logo-icon {
          width: 56px;
          height: 56px;
          margin: 0 auto 12px;
          background: linear-gradient(135deg, #1677ff, #4096ff);
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          font-size: 28px;
          box-shadow: 0 8px 20px rgba(22,119,255,0.35);
        }

        .login-welcome-title {
          font-size: 24px;
          font-weight: 600;
          margin: 0 0 4px 0;
          color: #1a1a1a;
        }

        .login-welcome-sub {
          font-size: 14px;
          color: #888;
          margin: 0 0 24px 0;
        }

        .login-hint {
          text-align: center;
          margin-top: 12px;
          font-size: 12px;
          color: #999;
        }

        .login-submit-btn {
          width: 100%;
          height: 48px;
          font-size: 16px;
          font-weight: 500;
          border-radius: 10px;
          background: linear-gradient(135deg, #1677ff, #4096ff) !important;
          border: none !important;
          transition: all 0.3s ease;
        }

        .login-submit-btn:hover {
          transform: translateY(-1px);
        }

        .login-forgot-area {
          display: flex;
          justify-content: flex-end;
          margin-top: -4px;
          margin-bottom: 8px;
        }

        .login-forgot-link {
          color: #1677ff;
          font-size: 16px;
          cursor: pointer;
          background: none;
          border: none;
          padding: 4px 8px;
          transition: color 0.2s ease;
        }

        .login-forgot-link:hover {
          color: #4096ff;
          text-decoration: underline;
        }

        .login-glass-card .ant-input-affix-wrapper {
          border-radius: 10px;
          padding: 4px 11px;
        }

        .login-glass-card .ant-input-affix-wrapper-lg {
          padding: 6px 11px;
        }

        .login-glass-card .ant-form-item {
          margin-bottom: 18px;
        }

        .login-glass-card .ant-pro-form-login-container {
          height: 160px !important;
        }

        .login-glass-card .ant-pro-form-login-container .ant-pro-form {
          height: auto !important;
        }

        .login-glass-card .ant-form-item:last-child {
          margin-bottom: 0;
        }

        .login-glass-card .ant-btn-primary {
          margin-top: 0;
        }

        .forgot-option-card {
          border: 1px solid #e8e8e8;
          border-radius: 12px;
          padding: 20px;
          cursor: pointer;
          transition: all 0.3s ease;
          display: flex;
          gap: 16px;
          align-items: flex-start;
        }

        .forgot-option-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0,0,0,0.08);
        }

        .forgot-option-card.option-a {
          background: linear-gradient(135deg, #f6ffed 0%, #fcffe6 100%);
          border-color: #b7eb8f;
        }

        .forgot-option-card.option-b {
          background: linear-gradient(135deg, #fff2e8 0%, #fff7e6 100%);
          border-color: #ffd591;
        }

        .forgot-option-icon {
          font-size: 32px;
          flex-shrink: 0;
        }

        .forgot-option-icon.icon-check {
          color: #52c41a;
        }

        .forgot-option-icon.icon-warning {
          color: #fa8c16;
        }

        .forgot-option-content {
          flex: 1;
        }

        .forgot-option-title {
          font-size: 16px;
          font-weight: 600;
          margin: 0 0 6px 0;
          color: #1a1a1a;
        }

        .forgot-option-desc {
          font-size: 13px;
          color: #666;
          margin: 0 0 12px 0;
          line-height: 1.5;
        }

        .forgot-option-btn {
          border-radius: 8px;
          font-weight: 500;
        }

        .forgot-option-btn.btn-primary {
          background: linear-gradient(135deg, #52c41a, #73d13d);
          border: none;
          color: white;
        }

        .forgot-option-btn.btn-warning {
          background: linear-gradient(135deg, #fa8c16, #ffa940);
          border: none;
          color: white;
        }

        @media (max-width: 768px) {
          .login-split-root {
            flex-direction: column;
          }
          .login-left {
            display: none;
          }
          .login-right {
            width: 100%;
            min-height: 100vh;
            padding: 24px 16px;
          }
          .login-glass-card {
            width: 100%;
            padding: 28px 20px;
            border-radius: 14px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.12);
          }
          .login-brand-title {
            font-size: 22px;
          }
          .login-welcome-title {
            font-size: 20px;
          }
        }
        @media (max-width: 480px) {
          .login-right {
            padding: 16px 12px;
          }
          .login-glass-card {
            padding: 22px 16px;
            border-radius: 12px;
          }
          .login-brand-title {
            font-size: 18px;
          }
          .login-brand-subtitle {
            font-size: 12px;
          }
          .login-logo-icon {
            width: 48px;
            height: 48px;
            font-size: 24px;
          }
          .login-welcome-title {
            font-size: 18px;
          }
          .login-welcome-sub {
            font-size: 12px;
          }
          .login-submit-btn {
            height: 44px;
            font-size: 15px;
          }
          .forgot-option-card {
            padding: 16px;
            gap: 12px;
          }
          .forgot-option-icon {
            font-size: 26px;
          }
          .forgot-option-title {
            font-size: 14px;
          }
          .forgot-option-desc {
            font-size: 12px;
          }
        }
      `}</style>

      <div className="login-split-root">
        <div className="login-left">
          <div className="login-carousel">
            {CAROUSEL_IMAGES.map((src, index) => (
              <div
                key={index}
                className={`login-carousel-slide${index === currentIndex ? ' active' : ''}`}
              >
                <img src={src} alt={`赛鸽图片 ${index + 1}`} />
              </div>
            ))}
          </div>

          <div className="login-gradient-overlay" />

          <div className="login-dots">
            {CAROUSEL_IMAGES.map((_, index) => (
              <button
                key={index}
                className={`login-dot${index === currentIndex ? ' active' : ''}`}
                onClick={() => setCurrentIndex(index)}
                aria-label={`切换到第 ${index + 1} 张图片`}
              />
            ))}
          </div>
        </div>

        <div className="login-right">
          <div className="login-brand">
            <h1 className="login-brand-title">赛鸽基因溯源平台</h1>
            <p className="login-brand-subtitle">
              基于基因检测的赛鸽身份识别与溯源管理系统
            </p>
          </div>

          <div className="login-glass-card">
            <div className="login-logo-area">
              <div className="login-logo-icon">
                <svg viewBox="64 64 896 896" width="32" height="32" fill="currentColor" aria-hidden="true">
                  <path d="M858.5 763.6a374 374 0 00-80.6-119.5 375.63 375.63 0 00-119.5-80.6c-.4-.2-.8-.3-1.2-.5C719.5 518 760 444.7 760 362c0-137-111-248-248-248S264 225 264 362c0 82.7 40.5 156 102.8 201.1-.4.2-.8.3-1.2.5-44.8 18.9-85 46-119.5 80.6a375.63 375.63 0 00-80.6 119.5A371.7 371.7 0 00136 901.8a8 8 0 008 8.2h60c4.4 0 7.9-3.5 8-7.8 2-77.2 33-149.5 87.8-204.3 56.7-56.7 132-87.9 212.2-87.9s155.5 31.2 212.2 87.9C779 752.7 810 825 812 902.2c.1 4.4 3.6 7.8 8 7.8h60a8 8 0 008-8.2c-1-47.8-10.9-94.3-29.5-138.2zM512 534c-45.9 0-89.1-17.9-121.6-50.4S340 407.9 340 362c0-45.9 17.9-89.1 50.4-121.6S466.1 190 512 190s89.1 17.9 121.6 50.4S684 316.1 684 362c0 45.9-17.9 89.1-50.4 121.6S557.9 534 512 534z" />
                </svg>
              </div>
              <h2 className="login-welcome-title">欢迎回来</h2>
              <p className="login-welcome-sub">请登录以访问赛鸽基因溯源管理后台</p>
            </div>

            {errorMsg && (
              <Alert
                type="error"
                message={errorMsg}
                showIcon
                style={{ marginBottom: 16 }}
                closable
                onClose={() => setErrorMsg('')}
              />
            )}

            <LoginForm
              onFinish={async (values) => {
                await handleSubmit(values as { username: string; password: string });
              }}
              submitter={{
                searchConfig: { submitText: '登 录' },
                submitButtonProps: {
                  loading,
                  className: 'login-submit-btn',
                },
              }}
            >
              <ProFormText
                name="username"
                fieldProps={{
                  size: 'large',
                  prefix: <UserOutlined />,
                }}
                placeholder="请输入用户名"
                rules={[{ required: true, message: '请输入用户名' }]}
              />
              <ProFormText.Password
                name="password"
                fieldProps={{
                  size: 'large',
                  prefix: <LockOutlined />,
                }}
                placeholder="请输入密码"
                rules={[{ required: true, message: '请输入密码' }]}
              />
            </LoginForm>

            <div className="login-forgot-area">
              <button
                type="button"
                className="login-forgot-link"
                onClick={handleForgotPassword}
              >
                忘记密码？
              </button>
            </div>

            <div className="login-hint">
              <Text type="secondary" style={{ fontSize: 12 }}>
                默认管理员账号: admin / admin123
              </Text>
            </div>
          </div>
        </div>
      </div>

      <Modal
        title="密码找回"
        open={forgotModalOpen}
        onCancel={() => setForgotModalOpen(false)}
        footer={null}
        width={520}
        centered
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '8px 0' }}>
          <div
            className="forgot-option-card option-a"
            role="button"
            tabIndex={0}
            aria-label="记得密码,点击返回登录页"
            onClick={handleBackToLogin}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleBackToLogin();
              }
            }}
          >
            <CheckCircleOutlined className="forgot-option-icon icon-check" />
            <div className="forgot-option-content">
              <div className="forgot-option-title">记得密码</div>
              <p className="forgot-option-desc">您还记得登录密码，点击返回登录页</p>
              <button
                type="button"
                className="forgot-option-btn btn-primary"
                onClick={(e) => {
                  e.stopPropagation();
                  handleBackToLogin();
                }}
              >
                返回登录
              </button>
            </div>
          </div>

          <div
            className="forgot-option-card option-b"
            role="button"
            tabIndex={0}
            aria-label="完全不记得密码,点击进入密码找回"
            onClick={handleRecoverPassword}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleRecoverPassword();
              }
            }}
          >
            <WarningOutlined className="forgot-option-icon icon-warning" />
            <div className="forgot-option-content">
              <div className="forgot-option-title">完全不记得密码</div>
              <p className="forgot-option-desc">您完全忘记了密码，点击进入密码找回</p>
              <button
                type="button"
                className="forgot-option-btn btn-warning"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRecoverPassword();
                }}
              >
                找回密码
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default Login;