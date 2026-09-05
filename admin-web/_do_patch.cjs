const fs = require("fs");
const f = "p:/龙鸽项目/longgehoutai/admin-web/src/pages/detection/Order.tsx";
let s = fs.readFileSync(f, "utf8");

// ====== 1. pro-components import ======
s = s.replace(
  /import \{\s*ProForm,?\s*ProFormDatePicker,?\s*ProFormSelect,?\s*ProFormText,?\s*ProFormTextArea,?\s*ProTable,\s*type ActionType,\s*type ProColumns,\s*type ProFormInstance,\s*\} from '@ant-design\/pro-components';/s,
  "import {\n  ProTable,\n  type ActionType,\n  type ProColumns,\n} from '@ant-design/pro-components';"
);

// ====== 2. antd import 加缺失的 ======
if (!s.includes("Form,")) s = s.replace("Drawer,", "Drawer,\n  Form,");
if (!s.includes("Input,")) s = s.replace("Form,", "Form,\n  Input,");
if (!s.includes("Select,")) s = s.replace("Input,", "Input,\n  Select,");
if (!s.includes("DatePicker,")) s = s.replace("Select,", "Select,\n  DatePicker,");

// ====== 3. formRef + state ======
s = s.replace(
  /const formRef = useRef<ProFormInstance>\(\);/,
  "const [formRef] = Form.useForm();\n\n  // 提交按钮状态\n  const [canSubmit, setCanSubmit] = useState(false);\n  const [submitting, setSubmitting] = useState(false);"
);

// ====== 4. openCreate/openEdit ======
s = s.replace(
  /const openCreate = \(\) => \{[\s\S]*?setDrawerVisible\(true\);[\s\S]*?loadOptions\(\);\s*\};/,
  `const openCreate = () => {
    setEditing(null);
    setCanSubmit(false);
    formRef.resetFields();
    setDrawerVisible(true);
    loadOptions();
  };`
);

s = s.replace(
  /const openEdit = \(record: DetectionOrder\) => \{[\s\S]*?setDrawerVisible\(true\);[\s\S]*?loadOptions\(\);\s*\};/,
  `const openEdit = (record: DetectionOrder) => {
    setEditing(record);
    formRef.setFieldsValue({
      user_name: record.user_name,
      phone: record.phone ?? undefined,
      ring_number: record.ring_number,
      org_id: record.org_id ?? undefined,
      test_org: record.test_org,
      project: record.project,
      scheduled_date: record.scheduled_date ? dayjs(record.scheduled_date) : undefined,
      remark: record.remark ?? undefined,
    });
    setCanSubmit(!!record.user_name && !!record.project);
    setDrawerVisible(true);
    loadOptions();
  };`
);

// ====== 5. Drawer 区域 ======
const startMarker = "      {/* 新增/编辑抽屉 */}";
const endMarker = "      {/* 详情抽屉 - 卡片网格布局 */}";
const startIdx = s.indexOf(startMarker);
const endIdx = s.indexOf(endMarker);
if (startIdx === -1 || endIdx === -1) { console.error("markers not found"); process.exit(1); }

