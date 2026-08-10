import { LockOutlined, UserOutlined, MobileOutlined } from '@ant-design/icons';
import { App, Button, Form, Input, Steps } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';


const ForgotPassword = () => {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [form] = Form.useForm();

  const handleSendCode = () => {
    const account = form.getFieldValue('account');
    if (!account) {
      message.warning('请输入用户名或手机号');
      return;
    }
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    message.success('验证码已发送，请查收');
  };

  const nextStep = async () => {
    try {
      if (current === 0) {
        await form.validateFields(['account']);
      } else if (current === 1) {
        await form.validateFields(['code']);
        const code = form.getFieldValue('code');
        if (code.length !== 6) {
          message.error('验证码为6位数字');
          return;
        }
      } else if (current === 2) {
        await form.validateFields(['newPassword', 'confirmPassword']);
        const { newPassword, confirmPassword } = form.getFieldsValue();
        if (newPassword !== confirmPassword) {
          message.error('两次输入的密码不一致');
          return;
        }
        if (newPassword.length < 6) {
          message.error('密码长度至少为6位');
          return;
        }
        setLoading(true);
        setTimeout(() => {
          setLoading(false);
          message.success('密码重置成功，请重新登录');
          navigate('/login', { replace: true });
        }, 1000);
        return;
      }
      setCurrent((prev) => prev + 1);
    } catch {
      // validation failed
    }
  };

  const prevStep = () => {
    setCurrent((prev) => Math.max(prev - 1, 0));
  };

  const steps = [
    { title: '账号验证', icon: <UserOutlined /> },
    { title: '输入验证码', icon: <MobileOutlined /> },
    { title: '重置密码', icon: <LockOutlined /> },
  ];

  return (
    <>
      <style>{`
        .forgot-split-root {
          min-height: 100vh;
          display: flex;
          background: #f0f2f5;
        }

        .forgot-left {
          width: 52%;
          position: relative;
          overflow: hidden;
          background: linear-gradient(135deg, #1e3a5f 0%, #2d5f8f 50%, #4a90d9 100%);
        }

        .forgot-left::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(to left,
            rgba(255,255,255,0.98) 0%,
            rgba(255,255,255,0.85) 15%,
            rgba(255,255,255,0.5) 35%,
            rgba(255,255,255,0.15) 55%,
            transparent 75%);
        }

        .forgot-brand {
          position: absolute;
          left: 8%;
          top: 50%;
          transform: translateY(-50%);
          z-index: 2;
          color: #1a1a1a;
          max-width: 420px;
        }

        .forgot-brand-title {
          font-size: 36px;
          font-weight: 700;
          margin: 0 0 12px 0;
          letter-spacing: 2px;
          line-height: 1.3;
        }

        .forgot-brand-subtitle {
          font-size: 16px;
          color: #555;
          margin: 0;
          line-height: 1.6;
        }

        .forgot-right {
          width: 48%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: linear-gradient(180deg, #f5f7fa 0%, #e4e9f0 100%);
          padding: 40px 20px;
        }

        .forgot-card {
          width: 460px;
          max-width: 100%;
          background: rgba(255,255,255,0.92);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.15);
          padding: 36px 32px;
        }

        .forgot-header {
          text-align: center;
          margin-bottom: 24px;
        }

        .forgot-header-title {
          font-size: 24px;
          font-weight: 600;
          margin: 0 0 4px 0;
          color: #1a1a1a;
        }

        .forgot-header-sub {
          font-size: 14px;
          color: #888;
          margin: 0;
        }

        .forgot-steps {
          margin-bottom: 28px;
        }

        .forgot-actions {
          display: flex;
          justify-content: space-between;
          margin-top: 8px;
          gap: 12px;
        }

        .forgot-actions .ant-btn {
          height: 44px;
          font-size: 15px;
          border-radius: 10px;
        }

        .forgot-actions .ant-btn-primary {
          background: linear-gradient(135deg, #1677ff, #4096ff) !important;
          border: none !important;
          flex: 1;
        }

        .forgot-actions .ant-btn-default {
          min-width: 100px;
        }

        .forgot-back {
          text-align: center;
          margin-top: 16px;
        }

        .forgot-back-btn {
          color: #1677ff;
          font-size: 14px;
          cursor: pointer;
          background: none;
          border: none;
          padding: 4px 8px;
        }

        .forgot-back-btn:hover {
          color: #4096ff;
          text-decoration: underline;
        }

        @media (max-width: 768px) {
          .forgot-split-root {
            flex-direction: column;
          }
          .forgot-left {
            display: none;
          }
          .forgot-right {
            width: 100%;
            min-height: 100vh;
          }
          .forgot-card {
            width: 100%;
            padding: 32px 24px;
          }
        }
      `}</style>

      <div className="forgot-split-root">
        <div className="forgot-left">
          <div className="forgot-brand">
            <h1 className="forgot-brand-title">赛鸽基因溯源平台</h1>
            <p className="forgot-brand-subtitle">
              基于基因检测的赛鸽身份识别与溯源管理系统
            </p>
          </div>
        </div>

        <div className="forgot-right">
          <div className="forgot-card">
            <div className="forgot-header">
              <h2 className="forgot-header-title">找回密码</h2>
              <p className="forgot-header-sub">请按步骤操作重置您的登录密码</p>
            </div>

            <Steps
              current={current}
              items={steps}
              className="forgot-steps"
              size="small"
            />

            <Form
              form={form}
              layout="vertical"
              requiredMark={false}
              initialValues={{ account: '', code: '', newPassword: '', confirmPassword: '' }}
            >
              {current === 0 && (
                <>
                  <Form.Item
                    name="account"
                    label="用户名 / 手机号"
                    rules={[{ required: true, message: '请输入用户名或手机号' }]}
                  >
                    <Input
                      size="large"
                      prefix={<UserOutlined />}
                      placeholder="请输入您的用户名或手机号"
                    />
                  </Form.Item>
                </>
              )}

              {current === 1 && (
                <>
                  <Form.Item
                    name="code"
                    label="验证码"
                    rules={[
                      { required: true, message: '请输入验证码' },
                      { len: 6, message: '验证码为6位数字' },
                    ]}
                  >
                    <Input
                      size="large"
                      prefix={<MobileOutlined />}
                      placeholder="请输入6位验证码"
                      maxLength={6}
                    />
                  </Form.Item>
                  <Form.Item style={{ marginBottom: 8 }}>
                    <Button
                      block
                      size="large"
                      onClick={handleSendCode}
                      disabled={countdown > 0}
                      style={{
                        borderRadius: 10,
                        height: 44,
                        borderColor: '#1677ff',
                        color: '#1677ff',
                      }}
                    >
                      {countdown > 0 ? `${countdown}s 后重发` : '获取验证码'}
                    </Button>
                  </Form.Item>
                </>
              )}

              {current === 2 && (
                <>
                  <Form.Item
                    name="newPassword"
                    label="新密码"
                    rules={[
                      { required: true, message: '请输入新密码' },
                      { min: 6, message: '密码长度至少为6位' },
                    ]}
                  >
                    <Input.Password
                      size="large"
                      prefix={<LockOutlined />}
                      placeholder="请输入新密码（至少6位）"
                    />
                  </Form.Item>
                  <Form.Item
                    name="confirmPassword"
                    label="确认新密码"
                    dependencies={['newPassword']}
                    rules={[
                      { required: true, message: '请确认新密码' },
                      ({ getFieldValue }) => ({
                        validator(_, value) {
                          if (!value || getFieldValue('newPassword') === value) {
                            return Promise.resolve();
                          }
                          return Promise.reject(new Error('两次输入的密码不一致'));
                        },
                      }),
                    ]}
                  >
                    <Input.Password
                      size="large"
                      prefix={<LockOutlined />}
                      placeholder="请再次输入新密码"
                    />
                  </Form.Item>
                </>
              )}

              <div className="forgot-actions">
                {current > 0 ? (
                  <Button
                    size="large"
                    className="forgot-prev-btn"
                    onClick={prevStep}
                  >
                    上一步
                  </Button>
                ) : (
                  <Button
                    size="large"
                    className="forgot-prev-btn"
                    onClick={() => navigate('/login')}
                  >
                    返回登录
                  </Button>
                )}
                <Button
                  type="primary"
                  size="large"
                  loading={loading}
                  onClick={nextStep}
                >
                  {current === 2 ? '确认重置' : '下一步'}
                </Button>
              </div>
            </Form>

            <div className="forgot-back">
              <button
                type="button"
                className="forgot-back-btn"
                onClick={() => navigate('/login')}
              >
                返回登录页
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ForgotPassword;