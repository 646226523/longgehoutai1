import React, { useState, useEffect, useCallback } from 'react';
import { Button, Card, Space, Tag, Input } from 'antd';
import type { NftAsset } from '../../services/nft';
import ImageUploader from '../../components/ImageUploader';
import SearchSelect from '../../components/SearchSelect';
import { searchGeneProfiles, type GeneProfileOption } from '../../services/gene';
import CustomAttrList from './CustomAttrList';
import NftMintPreview from './NftMintPreview';

interface NftMintFormProps {
  initialData?: Partial<NftAsset>;
  onCancel: () => void;
  onSubmit: (values: Record<string, any>, mode: 'draft' | 'audit') => Promise<{ id: number } | void>;
}

type FormValues = Record<string, any>;

const GENDER_MAP: Record<string, string> = { male: '雄', female: '雌', unknown: '未知' };

const NftMintForm: React.FC<NftMintFormProps> = ({
  initialData,
  onCancel,
  onSubmit,
}) => {
  const [isWide, setIsWide] = useState(window.innerWidth >= 1920);

  const [formValues, setFormValues] = useState<FormValues>({
    gene_profile_id: initialData?.gene_profile_id ?? null,
    name: initialData?.name || '',
    description: initialData?.description || '',
    image_url: initialData?.image_url || [],
    owner_name: initialData?.owner_name || '',
    customAttrs: [],
    ownerEditable: false,
  });

  const [selectedProfile, setSelectedProfile] = useState<GeneProfileOption | null>(null);

  useEffect(() => {
    const handleResize = () => setIsWide(window.innerWidth >= 1920);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const updateField = useCallback((key: string, value: any) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const profileChange = useCallback((p: GeneProfileOption) => {
    const attrs: Array<{ key: string; val: string }> = [];
    if (p.eye_color) attrs.push({ key: '眼砂', val: p.eye_color });
    if (p.color) attrs.push({ key: '羽色', val: p.color });
    const gender = GENDER_MAP[p.gender];
    if (gender) attrs.push({ key: '性别', val: gender });
    setFormValues((prev) => {
      const existingImg = Array.isArray(prev.image_url) ? prev.image_url : [];
      const candidateImg = p.photo_url && !existingImg.length ? [p.photo_url] : existingImg;
      return {
        ...prev,
        gene_profile_id: p.id,
        name: p.name || prev.name,
        owner_name: p.owner_name || prev.owner_name,
        image_url: candidateImg,
        customAttrs: attrs.length ? attrs : prev.customAttrs,
      };
    });
  }, []);

  const buildSubmitPayload = useCallback((): Record<string, any> => {
    const imageUrl = Array.isArray(formValues.image_url) ? formValues.image_url[0] : formValues.image_url;
    const ownerName = formValues.owner_name || selectedProfile?.owner_name;
    const metadata: Record<string, any> = {
      name: formValues.name,
      ring_number: selectedProfile?.ring_number,
      breed: selectedProfile?.breed,
      gender: GENDER_MAP[selectedProfile?.gender || ''] || selectedProfile?.gender,
      color: selectedProfile?.color,
      eye_color: selectedProfile?.eye_color,
      achievement: selectedProfile?.achievement,
      owner: ownerName,
      ipfs_image: imageUrl,
      ...Object.fromEntries((formValues.customAttrs || []).filter((a: any) => a.key && a.val).map((a: any) => [a.key, a.val])),
    };
    return {
      gene_profile_id: formValues.gene_profile_id,
      name: formValues.name,
      description: formValues.description,
      image_url: imageUrl,
      owner_name: ownerName,
      metadata,
      customAttrs: formValues.customAttrs,
    };
  }, [formValues, selectedProfile]);

  const handleGeneSearch = useCallback(async (keyword: string) => {
    const list = await searchGeneProfiles(keyword);
    const filtered = initialData?.id
      ? list.filter((p) => p.id !== initialData.id)
      : list;
    return filtered.map((p) => ({
      value: p.id,
      label: `${p.ring_number} ${p.name}`,
      ...p,
    }));
  }, [initialData?.id]);

  const renderGeneOption = useCallback((option: any) => {
    const p = option as GeneProfileOption & { value: any; label: any };
    return (
      <span style={{ lineHeight: 1.5 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#1f1f1f' }}>
          {p.ring_number} <span style={{ color: '#1677ff' }}>{p.name}</span>
        </div>
        <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 2 }}>
          品系：{p.breed || '—'} · 鸽主：{p.owner_name || '—'}
        </div>
        {p.achievement && (
          <div style={{ fontSize: 12, color: '#fa8c16', marginTop: 2 }}>赛绩：{p.achievement}</div>
        )}
      </span>
    );
  }, []);

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: 14,
    fontWeight: 600,
    color: '#1f1f1f',
    padding: '8px 0',
    borderBottom: '1px solid #f0f0f0',
    marginBottom: 16,
  };

  const cardStyle: React.CSSProperties = {
    borderRadius: 8,
    border: '1px solid #f0f0f0',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
  };

  const photoUrl = Array.isArray(formValues.image_url)
    ? formValues.image_url[0]
    : formValues.image_url;

  const formContent = (
    <>
      <Card
        title={<span style={sectionTitleStyle}>关联基因档案 <span style={{ color: '#ff4d4f' }}>*</span></span>}
        variant="borderless"
        styles={{ body: { padding: '16px 24px 24px' } }}
        style={{ ...cardStyle, marginBottom: 16 }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <SearchSelect
            placeholder="搜索足环号或鸽名（如：CN-2024 或 闪电侠）"
            style={{ width: '100%' }}
            value={formValues.gene_profile_id ?? undefined}
            onSearch={handleGeneSearch}
            optionLabel={renderGeneOption}
            onChange={(val, opt) => {
              if (!val || !opt) {
                updateField('gene_profile_id', null);
                setSelectedProfile(null);
                return;
              }
              const p = opt as unknown as GeneProfileOption;
              setSelectedProfile(p);
              profileChange(p);
            }}
          />
          {selectedProfile && (
            <div
              style={{
                border: '1px solid #bae0ff',
                background: '#e6f4ff',
                borderRadius: 8,
                padding: 12,
                display: 'flex',
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 6,
                  background: '#91caff',
                  color: '#fff',
                  fontSize: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flex: '0 0 48px',
                }}
              >
                🕊️
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: '#1f1f1f' }}>
                  {selectedProfile.ring_number} · {selectedProfile.name}
                </div>
                <div style={{ fontSize: 12, color: '#595959', marginTop: 4 }}>
                  品系：{selectedProfile.breed || '—'} · 鸽主：{selectedProfile.owner_name || '—'}
                </div>
                {selectedProfile.achievement && (
                  <div style={{ fontSize: 12, color: '#fa8c16', marginTop: 2 }}>
                    赛绩：{selectedProfile.achievement}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>

      <Card
        title={<span style={sectionTitleStyle}>资产信息</span>}
        variant="borderless"
        styles={{ body: { padding: '16px 24px 24px' } }}
        style={{ ...cardStyle, marginBottom: 16 }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ fontSize: 13, color: '#595959', marginBottom: 6 }}>
              资产名称 <span style={{ color: '#ff4d4f' }}>*</span>
            </div>
            <Input
              placeholder="请输入资产名称"
              value={formValues.name}
              onChange={(e) => updateField('name', e.target.value)}
            />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ fontSize: 13, color: '#595959' }}>资产描述</div>
              <Button type="link" size="small" onClick={() => {
                const nm = formValues.name || selectedProfile?.name || '';
                const br = selectedProfile?.breed || '';
                const ach = selectedProfile?.achievement || '';
                const base = `${nm}${br ? '，' + br + '品系' : ''}。血统纯正，遗传稳定。`;
                const txt = base + (ach ? '曾获得' + ach + '。' : '');
                updateField('description', txt.slice(0, 200));
              }}>✨ 生成描述</Button>
            </div>
            <Input.TextArea
              rows={3}
              maxLength={200}
              placeholder="请输入资产描述（最多200字）"
              value={formValues.description}
              onChange={(e) => updateField('description', e.target.value)}
              showCount
              style={{ resize: 'none', minHeight: 72, maxHeight: 160 }}
            />
          </div>
        </div>
      </Card>

      <Card
        title={<span style={sectionTitleStyle}>资产图片 <span style={{ color: '#ff4d4f' }}>*</span></span>}
        variant="borderless"
        styles={{ body: { padding: '16px 24px 24px' } }}
        style={{ ...cardStyle, marginBottom: 16 }}
      >
        <ImageUploader
          value={formValues.image_url}
          onChange={(url) => updateField('image_url', url)}
          maxCount={5}
        />
        <p style={{ color: '#999', fontSize: 12, marginTop: 8, marginBottom: 0 }}>
          支持 JPG / PNG / WEBP，单张 ≤ 5MB；主图为第一张，可上传 3-5 张细节图。
        </p>
      </Card>

      <Card
        title={<span style={sectionTitleStyle}>遗传数据</span>}
        variant="borderless"
        styles={{ body: { padding: '16px 24px 24px' } }}
        style={{ ...cardStyle, marginBottom: 16 }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
          {selectedProfile ? (
            [
              ['品系', selectedProfile.breed],
              ['羽色', selectedProfile.color],
              ['眼砂', selectedProfile.eye_color],
              ['性别', GENDER_MAP[selectedProfile.gender]],
              ['赛绩', selectedProfile.achievement],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px dashed #f0f0f0' }}>
                <span style={{ color: '#8c8c8c' }}>{k}</span>
                <span style={{ color: '#1f1f1f', fontWeight: 500 }}>{v || '—'}</span>
              </div>
            ))
          ) : (
            <div style={{ color: '#999', padding: '12px 0', textAlign: 'center' }}>请先选择关联基因档案</div>
          )}
        </div>
      </Card>

      <Card
        title={<span style={sectionTitleStyle}>高级设置</span>}
        variant="borderless"
        styles={{ body: { padding: '16px 24px 24px' } }}
        style={{ ...cardStyle, marginBottom: 16 }}
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <div style={{ fontSize: 13, color: '#595959' }}>
            持有者 <Tag color="blue" style={{ marginLeft: 8 }}>来自基因档案</Tag>
            <Button type="link" size="small" style={{ marginLeft: 8 }} onClick={() => updateField('ownerEditable', !formValues.ownerEditable)}>
              {formValues.ownerEditable ? '恢复默认' : '修改'}
            </Button>
          </div>
          {formValues.ownerEditable ? (
            <Input
              placeholder="请输入持有者名称"
              value={formValues.owner_name}
              onChange={(e) => updateField('owner_name', e.target.value)}
            />
          ) : (
            <div style={{ padding: '8px 12px', background: '#fafafa', borderRadius: 4, border: '1px solid #f0f0f0', color: '#1f1f1f' }}>
              {formValues.owner_name || <span style={{ color: '#999' }}>（未选择基因档案）</span>}
            </div>
          )}
          <div style={{ fontSize: 13, color: '#595959', marginTop: 8 }}>自定义属性（将自动合并到链上元数据）</div>
          <CustomAttrList
            value={formValues.customAttrs}
            onChange={(list) => updateField('customAttrs', list)}
          />
        </Space>
      </Card>
    </>
  );

  return (
    <div style={{ padding: 16 }}>
      <div
        style={{
          display: 'flex',
          gap: 16,
          flexDirection: isWide ? 'row' : 'column',
        }}
      >
        <div style={isWide ? { flex: '0 0 calc(60% - 8px)' } : { flex: 1 }}>
          {formContent}
        </div>
        <div style={isWide ? { flex: '0 0 calc(40% - 8px)', position: 'sticky', top: 16, alignSelf: 'flex-start' } : { flex: 1 }}>
          <NftMintPreview
            photo_url={photoUrl}
            name={formValues.name}
            breed={selectedProfile?.breed}
            achievement={selectedProfile?.achievement}
            owner_name={formValues.owner_name || selectedProfile?.owner_name}
          />
        </div>
      </div>

      <div
        style={{
          marginTop: 16,
          padding: '12px 16px',
          background: '#fafafa',
          borderRadius: 8,
          border: '1px solid #f0f0f0',
          textAlign: 'right',
          position: 'sticky',
          bottom: 0,
          zIndex: 10,
        }}
      >
        <Space>
          <Button onClick={onCancel}>取消</Button>
          <Button onClick={() => onSubmit(buildSubmitPayload(), 'draft')}>保存草稿</Button>
          <Button type="primary" onClick={() => onSubmit(buildSubmitPayload(), 'audit')}>
            提交上链审核
          </Button>
        </Space>
      </div>
    </div>
  );
};

export default NftMintForm;
