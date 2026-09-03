// 检查后端 configs 接口返回的 image 组有哪些 key
const http = require('http');
function get(path, token) {
  return new Promise((resolve, reject) => {
    http.get({
      hostname: 'localhost', port: 3015, path,
      headers: token ? { Authorization: 'Bearer ' + token } : {}
    }, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => resolve(JSON.parse(d)));
    }).on('error', reject);
  });
}
async function main() {
  const login = await get('/api/auth/login', null);
  // 需要 POST，改用 fetch 不行，改用手动 http.request
  const token = await new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost', port: 3015, path: '/api/auth/login', method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => resolve(JSON.parse(d).data.token));
    });
    req.write(JSON.stringify({ username: 'admin', password: 'admin123' }));
    req.end();
  });
  const configs = await get('/api/system/configs', token);
  const imgGroup = (configs.data?.groups || []).find((g) => g.group === 'image');
  console.log('image 组 keys:', imgGroup ? imgGroup.items.map((i) => i.config_key) : 'NOT FOUND');
}
main();
