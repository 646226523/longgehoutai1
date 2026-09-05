const fs = require("fs");
const f = "p:/龙鸽项目/longgehoutai/admin-web/src/pages/detection/Order.tsx";
let s = fs.readFileSync(f, "utf8");

// 1. import: 加 antd Form
s = s.replace(
  /^import\s*\{[^}]*\}\s*from\s*'antd';$/m,
  (m) => m.includes("Form") ? m : m.replace("Drawer,", "Drawer, Form,")
);
// 同时加 Input, Select, DatePicker, Button, Card, InputNumber
s = s.replace(
  /^import\s*\{([^}]*)\}\s*from\s*'antd';$/m,
  (m, p1) => {
    if (p1.includes("Form")) return m;
    const need = ["Form","Input","Select","DatePicker","Button","Card"];
    const have = p1.split(",").map(x=>x.trim()).filter(Boolean);
    const missing = need.filter(x=>!have.includes(x));
    return `import { ${have.concat(missing).join(", ")} } from 'antd';`;
  }
);
// 2. formRef: ProFormInstance -> FormInstance
s = s.replace(/formRef = useRef<ProFormInstance>\(\)/, `formRef = Form.useFormInstance()`);
s = s.replace(/formRef\.current\?\./g, `formRef?.`);

console.log("Step 1-2 imports OK");
fs.writeFileSync(f, s);
