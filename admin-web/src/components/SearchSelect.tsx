import React, { useState, useCallback, useRef } from 'react';
import { Select } from 'antd';

interface SearchSelectOption {
  value: string | number;
  label: string;
  [key: string]: unknown;
}

interface SearchSelectProps {
  value?: string | number;
  onChange?: (value: string | number | undefined, option?: SearchSelectOption) => void;
  onSearch: (keyword: string) => Promise<SearchSelectOption[]>;
  placeholder?: string;
  optionLabel?: (option: SearchSelectOption) => React.ReactNode;
  disabled?: boolean;
  allowClear?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const SearchSelect: React.FC<SearchSelectProps> = ({
  value,
  onChange,
  onSearch,
  placeholder = '请输入关键词搜索',
  optionLabel,
  disabled = false,
  allowClear = true,
  className,
  style,
}) => {
  const [options, setOptions] = useState<SearchSelectOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedValue, setSelectedValue] = useState<string | number | undefined>(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSearchRef = useRef(onSearch);
  onSearchRef.current = onSearch;

  const handleSearch = useCallback((keyword: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!keyword.trim()) {
      setOptions([]);
      return;
    }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await onSearchRef.current(keyword);
        setOptions(results);
      } catch {
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  const handleChange = useCallback(
    (val: string | number | undefined) => {
      setSelectedValue(val);
      if (val === undefined) {
        onChange?.(undefined, undefined);
        return;
      }
      const option = options.find((o) => o.value === val);
      onChange?.(val, option);
    },
    [onChange, options]
  );

  // 当传了自定义的 optionLabel（富样式/多行展示），选中态用简洁 selectedLabel，避免已选容器内容重叠溢出
  const useRichDropdown = Boolean(optionLabel);
  return (
    <Select
      showSearch
      filterOption={false}
      placeholder={placeholder}
      value={selectedValue}
      onChange={handleChange}
      onSearch={handleSearch}
      loading={loading}
      disabled={disabled}
      allowClear={allowClear}
      className={className}
      style={style}
      notFoundContent={loading ? '加载中...' : '无数据'}
      optionFilterProp="label"
      optionLabelProp={useRichDropdown ? 'selectedLabel' : 'label'}
      options={options.map((o) => {
        const rich = optionLabel ? optionLabel(o) : o.label;
        return {
          value: o.value,
          label: rich, // 下拉项展示（可能为多行富样式）
          selectedLabel: o.label, // 选中态展示（一定是简洁单行文本）
        };
      })}
    />
  );
};

export default SearchSelect;
