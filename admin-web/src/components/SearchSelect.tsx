import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Select } from 'antd';

interface SearchSelectOption {
  value: string | number;
  label: string;
  [key: string]: unknown;
}

interface SearchSelectProps {
  value?: string | number | null;
  onChange?: (value: string | number | null | undefined, option?: SearchSelectOption) => void;
  onSearch: (keyword: string) => Promise<SearchSelectOption[]>;
  placeholder?: string;
  optionLabel?: (option: SearchSelectOption) => React.ReactNode;
  disabled?: boolean;
  allowClear?: boolean;
  className?: string;
  style?: React.CSSProperties;
  mode?: 'tags';
  onFocus?: () => void;
  defaultOptions?: SearchSelectOption[];
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
  mode,
  onFocus,
  defaultOptions,
}) => {
  const isTagsMode = mode === 'tags';
  const [options, setOptions] = useState<SearchSelectOption[]>(defaultOptions ?? []);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSearchRef = useRef(onSearch);
  onSearchRef.current = onSearch;
  const loadedRef = useRef(false);

  const selectedValue = value ?? undefined;

  useEffect(() => {
    if (defaultOptions && defaultOptions.length) {
      setOptions((prev) => {
        const merged = [...defaultOptions];
        for (const opt of prev) {
          if (!merged.some((m) => String(m.value) === String(opt.value))) {
            merged.push(opt);
          }
        }
        return merged;
      });
    }
  }, [defaultOptions]);

  const handleSearch = useCallback((keyword: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
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

  const handleFocus = useCallback(() => {
    onFocus?.();
    if (!loadedRef.current) {
      loadedRef.current = true;
      handleSearch('');
    }
  }, [handleSearch, onFocus]);

  const useRichDropdown = Boolean(optionLabel);

  const selectOptions = options.map((o) => ({
    value: String(o.value),
    label: optionLabel ? optionLabel(o) : o.label,
    selectedLabel: o.label,
  }));

  const handleChange = useCallback(
    (val: unknown) => {
      if (isTagsMode) {
        const arr = val as Array<{ value: string; label: React.ReactNode }>;
        if (!arr || arr.length === 0) {
          onChange?.(undefined, undefined);
          return;
        }
        const item = arr[0];
        if (item.value === item.label) {
          onChange?.(item.value);
        } else {
          const option = selectOptions.find((o) => o.value === item.value);
          if (option) {
            const original = options.find((o) => String(o.value) === item.value);
            onChange?.(original ? original.value : item.value, original);
          } else {
            onChange?.(item.value);
          }
        }
      } else {
        const v = val as string | number | undefined;
        if (v === undefined || v === null) {
          onChange?.(undefined, undefined);
          return;
        }
        const option = options.find((o) => o.value === v);
        if (option) {
          onChange?.(v, option);
        } else {
          onChange?.(v);
        }
      }
    },
    [isTagsMode, onChange, options, selectOptions]
  );

  const selectValue = isTagsMode
    ? selectedValue !== undefined && selectedValue !== null
      ? (() => {
          const strVal = String(selectedValue);
          const matched = selectOptions.find((o) => o.value === strVal);
          return [
            matched
              ? { value: matched.value, label: matched.selectedLabel }
              : { value: strVal, label: strVal },
          ];
        })()
      : []
    : (selectedValue as string | number | undefined);

  return (
    <Select
      showSearch
      filterOption={false}
      placeholder={placeholder}
      mode={isTagsMode ? 'tags' : undefined}
      labelInValue={isTagsMode}
      value={selectValue as any}
      onChange={handleChange}
      onSearch={handleSearch}
      loading={loading}
      disabled={disabled}
      allowClear={allowClear}
      className={className}
      style={style}
      onFocus={handleFocus}
      notFoundContent={loading ? '加载中...' : '无数据'}
      optionFilterProp="label"
      optionLabelProp={useRichDropdown ? 'selectedLabel' : 'label'}
      options={selectOptions}
      maxTagCount="responsive"
    />
  );
};

export default SearchSelect;
