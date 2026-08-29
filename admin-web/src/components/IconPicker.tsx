import { Modal } from 'antd';
import { AppstoreOutlined } from '@ant-design/icons';

/**
 * 图标选择器 - 占位组件
 * 用于满足 MemberLevel 表单中选择等级徽章图标的需求。
 * 后续将实现:预置图标库弹窗 + 选中后回填表单。
 *
 * 约定:受控组件,配合 Ant Design Form.Item 使用。
 * - value: string | undefined 当前选中的图标 key
 * - onChange: (value: string) => void 图标变更回调
 */
interface IconPickerProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
}

const PRESET_ICONS = [
  { key: '🥉', label: '青铜' },
  { key: '🥈', label: '白银' },
  { key: '🥇', label: '黄金' },
  { key: '⭐', label: '星级' },
  { key: '💎', label: '钻石' },
  { key: '👑', label: '皇冠' },
  { key: '🏆', label: '奖杯' },
  { key: '🎖️', label: '勋章' },
];

const IconPicker: React.FC<IconPickerProps> = ({ value, onChange, placeholder }) => {
  const handleOpen = () => {
    Modal.confirm({
      title: '选择等级图标',
      content: (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, padding: '12px 0' }}>
          {PRESET_ICONS.map((icon) => (
            <div
              key={icon.key}
              onClick={() => onChange?.(icon.key)}
              style={{
                textAlign: 'center',
                cursor: 'pointer',
                padding: 12,
                border: value === icon.key ? '2px solid #1677ff' : '1px solid #d9d9d9',
                borderRadius: 8,
                transition: 'all 0.2s',
              }}
            >
              <div style={{ fontSize: 28 }}>{icon.key}</div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{icon.label}</div>
            </div>
          ))}
        </div>
      ),
      okText: '确认',
      cancelText: '取消',
    });
  };

  return (
    <div
      onClick={handleOpen}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '4px 11px',
        height: 32,
        border: '1px solid #d9d9d9',
        borderRadius: 6,
        cursor: 'pointer',
        background: '#fff',
        transition: 'border-color 0.2s',
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = '#1677ff'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = '#d9d9d9'; }}
    >
      {value ? (
        <>
          <span style={{ fontSize: 20 }}>{value}</span>
          <span style={{ color: '#333' }}>已选择</span>
        </>
      ) : (
        <>
          <AppstoreOutlined style={{ color: '#999' }} />
          <span style={{ color: '#bfbfbf' }}>{placeholder || '请选择图标'}</span>
        </>
      )}
    </div>
  );
};

export default IconPicker;
