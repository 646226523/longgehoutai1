import { PageContainer } from '@ant-design/pro-components';
import { App, Button, Card, Input, InputNumber, Select, Space, Spin, Switch, Table, Tabs, Tag, Tooltip, Segmented, Alert, Modal, Form, DatePicker, Row, Col, Statistic, type TableProps } from 'antd';
import {
  CameraOutlined,
  CompressOutlined,
  EyeInvisibleOutlined,
  EyeTwoTone,
  MessageOutlined,
  MinusCircleOutlined,
  PictureOutlined,
  PlayCircleOutlined,
  StopOutlined,
  WechatOutlined,
  FontSizeOutlined,
  PlusOutlined,
  DeleteOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import { useCallback, useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { useCurrentUser } from '../../app-context';
import { hasPermission } from '../../access';
import { getConfigs, updateConfig, type ConfigItem, testQiniuToken } from '../../services/system';
import { http } from '../../services/request';
import ImageUploader from '../../components/ImageUploader';

// ==================== 配置项类型定义 ====================
// 配置键 → 渲染类型 映射
type FieldType = 'text' | 'number' | 'password' | 'textarea' | 'select' | 'switch' | 'segmented';

// 字段元信息：决定渲染控件 + 校验规则 + 说明
interface FieldMeta {
  type: FieldType;
  options?: Array<{ label: string; value: string }>;
  placeholder?: string;
  extra?: string;      // 显示在下方的帮助文本
  maxLength?: number;
  suffix?: string;     // Input 的后缀单位，如 'MB'
  required?: boolean;  // 是否必填（全局保存时校验）
}

// ==================== 分组元信息 ====================
// 分组中文名 + 排序
const GROUP_META: Record<string, { label: string; sort: number; icon?: string }> = {
  general:        { label: '基础配置', sort: 1 },
  security:       { label: '安全配置', sort: 2 },
  map:            { label: '地图配置', sort: 3 },
  upload:         { label: '上传设置', sort: 4 },
  cloud_storage:  { label: '云存储（七牛云）', sort: 5 },
  image:           { label: '图片处理', sort: 6 },
  payment:         { label: '支付管理', sort: 7 },
  customer_service:{ label: '客服配置', sort: 8 },
  sms:             { label: '短信服务', sort: 9 },
  business:        { label: '业务配置', sort: 99 },
};
const GROUP_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(GROUP_META).map(([k, v]) => [k, v.label])
);

// ==================== 字段元信息 ====================
// 统一在这里定义每个配置键的渲染类型，方便后续扩展
const FIELD_META: Record<string, FieldMeta> = {
  // ---------- 基础配置（general 分组主要用 renderGeneralPanel 自定义渲染，此处补默认类型） ----------
  site_name:        { type: 'text', placeholder: '站点名称' },
  site_version:     { type: 'text', placeholder: '1.0.0' },
  admin_page_size:  { type: 'number', suffix: '条' },
  upload_max_size:  { type: 'number', suffix: 'MB' },

  // ---------- 地图 ----------
  map_provider: {
    type: 'select',
    options: [
      { label: '不使用地图', value: 'none' },
      { label: '高德地图', value: 'amap' },
      { label: '百度地图', value: 'baidu' },
      { label: '腾讯地图', value: 'tencent' },
    ],
  },
  map_amap_key:   { type: 'password', placeholder: '高德开放平台 → Web 端(JS API) Key' },
  map_baidu_key:  { type: 'password', placeholder: '百度地图开放平台 → 浏览器端 AK' },
  map_tencent_key:{ type: 'password', placeholder: '腾讯位置服务 → JS API Key' },

  // ---------- 上传设置 ----------
  upload_max_size_mb:   { type: 'number', suffix: 'MB', placeholder: '10' },
  upload_allowed_types: {
    type: 'textarea',
    placeholder: 'jpg,jpeg,png,gif,webp,pdf,mp4',
    extra: '逗号分隔的扩展名列表，小写，不需要点号',
  },
  upload_use_cloud: {
    type: 'select',
    options: [
      { label: '七牛云', value: 'qiniu' },
      { label: '本地存储', value: 'local' },
    ],
  },

  // ---------- 七牛云 ----------
  qiniu_access_key:  { type: 'password', placeholder: '七牛云开发者中心 → 密钥管理 → Access Key' },
  qiniu_secret_key:  { type: 'password', placeholder: '七牛云开发者中心 → 密钥管理 → Secret Key' },
  qiniu_bucket:      { type: 'text', placeholder: '七牛云对象存储 → 创建的 Bucket 名称' },
  qiniu_domain:      { type: 'text', placeholder: 'https://cdn.example.com', extra: 'CDN 加速域名（必须完整 URL 含协议）' },
  qiniu_upload_url:  { type: 'text', placeholder: 'https://upload.qiniup.com' },
  qiniu_region: {
    type: 'select',
    options: [
      { label: '华东 z0', value: 'z0' },
      { label: '华北 z1', value: 'z1' },
      { label: '华南 z2', value: 'z2' },
      { label: '北美 na0', value: 'na0' },
      { label: '新加坡 as0', value: 'as0' },
    ],
  },
  qiniu_use_https: {
    type: 'switch',
    extra: '建议开启，公网传输安全优先',
  },

  // ---------- 图片处理 ----------
  image_large_width:  { type: 'number', suffix: 'px' },
  image_large_height: { type: 'number', suffix: 'px' },
  image_medium_width:  { type: 'number', suffix: 'px' },
  image_medium_height: { type: 'number', suffix: 'px' },
  image_small_width:   { type: 'number', suffix: 'px' },
  image_small_height:  { type: 'number', suffix: 'px' },
  image_watermark_enable: { type: 'switch', extra: '开启后上传的图片将自动添加文字水印' },
  image_watermark_text:   { type: 'text', placeholder: '© 赛鸽基因' },
  image_watermark_position: {
    type: 'select',
    options: [
      { label: '左上角',   value: 'top-left' },
      { label: '顶部居中', value: 'top-center' },
      { label: '右上角',   value: 'top-right' },
      { label: '左下角',   value: 'bottom-left' },
      { label: '底部居中', value: 'bottom-center' },
      { label: '右下角',   value: 'bottom-right' },
    ],
  },
  image_compress_quality: {
    type: 'select',
    options: [
      { label: '不压缩', value: '100' },
      { label: '90% 高清', value: '90' },
      { label: '70% 标准', value: '70' },
      { label: '50% 中等', value: '50' },
      { label: '20% 低质', value: '20' },
    ],
  },

  // ---------- 微信支付 ----------
  pay_wechat_enable: { type: 'switch', extra: '开启后前端将显示微信支付入口' },
  pay_wechat_appid:  { type: 'text', placeholder: 'wx1234567890abcdef' },
  pay_wechat_mch_id: { type: 'text', placeholder: '1600000000' },
  pay_wechat_api_key:{ type: 'password', placeholder: 'APIv3 密钥（32位字母数字）' },
  pay_wechat_cert_path: { type: 'text', placeholder: '/etc/wechatpay/apiclient_cert.pem' },
  pay_wechat_key_path:  { type: 'text', placeholder: '/etc/wechatpay/apiclient_key.pem' },
  pay_wechat_notify_url: {
    type: 'text',
    placeholder: 'https://yourdomain.com/api/pay/wechat/notify',
    extra: '必须是 HTTPS 外网可访问的地址，微信支付结果将异步推送到此处',
  },

  // ---------- 支付宝 ----------
  pay_alipay_enable: { type: 'switch', extra: '开启后前端将显示支付宝支付入口' },
  pay_alipay_appid:  { type: 'text', placeholder: '2021000000000000' },
  pay_alipay_private_key: {
    type: 'password',
    placeholder: '-----BEGIN RSA PRIVATE KEY-----...',
    extra: '应用私钥（APP_PRIVATE_KEY），RSA2 签名用。注意：支付宝官方推荐使用证书模式',
  },
  pay_alipay_public_key: {
    type: 'password',
    placeholder: '-----BEGIN PUBLIC KEY-----...',
    extra: '支付宝公钥（ALIPAY_PUBLIC_KEY），验证回调签名用',
  },
  pay_alipay_gateway: {
    type: 'select',
    options: [
      { label: '正式环境', value: 'https://openapi.alipay.com/gateway.do' },
      { label: '沙箱测试', value: 'https://openapi-sandbox.dl.alipaydev.com/gateway.do' },
    ],
  },
  pay_alipay_notify_url: {
    type: 'text',
    placeholder: 'https://yourdomain.com/api/pay/alipay/notify',
    extra: '异步通知地址，必须外网可访问',
  },

  // ---------- 易付通 ----------
  pay_yft_enable: { type: 'switch', extra: '开启后前端将显示易付通支付入口' },
  pay_yft_appid:  { type: 'text', placeholder: '易付通商户中心分配的 AppID' },
  pay_yft_secret_key: { type: 'password', placeholder: '易付通商户中心分配的密钥' },
  pay_yft_gateway: { type: 'text', placeholder: 'http://221.122.92.171/web/' },
  pay_yft_notify_url: {
    type: 'text',
    placeholder: 'https://yourdomain.com/api/pay/yft/notify',
    extra: '支付结果异步通知地址，必须外网可访问',
  },

  // ---------- 客服配置 ----------
  wx_cs_enable: {
    type: 'select',
    options: [
      { label: '启用', value: '1' },
      { label: '关闭', value: '0' },
    ],
  },
  wx_cs_appid:  { type: 'text' },
  wx_cs_secret: { type: 'password' },
  wx_cs_link:   { type: 'text', placeholder: 'https://...' },
  wx_cs_qq:     { type: 'text' },
  wx_cs_welcome:{ type: 'text' },
  wecom_cs_enable: {
    type: 'select',
    options: [
      { label: '启用', value: '1' },
      { label: '关闭', value: '0' },
    ],
  },
  wecom_cs_corp_id:    { type: 'text' },
  wecom_cs_corp_secret:{ type: 'password' },
  wecom_cs_kf_account: { type: 'text' },

  // ---------- 短信服务（腾讯云） ----------
  sms_enabled: {
    type: 'select',
    options: [
      { label: '关闭（开发模式，验证码打印到后端日志）', value: '0' },
      { label: '启用（使用腾讯云真实发送）', value: '1' },
    ],
  },
  sms_tencent_secret_id:     { type: 'password', placeholder: '腾讯云 SecretId' },
  sms_tencent_secret_key:    { type: 'password', placeholder: '腾讯云 SecretKey（敏感，仅后端使用）' },
  sms_tencent_sdk_app_id:    { type: 'text',     placeholder: 'sms-xxxxxxxxxx' },
  sms_tencent_sign_name:     { type: 'text',     placeholder: '签名内容，如"赛鸽基因"' },
  sms_tencent_template_id_register: { type: 'text', placeholder: '注册验证码模板 ID，如 198765' },
  sms_tencent_template_id_reset:    { type: 'text', placeholder: '重置密码模板 ID，如 198766' },
};

// 未在 FIELD_META 中定义的默认字段
const DEFAULT_FIELD_META: FieldMeta = { type: 'text' };

// 分组 → 额外操作按钮（如七牛云 token 测试）
type GroupExtraAction = { key: string; label: string };
const GROUP_EXTRA_ACTIONS: Record<string, GroupExtraAction[]> = {
  cloud_storage: [{ key: 'test_qiniu', label: '🔑 测试七牛云 Token' }],
  sms: [{ key: 'test_sms', label: '📱 发送测试短信' }],
};

// ==================== 组件主体 ====================
const SystemConfig = () => {
  const { message, modal } = App.useApp();
  const currentUser = useCurrentUser();
  const canManage = hasPermission(currentUser, 'system:config:manage');
  const [groups, setGroups] = useState<Array<{ group: string; items: ConfigItem[] }>>([]);
  const [loading, setLoading] = useState(false);
  const [activeGroup, setActiveGroup] = useState<string>('');
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});
  const [savingGroup, setSavingGroup] = useState(false);
  const [showPasswordKeys, setShowPasswordKeys] = useState<Record<string, boolean>>({});
  const [testingKey, setTestingKey] = useState<string | null>(null);

  // ---------- 短信日志子面板 state ----------
  const [smsSubTab, setSmsSubTab] = useState<'config' | 'logs'>('config');
  const [smsLogs, setSmsLogs] = useState<any[]>([]);
  const [smsLogsTotal, setSmsLogsTotal] = useState(0);
  const [smsLogsLoading, setSmsLogsLoading] = useState(false);
  const [smsStats, setSmsStats] = useState<any>(null);
  const [smsStatsLoading, setSmsStatsLoading] = useState(false);
  const [smsQuery, setSmsQuery] = useState({
    phone: '', scene: '', status: '', startTime: undefined as number | undefined,
    endTime: undefined as number | undefined,
  });
  const [smsPage, setSmsPage] = useState(1);
  const [smsPageSize, setSmsPageSize] = useState(20);

  // 加载配置列表
  const loadConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getConfigs();
      const safeGroups = Array.isArray(res?.groups) ? res!.groups : [];
      setGroups(safeGroups);
      if (safeGroups.length > 0 && !activeGroup) {
        // 按 GROUP_META.sort 排序，再 fallback 到后端返回顺序
        const sorted = [...safeGroups].sort((a, b) => {
          const sa = GROUP_META[a.group]?.sort ?? 998;
          const sb = GROUP_META[b.group]?.sort ?? 999;
          return sa - sb;
        });
        setActiveGroup(sorted[0].group);
      }
    } catch {
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, [activeGroup]);

  useEffect(() => {
    loadConfigs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- 辅助 ----------

  // 测试七牛云 Token
  const handleTestQiniu = async () => {
    setTestingKey('qiniu');
    try {
      const res = await testQiniuToken();
      message.success(
        `✓ 七牛云 Token 生成成功！有效期 ${res.expiresIn}s，Bucket: ${res.bucket || '未配置'}`
      );
    } catch (err) {
      message.error(`${(err as Error).message} — 请检查 Access Key / Secret Key / Bucket 是否完整`);
    } finally {
      setTestingKey(null);
    }
  };

  // 测试腾讯云短信
  const handleTestSms = async () => {
    // 弹一个 Modal 让管理员输入测试手机号
    modal.confirm({
      title: '发送测试短信',
      okText: '发送',
      cancelText: '取消',
      content: (
        <div>
          <p style={{ marginBottom: 8, color: '#666', fontSize: 12 }}>
            将使用当前 system_config 中的短信配置发送验证码到指定手机号
          </p>
          <Input
            id="sms_test_phone"
            placeholder="如 13800138000"
            maxLength={11}
            onPressEnter={() => document.querySelector<HTMLInputElement>('#sms_test_phone')?.value}
          />
        </div>
      ),
      onOk: async () => {
        const phone = document.querySelector<HTMLInputElement>('#sms_test_phone')?.value?.trim();
        if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
          message.error('请输入正确的 11 位手机号');
          return Promise.reject();
        }
        setTestingKey('test_sms');
        try {
          // 调 send-code 接口（scene=register，dev_null 模式下验证码会打印到后端日志）
          const res = await fetch('http://localhost:3015/api/user/send-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, scene: 'register' }),
          }).then((r) => r.json());
          if (res.code === 0) {
            message.success(
              `✓ 测试短信发送成功！(provider=dev_null 时验证码已打印后端日志)`
            );
          } else {
            message.error(`发送失败: ${res.message}`);
          }
        } catch (err) {
          message.error(`${(err as Error).message} — 请检查后端 sms_enabled=1 并配置完整的腾讯云参数`);
        } finally {
          setTestingKey(null);
        }
      },
    });
  };

  // ========== 短信日志查询 ==========
  const fetchSmsLogs = useCallback(async () => {
    setSmsLogsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(smsPage),
        pageSize: String(smsPageSize),
      });
      if (smsQuery.phone) params.set('phone', smsQuery.phone);
      if (smsQuery.scene) params.set('scene', smsQuery.scene);
      if (smsQuery.status) params.set('status', smsQuery.status);
      if (smsQuery.startTime) params.set('startTime', String(smsQuery.startTime));
      if (smsQuery.endTime) params.set('endTime', String(smsQuery.endTime));
      const res: any = await http.get(`/system/sms-logs?${params.toString()}`);
      setSmsLogs(res?.list ?? []);
      setSmsLogsTotal(res?.total ?? 0);
    } catch (err) {
      message.error('加载短信日志失败: ' + (err as Error).message);
    } finally {
      setSmsLogsLoading(false);
    }
  }, [smsPage, smsPageSize, smsQuery, http, message]);

  const fetchSmsStats = useCallback(async () => {
    setSmsStatsLoading(true);
    try {
      const res: any = await http.get('/system/sms-logs/stats');
      setSmsStats(res ?? null);
    } catch (err) {
      console.warn('加载短信统计失败:', err);
    } finally {
      setSmsStatsLoading(false);
    }
  }, [http]);

  // 切换到 sms 日志子 tab 时自动加载
  useEffect(() => {
    if (activeGroup === 'sms' && smsSubTab === 'logs') {
      fetchSmsLogs();
      fetchSmsStats();
    }
  }, [activeGroup, smsSubTab, fetchSmsLogs, fetchSmsStats]);

  // ========== 图片处理专用：辅助工具 ==========
  // 根据 config_key 查找 ConfigItem（从当前分组 items 里取）
  const findItem = (items: ConfigItem[], key: string): ConfigItem | undefined =>
    items.find((it) => it.config_key === key);

  // 取当前值（优先编辑中的临时值，fallback 数据库原值，最后空串）
  const getVal = (item?: ConfigItem): string =>
    item ? (editingValues[item.config_key] ?? item.config_value ?? '') : '';

  // 设置值到 editingValues（不立即落库）
  const setVal = (key: string, v: string) =>
    setEditingValues((prev) => ({ ...prev, [key]: v }));

  // 判断某配置项是否有未保存的改动
  const hasChanged = (item?: ConfigItem): boolean => {
    if (!item) return false;
    const cur = editingValues[item.config_key];
    if (cur === undefined) return false;
    return cur !== (item.config_value ?? '');
  };

  // 获取当前 activeGroup 的 items
  const getActiveGroupItems = useCallback((): ConfigItem[] => {
    const g = groups.find((g) => g.group === activeGroup);
    return g?.items ?? [];
  }, [groups, activeGroup]);

  // 当前分组是否有任何未保存改动
  const hasAnyChangeInActiveGroup = useCallback((): boolean => {
    const items = getActiveGroupItems();
    return items.some((it) => hasChanged(it));
  }, [getActiveGroupItems, editingValues]);

  // 动态 requiredIf 判断 —— 根据开关决定哪些字段必填
  const isDynamicRequired = useCallback(
    (key: string, items: ConfigItem[]): boolean => {
      const getValByKey = (k: string) => editingValues[k] ?? items.find((i) => i.config_key === k)?.config_value ?? '';
      // sms_enabled='1' → 腾讯云参数必填
      if (getValByKey('sms_enabled') === '1') {
        if (['sms_tencent_secret_id', 'sms_tencent_secret_key', 'sms_tencent_sdk_app_id',
             'sms_tencent_sign_name', 'sms_tencent_template_id_register', 'sms_tencent_template_id_reset'].includes(key))
          return true;
      }
      // cloud_storage_provider='qiniu' → 七牛云参数必填
      if (getValByKey('cloud_storage_provider') === 'qiniu') {
        if (['qiniu_access_key', 'qiniu_secret_key', 'qiniu_bucket'].includes(key))
          return true;
      }
      // pay_wechat_enable='1' → 微信参数必填
      if (getValByKey('pay_wechat_enable') === '1') {
        if (['pay_wechat_appid', 'pay_wechat_mch_id', 'pay_wechat_api_key', 'pay_wechat_notify_url'].includes(key))
          return true;
      }
      // pay_alipay_enable='1' → 支付宝参数必填
      if (getValByKey('pay_alipay_enable') === '1') {
        if (['pay_alipay_appid', 'pay_alipay_private_key', 'pay_alipay_public_key', 'pay_alipay_notify_url'].includes(key))
          return true;
      }
      // pay_yft_enable='1' → 易付通参数必填
      if (getValByKey('pay_yft_enable') === '1') {
        if (['pay_yft_appid', 'pay_yft_secret_key', 'pay_yft_notify_url'].includes(key))
          return true;
      }
      return false;
    },
    [editingValues]
  );

  // 校验当前分组必填项 —— 返回未通过校验的配置名称列表
  const validateActiveGroup = useCallback((): string[] => {
    const items = getActiveGroupItems();
    const missing: string[] = [];
    items.forEach((it) => {
      const fm = FIELD_META[it.config_key];
      const val = editingValues[it.config_key] ?? it.config_value ?? '';
      const staticRequired = fm?.required === true;
      const dynamicRequired = isDynamicRequired(it.config_key, items);
      if ((staticRequired || dynamicRequired) && !String(val).trim()) {
        missing.push(it.name);
      }
    });
    return missing;
  }, [getActiveGroupItems, isDynamicRequired, editingValues]);

  // 全局保存：当前分组所有改动一次提交
  const handleSaveAll = useCallback(async () => {
    if (savingGroup) return;
    const items = getActiveGroupItems();
    const changedKeys = items.filter((it) => hasChanged(it)).map((it) => it.config_key);
    if (changedKeys.length === 0) return;

    // 1. 校验必填
    const missing = validateActiveGroup();
    if (missing.length > 0) {
      message.error(`以下配置项未填写：${missing.join('、')}`);
      return;
    }

    // 2. 防重入 + loading
    setSavingGroup(true);
    const failedNames: string[] = [];

    try {
      // 3. 串行保存（for-of + try-catch，失败的记录后继续）
      for (const key of changedKeys) {
        const item = items.find((i) => i.config_key === key)!;
        const newValue = editingValues[key];
        try {
          await updateConfig(key, newValue);
          // 成功 → 更新 groups 内对应项的 config_value
          setGroups((prev) =>
            prev.map((g) => ({
              ...g,
              items: g.items.map((it) =>
                it.config_key === key
                  ? { ...it, config_value: newValue }
                  : it
              ),
            }))
          );
        } catch {
          failedNames.push(item.name);
        }
      }

      // 4. 清理 editingValues（本次保存涉及的 key）
      setEditingValues((prev) => {
        const next = { ...prev };
        changedKeys.forEach((k) => delete next[k]);
        return next;
      });

      // 5. 汇总提示
      if (failedNames.length === 0) {
        message.success(`✓ ${changedKeys.length} 项配置已保存`);
      } else {
        message.warning(
          `${changedKeys.length - failedNames.length}/${changedKeys.length} 项保存成功。失败：${failedNames.join('、')}`
        );
      }
    } finally {
      setSavingGroup(false);
    }
  }, [savingGroup, getActiveGroupItems, validateActiveGroup, editingValues, message]);

  // 取消当前分组所有改动
  const handleResetChanges = useCallback(() => {
    const items = getActiveGroupItems();
    setEditingValues((prev) => {
      const next = { ...prev };
      items.forEach((it) => delete next[it.config_key]);
      return next;
    });
  }, [getActiveGroupItems, editingValues]);

  // ========== 图片处理专用：缩略图尺寸行（宽 + 高） ==========
  type ThumbRow = { label: string; widthKey: string; heightKey: string };
  const THUMB_ROWS: ThumbRow[] = [
    { label: '缩略图大图', widthKey: 'image_large_width',  heightKey: 'image_large_height'  },
    { label: '缩略图中图', widthKey: 'image_medium_width', heightKey: 'image_medium_height' },
    { label: '缩略图小图', widthKey: 'image_small_width',  heightKey: 'image_small_height'  },
  ];

  const renderThumbRow = (row: ThumbRow, items: ConfigItem[]) => {
    const w = findItem(items, row.widthKey);
    const h = findItem(items, row.heightKey);
    if (!w || !h) return null;
    const dirty = hasChanged(w) || hasChanged(h);
    return (
      <div
        key={row.widthKey}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '10px 12px',
          borderRadius: 8,
          background: '#fafafa',
          marginBottom: 8,
          border: '1px solid transparent',
          borderColor: dirty ? '#91caff' : 'transparent',
          transition: 'border-color .2s',
        }}
      >
        <div style={{ width: 120, display: 'flex', alignItems: 'center', gap: 6, color: '#595959' }}>
          <MinusCircleOutlined style={{ color: '#bfbfbf' }} />
          <span>{row.label}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
          <span style={{ color: '#8c8c8c', fontSize: 13 }}>宽</span>
          <Input
            type="number"
            value={getVal(w)}
            onChange={(e) => setVal(w.config_key, e.target.value)}
            disabled={!canManage}
            suffix="px"
            style={{ width: 130 }}
          />
          <span style={{ color: '#bfbfbf' }}>×</span>
          <span style={{ color: '#8c8c8c', fontSize: 13 }}>高</span>
          <Input
            type="number"
            value={getVal(h)}
            onChange={(e) => setVal(h.config_key, e.target.value)}
            disabled={!canManage}
            suffix="px"
            style={{ width: 130 }}
          />
          {/* 全局保存按钮已移至 Tab 右上角（tabBarExtraContent） */}
        </div>
      </div>
    );
  };

  // ========== 图片处理专用：水印 Card 内容 ==========
  const renderWatermarkSection = (items: ConfigItem[]) => {
    const enableItem = findItem(items, 'image_watermark_enable');
    const textItem   = findItem(items, 'image_watermark_text');
    const posItem    = findItem(items, 'image_watermark_position');
    const enabled = (getVal(enableItem) === '1');

    return (
      <div>
        {/* 水印开关 + 说明 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 16,
            padding: '12px 14px',
            background: '#fafafa',
            borderRadius: 8,
            marginBottom: 12,
          }}
        >
          <div style={{ width: 120, color: '#595959', display: 'flex', alignItems: 'center', gap: 6 }}>
            <FontSizeOutlined style={{ color: '#1677ff' }} />
            <span>启用水印</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Switch
                checked={enabled}
                onChange={(v) => setVal(enableItem!.config_key, v ? '1' : '0')}
                disabled={!canManage}
                checkedChildren={<PlayCircleOutlined />}
                unCheckedChildren={<StopOutlined />}
              />
              <span style={{ color: '#8c8c8c', fontSize: 12 }}>
                开启后，上传图片时将自动叠加文字水印
              </span>
            </div>
            {!enabled && (
              <Alert
                type="info"
                showIcon
                message="水印已关闭"
                description="水印文本、位置等参数将被忽略；开启后即可生效。"
                style={{ marginTop: 12 }}
              />
            )}
          </div>
        </div>

        {/* 水印参数 — 仅在开启时显示 */}
        {enabled && textItem && posItem && (
          <>
            {/* 水印文字 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 10 }}>
              <div style={{ width: 120, color: '#595959', textAlign: 'right' }}>水印文字</div>
              <Input
                value={getVal(textItem)}
                onChange={(e) => setVal(textItem.config_key, e.target.value)}
                disabled={!canManage}
                placeholder="例如 © 赛鸽基因"
                style={{ flex: 1, maxWidth: 360 }}
              />
              {/* 全局保存按钮已移至 Tab 右上角 */}
            </div>

            {/* 水印位置 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 120, color: '#595959', textAlign: 'right' }}>水印位置</div>
              <Select
                value={getVal(posItem)}
                options={FIELD_META.image_watermark_position.options}
                onChange={(v) => setVal(posItem.config_key, String(v))}
                disabled={!canManage}
                style={{ width: 200 }}
              />
              {/* 全局保存按钮已移至 Tab 右上角 */}
            </div>
          </>
        )}
      </div>
    );
  };

  // ========== 图片处理 Tab 整体 Card 布局 ==========
  const renderImagePanel = (items: ConfigItem[]) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 缩略图尺寸 Card */}
      <Card
        variant="borderless"
        style={{ borderRadius: 12, border: '1px solid #f0f0f0' }}
        styles={{ body: { padding: 0 } }}
        title={
          <Space size={8}>
            <div
              style={{
                width: 28, height: 28, borderRadius: 8,
                background: 'linear-gradient(135deg,#e6f4ff,#bae0ff)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#1677ff', fontSize: 14,
              }}
            ><CameraOutlined /></div>
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ fontWeight: 600, color: '#1f1f1f' }}>缩略图尺寸</div>
              <div style={{ fontSize: 12, color: '#8c8c8c', fontWeight: 400 }}>
                配置大 / 中 / 小三档缩略图的默认宽高（单位 px）
              </div>
            </div>
          </Space>
        }
      >
        <div style={{ padding: '14px 16px' }}>
          {THUMB_ROWS.map((row) => renderThumbRow(row, items))}
          <div style={{ color: '#bfbfbf', fontSize: 12, padding: '4px 4px 0' }}>
            提示：宽高同时为 0 表示不生成该档缩略图
          </div>
        </div>
      </Card>

      {/* 水印设置 Card */}
      <Card
        variant="borderless"
        style={{ borderRadius: 12, border: '1px solid #f0f0f0' }}
        styles={{ body: { padding: 0 } }}
        title={
          <Space size={8}>
            <div
              style={{
                width: 28, height: 28, borderRadius: 8,
                background: 'linear-gradient(135deg,#f6ffed,#d9f7be)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#52c41a', fontSize: 14,
              }}
            ><PictureOutlined /></div>
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ fontWeight: 600, color: '#1f1f1f' }}>水印设置</div>
              <div style={{ fontSize: 12, color: '#8c8c8c', fontWeight: 400 }}>
                开启后，上传的图片将自动叠加文字水印
              </div>
            </div>
          </Space>
        }
      >
        <div style={{ padding: '14px 16px' }}>
          {renderWatermarkSection(items)}
        </div>
      </Card>

      {/* 图片压缩 Card */}
      <Card
        variant="borderless"
        style={{ borderRadius: 12, border: '1px solid #f0f0f0' }}
        styles={{ body: { padding: 0 } }}
        title={
          <Space size={8}>
            <div
              style={{
                width: 28, height: 28, borderRadius: 8,
                background: 'linear-gradient(135deg,#f9f0ff,#efdbff)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#722ed1', fontSize: 14,
              }}
            ><CompressOutlined /></div>
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ fontWeight: 600, color: '#1f1f1f' }}>图片压缩</div>
              <div style={{ fontSize: 12, color: '#8c8c8c', fontWeight: 400 }}>
                上传原图按所选质量重新压缩，平衡画质与存储体积
              </div>
            </div>
          </Space>
        }
      >
        <div style={{ padding: '14px 16px' }}>
          {(() => {
            const item = findItem(items, 'image_compress_quality');
            if (!item) return null;
            const rawValue = editingValues[item.config_key] ?? item.config_value ?? '90';
            const setVal = (v: string) =>
              setEditingValues((prev) => ({ ...prev, [item.config_key]: v }));
            return (
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: 16,
                  padding: '10px 12px', borderRadius: 8,
                  background: '#fafafa', border: '1px solid transparent',
                }}
              >
                <div style={{ width: 120, color: '#595959' }}>压缩比例</div>
                <Select
                  value={rawValue}
                  onChange={(v) => setVal(String(v))}
                  style={{ flex: 1, maxWidth: 320 }}
                  options={FIELD_META.image_compress_quality.options}
                />
                {/* 全局保存按钮已移至 Tab 右上角 */}
              </div>
            );
          })()}
          <div style={{ color: '#bfbfbf', fontSize: 12, padding: '8px 4px 0' }}>
            提示：质量越低文件体积越小，但画质也会降低；"不压缩"表示原图直接存储
          </div>
        </div>
      </Card>
    </div>
  );

  // ========== 客服配置 Tab 整体 Card 布局 ==========
  // 单行 label(120) + 控件 + 独立保存按钮 的统一辅助渲染
  const renderCsRow = (
    label: string,
    itemKey: string,
    items: ConfigItem[],
    control: (item: ConfigItem, meta: FieldMeta) => JSX.Element
  ) => {
    const item = findItem(items, itemKey);
    if (!item) return null;
    const meta = FIELD_META[itemKey] ?? DEFAULT_FIELD_META;
    const dirty = hasChanged(item);
    return (
      <div
        key={itemKey}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '10px 12px',
          borderRadius: 8,
          background: '#fafafa',
          marginBottom: 8,
          border: '1px solid transparent',
          borderColor: dirty ? '#91caff' : 'transparent',
          transition: 'border-color .2s',
        }}
      >
        <div style={{ width: 120, display: 'flex', alignItems: 'center', color: '#595959' }}>
          {label}
        </div>
        <div style={{ flex: 1 }}>{control(item, meta)}</div>
        {/* 全局保存按钮已移至 Tab 右上角 */}
      </div>
    );
  };

  const renderCustomerServicePanel = (items: ConfigItem[]) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* 微信小程序客服 Card — 绿色渐变 */}
      <Card
        variant="borderless"
        style={{ borderRadius: 12, border: '1px solid #f0f0f0' }}
        styles={{ body: { padding: 0 } }}
        title={
          <Space size={8}>
            <div
              style={{
                width: 28, height: 28, borderRadius: 8,
                background: 'linear-gradient(135deg,#f6ffed,#d9f7be)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#52c41a', fontSize: 14,
              }}
            ><WechatOutlined /></div>
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ fontWeight: 600, color: '#1f1f1f' }}>微信小程序客服</div>
              <div style={{ fontSize: 12, color: '#8c8c8c', fontWeight: 400 }}>
                配置小程序客服会话、QQ/链接及欢迎语
              </div>
            </div>
          </Space>
        }
      >
        <div style={{ padding: '14px 16px' }}>
          {renderCsRow('客服启用', 'wx_cs_enable', items, (item, meta) => (
            <Select
              value={getVal(item)}
              options={meta.options ?? []}
              onChange={(v) => setVal(item.config_key, String(v))}
              disabled={!canManage}
              style={{ width: 200 }}
            />
          ))}
          {renderCsRow('小程序 AppID', 'wx_cs_appid', items, (item, meta) => (
            <Input
              value={getVal(item)}
              onChange={(e) => setVal(item.config_key, e.target.value)}
              disabled={!canManage}
              placeholder={meta.placeholder}
              style={{ maxWidth: 360 }}
            />
          ))}
          {renderCsRow('小程序 Secret', 'wx_cs_secret', items, (item, meta) => (
            <Input.Password
              value={getVal(item)}
              onChange={(e) => setVal(item.config_key, e.target.value)}
              disabled={!canManage}
              placeholder={meta.placeholder}
              style={{ maxWidth: 360 }}
            />
          ))}
          {renderCsRow('客服链接', 'wx_cs_link', items, (item, meta) => (
            <Input
              value={getVal(item)}
              onChange={(e) => setVal(item.config_key, e.target.value)}
              disabled={!canManage}
              placeholder={meta.placeholder}
              style={{ maxWidth: 420 }}
            />
          ))}
          {renderCsRow('客服 QQ', 'wx_cs_qq', items, (item) => (
            <Input
              value={getVal(item)}
              onChange={(e) => setVal(item.config_key, e.target.value)}
              disabled={!canManage}
              style={{ maxWidth: 260 }}
            />
          ))}
          {renderCsRow('欢迎语', 'wx_cs_welcome', items, (item) => (
            <Input
              value={getVal(item)}
              onChange={(e) => setVal(item.config_key, e.target.value)}
              disabled={!canManage}
              style={{ maxWidth: 420 }}
            />
          ))}
        </div>
      </Card>

      {/* 企业微信客服 Card — 蓝色渐变 */}
      <Card
        variant="borderless"
        style={{ borderRadius: 12, border: '1px solid #f0f0f0' }}
        styles={{ body: { padding: 0 } }}
        title={
          <Space size={8}>
            <div
              style={{
                width: 28, height: 28, borderRadius: 8,
                background: 'linear-gradient(135deg,#e6f4ff,#bae0ff)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#1677ff', fontSize: 14,
              }}
            ><MessageOutlined /></div>
            <div style={{ lineHeight: 1.2 }}>
              <div style={{ fontWeight: 600, color: '#1f1f1f' }}>企业微信客服</div>
              <div style={{ fontSize: 12, color: '#8c8c8c', fontWeight: 400 }}>
                配置企业微信客服工作台账号及凭据
              </div>
            </div>
          </Space>
        }
      >
        <div style={{ padding: '14px 16px' }}>
          {renderCsRow('客服启用', 'wecom_cs_enable', items, (item, meta) => (
            <Select
              value={getVal(item)}
              options={meta.options ?? []}
              onChange={(v) => setVal(item.config_key, String(v))}
              disabled={!canManage}
              style={{ width: 200 }}
            />
          ))}
          {renderCsRow('CorpID', 'wecom_cs_corp_id', items, (item) => (
            <Input
              value={getVal(item)}
              onChange={(e) => setVal(item.config_key, e.target.value)}
              disabled={!canManage}
              style={{ maxWidth: 360 }}
            />
          ))}
          {renderCsRow('CorpSecret', 'wecom_cs_corp_secret', items, (item) => (
            <Input.Password
              value={getVal(item)}
              onChange={(e) => setVal(item.config_key, e.target.value)}
              disabled={!canManage}
              style={{ maxWidth: 360 }}
            />
          ))}
          {renderCsRow('客服账号', 'wecom_cs_kf_account', items, (item) => (
            <Input
              value={getVal(item)}
              onChange={(e) => setVal(item.config_key, e.target.value)}
              disabled={!canManage}
              style={{ maxWidth: 360 }}
            />
          ))}
        </div>
      </Card>
    </div>
  );

  // ==================== 支付管理 Tab — 品牌化 Provider Card 布局 ====================
  const renderPaymentPanel = (items: ConfigItem[]) => {
    // ---- 内部 helper: 渲染一个紧凑的字段 ----
    const payField = (
      label: string,
      key: string,
      kind: 'text' | 'password' | 'select' = 'text',
    ): JSX.Element | null => {
      const item = findItem(items, key);
      if (!item) return null;
      const meta = FIELD_META[key] ?? DEFAULT_FIELD_META;
      const dirty = hasChanged(item);
      const controlProps = {
        value: getVal(item),
        onChange: (e: any) => setVal(key, String(e?.target?.value ?? e)),
        disabled: !canManage,
        placeholder: meta.placeholder,
        style: { width: '100%' },
      };
      let control: JSX.Element;
      if (kind === 'select' || meta.type === 'select') {
        control = <Select {...controlProps} options={meta.options ?? []} />;
      } else if (kind === 'password' || meta.type === 'password') {
        control = <Input.Password {...controlProps} />;
      } else {
        control = <Input {...controlProps} />;
      }
      return (
        <div key={key} style={{ marginBottom: 0 }}>
          <div style={{
            fontSize: 12, color: '#595959', marginBottom: 4, fontWeight: 500,
          }}>{label}</div>
          <div style={{
            border: `1px solid ${dirty ? '#1677ff' : '#d9d9d9'}`,
            borderRadius: 6,
            transition: 'border-color .2s',
            ...(dirty ? { boxShadow: '0 0 0 2px rgba(22,119,255,.1)' } : {}),
          }}>
            {control}
          </div>
          {meta.extra && (
            <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 4, lineHeight: 1.4 }}>
              {meta.extra}
            </div>
          )}
        </div>
      );
    };

    // ---- 内部 helper: Provider Card ----
    const ProviderCard = ({
      brand, name, subtitle, brandColor, brandBg, children,
    }: {
      brand: JSX.Element; name: string; subtitle: string;
      brandColor: string; brandBg: string; children: React.ReactNode;
    }) => {
      const enableKey =
        name === '微信支付' ? 'pay_wechat_enable' :
        name === '支付宝' ? 'pay_alipay_enable' :
        'pay_yft_enable';
      const enabled = getVal(findItem(items, enableKey)) === '1';
      const enableItem = findItem(items, enableKey);

      return (
        <Card
          variant="borderless"
          style={{ borderRadius: 14, border: '1px solid #f0f0f0' }}
          styles={{ body: { padding: 0 } }}
          title={
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12, width: '100%',
            }}>
              <div style={{
                width: 34, height: 34, borderRadius: 10,
                background: brandBg, color: brandColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                {brand}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontWeight: 600, fontSize: 14, color: '#1f1f1f',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  {name}
                  <Tag
                    color={enabled ? 'success' : 'default'}
                    style={{ margin: 0, fontSize: 11, lineHeight: '18px', paddingInline: 6 }}
                  >
                    {enabled ? '● 已启用' : '○ 已关闭'}
                  </Tag>
                </div>
                <div style={{ fontSize: 12, color: '#8c8c8c', fontWeight: 400 }}>
                  {subtitle}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: '#8c8c8c' }}>入口开关</span>
                <Switch
                  checked={enabled}
                  disabled={!canManage}
                  onChange={(v) => enableItem && setVal(enableItem.config_key, v ? '1' : '0')}
                  size="default"
                  style={{ backgroundColor: enabled ? brandColor : undefined }}
                />
              </div>
            </div>
          }
        >
          <div style={{ padding: '18px 20px 20px' }}>
            {/* 灰底分隔标题 */}
            {children}
          </div>
        </Card>
      );
    };

    // ---- Section divider (子分组标题) ----
    const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
      <div style={{ marginBottom: 16 }}>
        <div style={{
          fontSize: 12, fontWeight: 600, color: '#8c8c8c',
          textTransform: 'uppercase', letterSpacing: 0.5,
          marginBottom: 10, paddingBottom: 6,
          borderBottom: '1px dashed #f0f0f0',
        }}>{title}</div>
        {children}
      </div>
    );

    // ---- 顶部状态概览 ----
    const wechatEnabled = getVal(findItem(items, 'pay_wechat_enable')) === '1';
    const alipayEnabled = getVal(findItem(items, 'pay_alipay_enable')) === '1';
    const yftEnabled    = getVal(findItem(items, 'pay_yft_enable')) === '1';
    const enabledCount = [wechatEnabled, alipayEnabled, yftEnabled].filter(Boolean).length;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* 顶部状态概览条 */}
        <Card
          size="small"
          variant="borderless"
          style={{
            borderRadius: 12,
            border: '1px solid #e8ecf1',
            background: 'linear-gradient(135deg,#fafcff 0%,#f1f5f9 100%)',
          }}
        >
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'linear-gradient(135deg,#e0edff,#bae0ff)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#1677ff', fontSize: 18,
            }}>💳</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, color: '#1f1f1f', fontSize: 14 }}>
                支付通道总览
              </div>
              <div style={{ fontSize: 12, color: '#8c8c8c' }}>
                已启用 {enabledCount} / 3 个通道 — 管理各支付渠道的商户凭据与回调地址
              </div>
            </div>
            {/* 状态 pills */}
            {[
              { name: '微信支付', enabled: wechatEnabled, color: '#07C160', bg: '#f6ffed' },
              { name: '支付宝',   enabled: alipayEnabled, color: '#1677ff', bg: '#e6f4ff' },
              { name: '易付通',   enabled: yftEnabled,    color: '#fa541c', bg: '#fff2e8' },
            ].map((p) => (
              <div
                key={p.name}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '5px 12px', borderRadius: 16,
                  background: p.enabled ? p.bg : '#f5f5f5',
                  border: `1px solid ${p.enabled ? p.color + '40' : '#d9d9d9'}`,
                  fontSize: 12, fontWeight: 500,
                  color: p.enabled ? p.color : '#8c8c8c',
                }}
              >
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: p.enabled ? p.color : '#bfbfbf',
                }} />
                {p.name} {p.enabled ? '运行中' : '已关闭'}
              </div>
            ))}
          </div>
        </Card>

        {/* 微信支付 Card — 绿色品牌 */}
        <ProviderCard
          brand={<WechatOutlined style={{ color: '#07C160', fontSize: 18 }} />}
          name="微信支付"
          subtitle="JSAPI / Native / APP 支付，APIv3 签名"
          brandColor="#07C160"
          brandBg="linear-gradient(135deg,#f6ffed,#d9f7be)"
        >
          <Section title="基础参数">
            <Row gutter={[16, 12]}>
              <Col xs={24} sm={12}>{payField('AppID', 'pay_wechat_appid')}</Col>
              <Col xs={24} sm={12}>{payField('商户号 MchID', 'pay_wechat_mch_id')}</Col>
            </Row>
          </Section>
          <Section title="API 密钥 & 证书路径">
            <Row gutter={[16, 12]}>
              <Col xs={24} sm={12}>{payField('APIv3 密钥', 'pay_wechat_api_key', 'password')}</Col>
              <Col xs={24} sm={12}>{payField('证书 apiclient_cert.pem', 'pay_wechat_cert_path')}</Col>
              <Col xs={24} sm={12}>{payField('私钥 apiclient_key.pem', 'pay_wechat_key_path')}</Col>
            </Row>
          </Section>
          <Section title="回调地址">
            {payField('支付结果通知 URL', 'pay_wechat_notify_url')}
          </Section>
        </ProviderCard>

        {/* 支付宝 Card — 蓝色品牌 */}
        <ProviderCard
          brand={
            <span style={{
              color: '#1677ff', fontSize: 18, fontWeight: 700, lineHeight: 1,
            }}>支</span>
          }
          name="支付宝"
          subtitle="电脑网站 / 手机网站 / 当面付，RSA2 签名"
          brandColor="#1677ff"
          brandBg="linear-gradient(135deg,#e6f4ff,#bae0ff)"
        >
          <Section title="基础参数">
            <Row gutter={[16, 12]}>
              <Col xs={24} sm={12}>{payField('应用 AppID', 'pay_alipay_appid')}</Col>
              <Col xs={24} sm={12}>{payField('网关环境', 'pay_alipay_gateway', 'select')}</Col>
            </Row>
          </Section>
          <Section title="密钥配置">
            <Row gutter={[16, 12]}>
              <Col xs={24} sm={12}>{payField('应用私钥', 'pay_alipay_private_key', 'password')}</Col>
              <Col xs={24} sm={12}>{payField('支付宝公钥', 'pay_alipay_public_key', 'password')}</Col>
            </Row>
          </Section>
          <Section title="回调地址">
            {payField('异步通知 URL', 'pay_alipay_notify_url')}
          </Section>
        </ProviderCard>

        {/* 易付通 Card — 橙红色品牌 */}
        <ProviderCard
          brand={
            <span style={{
              color: '#fa541c', fontSize: 18, fontWeight: 700, lineHeight: 1,
            }}>易</span>
          }
          name="易付通"
          subtitle="H5 / 二维码支付，商户中心签名"
          brandColor="#fa541c"
          brandBg="linear-gradient(135deg,#fff2e8,#ffd8bf)"
        >
          <Section title="基础参数">
            <Row gutter={[16, 12]}>
              <Col xs={24} sm={12}>{payField('商户 AppID', 'pay_yft_appid')}</Col>
              <Col xs={24} sm={12}>{payField('网关接口地址', 'pay_yft_gateway')}</Col>
            </Row>
          </Section>
          <Section title="密钥配置">
            {payField('商户 SecretKey', 'pay_yft_secret_key', 'password')}
          </Section>
          <Section title="回调地址">
            {payField('支付结果异步通知 URL', 'pay_yft_notify_url')}
          </Section>
        </ProviderCard>
      </div>
    );
  };

  // ==================== 基础配置 Tab（品牌 + 登录页轮播图） ====================
