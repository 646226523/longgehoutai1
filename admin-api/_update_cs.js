const Database = require('better-sqlite3');
const db = new Database('data/admin.db');

// 启用微信小程序客服
db.prepare("UPDATE system_config SET config_value='1' WHERE config_key='wx_cs_enable'").run();

// 验证结果
const rows = db.prepare("SELECT config_key, config_value FROM system_config WHERE config_group='customer_service'").all();
console.log('=== 客服配置 ===');
rows.forEach(r => console.log(`${r.config_key} = ${r.config_value || '(空)'}`));
