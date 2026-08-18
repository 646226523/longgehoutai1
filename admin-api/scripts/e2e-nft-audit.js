// End-to-end test for NFT audit APIs
// Tests: stats, single reject, batch reject, list by rejected status, resubmit
const http = require('http');

const BASE = 'http://localhost:3015';
let TOKEN = '';

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'localhost',
      port: 3015,
      path,
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (TOKEN) opts.headers.Authorization = `Bearer ${TOKEN}`;
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body !== undefined) req.write(JSON.stringify(body));
    req.end();
  });
}

async function run() {
  // 1. Login
  const login = await request('POST', '/api/auth/login', {
    username: 'admin',
    password: 'admin123',
  });
  console.log('[1] Login:', login.status, login.body?.code === 0 ? 'OK' : 'FAIL');
  TOKEN = login.body?.data?.accessToken;
  if (!TOKEN) throw new Error('no token');

  // 2. stats
  const stats = await request('GET', '/api/nft/audit/stats');
  console.log('[2] GET /api/nft/audit/stats:', stats.status, JSON.stringify(stats.body));
  if (stats.status !== 200 || stats.body?.code !== 0) throw new Error('stats failed');

  // 3. Create a draft asset then submit to pending
  const create = await request('POST', '/api/nft/assets', {
    name: 'E2E 测试资产',
    owner_name: '测试鸽主',
    description: '接口测试',
  });
  console.log('[3] Create asset:', create.status, create.body);
  const assetId = create.body?.data?.id;
  if (!assetId) throw new Error('create failed');

  const submit = await request('POST', `/api/nft/assets/${assetId}/submit`);
  console.log('[3b] Submit asset:', submit.status, submit.body);

  // 4. Single reject → status should be 'rejected'
  const reject = await request('POST', `/api/nft/audit/${assetId}/reject`, {
    audit_remark: '测试驳回理由',
  });
  console.log('[4] Single reject:', reject.status, reject.body);
  if (reject.status !== 200) throw new Error('reject failed');

  // 5. Fetch rejected list
  const rejectedList = await request('GET', '/api/nft/audit/list?page=1&pageSize=10&status=rejected');
  console.log('[5] Rejected list:', rejectedList.status, 'total=', rejectedList.body?.data?.total);
  const found = rejectedList.body?.data?.list?.some((a) => a.id === assetId);
  console.log('    asset in rejected list?', found);
  if (!found) throw new Error('rejected list mismatch');

  // 6. Resubmit
  const resubmit = await request('POST', `/api/nft/assets/${assetId}/resubmit`);
  console.log('[6] Resubmit rejected:', resubmit.status, resubmit.body);
  if (resubmit.status !== 200 || resubmit.body?.code !== 0) throw new Error('resubmit failed');

  // 7. Verify asset now pending
  const assetDetail = await request('GET', `/api/nft/assets/${assetId}`);
  console.log('[7] Asset status after resubmit:', assetDetail.body?.data?.status);
  if (assetDetail.body?.data?.status !== 'pending') throw new Error('asset not pending');

  // 8. Batch reject test with a second asset
  const create2 = await request('POST', '/api/nft/assets', {
    name: 'E2E 批量测试资产',
    owner_name: '测试鸽主',
  });
  const id2 = create2.body?.data?.id;
  await request('POST', `/api/nft/assets/${id2}/submit`);

  const batch = await request('POST', '/api/nft/audit/batch-reject', {
    ids: [id2],
    reject_reason: '批量测试理由',
  });
  console.log('[8] Batch reject:', batch.status, batch.body);
  if (batch.body?.data?.success !== 1) throw new Error('batch reject failed');

  // 9. Verify batch rejected list
  const rejectedList2 = await request('GET', '/api/nft/audit/list?page=1&pageSize=10&status=rejected');
  const found2 = rejectedList2.body?.data?.list?.some((a) => a.id === id2);
  console.log('[9] Batch rejected list check:', found2);

  // 10. Test non-resubmittable state (minting) fails
  // First approve assetId (now pending) to move to minting
  const approve = await request('POST', `/api/nft/audit/${assetId}/approve`);
  console.log('[10] Approve to minting:', approve.status, approve.body);
  const resubmit2 = await request('POST', `/api/nft/assets/${assetId}/resubmit`);
  console.log('[10b] Resubmit minting should fail:', resubmit2.status, resubmit2.body);
  if (resubmit2.status !== 400) throw new Error('minting resubmit should fail');

  console.log('\n✅ All NFT audit API checks passed!');
}

run().catch((e) => {
  console.error('❌ E2E test failed:', e.message);
  process.exit(1);
});
