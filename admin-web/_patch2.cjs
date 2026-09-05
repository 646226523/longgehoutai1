const fs = require("fs");
const f = "p:/龙鸽项目/longgehoutai/admin-web/src/pages/detection/Order.tsx";
let s = fs.readFileSync(f, "utf8");

const startMarker = "      {/* 新增/编辑抽屉 */}";
const endMarker = "      {/* 详情抽屉 - 卡片网格布局 */}";
const startIdx = s.indexOf(startMarker);
const endIdx = s.indexOf(endMarker);

if (startIdx === -1 || endIdx === -1) {
  console.error("markers not found");
  process.exit(1);
}
console.log(`Replacing ${endIdx - startIdx} chars from idx ${startIdx} to ${endIdx}`);

const newSection = String.raw`      {/* 新增/编辑抽屉 - 原生 Form + 4 步卡片 */}
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
            onClick={() => handleDrawerSubmit()}
          >
            {editing ? '保存修改' : '确认提交'}
          </Button>
        }
      >
        <Form
          form={formRef as any}
          layout="vertical"
          initialValues={
            editing ? {
              user_name: editing.user_name,
              phone: editing.phone ?? undefined,
              ring_number: editing.ring_number,
              project: editing.project,
              remark: editing.remark ?? undefined,
            } : {}
          }
          onValuesChange={(_, all: any) => setCanSubmit(!!(all.user_name && all.project))}
          onFinish={handleSubmit}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '8px 4px' }}>

            {/* Step 1 */}
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

            {/* Step 2 */}
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
                        if (org) formRef?.setFieldsValue({ test_org: org.name });
                      } else {
                        formRef?.setFieldsValue({ test_org: undefined });
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

            {/* Step 3 */}
            <Card
              size="small"
              styles={{ body: { padding: 20 } }}
              style={{ borderLeft: '3px solid #fa8c16' }}
              title={<Space><span style={{ fontSize: 16 }}>3️⃣</span><span style={{ fontWeight: 600 }}>排期安排</span><span style={{ color: '#999', fontSize: 12 }}>选填</span></Space>}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Form.Item label="预约日期" name="scheduled_date">
                  <DatePicker style={{ width: '100%' }} placeholder="选填，可后续在排期弹窗安排" />
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

const result = s.substring(0, startIdx) + newSection + s.substring(endIdx);
fs.writeFileSync(f, result);
console.log("DONE");
