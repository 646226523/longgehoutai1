import React from 'react';
import { Card, Descriptions, Empty, Image, Space, Tag, Typography } from 'antd';
import type { DescriptionsProps } from 'antd';

const IPFS_PLACEHOLDER_IMG =
  'data:image/svg+xml;base64,' +
  btoa(
    `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" rx="8" fill="#f5f5f5" stroke="#f0f0f0" stroke-width="1"/><g fill="#bfbfbf"><rect x="30" y="36" width="40" height="28" rx="3"/><circle cx="40" cy="46" r="3" fill="#8c8c8c"/><path d="M70 64L56 50L46 60L38 52L30 60V64H70Z"/></g></svg>`
  );

export function safeJsonParse<T = any>(
  raw: string | null | undefined,
  fallback: T = {} as T
): T & { __parseError?: boolean; __raw?: string } {
  if (raw == null || raw === '') return fallback as any;
  if (typeof raw !== 'string') return fallback as any;
  try {
    return JSON.parse(raw);
  } catch {
    return { ...fallback, __parseError: true, __raw: raw } as any;
  }
}

export function parseMetadata(metadata: string | null | undefined): Record<string, any> {
  return safeJsonParse<Record<string, any>>(metadata, {});
}

export const CN_MAPPING: Record<string, string> = {
  name: '资产名',
  ring_number: '足环号',
  breed: '品系',
  bloodline: '血统',
  gender: '性别',
  color: '羽色',
  eye_color: '眼砂',
  achievement: '赛绩',
  race: '赛绩',
  owner: '鸽主',
  owner_name: '鸽主',
  ipfs_image: '链上图片',
  image_url: '封面图片',
  attributes: '属性',
  description: '描述',
  created_at: '创建日期',
  updated_at: '更新日期',
  created_date: '创建日期',
  birth_year: '出生年份',
  hatch_year: '出生年份',
  age: '鸽龄',
  sire: '父鸽血统',
  dam: '母鸽血统',
  lineage: '血统谱系',
  ancestry: '祖先',
  ring_id: '足环编号',
  father_strain: '父系',
  mother_strain: '母系',
  detection_no: '检测编号',
  chip_id: '芯片编号',
  level: '等级',
  race_rank: '赛事排名',
};

export const EXPANDABLE_ARRAY_KEYS = ['custom_attrs', 'attributes', 'extra_attributes'];

export interface KvEntry {
  key?: string;
  trait_type?: string;
  name?: string;
  value: any;
  custom?: boolean;
}

export function isKvEntryArray(arr: any[]): arr is KvEntry[] {
  if (!Array.isArray(arr) || arr.length === 0) return false;
  return arr.some((item) => {
    if (!item || typeof item !== 'object') return false;
    if (Array.isArray(item)) return false;
    if (!('value' in item)) return false;
    return 'key' in item || 'trait_type' in item || 'name' in item;
  });
}

const GENDER_VALUE_MAP: Record<string, string> = {
  male: '雄',
  female: '雌',
  unknown: '未知',
};

function isImageKey(key: string) {
  return /image|img|photo|url|图/i.test(key);
}

function isImageUrlOnly(val: any): val is string {
  if (typeof val !== 'string') return false;
  if (/^(https?:\/\/|ipfs:\/\/)/i.test(val)) return true;
  return /\.(png|jpg|jpeg|webp|gif|svg)(\?.*)?$/i.test(val);
}

function isUrlNonImage(val: any): val is string {
  return typeof val === 'string' && /^https?:\/\//i.test(val) && !isImageUrlOnly(val);
}

function ipfsToHttp(url: string): string {
  if (url.startsWith('ipfs://')) {
    return 'https://ipfs.io/ipfs/' + url.slice(7);
  }
  return url;
}

export function inferAliasByFuzzy(key: string): {
  alias?: string;
  categoryHint?: 'year' | 'image' | 'bloodline' | 'extPrefix';
} {
  const lowerKey = key.toLowerCase();

  if (/^(custom_|extra_|attr_|user_)/i.test(key)) {
    return { categoryHint: 'extPrefix' };
  }

  if (/year|生日|年龄|出生|鸽龄/i.test(key)) {
    return { alias: '出生年份/鸽龄', categoryHint: 'year' };
  }

  if (/image|img|photo|图|照片/i.test(key)) {
    return { alias: '图片', categoryHint: 'image' };
  }

  if (/血统|血缘|sire|dam|lineage|ancestor/i.test(lowerKey)) {
    return { alias: '血统类', categoryHint: 'bloodline' };
  }

  return {};
}

