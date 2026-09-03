const http = require('http');
function rq(m, p, t, b) {
  return new Promise((resolve) => {
    const h = { 'Content-Type': 'application/json' };
    if (t) h['Authorization'] = 'Bearer ' + t;
    const d = b ? JSON.stringify(b) : null;
    if (d) h['Content-Length'] = Buffer.byteLength(d);
    const q = http.request({ hostname: 'localhost', port: 3015, path: p, method: m, headers: h }, (res) => {
      let d = '';
      res.on('data', (c) => (d += c));
      res.on('end', () => resolve({ s: res.statusCode, b: d }));
    });
    q.on('error', (e) => resolve({ s: 0, b: e.message }));
    if (d) q.write(d);
    q.end();
  });
}
(async () => {
  const l = await rq('POST', '/api/auth/login', null, { username: 'admin', password: 'admin123' });
  console.log('login:', l.s);
  const t = JSON.parse(l.b).data.token;
  const p = await rq('GET', '/api/system/permissions', t);
  console.log('permissions status:', p.s);
  const j = JSON.parse(p.b);
  console.log('code:', j.code, 'msg:', j.message);
  if (Array.isArray(j.data)) {
    console.log('data is array, len:', j.data.length);
    j.data.forEach((g) => console.log('  group:', g.module || g.name || Object.keys(g)));
  } else if (j.data) {
    console.log('data keys:', Object.keys(j.data));
    const groups = j.data.groups || j.data;
    if (Array.isArray(groups)) {
      console.log('groups len:', groups.length);
      groups.slice(0, 3).forEach((g) => console.log('  ', g.module, 'perms:', (g.permissions || []).length));
    }
  } else {
    console.log('data is null/undefined');
    console.log('raw body:', p.b.substring(0, 300));
  }
})();
