import { useState, useMemo } from 'react';
import { Input, Tag, Empty, Divider, Tooltip } from 'antd';
import type React from 'react';

interface IconItem {
  key: string;
  label: string;
  emoji: string;
  category: string;
}

const ALL_ICONS: IconItem[] = [
  { key: '🥉', label: '青铜', emoji: '🥉', category: 'badge' },
  { key: '🥈', label: '白银', emoji: '🥈', category: 'badge' },
  { key: '🥇', label: '黄金', emoji: '🥇', category: 'badge' },
  { key: '💎', label: '钻石', emoji: '💎', category: 'badge' },
  { key: '👑', label: '王者', emoji: '👑', category: 'badge' },
  { key: '🏆', label: '至尊奖杯', emoji: '🏆', category: 'badge' },
  { key: '🎖️', label: '军功勋章', emoji: '🎖️', category: 'badge' },
  { key: '🏅', label: '荣誉奖章', emoji: '🏅', category: 'badge' },
  { key: '⭐', label: '明星徽章', emoji: '⭐', category: 'badge' },
  { key: '🌟', label: '闪耀新星', emoji: '🌟', category: 'badge' },
  { key: '✨', label: '传奇光辉', emoji: '✨', category: 'badge' },
  { key: '💫', label: '达人之星', emoji: '💫', category: 'badge' },
  { key: '🔥', label: '烈焰徽章', emoji: '🔥', category: 'badge' },
  { key: '⚡', label: '闪电徽章', emoji: '⚡', category: 'badge' },
  { key: '🚀', label: '先锋徽章', emoji: '🚀', category: 'badge' },
  { key: '💳', label: '尊贵身份', emoji: '💳', category: 'badge' },
  { key: '💰', label: '富豪徽章', emoji: '💰', category: 'badge' },

  { key: '🦅', label: '雄鹰', emoji: '🦅', category: 'bird' },
  { key: '🕊️', label: '和平鸽', emoji: '🕊️', category: 'bird' },
  { key: '🐦', label: '麻雀', emoji: '🐦', category: 'bird' },
  { key: '🐤', label: '小鸡', emoji: '🐤', category: 'bird' },
  { key: '🦜', label: '鹦鹉', emoji: '🦜', category: 'bird' },
  { key: '🦢', label: '天鹅', emoji: '🦢', category: 'bird' },
  { key: '🐔', label: '公鸡', emoji: '🐔', category: 'bird' },
  { key: '🐓', label: '斗鸡', emoji: '🐓', category: 'bird' },

  { key: '🔰', label: '骑士盾牌', emoji: '🔰', category: 'honor' },
  { key: '🗡️', label: '利剑', emoji: '🗡️', category: 'honor' },
  { key: '⚔️', label: '交叉剑', emoji: '⚔️', category: 'honor' },
  { key: '🛡️', label: '守护者盾', emoji: '🛡️', category: 'honor' },
  { key: '🎯', label: '神射手', emoji: '🎯', category: 'honor' },
  { key: '🏹', label: '弓箭手', emoji: '🏹', category: 'honor' },
  { key: '❤️', label: '荣誉之心', emoji: '❤️', category: 'honor' },
  { key: '💪', label: '力量之臂', emoji: '💪', category: 'honor' },
  { key: '🎖', label: '勋章', emoji: '🎖', category: 'honor' },
  { key: '🏵️', label: '勋章花', emoji: '🏵️', category: 'honor' },
  { key: '🎗️', label: '丝带勋章', emoji: '🎗️', category: 'honor' },

  { key: '🎪', label: '马戏团', emoji: '🎪', category: 'fun' },
  { key: '🎨', label: '艺术家', emoji: '🎨', category: 'fun' },
  { key: '🎓', label: '学者', emoji: '🎓', category: 'fun' },
  { key: '🎤', label: '歌手', emoji: '🎤', category: 'fun' },
  { key: '🎭', label: '演员', emoji: '🎭', category: 'fun' },
  { key: '🎮', label: '玩家', emoji: '🎮', category: 'fun' },
  { key: '🎰', label: '幸运', emoji: '🎰', category: 'fun' },
  { key: '🎱', label: '球手', emoji: '🎱', category: 'fun' },
  { key: '🎲', label: '骰子', emoji: '🎲', category: 'fun' },
  { key: '🎁', label: '礼物', emoji: '🎁', category: 'fun' },
  { key: '🔱', label: '三叉戟', emoji: '🔱', category: 'fun' },
  { key: '⚜️', label: '鸢尾花', emoji: '⚜️', category: 'fun' },
  { key: '🐉', label: '龙', emoji: '🐉', category: 'fun' },
  { key: '🦋', label: '蝴蝶', emoji: '🦋', category: 'fun' },

  { key: '🌸', label: '樱花', emoji: '🌸', category: 'nature' },
  { key: '🌺', label: '木槿', emoji: '🌺', category: 'nature' },
  { key: '🌻', label: '向日葵', emoji: '🌻', category: 'nature' },
  { key: '🌷', label: '郁金香', emoji: '🌷', category: 'nature' },
  { key: '🌹', label: '玫瑰', emoji: '🌹', category: 'nature' },
  { key: '🌴', label: '棕榈', emoji: '🌴', category: 'nature' },
  { key: '🌲', label: '松树', emoji: '🌲', category: 'nature' },
  { key: '🍀', label: '四叶草', emoji: '🍀', category: 'nature' },
  { key: '🌙', label: '月亮', emoji: '🌙', category: 'nature' },
  { key: '☀️', label: '太阳', emoji: '☀️', category: 'nature' },
  { key: '⛅', label: '云朵', emoji: '⛅', category: 'nature' },
  { key: '🌈', label: '彩虹', emoji: '🌈', category: 'nature' },
  { key: '⚓', label: '锚', emoji: '⚓', category: 'nature' },
];

