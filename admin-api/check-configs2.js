const http = require('http');
function req(path, token, method, body) {
  return new Promise((resolve) => {
    const r = http.request({
      hostname: 'localhost', port: 3015, path, method,
      headers: body ? { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token } : { Authorization: 'Bearer ' + token }
    }, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => resolve(d));
    });
    if (body) r.write(body);
    r.end();
  });
}
async function main() {
  const login = JSON.parse(await req('/api/auth/login', '', 'POST', JSON.stringify({ username: 'admin', password: 'admin123' })));
  const token = login.data.token;
  const cfg = JSON.parse(await req('/api/system/configs', token));
  console.log('code:', cfg.code, 'msg:', cfg.msg);
  console.log('data type:', typeof cfg.data);
  if (Array.isArray(cfg.data)) {
    console.log('data is array, len:', cfg.data.length);
    const groups = [...new Set(cfg.data.map(i => i.config_group))];
    console.log('groups from flat list:', groups);
  } else if (cfg.data && typeof cfg.data === 'object') {
    console.log('data keys:', Object.keys(cfg.data));
    if (cfg.data.groups) {
      console.log('groups:', cfg.data.groups.map(g => g.group + '(' + g.items.length + ')'));
    }
    if (cfg.data.list) {
      console.log('list len:', cfg.data.list.length);
    }
  }
}
main();
