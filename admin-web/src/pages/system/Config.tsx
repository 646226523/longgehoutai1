import { PageContainer } from '@ant-design/pro-components';
import { App, Button, Card, Input, InputNumber, Select, Space, Spin, Switch, Table, Tabs, Tag, Tooltip, Segmented, Alert, Modal, Form, type TableProps } from 'antd';
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
} from '@ant-design/icons';
import { useCallback, useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { useCurrentUser } from '../../app-context';
import { hasPermission } from '../../access';
import { getConfigs, updateConfig, type ConfigItem, testQiniuToken } from '../../services/system';
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
};

// 未在 FIELD_META 中定义的默认字段
const DEFAULT_FIELD_META: FieldMeta = { type: 'text' };

// 分组 → 额外操作按钮（如七牛云 token 测试）
type GroupExtraAction = { key: string; label: string };
const GROUP_EXTRA_ACTIONS: Record<string, GroupExtraAction[]> = {
  cloud_storage: [{ key: 'test_qiniu', label: '🔑 测试七牛云 Token' }],
};

// ==================== 组件主体 ====================
const SystemConfig = () => {
  const { message } = App.useApp();
  const currentUser = useCurrentUser();
  const canManage = hasPermission(currentUser, 'system:config:manage');
  const [groups, setGroups] = useState<Array<{ group: string; items: ConfigItem[] }>>([]);
  const [loading, setLoading] = useState(false);
  const [activeGroup, setActiveGroup] = useState<string>('');
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [showPasswordKeys, setShowPasswordKeys] = useState<Record<string, boolean>>({});
  const [testingKey, setTestingKey] = useState<string | null>(null);

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

  // 保存配置值
  const handleSave = async (item: ConfigItem) => {
    const newValue = editingValues[item.config_key] ?? item.config_value ?? '';
    setSavingKey(item.config_key);
    try {
      await updateConfig(item.config_key, newValue);
      message.success('✓ 配置已更新');
      setGroups((prev) =>
        prev.map((g) => ({
          ...g,
          items: g.items.map((it) =>
            it.config_key === item.config_key ? { ...it, config_value: newValue } : it
          ),
        }))
      );
      setEditingValues((prev) => {
        const next = { ...prev };
        delete next[item.config_key];
        return next;
      });
    } catch {
      // 拦截器已提示
    } finally {
      setSavingKey(null);
    }
  };

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
          {canManage && dirty && (
            <Space size={4} style={{ marginLeft: 'auto' }}>
              <Button
                size="small"
                type="link"
                onClick={() => {
                  setEditingValues((prev) => {
                    const n = { ...prev };
                    delete n[w.config_key]; delete n[h.config_key];
                    return n;
                  });
                }}
              >取消</Button>
              <Button
                size="small"
                type="primary"
                loading={savingKey === w.config_key || savingKey === h.config_key}
                onClick={async () => {
                  await handleSave(w);
                  await handleSave(h);
                }}
              >保存</Button>
            </Space>
          )}
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
              {canManage && hasChanged(textItem) && (
                <Button
                  size="small"
                  type="primary"
                  loading={savingKey === textItem.config_key}
                  onClick={() => handleSave(textItem)}
                >保存</Button>
              )}
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
              {canManage && hasChanged(posItem) && (
                <Button
                  size="small"
                  type="primary"
                  loading={savingKey === posItem.config_key}
                  onClick={() => handleSave(posItem)}
                >保存</Button>
              )}
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
                <Button
                  type="primary"
                  size="small"
                  loading={savingKey === item.config_key}
                  onClick={() => handleSave(item)}
                >保存设置</Button>
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
        {canManage && dirty && (
          <Space size={4}>
            <Button
              size="small"
              type="link"
              onClick={() => {
                setEditingValues((prev) => {
                  const n = { ...prev };
                  delete n[itemKey];
                  return n;
                });
              }}
            >取消</Button>
            <Button
              size="small"
              type="primary"
              loading={savingKey === itemKey}
              onClick={() => handleSave(item)}
            >保存</Button>
          </Space>
        )}
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

  // ==================== 基础配置 Tab（品牌 + 登录页轮播图） ====================
interface BannerItem { url: string; caption?: string; link?: string; }

interface GeneralPanelProps {
  items: ConfigItem[];
  canManage: boolean;
  editingValues: Record<string, string>;
  setEditingValues: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  handleSave: (item: ConfigItem) => Promise<void>;
  hasChanged: (item?: ConfigItem) => boolean;
  savingKey: string | null;
  setGroups: React.Dispatch<React.SetStateAction<Array<{ group: string; items: ConfigItem[] }>>>;
  message: { success: (m: string) => void; error: (m: string) => void; info: (m: string) => void };
}

// 🔴 注意：不能在普通函数里调用 useState，必须是真正的组件
const GeneralPanel: React.FC<GeneralPanelProps> = ({
  items, canManage, editingValues, setEditingValues, handleSave, hasChanged, savingKey, setGroups, message,
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
        {canManage && dirty && (
          <Space size={4}>
            <Button size="small" type="link" onClick={() => {
              setEditingValues((prev) => { const n = { ...prev }; delete n[itemKey]; return n; });
            }}>取消</Button>
            <Button size="small" type="primary" loading={savingKey === itemKey} onClick={() => handleSave(item)}>保存</Button>
          </Space>
        )}
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
                  {logoItem && canManage && (
                    <Space size={4}>
                      {hasChanged(logoItem) && (
                        <>
                          <Button size="small" type="link"
                            onClick={() => setEditingValues((prev) => { const n = { ...prev }; delete n[logoItem!.config_key]; return n; })}
                          >取消</Button>
                          <Button size="small" type="primary"
                            loading={savingKey === logoItem.config_key}
                            onClick={() => handleSave(logoItem)}
                          >保存 LOGO</Button>
                        </>
                      )}
                    </Space>
                  )}
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
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right',
      render: (_, record) => {
        const fm = FIELD_META[record.config_key] ?? DEFAULT_FIELD_META;
        // switch 类型：保存按钮始终可用（用户切换开关即算变更）
        const changed =
          fm.type === 'switch'
            ? editingValues[record.config_key] !== undefined
            : editingValues[record.config_key] !== undefined &&
              editingValues[record.config_key] !== (record.config_value ?? '');
        return canManage ? (
          <Button
            type="link"
            size="small"
            disabled={!changed}
            loading={savingKey === record.config_key}
            onClick={() => handleSave(record)}
          >
            保存
          </Button>
        ) : (
          <Tag>只读</Tag>
        );
      },
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
                    handleSave={handleSave}
                    hasChanged={hasChanged}
                    savingKey={savingKey}
                    setGroups={setGroups}
                    message={message}
                  />
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