interface IconPickerProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
}

const CATEGORIES = [
  { key: 'all', label: '全部', icon: '📋' },
  { key: 'badge', label: '等级徽章', icon: '🏆' },
  { key: 'bird', label: '飞禽鸟类', icon: '🕊️' },
  { key: 'honor', label: '荣誉勋章', icon: '🎖️' },
  { key: 'fun', label: '趣味图标', icon: '🎮' },
  { key: 'nature', label: '自然元素', icon: '🌸' },
];

const IconPicker: React.FC<IconPickerProps> = ({
  value,
  onChange,
  placeholder = '请选择等级图标',
}) => {
  const [searchText, setSearchText] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const filteredIcons = useMemo(() => {
    let result = ALL_ICONS;
    if (activeCategory !== 'all') {
      result = ALL_ICONS.filter((i) => i.category === activeCategory);
    }
    if (searchText.trim()) {
      const keyword = searchText.toLowerCase();
      result = result.filter(
        (i) =>
          i.key.toLowerCase().includes(keyword) ||
          i.label.toLowerCase().includes(keyword)
      );
    }
    return result;
  }, [activeCategory, searchText]);

  const selectedIcon = useMemo(
    () => ALL_ICONS.find((i) => i.key === value),
    [value]
  );

  const handleSelect = (icon: IconItem) => {
    onChange?.(icon.key === value ? '' : icon.key);
  };

  return (
    <div style={{ width: '100%' }}>
      <Input
        placeholder="搜索图标名称..."
        allowClear
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        style={{ marginBottom: 10 }}
      />

      <div
        style={{
          marginBottom: 10,
          display: 'flex',
          gap: 6,
          flexWrap: 'wrap',
        }}
      >
        {CATEGORIES.map((cat) => (
          <Tag.CheckableTag
            key={cat.key}
            checked={activeCategory === cat.key}
            onChange={() => setActiveCategory(cat.key)}
            style={{
              borderRadius: 6,
              padding: '4px 12px',
              fontSize: 12,
              cursor: 'pointer',
              border: activeCategory === cat.key ? '1px solid #1677ff' : '1px solid #e8e8e8',
              background: activeCategory === cat.key ? '#e6f4ff' : '#fff',
              color: activeCategory === cat.key ? '#1677ff' : '#595959',
              fontWeight: activeCategory === cat.key ? 500 : 400,
              transition: 'all 0.2s ease',
            }}
          >
            {cat.icon} {cat.label}
          </Tag.CheckableTag>
        ))}
      </div>

      <Divider style={{ margin: '4px 0 10px' }} />

      {selectedIcon && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '10px 14px',
            background: 'linear-gradient(135deg, #f6f8ff 0%, #f0f4ff 100%)',
            borderRadius: 10,
            marginBottom: 10,
            border: '1px solid #d6e4ff',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: 60,
              height: 60,
              background: 'linear-gradient(135deg, rgba(22,119,255,0.1) 0%, rgba(105,177,255,0.1) 100%)',
              borderRadius: '0 0 0 60px',
            }}
          />
          <div
            style={{
              width: 44,
              height: 44,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#fff',
              borderRadius: 10,
              boxShadow: '0 2px 12px rgba(22,119,255,0.15)',
              fontSize: 26,
              position: 'relative',
              zIndex: 1,
            }}
          >
            {selectedIcon.emoji}
          </div>
          <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#262626' }}>
              {selectedIcon.label}
            </div>
            <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 2 }}>
              标识: <code style={{ background: '#f5f5f5', padding: '1px 4px', borderRadius: 3 }}>{selectedIcon.key}</code>
            </div>
          </div>
          <div
            onClick={() => onChange?.('')}
            style={{
              cursor: 'pointer',
              padding: '2px 6px',
              fontSize: 11,
              color: '#8c8c8c',
              borderRadius: 4,
              transition: 'all 0.2s',
              zIndex: 1,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.background = '#fff1f0';
              (e.currentTarget as HTMLDivElement).style.color = '#ff4d4f';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.background = 'transparent';
              (e.currentTarget as HTMLDivElement).style.color = '#8c8c8c';
            }}
          >
            ✕ 清除
          </div>
        </div>
      )}

      {filteredIcons.length === 0 ? (
        <Empty description="暂无匹配的图标" style={{ padding: '24px 0' }} />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: 8,
            maxHeight: 280,
            overflowY: 'auto',
            padding: 6,
            borderRadius: 10,
            background: '#fafafa',
            border: '1px solid #f0f0f0',
            scrollbarWidth: 'thin',
          }}
        >
          {filteredIcons.map((icon) => {
            const isSelected = icon.key === value;
            return (
              <Tooltip key={icon.key} title={icon.label} placement="top">
                <div
                  onClick={() => handleSelect(icon)}
                  style={{
                    width: '100%',
                    aspectRatio: '1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    borderRadius: 10,
                    background: isSelected
                      ? 'linear-gradient(135deg, #1677ff 0%, #4096ff 100%)'
                      : '#fff',
                    border: isSelected
                      ? '2px solid #1677ff'
                      : '2px solid #f0f0f0',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    color: isSelected ? '#fff' : 'inherit',
                    fontSize: 22,
                    boxShadow: isSelected
                      ? '0 4px 12px rgba(22,119,255,0.35)'
                      : '0 1px 2px rgba(0,0,0,0.04)',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      const el = e.currentTarget as HTMLDivElement;
                      el.style.background = 'linear-gradient(135deg, #e6f4ff 0%, #bae0ff 100%)';
                      el.style.transform = 'translateY(-2px) scale(1.05)';
                      el.style.boxShadow = '0 4px 12px rgba(22,119,255,0.2)';
                      el.style.borderColor = '#91caff';
                    }
                  }}
                  onMouseLeave={(e) => {
                    const el = e.currentTarget as HTMLDivElement;
                    if (isSelected) {
                      el.style.background = 'linear-gradient(135deg, #1677ff 0%, #4096ff 100%)';
                      el.style.transform = 'translateY(0) scale(1)';
                      el.style.boxShadow = '0 4px 12px rgba(22,119,255,0.35)';
                      el.style.borderColor = '#1677ff';
                    } else {
                      el.style.background = '#fff';
                      el.style.transform = 'translateY(0) scale(1)';
                      el.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)';
                      el.style.borderColor = '#f0f0f0';
                    }
                  }}
                >
                  {icon.emoji}
                </div>
              </Tooltip>
            );
          })}
        </div>
      )}

      <div
        style={{
          marginTop: 10,
          padding: '8px 12px',
          background: value ? '#f6ffed' : '#f5f5f5',
          borderRadius: 8,
          textAlign: 'center',
          color: value ? '#52c41a' : '#bfbfbf',
          fontSize: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          transition: 'all 0.2s',
        }}
      >
        {value ? (
          <>
            <span style={{ fontSize: 16 }}>✓</span>
            已选择 {selectedIcon?.label}（{value}）· 共 {ALL_ICONS.length} 个图标库
          </>
        ) : (
          <>
            👆 {placeholder} · 共 {ALL_ICONS.length} 个图标可选
          </>
        )}
      </div>
    </div>
  );
};

export default IconPicker;