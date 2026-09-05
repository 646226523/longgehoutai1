const fs = require("fs");
const f = "p:/龙鸽项目/longgehoutai/admin-web/src/pages/detection/Order.tsx";
let s = fs.readFileSync(f, "utf8");

// 1. antd import 去掉 Checkbox, Col, Divider, Radio, Row
s = s.replace(/^\s*Checkbox,\r?\n/m, "");
s = s.replace(/^\s*Col,\r?\n/m, "");
s = s.replace(/^\s*Divider,\r?\n/m, "");
s = s.replace(/^\s*Radio,\r?\n/m, "");
s = s.replace(/^\s*Row,\r?\n/m, "");

// 2. icons import 去掉未用的
s = s.replace(/^\s*CheckCircleFilled,\r?\n/m, "");
s = s.replace(/^\s*ClockCircleOutlined,\r?\n/m, "");
s = s.replace(/^\s*CloseCircleFilled,\r?\n/m, "");
s = s.replace(/^\s*InfoCircleOutlined,\r?\n/m, "");

// 3. 删除 ITEM_PRICES 和 TIME_SLOTS 常量
s = s.replace(/^\s*const ITEM_PRICES[\s\S]*?\n};\r?\n\r?\n/m, "");
s = s.replace(/^\s*const TIME_SLOTS[\s\S]*?\n};\r?\n\r?\n/m, "");

// 4. 删除旧 state (setFormValues, selectedTimeSlot 等)
s = s.replace(/^\s*const \[formValues, setFormValues\][\s\S]*?setCurrentStep\);\r?\n/m, "");
s = s.replace(/^\s*const getFormString[\s\S]*?;\r?\n/m, "");
s = s.replace(/^\s*const selectedProfile[\s\S]*?;\r?\n/m, "");

fs.writeFileSync(f, s);
console.log("OK");
