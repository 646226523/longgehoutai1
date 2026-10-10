// API 级验证脚本:会员订阅全链路(先用 send-code 拿验证码)
const BASE = 'http://localhost:3015/api';

async function api(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(BASE + path, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ...data };
}

async function main() {
  console.log('=== 会员订阅全链路验证 ===\n');

  // 1. send-code 拿验证码
  const phone = '139' + String(Date.now()).slice(-8);
  const code = await api('POST', '/user/send-code', { phone });
  console.log('1. send-code:', code.code === 0 ? '✅' : '❌');
  if (code.data?.code) console.log('   验证码(后端日志里应能看到):', code.data.code);

  // 2. 验证码登录(自动注册新用户)
  const login = await api('POST', '/user/login', { phone, verifyCode: code.data.code });
  console.log('\n2. 登录/注册:', login.code === 0 ? '✅' : '❌', login.message);
  if (login.code !== 0) { console.log('   data:', JSON.stringify(login.data)); return; }
  const userId = login.data.userId;
  const token = login.data.token;
  console.log('   userId:', userId);
  console.log('   membership:', JSON.stringify(login.data.membership));

  // 3. 等级列表取 gold
  const levels = await api('GET', '/user/levels');
  const gold = levels.data?.find((l) => l.code === 'gold' && l.price > 0);
  const diamond = levels.data?.find((l) => l.code === 'diamond' && l.price > 0);

  // 4. 初始 membership
  const m0 = await api('GET', '/user/me/membership', null, token);
  console.log('\n3. 初始 membership:', m0.code === 0 ? '✅' : '❌');
  console.log('   levelId=', m0.data?.levelId, 'expireAt=', m0.data?.memberExpireAt, 'source=', m0.data?.memberSource);

  // 5. 首次订阅 gold
  console.log('\n4. 首次订阅 gold:');
  const sub1 = await api('POST', '/user/me/subscribe', { level_id: gold.id, pay_method: 'mock' }, token);
  console.log('   subscribe:', sub1.code === 0 ? '✅' : '❌', sub1.message);
  if (sub1.code === 0) {
    const ms = sub1.data.membership;
    console.log(`   levelId=${ms.levelId} levelName=${ms.levelName} expireAt=${new Date(ms.memberExpireAt).toISOString()} remaining=${ms.memberRemainingDays}d`);
    const expected = Date.now() + gold.duration_days * 86400000;
    const diff = Math.abs(ms.memberExpireAt - expected);
    console.log(`   ${diff < 5000 ? '✅' : '❌'} 有效期正确 (误差 ${diff}ms)`);
  }

  // 6. 续费叠加(再买一个月)
  console.log('\n5. 续费叠加(再买 gold):');
  const beforeM = await api('GET', '/user/me/membership', null, token);
  const oldExpire = beforeM.data.memberExpireAt;
  console.log('   续费前 expireAt:', new Date(oldExpire).toISOString());
  const sub2 = await api('POST', '/user/me/subscribe', { level_id: gold.id, pay_method: 'mock' }, token);
  const afterM = await api('GET', '/user/me/membership', null, token);
  const newExpire = afterM.data.memberExpireAt;
  console.log('   续费后 expireAt:', new Date(newExpire).toISOString());
  const expected = oldExpire + gold.duration_days * 86400000;
  const diff = Math.abs(newExpire - expected);
  console.log(`   ${diff < 5000 ? '✅' : '❌'} 叠加正确 (差 ${diff}ms)`);

  // 7. 跨等级切换(gold → diamond)
  console.log('\n6. 跨等级升级(gold → diamond):');
  const sub3 = await api('POST', '/user/me/subscribe', { level_id: diamond.id, pay_method: 'mock' }, token);
  const m3 = await api('GET', '/user/me/membership', null, token);
  console.log('   levelCode:', m3.data?.levelCode, m3.data?.levelCode === 'diamond' ? '✅' : '❌');
  console.log('   levelName:', m3.data?.levelName);
  console.log('   remainingDays:', m3.data?.memberRemainingDays);

  // 8. 历史订单
  console.log('\n7. 历史订单:');
  const orders = await api('GET', '/user/me/member-orders', null, token);
  console.log('   total:', orders.data?.total);
  orders.data?.list?.forEach((o) => {
    console.log(`   ${o.order_no} ${o.level_name} ¥${o.price} ${o.duration_days}天 ${new Date(o.start_at).toISOString().slice(0, 10)}~${new Date(o.end_at).toISOString().slice(0, 10)}`);
  });

  console.log('\n=== 全链路验证完成 ✅ ===');
}

main().catch((e) => console.error('❌', e));
