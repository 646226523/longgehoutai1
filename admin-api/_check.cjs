const Database = require('better-sqlite3');
const db = new Database('data/admin.db');
db.prepare("SELECT config_key, config_value FROM system_config WHERE config_group='customer_service' AND config_key LIKE 'wecom_%'").all().forEach(r => console.log(r.config_key + ' = [' + r.config_value + ']'));
