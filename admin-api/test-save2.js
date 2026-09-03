const http = require('http');
function call(method, path, headers, body) {
  return new Promise((resolve) => {
    const req = http.request({ hostname: 'localhost', port: 3015, path, method, headers }, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => resolve({ status: res.statusCode, body: d, resHeaders: res.headers }));
    });
    if (body) req.write(body);
    req.end();
  });
}
(async () => {
  const login = await call('POST', '/api/auth/login', { 'Content-Type': 'application/json' }, JSON.stringify({ username: 'admin', password: 'admin123' }));
  console.log('login status:', login.status);
  const lj = JSON.parse(login.body);
  console.log('login.data:', JSON.stringify(lj.data).slice(0, 200));
  const token = lj.data.token;
  console.log('token:', token ? token.slice(0, 30) + '...' : 'NONE');
  
  // 直接用这个 token 请求 configs
  const cfg = await call('GET', '/api/system/configs', { Authorization: 'Bearer ' + token });
  console.log('\nGET configs status:', cfg.status);
  const cj = JSON.parse(cfg.body);
  console.log('code:', cj.code, 'msg:', cj.message || cj.msg);
  
  // 试试 PUT
  const put = await call('PUT', '/api/system/configs/image_watermark_text', {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  }, JSON.stringify({ config_value: '赛鸽基因' }));
  console.log('\nPUT status:', put.status);
  console.log('PUT body:', put.body.slice(0, 300));
})();
