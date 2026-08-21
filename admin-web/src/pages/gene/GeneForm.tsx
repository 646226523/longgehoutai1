import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  App,
  Form,
  Input,
  AutoComplete,
  Radio,
  DatePicker,
  Button,
  Card,
  Row,
  Col,
  Space,
} from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import ImageUploader from '../../components/ImageUploader';
import GeneFormPreview from './GeneFormPreview';
import SearchSelect from '../../components/SearchSelect';

import {
  checkRingNumber,
  searchOwners,
  searchGeneProfiles,
  getGeneDicts,
  type GeneProfile,
  type GeneProfileCreateParams,
  type GeneDicts,
  type OwnerOption,
  type GeneProfileOption,
} from '../../services/gene';

const { TextArea } = Input;

const RING_NUMBER_PATTERN = /^[A-Za-z]{2,3}-\d{4}(-[A-Za-z0-9]+){1,3}$/;

interface SearchSelectOption {
  value: string | number;
  label: string;
  phone?: string;
  [key: string]: unknown;
}

interface GeneFormProps {
  initialData?: Partial<GeneProfile>;
  onCancel: () => void;
  onSubmit: (values: GeneProfileCreateParams, mode: 'confirm' | 'save-new') => Promise<void>;
}

type FormValues = Record<string, any>;

const GENDER_FALLBACK = [
  { label: '雄', value: 'male' },
  { label: '雌', value: 'female' },
  { label: '未知', value: 'unknown' },
];

const STATUS_FALLBACK = [
  { label: '正常', value: 1 },
  { label: '停用', value: 0 },
];

const COLOR_FALLBACK = ['灰', '雨点', '白', '红轮', '花', '石板', '其他'];
const EYE_COLOR_FALLBACK = ['黄眼', '砂眼', '牛眼'];
const BREED_FALLBACK: string[] = [];
const BLOODLINE_FALLBACK: string[] = [];