function getLabelInfo(key: string): {
  label: string;
  custom: boolean;
  category: 'system' | 'image' | 'custom';
  fuzzyAlias: boolean;
} {
  const fuzzy = inferAliasByFuzzy(key);

  if (fuzzy.categoryHint === 'extPrefix') {
    if (fuzzy.alias) {
      return {
        label: fuzzy.alias,
        custom: true,
        category: 'custom',
        fuzzyAlias: true,
      };
    }
    const mapped = CN_MAPPING[key];
    if (mapped) {
      return {
        label: mapped,
        custom: true,
        category: 'custom',
        fuzzyAlias: false,
      };
    }
    return {
      label: key,
      custom: true,
      category: 'custom',
      fuzzyAlias: false,
    };
  }

  const mapped = CN_MAPPING[key];
  if (mapped) {
    const isImage = isImageKey(key) || fuzzy.categoryHint === 'image';
    return {
      label: mapped,
      custom: false,
      category: isImage ? 'image' : 'system',
      fuzzyAlias: false,
    };
  }

  if (fuzzy.alias) {
    const isImage = fuzzy.categoryHint === 'image';
    return {
      label: fuzzy.alias,
      custom: true,
      category: isImage ? 'image' : 'custom',
      fuzzyAlias: true,
    };
  }

  return {
    label: key,
    custom: true,
    category: 'custom',
    fuzzyAlias: false,
  };
}

export function getFieldCategory(
  key: string,
  overrides?: Record<string, 'system' | 'image' | 'custom'>
): 'system' | 'image' | 'custom' {
  if (overrides && key in overrides) {
    return overrides[key];
  }
  const info = getLabelInfo(key);
  return info.category;
}

export function expandCustomAttrsArrays(parsed: Record<string, any>): {
  record: Record<string, any>;
  customOrigins: Record<string, { custom: boolean; fromExpanded: boolean; fromExtraDescription?: boolean }>;
  flattenedExtras: Array<{ parentKey: string; dotKey: string; value: any }>;
  stringArrays: Record<string, string[]>;
  nestedObjects: Record<string, Array<{ dotKey: string; value: any; depth: number }>>;
} {
  const record: Record<string, any> = { ...parsed };
  const customOrigins: Record<string, { custom: boolean; fromExpanded: boolean; fromExtraDescription?: boolean }> = {};
  const flattenedExtras: Array<{ parentKey: string; dotKey: string; value: any }> = [];
  const stringArrays: Record<string, string[]> = {};
  const nestedObjects: Record<string, Array<{ dotKey: string; value: any; depth: number }>> = {};

  const preserveFields = ['__parseError', '__raw'];
  const preserved: Record<string, any> = {};
  for (const f of preserveFields) {
    if (f in record) {
      preserved[f] = record[f];
      delete record[f];
    }
  }

  for (const arrKey of EXPANDABLE_ARRAY_KEYS) {
    const arrVal = record[arrKey];
    if (isKvEntryArray(arrVal)) {
      for (const entry of arrVal) {
        const k = (entry.key || entry.trait_type || entry.name) as string;
        if (!k) continue;
        if (k in record) continue;
        record[k] = entry.value;
        customOrigins[k] = { custom: !!entry.custom, fromExpanded: true };
      }
      delete record[arrKey];
    }
  }

  for (const [key, val] of Object.entries(record)) {
    if (Array.isArray(val)) {
      if (isKvEntryArray(val)) continue;
      const allPrim = val.every(
        (v: any) => typeof v === 'string' || typeof v === 'number'
      );
      if (allPrim) {
        stringArrays[key] = val.map((v: any) => String(v));
      } else {
        nestedObjects[key] = [];
      }
    } else if (val !== null && typeof val === 'object') {
      const walk = (obj: any, prefix: string, depth: number) => {
        if (depth > 2) return;
        for (const [k, v] of Object.entries(obj)) {
          const dotKey = prefix ? `${prefix}.${k}` : k;
          if (v !== null && typeof v === 'object' && !Array.isArray(v) && depth < 2) {
            walk(v, dotKey, depth + 1);
          } else {
            flattenedExtras.push({ parentKey: key, dotKey, value: v });
          }
        }
      };
      walk(val, key, 1);
    }
  }

  for (const f of preserveFields) {
    if (f in preserved) {
      record[f] = preserved[f];
    }
  }

  return { record, customOrigins, flattenedExtras, stringArrays, nestedObjects };
}

