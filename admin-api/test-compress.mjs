// 图片压缩功能验证脚本
// 用法: node test-compress.mjs
import http from 'http';
import fs from 'fs';

const BASE = 'http://localhost:3015';

function httpReq(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const data = Buffer.concat(chunks);
        let parsed;
        try { parsed = JSON.parse(data.toString()); } catch { parsed = data.toString(); }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function login() {
  const opts = {
    method: 'POST',
    hostname: 'localhost',
    port: 3015,
    path: '/api/auth/login',
    headers: { 'Content-Type': 'application/json' },
  };
  const body = JSON.stringify({ username: 'admin', password: 'admin123' });
  const { status, body: resp } = await httpReq(opts, body);
  if (status !== 200 || !resp.data?.accessToken) {
    console.error('登录失败:', status, resp);
    process.exit(1);
  }
  return resp.data.accessToken;
}

async function setQuality(token, q) {
  const opts = {
    method: 'PUT',
    hostname: 'localhost',
    port: 3015,
    path: `/api/system/configs/image_compress_quality`,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  };
  const body = JSON.stringify({ config_value: String(q) });
  const { status, body: resp } = await httpReq(opts, body);
  console.log(`  设置 quality=${q} → HTTP ${status}, code=${resp.code}`);
}

async function upload(b64Data, token) {
  const payload = JSON.stringify({ data: `data:image/jpeg;base64,${b64Data}` });
  const opts = {
    method: 'POST',
    hostname: 'localhost',
    port: 3015,
    path: '/api/upload',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
    },
  };
  return await httpReq(opts, payload);
}

async function downloadFile(urlPath) {
  const opts = {
    method: 'GET',
    hostname: 'localhost',
    port: 3015,
    path: urlPath,
  };
  return new Promise((resolve, reject) => {
    const req = http.request(opts, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).length));
    });
    req.on('error', reject);
    req.end();
  });
}

// --- MAIN ---
const b64 = fs.readFileSync('test-image-b64.txt', 'utf8').trim();
console.log('原始 base64 图片长度:', b64.length, 'chars');

console.log('\n[1/3] 登录获取 token...');
const token = await login();
console.log('  登录成功');

console.log('\n[2/3] 测试 quality=70 (压缩)...');
await setQuality(token, 70);
const { status: s1, body: r1 } = await upload(b64, token);
if (s1 !== 200 || r1.code !== 0) {
  console.error('上传失败:', s1, r1);
  process.exit(1);
}
const url70 = r1.data.url;
console.log('  上传成功:', url70);
const size70 = await downloadFile(url70);
console.log(`  文件大小: ${size70} bytes (${(size70/1024).toFixed(1)} KB)`);

console.log('\n[3/3] 测试 quality=100 (不压缩)...');
await setQuality(token, 100);
const { status: s2, body: r2 } = await upload(b64, token);
if (s2 !== 200 || r2.code !== 0) {
  console.error('上传失败:', s2, r2);
  process.exit(1);
}
const url100 = r2.data.url;
console.log('  上传成功:', url100);
const size100 = await downloadFile(url100);
console.log(`  文件大小: ${size100} bytes (${(size100/1024).toFixed(1)} KB)`);

console.log('\n========== 结果对比 ==========');
console.log(`quality=70 (压缩):  ${size70} bytes`);
console.log(`quality=100 (原图): ${size100} bytes`);
console.log(`压缩比: ${(size70/size100*100).toFixed(1)}%`);
if (size70 <= size100) {
  console.log('✓ 压缩版 <= 原图  PASS');
} else {
  console.log('✗ 压缩版 > 原图   FAIL');
}

// 还原默认值
await setQuality(token, 90);
console.log('\n已还原 quality=90');
