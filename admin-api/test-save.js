const http = require('http');

function call(method, path, token, body) {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost', port: 3015, path, method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: 'Bearer ' + token } : {})
      }
    }, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  // 登录
  const login = await call('POST', '/api/auth/login', null, { username: 'admin', password: 'admin123' });
  console.log('login status:', login.status);
  const token = JSON.parse(login.body).data.token;

  // 先 GET configs 看看 image 组的 key 是否存在
  const cfg = await call('GET', '/api/system/configs', token);
  const j = JSON.parse(cfg.body);
  console.log('GET configs code:', j.code, 'data type:', typeof j.data);
  let imageItems = [];
  if (Array.isArray(j.data)) {
    imageItems = j.data.filter(i => i.config_group === 'image');
  } else if (j.data && Array.isArray(j.data.groups)) {
    const g = j.data.groups.find(g => g.group === 'image');
    imageItems = g ? g.items : [];
  }
  console.log('image group items:', imageItems.length);
  console.log('keys:', imageItems.map(i => i.config_key));

  // 测试 PUT
  const testKey = 'image_watermark_text';
  const put = await call('PUT', '/api/system/configs/' + testKey, token, { config_value: 'test123' });
  console.log(`\nPUT ${testKey} status:`, put.status);
  const pj = JSON.parse(put.body);
  console.log('PUT response:', JSON.stringify(pj));
}
main();