const GeneForm: React.FC<GeneFormProps> = ({
  initialData,
  onCancel,
  onSubmit,
}) => {
  const { message } = App.useApp();
  const isEditMode = !!initialData?.id;

  const [isWide, setIsWide] = useState(window.innerWidth >= 1920);

  const [formValues, setFormValues] = useState<FormValues>({
    ring_number: initialData?.ring_number || '',
    name: initialData?.name || '',
    gender: initialData?.gender || 'male',
    breed: initialData?.breed || '',
    bloodline: initialData?.bloodline || '',
    color: initialData?.color || undefined,
    eye_color: initialData?.eye_color || undefined,
    owner_id: (initialData as Record<string, any>)?.owner_id ?? null,
    owner_name: initialData?.owner_name || '',
    owner_phone: initialData?.owner_phone || '',
    birth_date: initialData?.birth_date ? dayjs(initialData.birth_date) : undefined,
    gene_sequence: initialData?.gene_sequence || '',
    photo_url: initialData?.photo_url || undefined,
    status: initialData?.status ?? 1,
    sire_id: (initialData as Record<string, any>)?.sire_id ?? null,
    dam_id: (initialData as Record<string, any>)?.dam_id ?? null,
  });

  const [sireDefaultOptions, setSireDefaultOptions] = useState<SearchSelectOption[]>([]);
  const [damDefaultOptions, setDamDefaultOptions] = useState<SearchSelectOption[]>([]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [ringCheckStatus, setRingCheckStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid' | 'invalid-format'>('idle');
  const [dicts, setDicts] = useState<GeneDicts | null>(null);

  const ringCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleResize = () => setIsWide(window.innerWidth >= 1920);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    getGeneDicts().then(setDicts).catch(() => setDicts(null));
  }, []);

  useEffect(() => {
    if (isEditMode && initialData?.owner_name) {
      searchOwners(initialData.owner_name).then((owners) => {
        const match = owners.find((o) => o.name === initialData.owner_name);
        if (match) {
          setFormValues((prev) => ({
            ...prev,
            owner_id: match.id,
            owner_name: match.name,
            owner_phone: match.phone,
          }));
        }
      });
    }
  }, []);

  useEffect(() => {
    if (isEditMode && initialData) {
      const sireId = (initialData as any).sire_id;
      const damId = (initialData as any).dam_id;
      const sireRing = (initialData as any).sire_ring;
      const sireName = (initialData as any).sire_name;
      const damRing = (initialData as any).dam_ring;
      const damName = (initialData as any).dam_name;

      if (sireId && (sireRing || sireName)) {
        setSireDefaultOptions([
          {
            value: sireId,
            label: `${sireRing || ''} ${sireName || ''}`.trim(),
          },
        ]);
      }
      if (damId && (damRing || damName)) {
        setDamDefaultOptions([
          {
            value: damId,
            label: `${damRing || ''} ${damName || ''}`.trim(),
          },
        ]);
      }
    }
  }, [isEditMode, initialData]);

  const updateField = useCallback((key: string, value: any) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const validateRingNumberFormat = useCallback((val: string): string | null => {
    if (!val) return '请输入足环号';
    if (!RING_NUMBER_PATTERN.test(val)) return '格式错误,应为 XX-XXXX-XXX 或 XX-XXXX-XX-XXXX 格式';
    return null;
  }, []);

  const handleRingNumberChange = useCallback((val: string) => {
    updateField('ring_number', val);
    setErrors((prev) => ({ ...prev, ring_number: '' }));
    setRingCheckStatus('idle');

    const formatErr = validateRingNumberFormat(val);
    if (formatErr) {
      setErrors((prev) => ({ ...prev, ring_number: formatErr }));
      setRingCheckStatus('invalid-format');
      return;
    }

    if (isEditMode) return;

    if (ringCheckTimer.current) clearTimeout(ringCheckTimer.current);
    setRingCheckStatus('checking');

    ringCheckTimer.current = setTimeout(async () => {
      try {
        const res = await checkRingNumber(val);
        if (res.exists) {
          setErrors((prev) => ({ ...prev, ring_number: '该足环号已存在' }));
          setRingCheckStatus('invalid');
        } else {
          setRingCheckStatus('valid');
        }
      } catch {
        setRingCheckStatus('idle');
      }
    }, 1000);
  }, [isEditMode, validateRingNumberFormat, updateField]);

  const handleOwnerSearch = useCallback(async (keyword: string): Promise<SearchSelectOption[]> => {
    const owners = await searchOwners(keyword);
    return owners.map((o: OwnerOption) => ({
      value: o.id,
      label: o.name,
      phone: o.phone,
    }));
  }, []);

  const handleOwnerChange = useCallback((value: string | number | null | undefined, option?: SearchSelectOption) => {
    if (value === undefined || value === null) {
      setFormValues((prev) => ({
        ...prev,
        owner_id: null,
        owner_name: '',
        owner_phone: '',
      }));
      return;
    }

    const strValue = String(value);
    const isExistingOwner = !!option;

    if (isExistingOwner) {
      setFormValues((prev) => ({
        ...prev,
        owner_id: option!.value as number,
        owner_name: option!.label,
        owner_phone: (option!.phone as string) || '',
      }));
    } else {
      setFormValues((prev) => ({
        ...prev,
        owner_id: null,
        owner_name: strValue,
        owner_phone: '',
      }));
    }
    setErrors((prev) => ({ ...prev, owner_name: '' }));
  }, []);

  const handleSireDamSearch = useCallback(async (keyword: string, gender?: string): Promise<SearchSelectOption[]> => {
    const profiles = await searchGeneProfiles(keyword, gender);
    const seen = new Set<string>();
    return profiles
      .filter((p: GeneProfileOption) => !isEditMode || p.id !== initialData?.id)
      .map((p: GeneProfileOption) => ({
        value: p.id,
        label: `${p.ring_number} ${p.name}`.trim(),
      }))
      .filter((o) => {
        const key = String(o.value);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [isEditMode, initialData?.id]);

  const handleSireSearch = useCallback((keyword: string) => handleSireDamSearch(keyword, 'male'), [handleSireDamSearch]);
  const handleDamSearch = useCallback((keyword: string) => handleSireDamSearch(keyword, 'female'), [handleSireDamSearch]);

  const handleSubmit = useCallback(async (mode: 'confirm' | 'save-new') => {
    const newErrors: Record<string, string> = {};

    if (!formValues.ring_number) newErrors.ring_number = '请输入足环号';
    else if (!RING_NUMBER_PATTERN.test(formValues.ring_number)) newErrors.ring_number = '格式错误,应为 XX-XXXX-XXX 或 XX-XXXX-XX-XXXX 格式';
    else if (ringCheckStatus === 'invalid') newErrors.ring_number = '该足环号已存在';

    if (!formValues.name) newErrors.name = '请输入鸽名';
    if (!formValues.owner_name) newErrors.owner_name = '请选择鸽主';

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      message.warning('请检查表单必填项');
      return;
    }

    const submitValues: GeneProfileCreateParams = {
      ring_number: formValues.ring_number,
      name: formValues.name,
      gender: formValues.gender,
      breed: formValues.breed,
      bloodline: formValues.bloodline,
      owner_name: formValues.owner_name,
      owner_phone: formValues.owner_phone,
      color: formValues.color,
      eye_color: formValues.eye_color,
      birth_date: formValues.birth_date
        ? dayjs(formValues.birth_date).format('YYYY-MM-DD')
        : undefined,
      gene_sequence: formValues.gene_sequence,
      photo_url: formValues.photo_url,
      status: formValues.status,
      sire_id: formValues.sire_id || null,
      dam_id: formValues.dam_id || null,
    };

    await onSubmit(submitValues, mode);
  }, [formValues, ringCheckStatus, message, onSubmit]);

  const genderOptions = dicts?.genders?.length ? dicts.genders : GENDER_FALLBACK;
  const statusOptions = dicts?.statuses?.length ? dicts.statuses : STATUS_FALLBACK;

  const previewData = {
    ring_number: formValues.ring_number,
    name: formValues.name,
    breed: formValues.breed,
    bloodline: formValues.bloodline,
    owner_name: formValues.owner_name,
    photo_url: formValues.photo_url,
  };

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

  const formContent = (
    <Form layout="vertical">
      <Card
        title={<span style={sectionTitleStyle}>基础信息 {!isEditMode && <span style={{ color: '#ff4d4f' }}>*</span>}</span>}
        variant="borderless"
        styles={{ body: { padding: '16px 24px 24px' } }}
        style={{ ...cardStyle, marginBottom: 16 }}
      >
          <Row gutter={16}>
            <Col xs={24} lg={12}>
              <Form.Item
                label="足环号"
                validateStatus={errors.ring_number ? 'error' : ''}
                help={errors.ring_number || (ringCheckStatus === 'checking' ? '校验中...' : undefined)}
                required
              >
                <Input
                  value={formValues.ring_number}
                  onChange={(e) => handleRingNumberChange(e.target.value)}
                  placeholder="CN-XXXX-XX-XXXXXX"
                  disabled={isEditMode}
                  status={ringCheckStatus === 'invalid' || ringCheckStatus === 'invalid-format' ? 'error' : undefined}
                />
              </Form.Item>
            </Col>
            <Col xs={24} lg={12}>
              <Form.Item
                label="鸽名"
                validateStatus={errors.name ? 'error' : ''}
                help={errors.name}
                required
              >
                <Input
                  value={formValues.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="请输入鸽名"
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24} lg={12}>
              <Form.Item label="性别">
                <Radio.Group
                  value={formValues.gender}
                  onChange={(e) => updateField('gender', e.target.value)}
                >
                  {genderOptions.map((g) => (
                    <Radio key={g.value} value={g.value}>
                      {g.label}
                    </Radio>
                  ))}
                </Radio.Group>
              </Form.Item>
            </Col>
            <Col xs={24} lg={12}>
              <Form.Item label="品种">
                <AutoComplete
                  value={formValues.breed}
                  onChange={(val) => updateField('breed', val)}
                  options={((dicts?.breeds ?? BREED_FALLBACK)).map((b) => ({ value: b }))}
                  placeholder="请输入或选择品种"
                  filterOption={(inputValue, option) =>
                    option!.value.toUpperCase().includes(inputValue.toUpperCase())
                  }
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24}>
              <Form.Item label="血统">
                <AutoComplete
                  value={formValues.bloodline}
                  onChange={(val) => updateField('bloodline', val)}
                  options={((dicts?.bloodlines ?? BLOODLINE_FALLBACK)).map((b) => ({ value: b }))}
                  placeholder="请输入或选择血统"
                  filterOption={(inputValue, option) =>
                    option!.value.toUpperCase().includes(inputValue.toUpperCase())
                  }
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
          </Row>
      </Card>

      <Card
        title={<span style={sectionTitleStyle}>外观特征</span>}
        variant="borderless"
        styles={{ body: { padding: '16px 24px 24px' } }}
        style={{ ...cardStyle, marginBottom: 16 }}
      >
          <Row gutter={16}>
            <Col xs={24} lg={12}>
              <Form.Item label="羽色">
                <select
                  value={formValues.color || ''}
                  onChange={(e) => updateField('color', e.target.value || undefined)}
                  style={{
                    width: '100%',
                    height: 32,
                    padding: '4px 11px',
                    border: '1px solid #d9d9d9',
                    borderRadius: 6,
                    outline: 'none',
                    backgroundColor: '#fff',
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                >
                  <option value="">请选择羽色</option>
                  {COLOR_FALLBACK.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </Form.Item>
            </Col>
            <Col xs={24} lg={12}>
              <Form.Item label="眼砂">
                <select
                  value={formValues.eye_color || ''}
                  onChange={(e) => updateField('eye_color', e.target.value || undefined)}
                  style={{
                    width: '100%',
                    height: 32,
                    padding: '4px 11px',
                    border: '1px solid #d9d9d9',
                    borderRadius: 6,
                    outline: 'none',
                    backgroundColor: '#fff',
                    fontSize: 14,
                    cursor: 'pointer',
                  }}
                >
                  <option value="">请选择眼砂</option>
                  {EYE_COLOR_FALLBACK.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </Form.Item>
            </Col>
          </Row>
      </Card>

      <Card
        title={<span style={sectionTitleStyle}>鸽主信息</span>}
        variant="borderless"
        styles={{ body: { padding: '16px 24px 24px' } }}
        style={{ ...cardStyle, marginBottom: 16 }}
      >
          <Row gutter={16}>
            <Col xs={24} lg={12}>
              <Form.Item
                label="鸽主姓名"
                validateStatus={errors.owner_name ? 'error' : ''}
                help={errors.owner_name}
                required
              >
                <SearchSelect
                  value={formValues.owner_id ?? formValues.owner_name ?? undefined}
                  onChange={handleOwnerChange}
                  onSearch={handleOwnerSearch}
                  allowCreate
                  placeholder="搜索或输入鸽主姓名"
                  optionLabel={(o) => {
                    const phone = o.phone as string | undefined;
                    return (
                      <span>
                        {o.label}
                        {phone && (
                          <span style={{ color: '#999', marginLeft: 8, fontSize: 12 }}>
                            {phone}
                          </span>
                        )}
                      </span>
                    );
                  }}
                />
              </Form.Item>
            </Col>
            <Col xs={24} lg={12}>
              <Form.Item label="鸽主电话">
                <Input
                  value={formValues.owner_phone}
                  placeholder={formValues.owner_id ? '选择鸽主后自动填充' : '请输入鸽主电话'}
                  disabled={!!formValues.owner_id}
                  onChange={(e) => updateField('owner_phone', e.target.value)}
                />
              </Form.Item>
            </Col>
          </Row>
      </Card>

      <Card
        title={<span style={sectionTitleStyle}>遗传数据</span>}
        variant="borderless"
        styles={{ body: { padding: '16px 24px 24px' } }}
        style={{ ...cardStyle, marginBottom: 16 }}
      >
          <Row gutter={16}>
            <Col xs={24} lg={12}>
              <Form.Item label="出生日期">
                <DatePicker
                  value={formValues.birth_date as Dayjs | undefined}
                  onChange={(d) => updateField('birth_date', d)}
                  style={{ width: '100%' }}
                  placeholder="请选择出生日期"
                  disabledDate={(current) => current && current > dayjs()}
                />
              </Form.Item>
            </Col>
            <Col xs={24} lg={12}>
              <Form.Item label="照片">
                <ImageUploader
                  value={formValues.photo_url}
                  onChange={(url) => updateField('photo_url', url)}
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col xs={24}>
              <Form.Item label="基因序列">
                <TextArea
                  value={formValues.gene_sequence}
                  onChange={(e) => updateField('gene_sequence', e.target.value)}
                  placeholder="请输入基因序列数据"
                  autoSize={{ minRows: 3, maxRows: 8 }}
                />
              </Form.Item>
            </Col>
          </Row>
      </Card>

      <Card
        title={<span style={sectionTitleStyle}>亲子关系</span>}
        variant="borderless"
        styles={{ body: { padding: '16px 24px 24px' } }}
        style={{ ...cardStyle, marginBottom: 16 }}
      >
          <Row gutter={16}>
            <Col xs={24} lg={12}>
              <Form.Item label="父鸽">
                <SearchSelect
                  mode="tags"
                  value={formValues.sire_id ?? undefined}
                  onChange={(val, option) => {
                    if (val === undefined) {
                      updateField('sire_id', null);
                    } else if (option) {
                      updateField('sire_id', val);
                    } else {
                      updateField('sire_id', String(val));
                    }
                  }}
                  onSearch={handleSireSearch}
                  placeholder="搜索并选择父鸽，或输入新鸽名"
                  defaultOptions={sireDefaultOptions}
                />
              </Form.Item>
            </Col>
            <Col xs={24} lg={12}>
              <Form.Item label="母鸽">
                <SearchSelect
                  mode="tags"
                  value={formValues.dam_id ?? undefined}
                  onChange={(val, option) => {
                    if (val === undefined) {
                      updateField('dam_id', null);
                    } else if (option) {
                      updateField('dam_id', val);
                    } else {
                      updateField('dam_id', String(val));
                    }
                  }}
                  onSearch={handleDamSearch}
                  placeholder="搜索并选择母鸽，或输入新鸽名"
                  defaultOptions={damDefaultOptions}
                />
              </Form.Item>
            </Col>
          </Row>
      </Card>

      <Card
        title={<span style={sectionTitleStyle}>档案状态</span>}
        variant="borderless"
        styles={{ body: { padding: '16px 24px 24px' } }}
        style={{ ...cardStyle, marginBottom: 16 }}
      >
          <Form.Item label="状态">
            <Radio.Group
              value={formValues.status}
              onChange={(e) => updateField('status', e.target.value)}
            >
              {statusOptions.map((s) => (
                <Radio key={s.value} value={s.value}>
                  {s.label}
                </Radio>
              ))}
            </Radio.Group>
          </Form.Item>
      </Card>
    </Form>
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
          <GeneFormPreview formData={previewData} />
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
          <Button onClick={() => handleSubmit('save-new')}>保存并新增下一个</Button>
          <Button type="primary" onClick={() => handleSubmit('confirm')}>
            确定
          </Button>
        </Space>
      </div>
    </div>
  );
};

export default GeneForm;