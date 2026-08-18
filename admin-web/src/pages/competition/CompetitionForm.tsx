import React, { useState, useEffect, useMemo } from 'react';
import {
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Button,
  Card,
  Row,
  Col,
  Space,
  Tag,
  App,
  Divider,
  Alert,
  Tooltip,
  Switch,
  Modal,
} from 'antd';
import {
  EnvironmentOutlined,
  PhoneOutlined,
  AimOutlined,
  DragOutlined,
  DeleteOutlined,
  EditOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import MapSelector from '../../components/MapSelector';
import { CITY_COORDINATES } from '../../data/city-coordinates';
import { Point, calculateDistance, calculateRouteDistance, estimateFlightTime, isSamePoint, isInChina } from '../../utils/geo';
import {
  createCompetition,
  updateCompetition,
  type CompetitionItem,
  type CompetitionCreateParams,
  type CompetitionUpdateParams,
} from '../../services/competition';

const { TextArea } = Input;
const { RangePicker } = DatePicker;

interface CompetitionFormProps {
  record?: CompetitionItem | null;
  onCancel: () => void;
  onSuccess: () => void;
}

const CompetitionForm: React.FC<CompetitionFormProps> = ({ record, onCancel, onSuccess }) => {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [endPoint, setEndPoint] = useState<Point | null>(null);
  const [waypoints, setWaypoints] = useState<Point[]>([]);
  const [startAddress, setStartAddress] = useState('');
  const [endAddress, setEndAddress] = useState('');
  const [distanceOverridden, setDistanceOverridden] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitErrors, setSubmitErrors] = useState<string[]>([]);
  const [showErrorModal, setShowErrorModal] = useState(false);

  const isEdit = !!record;

  const syncWaypointCoordinates = (index: number, key: 'lng' | 'lat', value: number) => {
    setWaypoints((currentWaypoints) => {
      const newWps = [...currentWaypoints];
      newWps[index] = { ...newWps[index], [key]: value };
      return newWps;
    });
  };

  useEffect(() => {
    if (!record) return;

    const initialStart =
      record.start_lng != null && record.start_lat != null
        ? { lng: record.start_lng, lat: record.start_lat }
        : null;
    const initialEnd =
      record.end_lng != null && record.end_lat != null
        ? { lng: record.end_lng, lat: record.end_lat }
        : null;
    let initialWaypoints: Point[] = [];

    const normalizeWaypoints = (value: unknown): Point[] => {
      if (!Array.isArray(value)) return [];
      return value.filter(
        (point): point is Point => typeof point?.lng === 'number' && typeof point?.lat === 'number'
      );
    };

    const parseRouteGeoJSON = (value: string | null | undefined): Point[] => {
      if (!value) return [];
      try {
        const parsed = JSON.parse(value);
        const coordinates =
          parsed?.type === 'LineString'
            ? parsed.coordinates
            : parsed?.type === 'FeatureCollection'
              ? parsed.features?.find((feature: any) => feature?.geometry?.type === 'LineString')
                  ?.geometry?.coordinates
              : null;
        if (!Array.isArray(coordinates)) return [];
        return coordinates
          .map((item) => ({ lng: item?.[0], lat: item?.[1] }))
          .filter((point): point is Point => typeof point.lng === 'number' && typeof point.lat === 'number')
          .slice(1, -1);
      } catch {
        return [];
      }
    };

    const parseWaypointsValue = (value: string | null | undefined): Point[] => {
      if (!value) return [];
      try {
        const parsed = JSON.parse(value);
        return normalizeWaypoints(parsed);
      } catch {
        return [];
      }
    };

    initialWaypoints = parseWaypointsValue(record.waypoints);
    if (initialWaypoints.length === 0) {
      initialWaypoints = parseRouteGeoJSON(record.route_geojson);
    }

    setStartPoint(initialStart);
    setEndPoint(initialEnd);
    setWaypoints(initialWaypoints);
    setStartAddress(record.start_address || '');
    setEndAddress(record.end_address || '');

    const calculatedDistance =
      initialStart && initialEnd
        ? calculateRouteDistance(initialStart, initialWaypoints, initialEnd)
        : 0;
    const hasManualDistance =
      record.distance != null &&
      calculatedDistance > 0 &&
      Math.abs(record.distance - calculatedDistance) > 0.01;

    setDistanceOverridden(hasManualDistance);
    form.setFieldsValue({
      name: record.name,
      type: record.type || undefined,
      status: record.status || undefined,
      organizer: record.organizer || undefined,
      contact_phone: record.contact_phone || undefined,
      distance: record.distance ?? undefined,
      description: record.description || undefined,
      time_range:
        record.start_time && record.end_time
          ? [dayjs(record.start_time), dayjs(record.end_time)]
          : undefined,
    });
  }, [form, record]);

  const autoDistance = useMemo(() => {
    if (!startPoint || !endPoint || isSamePoint(startPoint, endPoint)) return 0;

    try {
      const distance = calculateRouteDistance(startPoint, waypoints, endPoint);
      return Number.isFinite(distance) && distance > 0 ? distance : 0;
    } catch {
      return 0;
    }
  }, [startPoint, endPoint, waypoints]);

  useEffect(() => {
    if (!distanceOverridden && autoDistance > 0) {
      form.setFieldValue('distance', Number(autoDistance.toFixed(2)));
    }
  }, [autoDistance, distanceOverridden, form]);

  const manualDistance = Form.useWatch('distance', form);
  const effectiveDistance =
    distanceOverridden && typeof manualDistance === 'number' && Number.isFinite(manualDistance)
      ? manualDistance
      : autoDistance;
  const flightHours = effectiveDistance > 0 ? estimateFlightTime(effectiveDistance) : 0;

  const routeCities = useMemo(() => {
    if (!startPoint || !endPoint) return [];

    const nearestCityName = (point: Point) => {
      let nearestName = '';
      let nearestDistance = Number.POSITIVE_INFINITY;
      for (const city of CITY_COORDINATES) {
        const distance = calculateDistance(point, city);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestName = city.name;
        }
      }
      return nearestDistance <= 100 ? nearestName : `${point.lng.toFixed(2)}, ${point.lat.toFixed(2)}`;
    };

    const cities = [
      startAddress || nearestCityName(startPoint),
      ...waypoints.map(nearestCityName),
      endAddress || nearestCityName(endPoint),
    ];
    return cities.filter((city, index) => city && city !== cities[index - 1]);
  }, [endAddress, endPoint, startAddress, startPoint, waypoints]);

  const routeWarning = useMemo(() => {
    if (!startPoint || !endPoint) return '';
    if (isSamePoint(startPoint, endPoint)) {
      return '起点与终点不能相同，请重新选择';
    }
    if (!isInChina(startPoint.lng, startPoint.lat)) {
      return '起点坐标超出中国范围';
    }
    if (!isInChina(endPoint.lng, endPoint.lat)) {
      return '终点坐标超出中国范围';
    }
    const invalidWaypointIndex = waypoints.findIndex(
      (point) => !isInChina(point.lng, point.lat)
    );
    if (invalidWaypointIndex >= 0) {
      return `中途点${invalidWaypointIndex + 1}坐标超出中国范围`;
    }
    if (autoDistance <= 0) {
      return '赛线空距计算异常，请检查坐标';
    }
    return '';
  }, [autoDistance, endPoint, startPoint, waypoints]);

  // 构建 GeoJSON 路线
  const buildRouteGeoJSON = (): string => {
    const coordinates: number[][] = [];
    if (startPoint) coordinates.push([startPoint.lng, startPoint.lat]);
    waypoints.forEach((wp) => coordinates.push([wp.lng, wp.lat]));
    if (endPoint) coordinates.push([endPoint.lng, endPoint.lat]);

    const geojson = {
      type: 'LineString',
      coordinates,
    };
    return JSON.stringify(geojson);
  };

  // 提交前汇总全部校验问题（一次列出，便于后台工作人员定位）
  const collectIssues = (): string[] => {
    const issues: string[] = [];
    const nameValue = form.getFieldValue('name');
    if (!nameValue || !String(nameValue).trim()) {
      issues.push('赛事名称：未填写，请输入赛事名称');
    }
    if (!startPoint) {
      issues.push('起点（司放地）：未选择，请在地图搜索框输入地址或点击地图选择起点');
    }
    if (!endPoint) {
      issues.push('终点（归巢地）：未选择，请在地图搜索框输入地址或点击地图选择终点');
    }
    if (startPoint && endPoint && routeWarning) {
      issues.push(routeWarning);
    }
    if (distanceOverridden) {
      const distance = form.getFieldValue('distance');
      if (typeof distance !== 'number' || !Number.isFinite(distance) || distance <= 0) {
        issues.push('手动空距：未填写或无效，请输入大于 0 的空距值');
      }
    }
    return issues;
  };

  // 处理提交
  const handleSubmit = async () => {
    // 先触发表单内联校验（高亮有误字段）
    let values: any;
    try {
      values = await form.validateFields();
    } catch {
      // 内联校验错误已由表单自动展示，继续收集汇总问题以弹窗提示
    }

    const issues = collectIssues();
    if (issues.length > 0) {
      setSubmitErrors(Array.from(new Set(issues)));
      setShowErrorModal(true);
      return;
    }

    // 兜底防御（正常情况下 collectIssues 已覆盖）
    if (routeWarning) {
      message.error(routeWarning);
      return;
    }

    setSubmitting(true);
    try {
      // ===== 以下保持原有提交逻辑不变 =====
      const timeRange = values.time_range;
      const distance = distanceOverridden ? values.distance : autoDistance;

      const payload: CompetitionCreateParams & CompetitionUpdateParams = {
        name: values.name,
        type: values.type,
        status: values.status,
        organizer: values.organizer,
        contact_phone: values.contact_phone,
        start_time: timeRange ? timeRange[0].valueOf() : undefined,
        end_time: timeRange ? timeRange[1].valueOf() : undefined,
        distance: distance ?? undefined,
        description: values.description,
        location: startAddress && endAddress ? `${startAddress} → ${endAddress}` : values.location,
        start_lng: startPoint?.lng,
        start_lat: startPoint?.lat,
        start_address: startAddress || undefined,
        end_lng: endPoint?.lng,
        end_lat: endPoint?.lat,
        end_address: endAddress || undefined,
        waypoints: waypoints.length > 0 ? JSON.stringify(waypoints) : undefined,
        route_geojson: startPoint && endPoint ? buildRouteGeoJSON() : undefined,
      };

      if (isEdit && record) {
        await updateCompetition(record.id, payload);
        message.success('更新成功');
      } else {
        await createCompetition(payload as CompetitionCreateParams);
        message.success('新增成功');
      }
      onSuccess();
    } finally {
      // 无论成功或失败（后端错误由 request.ts 拦截器统一提示），都复位提交按钮
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '0 0 24px' }}>
      <Form
        form={form}
        layout="vertical"
        requiredMark
        style={{ maxWidth: '100%' }}
        initialValues={{
          type: 'autumn',
        }}
      >
        <Row gutter={24}>
          {/* 左侧：基本信息表单 */}
          <Col xs={24} lg={12} xl={11}>
            {/* 基本信息 */}
            <Card
              title={
                <Space>
                  <EditOutlined />
                  <span>基本信息</span>
                </Space>
              }
              style={{ marginBottom: 16 }}
              size="small"
            >
              <Form.Item
                label="赛事名称"
                name="name"
                rules={[{ required: true, message: '请输入赛事名称' }]}
              >
                <Input placeholder="请输入赛事名称" />
              </Form.Item>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="赛事类型" name="type">
                    <Select
                      placeholder="请选择赛事类型"
                      options={[
                        { label: '春赛', value: 'spring' },
                        { label: '秋赛', value: 'autumn' },
                        { label: '特比环', value: 'boiler' },
                        { label: '公棚赛', value: 'pigeon_loft' },
                      ]}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="状态" name="status">
                    <Select
                      placeholder="请选择状态"
                      options={[
                        { label: '草稿', value: 'draft' },
                        { label: '报名中', value: 'enrolling' },
                      ]}
                      allowClear
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="主办方" name="organizer">
                    <Input placeholder="请输入主办方" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label={
                      <span>
                        <PhoneOutlined /> 联系电话
                      </span>
                    }
                    name="contact_phone"
                  >
                    <Input placeholder="请输入联系电话" />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item label="比赛时间" name="time_range">
                <RangePicker
                  showTime={{ format: 'HH:mm' }}
                  format="YYYY-MM-DD HH:mm"
                  style={{ width: '100%' }}
                  placeholder={['开始时间', '结束时间']}
                />
              </Form.Item>
            </Card>

            {/* 赛线设定 */}
            <Card
              title={
                <Space>
                  <AimOutlined style={{ color: '#52c41a' }} />
                  <span>赛线设定</span>
                  <Tag color="green">核心</Tag>
                </Space>
              }
              style={{ marginBottom: 16 }}
              size="small"
            >
              {/* 起点 */}
              <div
                style={{
                  padding: 12,
                  background: '#f6ffed',
                  borderRadius: 8,
                  marginBottom: 12,
                  border: '1px solid #b7eb8f',
                }}
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Tag color="green" style={{ marginRight: 8 }}>
                      <EnvironmentOutlined /> 起点（司放地）
                    </Tag>
                    {startPoint && (
                      <Tooltip title="点击清除起点">
                        <Button
                          type="link"
                          size="small"
                          danger
                          onClick={() => {
                            setStartPoint(null);
                            setStartAddress('');
                          }}
                        >
                          清除
                        </Button>
                      </Tooltip>
                    )}
                  </div>
                  {startPoint ? (
                    <>
                      <Input
                        value={startAddress}
                        placeholder="起点地址"
                        onChange={(e) => setStartAddress(e.target.value)}
                        prefix={<EnvironmentOutlined style={{ color: '#52c41a' }} />}
                      />
                      <Row gutter={12}>
                        <Col span={12}>
                          <Form.Item label="经度" style={{ marginBottom: 0 }}>
                            <InputNumber
                              value={startPoint.lng}
                              style={{ width: '100%' }}
                              precision={4}
                              step={0.0001}
                              onChange={(v) => {
                                if (v != null) setStartPoint({ ...startPoint, lng: v });
                              }}
                            />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item label="纬度" style={{ marginBottom: 0 }}>
                            <InputNumber
                              value={startPoint.lat}
                              style={{ width: '100%' }}
                              precision={4}
                              step={0.0001}
                              onChange={(v) => {
                                if (v != null) setStartPoint({ ...startPoint, lat: v });
                              }}
                            />
                          </Form.Item>
                        </Col>
                      </Row>
                    </>
                  ) : (
                    <div style={{ color: '#999', fontSize: 13 }}>
                      请在右侧地图选择起点位置 或 使用搜索选点功能
                    </div>
                  )}
                </Space>
              </div>

              {/* 终点 */}
              <div
                style={{
                  padding: 12,
                  background: '#fff1f0',
                  borderRadius: 8,
                  marginBottom: 12,
                  border: '1px solid #ffa39e',
                }}
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <Tag color="red" style={{ marginRight: 8 }}>
                      <EnvironmentOutlined /> 终点（归巢地）
                    </Tag>
                    {endPoint && (
                      <Tooltip title="点击清除终点">
                        <Button
                          type="link"
                          size="small"
                          danger
                          onClick={() => {
                            setEndPoint(null);
                            setEndAddress('');
                          }}
                        >
                          清除
                        </Button>
                      </Tooltip>
                    )}
                  </div>
                  {endPoint ? (
                    <>
                      <Input
                        value={endAddress}
                        placeholder="终点地址"
                        onChange={(e) => setEndAddress(e.target.value)}
                        prefix={<EnvironmentOutlined style={{ color: '#ff4d4f' }} />}
                      />
                      <Row gutter={12}>
                        <Col span={12}>
                          <Form.Item label="经度" style={{ marginBottom: 0 }}>
                            <InputNumber
                              value={endPoint.lng}
                              style={{ width: '100%' }}
                              precision={4}
                              step={0.0001}
                              onChange={(v) => {
                                if (v != null) setEndPoint({ ...endPoint, lng: v });
                              }}
                            />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item label="纬度" style={{ marginBottom: 0 }}>
                            <InputNumber
                              value={endPoint.lat}
                              style={{ width: '100%' }}
                              precision={4}
                              step={0.0001}
                              onChange={(v) => {
                                if (v != null) setEndPoint({ ...endPoint, lat: v });
                              }}
                            />
                          </Form.Item>
                        </Col>
                      </Row>
                    </>
                  ) : (
                    <div style={{ color: '#999', fontSize: 13 }}>
                      请在右侧地图选择终点位置 或 使用搜索选点功能
                    </div>
                  )}
                </Space>
              </div>

              {/* 中途点列表 */}
              {waypoints.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <Divider style={{ margin: '8px 0' }}>
                    <Tag color="blue">中途点</Tag>
                  </Divider>
                  {waypoints.map((wp, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px 12px',
                        background: '#e6f7ff',
                        borderRadius: 6,
                        marginBottom: 6,
                        border: '1px solid #91d5ff',
                      }}
                    >
                      <span
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          background: '#1890ff',
                          color: '#fff',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 8,
                          fontSize: 12,
                        }}
                      >
                        {idx + 1}
                      </span>
                      <InputNumber
                        value={wp.lng}
                        size="small"
                        precision={4}
                        step={0.0001}
                        style={{ width: 100 }}
                        onChange={(v) => {
                          if (v != null) {
                            syncWaypointCoordinates(idx, 'lng', v);
                          }
                        }}
                      />
                      <span style={{ margin: '0 4px', color: '#999' }}>,</span>
                      <InputNumber
                        value={wp.lat}
                        size="small"
                        precision={4}
                        step={0.0001}
                        style={{ width: 100 }}
                        onChange={(v) => {
                          if (v != null) {
                            syncWaypointCoordinates(idx, 'lat', v);
                          }
                        }}
                      />
                      <Space style={{ marginLeft: 8 }}>
                        <Button
                          type="text"
                          size="small"
                          icon={<ArrowUpOutlined />}
                          disabled={idx === 0}
                          onClick={() => {
                            const target = idx - 1;
                            const newWps = [...waypoints];
                            const [current] = newWps.splice(idx, 1);
                            newWps.splice(target, 0, current);
                            setWaypoints(newWps);
                          }}
                        />
                        <Button
                          type="text"
                          size="small"
                          icon={<ArrowDownOutlined />}
                          disabled={idx === waypoints.length - 1}
                          onClick={() => {
                            const target = idx + 1;
                            const newWps = [...waypoints];
                            const [current] = newWps.splice(idx, 1);
                            newWps.splice(target, 0, current);
                            setWaypoints(newWps);
                          }}
                        />
                        <Button
                          type="text"
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => {
                            setWaypoints(waypoints.filter((_, i) => i !== idx));
                          }}
                        />
                      </Space>
                    </div>
                  ))}
                </div>
              )}

              {/* 空距显示 */}
              <div
                style={{
                  padding: 12,
                  background: autoDistance > 0 ? '#f6ffed' : '#f5f5f5',
                  borderRadius: 8,
                  border: autoDistance > 0 ? '1px solid #b7eb8f' : '1px solid #e8e8e8',
                }}
              >
                <Row gutter={16} align="middle">
                  <Col span={autoDistance > 0 ? 12 : 24}>
                    <Space>
                      <span style={{ fontSize: 16 }}>📏</span>
                      <span style={{ fontWeight: 'bold' }}>空距：</span>
                      <span
                        style={{
                          fontSize: 18,
                          fontWeight: 'bold',
                          color: autoDistance > 0 ? '#389e0d' : '#999',
                        }}
                      >
                        {effectiveDistance > 0 ? `${effectiveDistance.toFixed(2)} km` : '待计算'}
                      </span>
                      {autoDistance > 0 && !distanceOverridden && (
                        <Tag color="success">✅ 已自动计算</Tag>
                      )}
                      {distanceOverridden && (
                        <Tag color="warning">⚠️ 已手动覆盖</Tag>
                      )}
                    </Space>
                  </Col>
                  {autoDistance > 0 && (
                    <Col span={12}>
                      <div style={{ color: '#666', fontSize: 13 }}>
                        🕐 预计飞行时间：<strong>{flightHours.toFixed(1)}</strong> 小时
                      </div>
                    </Col>
                  )}
                </Row>
                {autoDistance > 0 && (
                  <Row gutter={8} style={{ marginTop: 8 }}>
                    <Col span={12}>
                      <span style={{ color: '#666', fontSize: 13 }}>
                        空距手动调整：
                        <Switch
                          checked={distanceOverridden}
                          onChange={(checked) => {
                            setDistanceOverridden(checked);
                            if (checked) {
                              form.setFieldValue('distance', Number(autoDistance.toFixed(2)));
                            }
                          }}
                          style={{ marginLeft: 8 }}
                        />
                      </span>
                    </Col>
                    {distanceOverridden && (
                      <Col span={12}>
                        <Form.Item
                          name="distance"
                          noStyle
                          rules={[{ required: true, message: '请输入手动空距' }]}
                        >
                          <Space>
                            <InputNumber
                              placeholder="手动输入空距"
                              style={{ width: '100%' }}
                              min={0}
                              step={0.1}
                            />
                            <span>km</span>
                          </Space>
                        </Form.Item>
                      </Col>
                    )}
                  </Row>
                )}
              </div>
            </Card>

            {/* 规程设置 */}
            <Card
              title={
                <Space>
                  <EditOutlined />
                  <span>规程设置</span>
                </Space>
              }
              size="small"
            >
              <Form.Item label="赛事规程" name="description">
                <TextArea
                  placeholder="请输入赛事规程，如：春季500公里比赛，参赛费100元/羽，奖金10万元..."
                  rows={6}
                  maxLength={2000}
                  showCount
                />
              </Form.Item>
            </Card>
          </Col>

          {/* 右侧：地图区域 */}
          <Col xs={24} lg={12} xl={13}>
            {/* 异常提示 */}
            {routeWarning && (
              <Alert
                type="error"
                message={routeWarning}
                showIcon
                style={{ marginBottom: 12 }}
              />
            )}

            {/* 地图选点组件 */}
            <Card
              title={
                <Space>
                  <AimOutlined style={{ color: '#1890ff' }} />
                  <span>赛线地图</span>
                </Space>
              }
              size="small"
              style={{ marginBottom: 16 }}
              styles={{ body: { padding: 12 } }}
            >
              <MapSelector
                startPoint={startPoint}
                endPoint={endPoint}
                waypoints={waypoints}
                startAddress={startAddress}
                endAddress={endAddress}
                onStartPointChange={(p) => {
                  setStartPoint(p);
                  if (!p) setStartAddress('');
                }}
                onEndPointChange={(p) => {
                  setEndPoint(p);
                  if (!p) setEndAddress('');
                }}
                onWaypointsChange={setWaypoints}
                onStartAddressChange={setStartAddress}
                onEndAddressChange={setEndAddress}
              />
            </Card>

            {/* 赛线分析面板 */}
            <Card
              title={
                <Space>
                  <DragOutlined style={{ color: '#faad14' }} />
                  <span>赛线分析</span>
                </Space>
              }
              size="small"
            >
              <Row gutter={16}>
                <Col span={12}>
                  <div
                    style={{
                      padding: 12,
                      background: autoDistance > 0 ? '#f6ffed' : '#fafafa',
                      borderRadius: 8,
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: 24, fontWeight: 'bold', color: autoDistance > 0 ? '#389e0d' : '#999' }}>
                      {effectiveDistance > 0 ? effectiveDistance.toFixed(2) : '--'}
                      <span style={{ fontSize: 14, color: '#666', marginLeft: 4 }}>km</span>
                    </div>
                    <div style={{ color: '#666', fontSize: 12 }}>总空距</div>
                  </div>
                </Col>
                <Col span={12}>
                  <div
                    style={{
                      padding: 12,
                      background: autoDistance > 0 ? '#e6f7ff' : '#fafafa',
                      borderRadius: 8,
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: 24, fontWeight: 'bold', color: autoDistance > 0 ? '#096dd9' : '#999' }}>
                      {flightHours > 0 ? flightHours.toFixed(1) : '--'}
                      <span style={{ fontSize: 14, color: '#666', marginLeft: 4 }}>小时</span>
                    </div>
                    <div style={{ color: '#666', fontSize: 12 }}>预计飞行时间 (1200m/min)</div>
                  </div>
                </Col>
              </Row>

              {routeCities.length > 0 && (
                <div
                  style={{
                    marginTop: 12,
                    padding: 12,
                    background: '#fffbe6',
                    borderRadius: 8,
                    border: '1px solid #ffe58f',
                  }}
                >
                  <div style={{ marginBottom: 8, fontWeight: 'bold' }}>途经城市</div>
                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    {routeCities.map((city, index) => (
                      <React.Fragment key={`${city}-${index}`}>
                        {index > 0 && <span style={{ color: '#1890ff' }}>→</span>}
                        <Tag color={index === 0 ? 'green' : index === routeCities.length - 1 ? 'red' : 'blue'}>
                          {city}
                        </Tag>
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </Col>
        </Row>

        {/* 底部按钮 */}
        <Divider style={{ margin: '16px 0' }} />
        <div style={{ textAlign: 'right' }}>
          <Space>
            <Button onClick={onCancel}>取消</Button>
            <Button type="primary" loading={submitting} onClick={handleSubmit}>
              {isEdit ? '保存修改' : '确认发布'}
            </Button>
          </Space>
        </div>
      </Form>
      <Modal
        title="提交失败，请完善以下信息"
        open={showErrorModal}
        onOk={() => setShowErrorModal(false)}
        onCancel={() => setShowErrorModal(false)}
        okText="知道了"
        cancelButtonProps={{ style: { display: 'none' } }}
        width={560}
      >
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 12 }}
          message="以下信息存在错误或未填写，请根据提示修正后重新提交："
        />
        <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.9 }}>
          {submitErrors.map((error, index) => (
            <li key={index}>{error}</li>
          ))}
        </ul>
      </Modal>
    </div>
  );
};

export default CompetitionForm;