const newDrawer = String.raw`      {/* 新增/编辑抽屉 - 原生 Form + 3 步卡片 */}
      <Drawer
        title={
          <Space>
            <span>{editing ? '编辑预约订单' : '新增预约订单'}</span>
            <Tag color="blue">{editing ? '订单号 ' + editing.order_no : '新建订单'}</Tag>
          </Space>
        }
        open={drawerVisible}
        onClose={() => { setDrawerVisible(false); }}
        destroyOnClose={false}
        maskClosable={false}
        width="min(92vw, 960px)"
        extra={
          <Button
            type="primary"
            disabled={!canSubmit}
            loading={submitting}
            onClick={handleDrawerSubmit}
          >
            {editing ? '保存修改' : '确认提交'}
          </Button>
        }
      >
        <Form
          form={formRef}
          layout="vertical"
          preserve={false}
          initialValues={
            editing ? {
              user_name: editing.user_name,
              phone: editing.phone ?? undefined,
              ring_number: editing.ring_number,
              project: editing.project,
              remark: editing.remark ?? undefined,
            } : {}
          }
          onValuesChange={(_, all) => setCanSubmit(!!(all.user_name && all.project))}
          onFinish={handleSubmit}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '8px 4px' }}>

            {/* Step 1: 检测对象 */}
            <Card
              size="small"
              styles={{ body: { padding: 20 } }}
              style={{ borderLeft: '3px solid #1677ff' }}
              title={<Space><span style={{ fontSize: 16 }}>1️⃣</span><span style={{ fontWeight: 600 }}>检测对象</span><span style={{ color: '#ff4d4f', fontSize: 12 }}>* 必填</span></Space>}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Form.Item label="预约人姓名" name="user_name" rules={[{ required: true, message: '请输入预约人姓名' }]}>
                  <Input placeholder="请输入鸽主真实姓名" maxLength={32} />
                </Form.Item>
                <Form.Item label="联系电话" name="phone" rules={[{ pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确' }]}>
                  <Input placeholder="选填，用于联系鸽主" maxLength={11} />
                </Form.Item>
                <Form.Item label="鸽子足环号" name="ring_number">
                  <Input placeholder="选填，如 CHN-2023-000001" maxLength={40} />
                </Form.Item>
                <div />
              </div>
            </Card>

            {/* Step 2: 检测服务 */}
            <Card
              size="small"
              styles={{ body: { padding: 20 } }}
              style={{ borderLeft: '3px solid #52c41a' }}
              title={<Space><span style={{ fontSize: 16 }}>2️⃣</span><span style={{ fontWeight: 600 }}>检测服务</span><span style={{ color: '#ff4d4f', fontSize: 12 }}>* 必填</span></Space>}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Form.Item label="检测机构" name="org_id">
                  <Select
                    allowClear
                    placeholder="选填，从已有机构选择"
                    options={orgOptions.map(o => ({ label: o.name, value: o.id }))}
                    onChange={(v) => {
                      if (v) {
                        const org = orgOptions.find(o => o.id === v);
                        if (org) formRef.setFieldsValue({ test_org: org.name });
                      } else {
                        formRef.setFieldsValue({ test_org: undefined });
                      }
                    }}
                  />
                </Form.Item>
                <Form.Item label="检测机构名称(手填)" name="test_org">
                  <Input placeholder="未选机构时可手填" maxLength={64} />
                </Form.Item>
                <Form.Item label="检测项目" name="project" rules={[{ required: true, message: '请选择检测项目' }]}>
                  <Select
                    placeholder="请选择需要的检测项目"
                    options={itemTypes.map(t => ({ label: t.name, value: t.name }))}
                  />
                </Form.Item>
                <div />
              </div>
            </Card>

            {/* Step 3: 排期 */}
            <Card
              size="small"
              styles={{ body: { padding: 20 } }}
              style={{ borderLeft: '3px solid #fa8c16' }}
              title={<Space><span style={{ fontSize: 16 }}>3️⃣</span><span style={{ fontWeight: 600 }}>排期安排</span><span style={{ color: '#999', fontSize: 12 }}>选填</span></Space>}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Form.Item label="预约日期" name="scheduled_date">
                  <DatePicker style={{ width: '100%' }} placeholder="选填" />
                </Form.Item>
                <Form.Item label="订单备注" name="remark">
                  <Input.TextArea rows={4} placeholder="选填，特别说明或注意事项" maxLength={200} showCount />
                </Form.Item>
              </div>
            </Card>

          </div>
        </Form>
      </Drawer>

`;

s = s.substring(0, startIdx) + newDrawer + s.substring(endIdx);

// ====== 6. handleDrawerSubmit (插到 handleSubmit 前面) ======
s = s.replace(
  /\s*\/\/ 提交新增\/编辑/,
  `
  // Drawer 提交按钮: 先校验, 失败时滚动+高亮
  const handleDrawerSubmit = async () => {
    try {
      const values = await formRef.validateFields();
      setSubmitting(true);
      await handleSubmit(values);
    } catch (err) {
      const firstField = err?.errorFields?.[0];
      if (firstField?.name?.length) {
        message.warning('请先完善必填项');
        setTimeout(() => {
          const name = firstField.name[0];
          const el = document.querySelector('label[for="' + name + '"]')?.closest('.ant-form-item');
          el?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
          if (el instanceof HTMLElement) {
            el.style.transition = 'box-shadow 0.3s';
            el.style.boxShadow = '0 0 0 2px #ff4d4f';
            setTimeout(() => { el.style.boxShadow = ''; }, 2000);
          }
        }, 50);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // 提交新增/编辑`
);

// ====== 7. handleSubmit 清理旧 state 引用 ======
s = s.replace(
  /setDrawerVisible\(false\);\s*\/\/ 重置表单联动状态[\s\S]*?setCurrentStep\(0\);\s*handleRefresh/,
  `setDrawerVisible(false);
    formRef.resetFields();
    setCanSubmit(false);
    handleRefresh`
);

// ====== 8. 清理 useRef<ProFormInstance> (已删除, 安全) ======

fs.writeFileSync(f, s);
console.log("DONE. newDrawer chars:", newDrawer.length);
