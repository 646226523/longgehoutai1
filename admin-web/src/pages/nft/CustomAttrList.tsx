import React, { useCallback } from 'react';
import { Input, Button } from 'antd';

export interface CustomAttr {
  key: string;
  val: string;
}

interface CustomAttrListProps {
  value?: CustomAttr[];
  onChange?: (next: CustomAttr[]) => void;
}

const CustomAttrList: React.FC<CustomAttrListProps> = ({ value, onChange }) => {
  const list = Array.isArray(value) ? value : [];

  const update = useCallback(
    (next: CustomAttr[]) => {
      onChange?.(next);
    },
    [onChange]
  );

  const handleK = useCallback(
    (idx: number, k: string) => {
      const next = list.map((row, i) => (i === idx ? { ...row, key: k } : row));
      update(next);
    },
    [list, update]
  );

  const handleV = useCallback(
    (idx: number, v: string) => {
      const next = list.map((row, i) => (i === idx ? { ...row, val: v } : row));
      update(next);
    },
    [list, update]
  );

  const remove = useCallback(
    (idx: number) => {
      const next = list.filter((_, i) => i !== idx);
      update(next);
    },
    [list, update]
  );

  const add = useCallback(() => {
    const next = [...list, { key: '', val: '' }];
    update(next);
  }, [list, update]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {list.map((row, idx) => (
        <div
          key={idx}
          style={{
            display: 'grid',
            gridTemplateColumns: '35% 35% 30%',
            gap: 8,
            alignItems: 'center',
          }}
        >
          <Input
            placeholder="属性名（如 眼砂）"
            value={row.key}
            onChange={(e) => handleK(idx, e.target.value)}
          />
          <Input
            placeholder="属性值"
            value={row.val}
            onChange={(e) => handleV(idx, e.target.value)}
          />
          <Button danger type="link" onClick={() => remove(idx)}>
            删除
          </Button>
        </div>
      ))}
      <Button type="dashed" block style={{ marginTop: 8 }} onClick={() => add()}>
        + 添加属性
      </Button>
    </div>
  );
};

export default CustomAttrList;