function calcObjectDepth(obj: any, depth = 0): number {
  if (obj === null || typeof obj !== 'object') return depth;
  let max = depth;
  if (Array.isArray(obj)) {
    for (const v of obj) {
      const d = calcObjectDepth(v, depth + 1);
      if (d > max) max = d;
    }
  } else {
    for (const v of Object.values(obj)) {
      const d = calcObjectDepth(v, depth + 1);
      if (d > max) max = d;
    }
  }
  return max;
}

export function intelligentValueRenderer(
  key: string,
  raw: any,
  assetName?: string,
  opts?: { isDeepNested?: boolean }
): React.ReactNode {
  if (raw == null || raw === '') return '-';

  const genderKey = /gender|sex/i.test(key);
  if (genderKey && typeof raw === 'string' && GENDER_VALUE_MAP[raw]) {
    return <span>{GENDER_VALUE_MAP[raw]}</span>;
  }

  if (isImageKey(key) && isImageUrlOnly(raw)) {
    const httpUrl = ipfsToHttp(raw);
    const isIpfs = raw.startsWith('ipfs://');
    if (isIpfs) {
      return (
        <Space>
          <img
            src={IPFS_PLACEHOLDER_IMG}
            alt={assetName || key}
            style={{
              width: 80,
              height: 80,
              objectFit: 'cover',
              borderRadius: 8,
              border: '1px solid #f0f0f0',
            }}
          />
          <Typography.Link target="_blank" href={httpUrl}>
            链上原图
          </Typography.Link>
        </Space>
      );
    }
    return (
      <Space>
        <Image
          src={raw}
          width={80}
          height={80}
          style={{
            objectFit: 'cover',
            borderRadius: 8,
            border: '1px solid #f0f0f0',
          }}
          fallback={IPFS_PLACEHOLDER_IMG}
          alt={assetName || key}
        />
        <Typography.Link target="_blank" href={raw}>
          查看原图
        </Typography.Link>
      </Space>
    );
  }

  if (!isImageKey(key) && isImageUrlOnly(raw)) {
    const isIpfs = raw.startsWith('ipfs://');
    const httpUrl = ipfsToHttp(raw);
    return (
      <Space>
        {isIpfs ? (
          <img
            src={IPFS_PLACEHOLDER_IMG}
            alt={assetName || key}
            style={{
              width: 80,
              height: 80,
              objectFit: 'cover',
              borderRadius: 8,
              border: '1px solid #f0f0f0',
            }}
          />
        ) : (
          <Image
            src={raw}
            width={80}
            height={80}
            style={{
              objectFit: 'cover',
              borderRadius: 8,
              border: '1px solid #f0f0f0',
            }}
            fallback={IPFS_PLACEHOLDER_IMG}
            alt={assetName || key}
          />
        )}
        <Typography.Link target="_blank" href={isIpfs ? httpUrl : raw}>
          查看原图
        </Typography.Link>
      </Space>
    );
  }

  if (Array.isArray(raw)) {
    const allPrim = raw.every((v: any) => typeof v === 'string' || typeof v === 'number');
    if (allPrim) {
      return (
        <Space size={4} wrap>
          {raw.map((v: any, idx: number) => (
            <Tag key={idx}>{String(v)}</Tag>
          ))}
        </Space>
      );
    }
  }

  const isNonArrayObj = raw !== null && typeof raw === 'object' && !Array.isArray(raw);
  if (isNonArrayObj) {
    let isDeep = !!opts?.isDeepNested;
    if (!isDeep) {
      isDeep = calcObjectDepth(raw) > 2;
    }
    if (!isDeep) {
      try {
        isDeep = JSON.stringify(raw).length > 300;
      } catch {}
    }
    if (isDeep) {
      let jsonStr = '';
      try {
        jsonStr = JSON.stringify(raw, null, 2);
      } catch {
        jsonStr = String(raw);
      }
      return (
        <Typography.Paragraph
          copyable
          style={{ marginBottom: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
        >
          {jsonStr}
        </Typography.Paragraph>
      );
    }
  }

  const yearKeySet: Record<string, 1> = { birth_year: 1, hatch_year: 1, age: 1 };
  const fuzzy = inferAliasByFuzzy(key);
  const isYearKey = fuzzy.categoryHint === 'year' || yearKeySet[key];
  if (isYearKey && typeof raw === 'number') {
    return <span>{raw} 年</span>;
  }

  const isRankKey = /赛绩|race|achievement|rank/i.test(key);
  if (isRankKey) {
    const rawStr = String(raw);
    const rankMatch = rawStr.match(/第(\d+)名/);
    let emoji = '';
    if (rankMatch) {
      const num = parseInt(rankMatch[1], 10);
      if (num === 1) emoji = '🥇';
      else if (num === 2) emoji = '🥈';
      else if (num === 3) emoji = '🥉';
      else emoji = '🏅';
    } else {
      const pureNumMatch = rawStr.match(/(\d+)/);
      if (pureNumMatch) {
        const num = parseInt(pureNumMatch[1], 10);
        if (num === 1) emoji = '🥇';
        else if (num === 2) emoji = '🥈';
        else if (num === 3) emoji = '🥉';
        else emoji = '🏅';
      } else {
        emoji = '🏁';
      }
    }
    return <span>{emoji} {rawStr}</span>;
  }

  let val: any = raw;
  if (typeof val !== 'string' && typeof val !== 'number') {
    try {
      val = JSON.stringify(val);
    } catch {
      val = String(val);
    }
  }
  let s: string = String(val);

  if (isUrlNonImage(s)) {
    return (
      <Typography.Paragraph
        copyable
        ellipsis={{ rows: 1, expandable: false }}
        style={{ marginBottom: 0, maxWidth: 360 }}
      >
        {s}
      </Typography.Paragraph>
    );
  }

  const s2: string = s;
  if (s2.length > 80) {
    return (
      <Typography.Paragraph
        copyable
        ellipsis={{ rows: 3, expandable: true, symbol: '展开' }}
        style={{ marginBottom: 0 }}
      >
        {s2}
      </Typography.Paragraph>
    );
  }

  const isHashLike = /hash|address|tx|token/i.test(key) && s2.length > 24;
  if (isHashLike || s2.length > 60) {
    return (
      <Typography.Text
        ellipsis={{ tooltip: true, symbol: '…' }}
        copyable
        style={{ maxWidth: 360, display: 'inline-block' }}
      >
        {s2}
      </Typography.Text>
    );
  }

  return <span>{s2}</span>;
}

interface RenderStructuredInfoGridOpts {
  filterKeys?: Set<string>;
  forceCustomLabel?: boolean;
  customHighlights?: Set<string>;
}

export function renderStructuredInfoGrid(
  metadata: Record<string, any>,
  assetName?: string,
  descriptionsProps?: Partial<DescriptionsProps>,
  opts?: RenderStructuredInfoGridOpts
): React.ReactNode {
  const parseError = !!metadata?.__parseError;
  const allOrderedKeys = Array.from(
    new Set([
      ...Object.keys(CN_MAPPING).filter((k) => metadata[k] != null && metadata[k] !== ''),
      ...Object.keys(metadata).filter(
        (k) =>
          !CN_MAPPING[k] &&
          k !== '__parseError' &&
          k !== '__raw' &&
          metadata[k] != null &&
          metadata[k] !== ''
      ),
    ])
  );

  const orderedKeys = opts?.filterKeys
    ? Array.from(opts.filterKeys).filter((k) => allOrderedKeys.includes(k))
    : allOrderedKeys;

  const N = orderedKeys.length;
  if (N === 0) {
    return (
      <Space direction="vertical" style={{ width: '100%' }} align="center">
        <Empty description="暂无属性" />
        {parseError && (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            元数据格式异常，已按原文展示
          </Typography.Text>
        )}
      </Space>
    );
  }
  return (
    <Descriptions column={2} bordered size="small" {...descriptionsProps}>
      {(() => {
        const COL = 2;
        let acc = 0;
        const nodes: React.ReactNode[] = [];
        const pad = (key: string, span: number) => (
          <Descriptions.Item
            key={key}
            span={span}
            label=" "
            labelStyle={{ display: 'none', border: 'none' }}
            contentStyle={{ border: 'none', color: 'transparent' }}
          >
            <span style={{ visibility: 'hidden' }}>.</span>
          </Descriptions.Item>
        );
        for (const key of orderedKeys) {
          const { label, custom } = getLabelInfo(key);
          const shouldShowCustomBadge = opts?.forceCustomLabel || custom;
          const isHighlighted = opts?.customHighlights?.has(key);
          const isSystemTopDescription = key === 'description' && !shouldShowCustomBadge;
          const realLabel: React.ReactNode = (
            <>
              {key === 'description' ? <>📝 {label}</> : label}
              {shouldShowCustomBadge && (<Tag color="magenta" style={{marginLeft:6,fontWeight:'normal'}}>自定义</Tag>)}
              {isSystemTopDescription && (<Tag color="green" style={{marginLeft:6,fontWeight:'normal'}}>系统顶层</Tag>)}
              {isHighlighted && (<Tag color="green" style={{marginLeft:6,fontWeight:'normal'}}>✅ 用户自定义</Tag>)}
            </>
          );
          const span = (key === 'description' || isImageKey(key)) ? COL : 1;
          if (acc !== 0 && acc + span > COL) {
            nodes.push(pad(`__pad__${key}`, COL - acc));
            acc = 0;
          }
          nodes.push(
            <Descriptions.Item
              key={key}
              label={realLabel}
              span={span}
            >
              {intelligentValueRenderer(key, metadata[key], assetName)}
            </Descriptions.Item>
          );
          acc += span;
          if (acc >= COL) acc = 0;
        }
        if (acc > 0) {
          nodes.push(pad('__pad_end__', COL - acc));
        }
        return nodes;
      })()}
    </Descriptions>
  );
}

export function renderMetadataInfoSection(
  metadata: string | null,
  extraImageUrl?: string | null,
  extraDescription?: string | null
): React.ReactNode {
  const parsed = parseMetadata(metadata);
  const parseError = !!parsed.__parseError;
  const rawText = parsed.__raw;

  const expanded = expandCustomAttrsArrays(parsed);
  let { record, customOrigins, flattenedExtras, nestedObjects } = expanded;

  for (const extra of flattenedExtras) {
    if (!(extra.dotKey in record)) {
      record[extra.dotKey] = extra.value;
    }
  }

  const trimmedDesc = (extraDescription ?? '').trim();
  const hasExtraDesc = trimmedDesc.length > 0;
  if (hasExtraDesc) {
    record = { ...record, description: trimmedDesc };
    customOrigins.description = { custom: false, fromExpanded: false, fromExtraDescription: true };
  }

  const extraImageContributed = extraImageUrl && !record.image_url && !record.ipfs_image;
  if (extraImageContributed && extraImageUrl) {
    record = { ...record, image_url: extraImageUrl };
    customOrigins.image_url = { custom: true, fromExpanded: false };
  }

  for (const nestedKey of Object.keys(nestedObjects)) {
    if (!(nestedKey in customOrigins)) {
      customOrigins[nestedKey] = { custom: true, fromExpanded: false };
    }
  }

  const systemKeys: string[] = [];
  const imageKeys: string[] = [];
  const customKeys: string[] = [];

  const nonEmptyKeys = Object.keys(record).filter(
    (k) => k !== '__parseError' && k !== '__raw' && record[k] != null && record[k] !== ''
  );

  for (const k of nonEmptyKeys) {
    const origin = customOrigins[k];
    if (origin && origin.custom) {
      if (isImageKey(k)) {
        imageKeys.push(k);
      } else {
        customKeys.push(k);
      }
      continue;
    }
    const cat = getFieldCategory(k);
    if (cat === 'image') {
      imageKeys.push(k);
    } else if (cat === 'system') {
      systemKeys.push(k);
    } else {
      customKeys.push(k);
    }
  }

  const orderedSystemKeysRaw = Array.from(new Set([
    ...Object.keys(CN_MAPPING).filter(k => systemKeys.includes(k)),
    ...systemKeys.filter(k => !CN_MAPPING[k]),
  ]));
  const descInSys = orderedSystemKeysRaw.indexOf('description');
  const orderedSystemKeys = [...orderedSystemKeysRaw];
  if (descInSys !== -1) {
    orderedSystemKeys.splice(descInSys, 1);
    orderedSystemKeys.push('description');
  }

  const orderedImageKeys = Array.from(
    new Set([
      ...Object.keys(CN_MAPPING).filter((k) => imageKeys.includes(k)),
      ...imageKeys.filter((k) => !CN_MAPPING[k]),
    ])
  );

  const orderedCustomKeys = Array.from(
    new Set([
      ...Object.keys(CN_MAPPING).filter((k) => customKeys.includes(k)),
      ...customKeys.filter((k) => !CN_MAPPING[k]),
    ])
  );

  const N1 = orderedSystemKeys.length;
  const N2 = orderedImageKeys.length;
  const N3 = orderedCustomKeys.length;
  const totalN = N1 + N2 + N3;

  const customHighlightKeys = new Set(
    Object.keys(customOrigins).filter((k) => customOrigins[k].custom)
  );

  const assetName = record.name ? String(record.name) : undefined;

  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      <Card
        variant="outlined"
        title={
          <>
            信息详情 · 共 {totalN} 个属性
          </>
        }
        styles={{ body: { padding: 0 } }}
      >
        <Space direction="vertical" size={12} style={{ width: '100%', padding: 12 }}>
          <Card
            variant="outlined"
            title={
              <>
                <span>📋 核心属性</span>
                <Tag color="purple" style={{ marginLeft: 8 }}>
                  {N1} 项
                </Tag>
              </>
            }
            styles={{ body: { padding: 12 } }}
          >
            {N1 === 0 ? (
              <Empty description="暂无核心属性" />
            ) : (
              renderStructuredInfoGrid(
                record,
                assetName,
                undefined,
                {
                  filterKeys: new Set(orderedSystemKeys),
                  forceCustomLabel: false,
                }
              )
            )}
          </Card>

          <Card
            variant="outlined"
            title={
              <>
                <span>🖼️ 图片附件</span>
                <Tag color="purple" style={{ marginLeft: 8 }}>
                  {N2} 项
                </Tag>
              </>
            }
            styles={{ body: { padding: 12 } }}
          >
            {N2 === 0 ? (
              <Empty description="暂无图片" />
            ) : (
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                {orderedImageKeys.map((imgKey) => (
                  <Space key={imgKey} align="start" style={{ width: '100%' }}>
                    <Tag color="blue" style={{ flexShrink: 0 }}>
                      {getLabelInfo(imgKey).label}
                    </Tag>
                    {intelligentValueRenderer(imgKey, record[imgKey], assetName)}
                  </Space>
                ))}
              </Space>
            )}
          </Card>

          <Card
            variant="outlined"
            title={
              <>
                <span>✨ 自定义扩展属性</span>
                <Tag color="purple" style={{ marginLeft: 8 }}>
                  {N3} 项
                </Tag>
                <Tag color="magenta" style={{ marginLeft: 8 }}>
                  用户上传
                </Tag>
              </>
            }
            styles={{ body: { padding: 12 } }}
          >
            {N3 === 0 ? (
              <Empty description="暂无自定义扩展属性" />
            ) : (
              renderStructuredInfoGrid(
                record,
                assetName,
                undefined,
                {
                  filterKeys: new Set(orderedCustomKeys),
                  forceCustomLabel: true,
                  customHighlights: customHighlightKeys,
                }
              )
            )}
          </Card>
        </Space>
      </Card>

      {parseError && (
        <Space direction="vertical" style={{ width: '100%' }}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            元数据格式异常，已按原文展示
          </Typography.Text>
          {rawText && (
            <pre
              style={{
                margin: 0,
                padding: 12,
                background: '#fafafa',
                border: '1px solid #f0f0f0',
                borderRadius: 4,
                fontSize: 12,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                maxHeight: 200,
                overflow: 'auto',
              }}
            >
              {rawText}
            </pre>
          )}
        </Space>
      )}
    </Space>
  );
}
