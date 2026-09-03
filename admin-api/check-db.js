const Database = require('better-sqlite3');
const db = new Database('data/admin.db');
console.log('TABLES:', db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r => r.name));
console.log('---');
console.log('IMAGE CONFIGS:', db.prepare("SELECT config_key, config_value FROM system_configs WHERE config_group='image' ORDER BY sort_order, config_key").all());
