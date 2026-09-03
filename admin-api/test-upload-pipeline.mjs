// upload pipeline functional test
const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:3015';
const UPLOADS_DIR = path.join(__dirname, 'uploads');

function httpRequest(method, url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const opts = {
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
    };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve(data); }
      });
    });
    req.on('error', reject);
    if (body) req.write(typeof body === 'string' ? body : JSON.stringify(body));
    req.end();
  });
}

async function main() {
  // Step 1: Login
  console.log('=== Step 1: Login ===');
  const login = await httpRequest('POST', `${BASE}/api/auth/login`, { username: 'admin', password: 'admin123' });
  const token = login.data.accessToken;
  console.log('Token:', token.substring(0, 30) + '...');
  const H = { Authorization: `Bearer ${token}` };

  // Step 2: Check current image configs
  console.log('\n=== Step 2: Current image configs ===');
  const cfg = await httpRequest('GET', `${BASE}/api/system/configs`, null, H);
  cfg.data.list.filter(c => c.config_key.startsWith('image_')).forEach(c => {
    console.log(`  ${c.config_key} = ${c.config_value}`);
  });

  // Step 3: Enable watermark
  console.log('\n=== Step 3: Enable watermark ===');
  await httpRequest('PUT', `${BASE}/api/system/configs/image_watermark_enable`, { config_value: '1' }, H);
  await httpRequest('PUT', `${BASE}/api/system/configs/image_watermark_text`, { config_value: '赛鸽基因' }, H);
  await httpRequest('PUT', `${BASE}/api/system/configs/image_watermark_position`, { config_value: 'bottom-right' }, H);
  console.log('Watermark enabled');

  // Read test image
  const testImgPath = path.join(__dirname, 'test-input.jpg');
  const b64 = fs.readFileSync(testImgPath).toString('base64');
  const dataUri = `data:image/jpeg;base64,${b64}`;

  // Step 4: Upload WITH watermark
  console.log('\n=== Step 4: Upload WITH watermark ===');
  const respWm = await httpRequest('POST', `${BASE}/api/upload`, { data: dataUri }, H);
  console.log('Response:', JSON.stringify(respWm, null, 2));

  const fileNameWm = path.basename(respWm.data.url);
  const filePathWm = path.join(UPLOADS_DIR, fileNameWm);
  const sizeWm = fs.statSync(filePathWm).size;
  console.log(`Original file (with wm): ${fileNameWm} -> ${sizeWm} bytes`);

  console.log('\nThumbnail files (with wm):');
  for (const sk of ['large', 'medium', 'small']) {
    const tp = path.join(UPLOADS_DIR, 'thumbs', sk, fileNameWm);
    if (fs.existsSync(tp)) {
      console.log(`  thumbs/${sk}/${fileNameWm} -> ${fs.statSync(tp).size} bytes`);
    } else {
      console.log(`  thumbs/${sk}/${fileNameWm} -> NOT FOUND`);
    }
  }

  // Step 5: Disable watermark
  console.log('\n=== Step 5: Disable watermark ===');
  await httpRequest('PUT', `${BASE}/api/system/configs/image_watermark_enable`, { config_value: '0' }, H);
  console.log('Watermark disabled');

  // Step 6: Upload WITHOUT watermark
  console.log('\n=== Step 6: Upload WITHOUT watermark ===');
  const respNoWm = await httpRequest('POST', `${BASE}/api/upload`, { data: dataUri }, H);
  console.log('Response:', JSON.stringify(respNoWm, null, 2));

  const fileNameNoWm = path.basename(respNoWm.data.url);
  const filePathNoWm = path.join(UPLOADS_DIR, fileNameNoWm);
  const sizeNoWm = fs.statSync(filePathNoWm).size;
  console.log(`Original file (no wm): ${fileNameNoWm} -> ${sizeNoWm} bytes`);

  console.log('\nThumbnail files (no wm):');
  for (const sk of ['large', 'medium', 'small']) {
    const tp = path.join(UPLOADS_DIR, 'thumbs', sk, fileNameNoWm);
    if (fs.existsSync(tp)) {
      console.log(`  thumbs/${sk}/${fileNameNoWm} -> ${fs.statSync(tp).size} bytes`);
    } else {
      console.log(`  thumbs/${sk}/${fileNameNoWm} -> NOT FOUND`);
    }
  }

  // Step 7: Summary
  console.log('\n=== Step 7: SUMMARY ===');
  console.log('Original size WITH wm     :', sizeWm, 'bytes');
  console.log('Original size WITHOUT wm :', sizeNoWm, 'bytes');
  console.log('Difference               :', sizeWm - sizeNoWm, 'bytes');

  console.log('\nAll files under uploads/thumbs/:');
  const thumbsDir = path.join(UPLOADS_DIR, 'thumbs');
  function walk(dir) {
    for (const f of fs.readdirSync(dir)) {
      const fp = path.join(dir, f);
      const st = fs.statSync(fp);
      if (st.isDirectory()) walk(fp);
      else console.log('  ', path.relative(UPLOADS_DIR, fp), `(${st.size} bytes)`);
    }
  }
  if (fs.existsSync(thumbsDir)) walk(thumbsDir);
  else console.log('  (thumbs dir does not exist)');

  // Restore watermark enable to 0
  await httpRequest('PUT', `${BASE}/api/system/configs/image_watermark_enable`, { config_value: '0' }, H);
  console.log('\n[cleanup] watermark_enable restored to 0');
}

main().catch(err => { console.error('FAIL:', err); process.exit(1); });
