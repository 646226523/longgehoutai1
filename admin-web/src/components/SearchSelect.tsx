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
  allowCreate?: boolean;
}

interface LabeledValue {
  value: string;
  label: React.ReactNode;
}

const SearchSelect: React.FC<SearchSelectProps> = ({
  value,
  onChange,
  onSearch,
  placeholder = '请输入关键词搜索',
  optionLabel,
  disabled = false,
  allowClear = false,
  className,
  style,
  mode,
  onFocus,
  defaultOptions,
  allowCreate,
}) => {
  const isTagsMode = mode === 'tags';
  const isSingleAllowCreate = !isTagsMode && !!allowCreate;

  const [options, setOptions] = useState<SearchSelectOption[]>(defaultOptions ?? []);
  const [loading, setLoading] = useState(false);
  const [searchValue, setSearchValue] = useState<string>('');
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
    setSearchValue(keyword);
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

  const handleBlur = useCallback(() => {
    if (isSingleAllowCreate && searchValue) {
      const trimmed = searchValue.trim();
      if (trimmed) {
        const existingOption = options.find((o) => String(o.value) === trimmed);
        if (existingOption) {
          onChange?.(existingOption.value, existingOption);
        } else {
          onChange?.(trimmed);
        }
      }
    }
    setSearchValue('');
  }, [isSingleAllowCreate, searchValue, options, onChange]);

  const handleChange = useCallback(
    (val: unknown) => {
      if (isTagsMode) {
        const arr = val as string[];
        if (!arr || arr.length === 0) {
          onChange?.(undefined, undefined);
          return;
        }
        const newValue = arr[arr.length - 1];
        if (onChange) {
          const option = options.find((o) => String(o.value) === String(newValue));
          onChange(option ? option.value : newValue, option);
        }
      } else if (isSingleAllowCreate) {
        const v = val as LabeledValue | string | number | undefined;
        if (v === undefined || v === null) {
          onChange?.(undefined, undefined);
          return;
        }
        let strVal: string;
        if (typeof v === 'object' && 'value' in v) {
          strVal = String(v.value);
        } else {
          strVal = String(v);
        }
        const option = options.find((o) => String(o.value) === strVal);
        if (option) {
          onChange?.(option.value, option);
        } else {
          onChange?.(strVal);
        }
      } else {
        const v = val as string | number | undefined;
        if (v === undefined || v === null) {
          onChange?.(undefined, undefined);
          return;
        }
        const strVal = String(v);
        const option = options.find((o) => String(o.value) === strVal);
        if (option) {
          onChange?.(option.value, option);
        } else {
          onChange?.(v);
        }
      }
    },
    [isTagsMode, isSingleAllowCreate, onChange, options]
  );

  let selectValue: unknown;
  if (isTagsMode) {
    selectValue = selectedValue !== undefined && selectedValue !== null
      ? [String(selectedValue)]
      : [];
  } else if (isSingleAllowCreate && selectedValue !== undefined && selectedValue !== null) {
    const strVal = String(selectedValue);
    const existingOption = options.find((o) => String(o.value) === strVal);
    const displayLabel = existingOption
      ? (optionLabel ? optionLabel(existingOption) : existingOption.label)
      : strVal;
    selectValue = { value: strVal, label: displayLabel };
  } else {
    selectValue = selectedValue as string | number | undefined;
  }

  const selectProps: Record<string, unknown> = {
    showSearch: true,
    filterOption: false,
    placeholder,
    value: selectValue,
    onChange: handleChange,
    onSearch: handleSearch,
    onBlur: handleBlur,
    loading,
    disabled,
    allowClear,
    className,
    style,
    onFocus: handleFocus,
    notFoundContent: loading ? '加载中...' : '无数据',
    optionFilterProp: 'label',
    maxTagCount: 'responsive',
  };

  if (isTagsMode) {
    selectProps.mode = 'tags';
    selectProps.tokenSeparators = [','];
  } else if (isSingleAllowCreate) {
    selectProps.mode = 'combobox';
    selectProps.labelInValue = true;
  }

  selectProps.options = options.map((o) => ({
    value: String(o.value),
    label: optionLabel ? optionLabel(o) : o.label,
  }));

  return <Select {...selectProps as any} />;
};

export default SearchSelect;