interface BannerItem { url: string; caption?: string; link?: string; }

interface GeneralPanelProps {
  items: ConfigItem[];
  canManage: boolean;
  editingValues: Record<string, string>;
  setEditingValues: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  hasChanged: (item?: ConfigItem) => boolean;
  setGroups: React.Dispatch<React.SetStateAction<Array<{ group: string; items: ConfigItem[] }>>>;
  message: { success: (m: string) => void; error: (m: string) => void; info: (m: string) => void };
}

// 🔴 注意：不能在普通函数里调用 useState，必须是真正的组件
const GeneralPanel: React.FC<GeneralPanelProps> = ({
  items, canManage, editingValues, setEditingValues, hasChanged, setGroups, message,
}) => {
  const logoItem    = items.find(i => i.config_key === 'platform_logo_url');
  const bannerItem  = items.find(i => i.config_key === 'admin_login_banner');

  const [bannerList, setBannerList] = useState<BannerItem[]>(() => {
    const raw = bannerItem?.config_value ?? '[]';
    try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; } catch { return []; }
  });
  const [bannerModalOpen, setBannerModalOpen] = useState(false);
  const [bannerForm] = Form.useForm();
  const [savingBanner, setSavingBanner] = useState(false);

  useEffect(() => {
    if (!bannerItem) return;
    const raw = editingValues['admin_login_banner'] ?? bannerItem.config_value ?? '[]';
    try { const p = JSON.parse(raw); setBannerList(Array.isArray(p) ? p : []); } catch { setBannerList([]); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bannerItem?.config_value]);

  // 本地辅助函数（从 SystemConfig 传入的闭包依赖中独立）
  const getVal = (item?: ConfigItem): string =>
    item ? (editingValues[item.config_key] ?? item.config_value ?? '') : '';
  const setVal = (key: string, v: string) =>
    setEditingValues((prev) => ({ ...prev, [key]: v }));
  const findItem = (iks: ConfigItem[], key: string) => iks.find((it) => it.config_key === key);

  // 复用 renderCsRow 样式的内联行渲染（避免跨作用域传递过多 props）
  const renderCsRow = (
    label: string, itemKey: string,
    control: (item: ConfigItem, meta: FieldMeta) => JSX.Element
  ) => {
    const item = findItem(items, itemKey);
    if (!item) return null;
    const meta = FIELD_META[itemKey] ?? DEFAULT_FIELD_META;
    const dirty = hasChanged(item);
    return (
      <div key={itemKey}
        style={{
          display: 'flex', alignItems: 'center', gap: 16,
          padding: '10px 12px', borderRadius: 8, background: '#fafafa', marginBottom: 8,
          border: '1px solid transparent', borderColor: dirty ? '#91caff' : 'transparent', transition: 'border-color .2s',
        }}
      >
        <div style={{ width: 120, display: 'flex', alignItems: 'center', color: '#595959' }}>{label}</div>
        <div style={{ flex: 1 }}>{control(item, meta)}</div>
        {/* 全局保存按钮已移至 Tab 右上角（tabBarExtraContent） */}
      </div>
    );
  };

  const handleSaveBanner = async () => {
    if (!bannerItem) return;
    setSavingBanner(true);
    try {
      await updateConfig(bannerItem.config_key, JSON.stringify(bannerList));
      message.success(`✓ 已保存 ${bannerList.length} 条登录页轮播图`);
      setGroups((prev) =>
        prev.map((g) => ({
          ...g,
          items: g.items.map((it) =>
            it.config_key === bannerItem.config_key
              ? { ...it, config_value: JSON.stringify(bannerList) }
              : it
          ),
        }))
      );
    } finally {
      setSavingBanner(false);
    }
  };

  const handleAddBanner = () => {
    if (!canManage) return;
    bannerForm.setFieldsValue({ url: '', caption: '', link: '' });
    setBannerModalOpen(true);
  };

  return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* ===== 平台品牌 Card ===== */}
        <Card
          variant="borderless"
          style={{ borderRadius: 12, border: '1px solid #f0f0f0' }}
          styles={{ body: { padding: 0 } }}
          title={
            <Space size={8}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: 'linear-gradient(135deg,#f6ffed,#d9f7be)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#52c41a', fontSize: 14,
              }}><PictureOutlined /></div>
              <div style={{ lineHeight: 1.2 }}>
                <div style={{ fontWeight: 600, color: '#1f1f1f' }}>平台品牌</div>
                <div style={{ fontSize: 12, color: '#8c8c8c', fontWeight: 400 }}>
                  LOGO、站点名称与副标题（C 端 & 管理后台登录页共用）
                </div>
              </div>
            </Space>
          }
        >
          <div style={{ padding: '16px 20px' }}>
            {/* LOGO 上传行 */}
            <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', paddingBottom: 16, borderBottom: '1px solid #f0f0f0', marginBottom: 16 }}>
              <div style={{ width: 120, fontWeight: 500, color: '#595959', paddingTop: 6 }}>平台 LOGO</div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <ImageUploader
                    value={getVal(logoItem) || undefined}
                    onChange={(url) => setVal(logoItem!.config_key, url as string)}
                    disabled={!canManage}
                    sizeHint="建议 400×400px 正方形 · 透明背景 PNG"
                  />
                  {/* 全局保存按钮已移至 Tab 右上角 */}
                </div>
                <div style={{ fontSize: 12, color: '#8c8c8c', lineHeight: 1.5 }}>
                  将显示在：用户端 Header <span style={{ color: '#bfbfbf' }}>(24px)</span>、登录/注册页 <span style={{ color: '#bfbfbf' }}>(64px)</span>、管理后台登录页 <span style={{ color: '#bfbfbf' }}>(56px)</span>。透明背景 PNG 效果最佳。
                </div>
              </div>
            </div>

            {/* 平台名称 */}
            {renderCsRow('平台名称', 'platform_name', (item) => (
              <Input
                value={getVal(item)}
                onChange={(e) => setVal(item.config_key, e.target.value)}
                disabled={!canManage}
                placeholder="龙鸽基因"
                style={{ maxWidth: 360 }}
              />
            ))}

            {/* 副标题 */}
            {renderCsRow('平台副标题', 'platform_subtitle', (item) => (
              <Input
                value={getVal(item)}
                onChange={(e) => setVal(item.config_key, e.target.value)}
                disabled={!canManage}
                placeholder="赛鸽数字资产平台"
                style={{ maxWidth: 360 }}
              />
            ))}

            {/* 其他 general 小项 */}
            {renderCsRow('站点名称', 'site_name', (item) => (
              <Input
                value={getVal(item)}
                onChange={(e) => setVal(item.config_key, e.target.value)}
                disabled={!canManage}
                style={{ maxWidth: 360 }}
              />
            ))}
            {renderCsRow('系统版本', 'site_version', (item) => (
              <Input
                value={getVal(item)}
                onChange={(e) => setVal(item.config_key, e.target.value)}
                disabled={!canManage}
                style={{ maxWidth: 360 }}
              />
            ))}
            {renderCsRow('默认分页大小', 'admin_page_size', (item) => (
              <Space.Compact style={{ width: 200 }}>
                <InputNumber
                  value={Number(getVal(item)) || 10}
                  onChange={(v) => setVal(item.config_key, String(v))}
                  disabled={!canManage}
                  min={5} max={50}
                  style={{ width: '100%' }}
                />
                <span style={{ display: 'flex', alignItems: 'center', padding: '0 11px', backgroundColor: '#f5f5f5', border: '1px solid #d9d9d9', borderRadius: '0 6px 6px 0', color: 'rgba(0,0,0,0.65)' }}>条</span>
              </Space.Compact>
            ))}
            {renderCsRow('上传大小上限', 'upload_max_size', (item) => (
              <Space.Compact style={{ width: 200 }}>
                <InputNumber
                  value={Number(getVal(item)) || 10}
                  onChange={(v) => setVal(item.config_key, String(v))}
                  disabled={!canManage}
                  min={1} max={100}
                  style={{ width: '100%' }}
                />
                <span style={{ display: 'flex', alignItems: 'center', padding: '0 11px', backgroundColor: '#f5f5f5', border: '1px solid #d9d9d9', borderRadius: '0 6px 6px 0', color: 'rgba(0,0,0,0.65)' }}>MB</span>
              </Space.Compact>
            ))}
          </div>
        </Card>

        {/* ===== 管理后台登录页轮播图 Card ===== */}
        <Card
          variant="borderless"
          style={{ borderRadius: 12, border: '1px solid #f0f0f0' }}
          styles={{ body: { padding: 0 } }}
          title={
            <Space size={8}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: 'linear-gradient(135deg,#fff7e6,#ffe7ba)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fa8c16', fontSize: 14,
              }}><PictureOutlined /></div>
              <div style={{ lineHeight: 1.2 }}>
                <div style={{ fontWeight: 600, color: '#1f1f1f' }}>管理后台登录页广告轮播图</div>
                <div style={{ fontSize: 12, color: '#8c8c8c', fontWeight: 400 }}>
                  未配置时使用默认示例图；支持添加、排序、删除
                </div>
              </div>
            </Space>
          }
          extra={
            canManage && (
              <Space>
                <Tag color="blue">{bannerList.length} 条</Tag>
                <Button size="small" icon={<PlusOutlined />} type="primary" onClick={handleAddBanner}>
                  添加轮播图
                </Button>
                {bannerList.length > 0 && (
                  <Button size="small" type="primary" loading={savingBanner} onClick={handleSaveBanner}>
                    保存全部
                  </Button>
                )}
              </Space>
            )
          }
        >
          <div style={{ padding: '16px 20px' }}>
            {bannerList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#bfbfbf' }}>
                <PictureOutlined style={{ fontSize: 40, marginBottom: 8 }} />
                <div>暂无轮播图，点击右上角「添加轮播图」开始配置</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {bannerList.map((b, idx) => (
                  <div key={idx}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 12px', borderRadius: 8,
                      background: '#fafafa', border: '1px solid #f0f0f0',
                    }}
                  >
                    {/* 缩略图 */}
                    <div style={{ width: 120, height: 72, borderRadius: 6, overflow: 'hidden', background: '#f0f0f0', flexShrink: 0 }}>
                      {b.url ? (
                        <img src={b.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bfbfbf', fontSize: 12 }}>无图</div>
                      )}
                    </div>
                    {/* 序号 */}
                    <Tag style={{ width: 36, textAlign: 'center' }}>{idx + 1}</Tag>
                    {/* 编辑区 */}
                    <div style={{ flex: 1, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <Input
                        placeholder="图片 URL"
                        value={b.url}
                        onChange={(e) => {
                          const next = [...bannerList]; next[idx] = { ...next[idx], url: e.target.value };
                          setBannerList(next);
                        }}
                        style={{ flex: 2, minWidth: 160 }}
                        disabled={!canManage}
                      />
                      <Input
                        placeholder="标题/描述（可选）"
                        value={b.caption || ''}
                        onChange={(e) => {
                          const next = [...bannerList]; next[idx] = { ...next[idx], caption: e.target.value };
                          setBannerList(next);
                        }}
                        style={{ flex: 1, minWidth: 140 }}
                        disabled={!canManage}
                      />
                      <Input
                        placeholder="跳转链接（可选）"
                        value={b.link || ''}
                        onChange={(e) => {
                          const next = [...bannerList]; next[idx] = { ...next[idx], link: e.target.value };
                          setBannerList(next);
                        }}
                        style={{ flex: 1, minWidth: 140 }}
                        disabled={!canManage}
                      />
                    </div>
                    {/* 操作按钮 */}
                    {canManage && (
                      <Space size={4}>
                        <Button size="small" icon={<ArrowUpOutlined />} disabled={idx === 0}
                          onClick={() => {
                            const next = [...bannerList]; [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                            setBannerList(next);
                          }}
                        />
                        <Button size="small" icon={<ArrowDownOutlined />} disabled={idx === bannerList.length - 1}
                          onClick={() => {
                            const next = [...bannerList]; [next[idx + 1], next[idx]] = [next[idx], next[idx + 1]];
                            setBannerList(next);
                          }}
                        />
                        <Button size="small" danger icon={<DeleteOutlined />}
                          onClick={() => setBannerList(bannerList.filter((_, i) => i !== idx))}
                        />
                      </Space>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* 添加轮播图 Modal */}
        <Modal
          title="添加登录页轮播图"
          open={bannerModalOpen}
          onCancel={() => setBannerModalOpen(false)}
          onOk={async () => {
            try {
              const values = await bannerForm.validateFields();
              setBannerList((prev) => [...prev, { url: values.url, caption: values.caption, link: values.link }]);
              setBannerModalOpen(false);
              message.info('已添加到列表，点击「保存全部」后生效');
            } catch { /* validateFields 失败不处理 */ }
          }}
          okText="添加"
          cancelText="取消"
        >
          <Form form={bannerForm} layout="vertical">
            {/* ImageUploader 不走 Form.Item（非受控组件），验证 hidden url 字段 */}
            <Form.Item
              label="图片"
              name="url"
              rules={[{ required: true, message: '请上传图片' }]}
            >
              {/* url 字段是 hidden Input，ImageUploader 上传后通过 onChange 调用 bannerForm.setFieldsValue({ url }) 回填 */}
              <Input style={{ display: 'none' }} />
            </Form.Item>
            <div style={{ marginBottom: 16 }}>
              <ImageUploader
                maxCount={1}
                onChange={(url) => {
                  if (typeof url === 'string') {
                    bannerForm.setFieldsValue({ url });
                  }
                }}
              />
            </div>
            <Form.Item label="标题/描述（可选）" name="caption">
              <Input placeholder="例如：欢迎使用赛鸽基因溯源平台" />
            </Form.Item>
            <Form.Item label="跳转链接（可选）" name="link">
              <Input placeholder="例如：/dashboard" />
            </Form.Item>
          </Form>
        </Modal>
      </div>
    );
};

// ==================== 配置值渲染器（SystemConfig 内部） ====================
  const renderValue = (record: ConfigItem) => {
    const fieldMeta = FIELD_META[record.config_key] ?? DEFAULT_FIELD_META;
    const rawValue = editingValues[record.config_key] ?? record.config_value ?? '';
    const disabled = !canManage;
    const setVal = (v: string) =>
      setEditingValues((prev) => ({ ...prev, [record.config_key]: v }));

    switch (fieldMeta.type) {
      case 'select':
        return (
          <Select
            value={rawValue}
            options={fieldMeta.options}
            onChange={(v) => setVal(String(v))}
            disabled={disabled}
            placeholder={fieldMeta.placeholder}
            style={{ width: '100%', maxWidth: 260 }}
          />
        );

      case 'switch':
        return (
          <Switch
            checked={rawValue === '1' || rawValue === 'true'}
            onChange={(checked) => setVal(checked ? '1' : '0')}
            disabled={disabled}
            checkedChildren={<PlayCircleOutlined />}
            unCheckedChildren={<StopOutlined />}
          />
        );

      case 'segmented':
        return (
          <Segmented
            value={rawValue}
            options={fieldMeta.options ?? []}
            onChange={(v) => setVal(String(v))}
            disabled={disabled}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={rawValue}
            onChange={(e) => setVal(e.target.value)}
            disabled={disabled}
            placeholder={fieldMeta.placeholder ?? '请输入数字'}
            suffix={fieldMeta.suffix}
            style={{ width: 160 }}
          />
        );

      case 'password':
        return (
          <Input.Password
            value={rawValue}
            onChange={(e) => setVal(e.target.value)}
            disabled={disabled}
            placeholder={fieldMeta.placeholder ?? '请输入密钥'}
            iconRender={(_visible) =>
              showPasswordKeys[record.config_key] ? (
                <EyeTwoTone onClick={() =>
                  setShowPasswordKeys((prev) => ({ ...prev, [record.config_key]: false }))
                } />
              ) : (
                <EyeInvisibleOutlined onClick={() =>
                  setShowPasswordKeys((prev) => ({ ...prev, [record.config_key]: true }))
                } />
              )
            }
            style={{ width: '100%', maxWidth: 340 }}
          />
        );

      case 'textarea':
        return (
          <Input.TextArea
            value={rawValue}
            onChange={(e) => setVal(e.target.value)}
            disabled={disabled}
            placeholder={fieldMeta.placeholder}
            rows={2}
            autoSize={{ minRows: 2, maxRows: 4 }}
          />
        );

      case 'text':
      default:
        return (
          <Input
            value={rawValue}
            onChange={(e) => setVal(e.target.value)}
            disabled={disabled}
            placeholder={fieldMeta.placeholder ?? '请输入配置值'}
            style={{ width: '100%', maxWidth: 340 }}
          />
        );
    }
  };

  // ==================== Table 列定义 ====================
  const columns: TableProps<ConfigItem>['columns'] = [
    {
      title: '配置名称',
      dataIndex: 'name',
      width: 200,
      fixed: 'left',
      render: (val, record) => {
        const fm = FIELD_META[record.config_key];
        const hasExtra = fm?.extra;
        return (
          hasExtra
            ? <Tooltip title={fm.extra}><span>{String(val)}</span></Tooltip>
            : String(val)
        );
      },
    },
    {
      title: '配置键',
      dataIndex: 'config_key',
      width: 200,
      render: (val) => <code>{String(val ?? '')}</code>,
    },
    {
      title: '配置值',
      dataIndex: 'config_value',
      render: (_, record) => renderValue(record),
    },
    {
      title: '说明',
      dataIndex: 'description',
      ellipsis: true,
      render: (val) => (val ? <Tooltip title={String(val)}>{String(val)}</Tooltip> : '-'),
    },
    {
      title: '更新时间',
      dataIndex: 'updated_at',
      width: 170,
      render: (val) => (val ? dayjs(Number(val)).format('YYYY-MM-DD HH:mm:ss') : '-'),
    },
  ];

  // ==================== 渲染 ====================
  return (
    <PageContainer
      header={{
        title: '系统配置',
        breadcrumb: {},
      }}
    >
      <Spin spinning={loading}>
        <Tabs
          activeKey={activeGroup}
          onChange={setActiveGroup}
          tabBarExtraContent={
            canManage && hasAnyChangeInActiveGroup() ? (
              <Space>
                <Button
                  onClick={handleResetChanges}
                  disabled={savingGroup}
                >
                  取消改动
                </Button>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  loading={savingGroup}
                  onClick={handleSaveAll}
                >
                  保存设置
                </Button>
              </Space>
            ) : null
          }
          items={groups.map((g) => {
            const extraActions = GROUP_EXTRA_ACTIONS[g.group] ?? [];
            return {
              key: g.group,
              label: (
                <Space size={4}>
                  <span>{GROUP_LABEL[g.group] ?? g.group}</span>
                  <Tag style={{ marginRight: 0 }}>{g.items.length}</Tag>
                </Space>
              ),
              children:
                g.group === 'image' ? (
                  // 图片处理：使用 Card 分组布局
                  renderImagePanel(g.items)
                ) :
                g.group === 'customer_service' ? (
                  // 客服配置：使用 Card 分组布局
                  renderCustomerServicePanel(g.items)
                ) :
                g.group === 'general' ? (
                  // 基础配置：平台品牌 + 登录页轮播图 自定义 Card 布局
                  <GeneralPanel
                    items={g.items}
                    canManage={canManage}
                    editingValues={editingValues}
                    setEditingValues={setEditingValues}
                    hasChanged={hasChanged}
                    setGroups={setGroups}
                    message={message}
                  />
                ) :
                g.group === 'sms' ? (
                  // 短信服务：Segmented 切换「配置参数」/「发送记录」
                  <div>
                    <Segmented
                      value={smsSubTab}
                      onChange={(v) => setSmsSubTab(v as 'config' | 'logs')}
                      options={[
                        { label: '⚙️ 配置参数', value: 'config' },
                        { label: '📋 发送记录', value: 'logs' },
                      ]}
                      style={{ marginBottom: 16 }}
                    />
                    {smsSubTab === 'config' ? (
                      <div>
                        {/* 分组顶部的额外操作区 */}
                        {extraActions.length > 0 && (
                          <div style={{ marginBottom: 12 }}>
                            {extraActions.map((a) =>
                              a.key === 'test_sms' ? (
                                <Button
                                  key={a.key}
                                  type="dashed"
                                  icon={<PlayCircleOutlined />}
                                  loading={testingKey === a.key}
                                  onClick={handleTestSms}
                                >
                                  {a.label}
                                </Button>
                              ) : null
                            )}
                          </div>
                        )}
                        <Table<ConfigItem>
                          rowKey="config_key"
                          columns={columns}
                          dataSource={g.items}
                          pagination={false}
                          size="middle"
                          scroll={{ x: 1000 }}
                        />
                      </div>
                    ) : (
                      // ========== 短信日志子面板 ==========
                      <div>
                        {/* Stats cards */}
                        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                          <Col xs={12} sm={8} md={4}>
                            <Card loading={smsStatsLoading}>
                              <Statistic
                                title="今日发送"
                                value={smsStats?.todayCount ?? 0}
                                suffix="条"
                              />
                            </Card>
                          </Col>
                          <Col xs={12} sm={8} md={4}>
                            <Card loading={smsStatsLoading}>
                              <Statistic
                                title="累计发送"
                                value={smsStats?.total ?? 0}
                                suffix="条"
                                valueStyle={{ color: '#1677ff' }}
                              />
                            </Card>
                          </Col>
                          <Col xs={12} sm={8} md={4}>
                            <Card loading={smsStatsLoading}>
                              <Statistic
                                title="发送失败"
                                value={smsStats?.failedCount ?? 0}
                                suffix="条"
                                valueStyle={{ color: '#cf1322' }}
                              />
                            </Card>
                          </Col>
                          <Col xs={12} sm={8} md={4}>
                            <Card loading={smsStatsLoading}>
                              <Statistic
                                title="已使用"
                                value={smsStats?.usedCount ?? 0}
                                suffix="条"
                                valueStyle={{ color: '#389e0d' }}
                              />
                            </Card>
                          </Col>
                          <Col xs={12} sm={8} md={4}>
                            <Card loading={smsStatsLoading}>
                              <Statistic
                                title="已过期"
                                value={smsStats?.expiredCount ?? 0}
                                suffix="条"
                                valueStyle={{ color: '#d48806' }}
                              />
                            </Card>
                          </Col>
                          <Col xs={12} sm={8} md={4}>
                            <Card loading={smsStatsLoading}>
                              <Statistic
                                title="独立手机号"
                                value={smsStats?.distinctPhone ?? 0}
                                suffix="个"
                                valueStyle={{ color: '#722ed1' }}
                              />
                            </Card>
                          </Col>
                        </Row>

                        {/* 筛选区 */}
                        <Card size="small" style={{ marginBottom: 12 }}>
                          <Space wrap size={12}>
                            <Input
                              placeholder="手机号"
                              allowClear
                              style={{ width: 180 }}
                              value={smsQuery.phone}
                              onChange={(e) => setSmsQuery(q => ({ ...q, phone: e.target.value }))}
                              onPressEnter={() => { setSmsPage(1); fetchSmsLogs(); }}
                            />
                            <Select
                              placeholder="场景"
                              allowClear
                              style={{ width: 140 }}
                              value={smsQuery.scene || undefined}
                              onChange={(v) => setSmsQuery(q => ({ ...q, scene: v || '' }))}
                              options={[
                                { value: 'register', label: '注册验证' },
                                { value: 'login', label: '登录验证' },
                                { value: 'reset_password', label: '重置密码' },
                              ]}
                            />
                            <Select
                              placeholder="状态"
                              allowClear
                              style={{ width: 140 }}
                              value={smsQuery.status || undefined}
                              onChange={(v) => setSmsQuery(q => ({ ...q, status: v || '' }))}
                              options={[
                                { value: 'sent', label: '已发送' },
                                { value: 'failed', label: '发送失败' },
                                { value: 'used', label: '已使用' },
                                { value: 'expired', label: '已过期' },
                              ]}
                            />
                            <DatePicker.RangePicker
                              showTime
                              format="YYYY-MM-DD HH:mm"
                              value={[
                                smsQuery.startTime ? dayjs(smsQuery.startTime) : null,
                                smsQuery.endTime ? dayjs(smsQuery.endTime) : null,
                              ]}
                              onChange={(dates) => {
                                setSmsQuery(q => ({
                                  ...q,
                                  startTime: dates?.[0]?.valueOf(),
                                  endTime: dates?.[1]?.valueOf(),
                                }));
                              }}
                            />
                            <Button type="primary" onClick={() => { setSmsPage(1); fetchSmsLogs(); }}>
                              查询
                            </Button>
                            <Button onClick={() => {
                              setSmsQuery({ phone: '', scene: '', status: '', startTime: undefined, endTime: undefined });
                              setSmsPage(1);
                              fetchSmsLogs();
                            }}>
                              重置
                            </Button>
                          </Space>
                        </Card>

                        {/* 日志表格 */}
                        <Table
                          rowKey="id"
                          loading={smsLogsLoading}
                          dataSource={smsLogs}
                          size="middle"
                          scroll={{ x: 1000 }}
                          pagination={{
                            current: smsPage,
                            pageSize: smsPageSize,
                            total: smsLogsTotal,
                            showSizeChanger: true,
                            showQuickJumper: true,
                            showTotal: (t) => `共 ${t} 条`,
                            onChange: (p, ps) => {
                              setSmsPage(p);
                              setSmsPageSize(ps);
                              // fetchSmsLogs 在 useEffect 里监听 smsPage 变化会自动触发
                            },
                          }}
                          columns={[
                            {
                              title: '手机号',
                              dataIndex: 'phone',
                              width: 130,
                              render: (v: string) => (
                                <a onClick={() => {
                                  navigator.clipboard?.writeText(v);
                                  message.success('已复制: ' + v);
                                }}>{v}</a>
                              ),
                            },
                            {
                              title: '场景',
                              dataIndex: 'scene',
                              width: 110,
                              render: (v: string) => ({
                                register: '注册验证',
                                login: '登录验证',
                                reset_password: '重置密码',
                              })[v] ?? v,
                            },
                            {
                              title: '供应商',
                              dataIndex: 'provider',
                              width: 110,
                              render: (v: string) => (
                                <Tag color={v === 'tencent' ? 'blue' : 'default'}>
                                  {v === 'tencent' ? '腾讯云' : v === 'dev_null' ? '开发模拟' : v}
                                </Tag>
                              ),
                            },
                            {
                              title: '状态',
                              dataIndex: 'status',
                              width: 110,
                              render: (v: string) => {
                                const colorMap: Record<string, string> = {
                                  sent: 'blue', failed: 'red', used: 'green', expired: 'orange',
                                };
                                const labelMap: Record<string, string> = {
                                  sent: '已发送', failed: '发送失败', used: '已使用', expired: '已过期',
                                };
                                return <Tag color={colorMap[v] ?? 'default'}>{labelMap[v] ?? v}</Tag>;
                              },
                            },
                            {
                              title: '发送时间',
                              dataIndex: 'created_at',
                              width: 170,
                              render: (v: number) => v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : '-',
                            },
                            {
                              title: '过期时间',
                              dataIndex: 'expire_at',
                              width: 170,
                              render: (v: number) => v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : '-',
                            },
                            {
                              title: '使用时间',
                              dataIndex: 'used_at',
                              width: 170,
                              render: (v: number) => v ? dayjs(v).format('YYYY-MM-DD HH:mm:ss') : '-',
                            },
                            {
                              title: '错误信息',
                              dataIndex: 'error_msg',
                              ellipsis: true,
                              render: (v: string) => v || '-',
                            },
                          ]}
                        />
                      </div>
                    )}
                  </div>
                ) :
                g.group === 'payment' ? (
                  renderPaymentPanel(g.items)
                ) : (
                <div>
                  {/* 分组顶部的额外操作区 */}
                  {extraActions.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      {extraActions.map((a) =>
                        a.key === 'test_qiniu' ? (
                          <Button
                            key={a.key}
                            type="dashed"
                            icon={<PlayCircleOutlined />}
                            loading={testingKey === a.key}
                            onClick={handleTestQiniu}
                          >
                            {a.label}
                          </Button>
                        ) : a.key === 'test_sms' ? (
                          <Button
                            key={a.key}
                            type="dashed"
                            icon={<PlayCircleOutlined />}
                            loading={testingKey === a.key}
                            onClick={handleTestSms}
                          >
                            {a.label}
                          </Button>
                        ) : null
                      )}
                    </div>
                  )}
                  <Table<ConfigItem>
                    rowKey="config_key"
                    columns={columns}
                    dataSource={g.items}
                    pagination={false}
                    size="middle"
                    scroll={{ x: 1000 }}
                  />
                </div>
              ),
            };
          })}
        />
      </Spin>
    </PageContainer>
  );
};

export default SystemConfig;
