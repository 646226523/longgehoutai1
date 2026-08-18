import initSqlJs from 'sql.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
const _dirname = path.dirname(fileURLToPath(import.meta.url));
const SQL = await initSqlJs();
const filePath = path.resolve(_dirname, 'data', 'admin.db');
const db = new SQL.Database(fs.readFileSync(filePath));
const res = db.exec("SELECT config_key, config_value FROM system_config WHERE config_key LIKE 'map_%'");
if (!res[0]) { console.log('no rows'); process.exit(0); }
const cols = res[0].columns;
const out = res[0].values.map((v) => Object.fromEntries(cols.map((c, i) => [c, v[i]])));
console.log(JSON.stringify(out, null, 2));
db.close();