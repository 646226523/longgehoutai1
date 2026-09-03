# 任务列表：修复 DetectionOrder 控制台空引用错误

## Task 1: 修复 loadOptions 空值保护

- **优先级**: high

- **状态**: completed

- **关联 AC**: AC-1

- **目标**: 修复 `getDetectionOrgOptions`、`getDetectionItemTypes` 返回 null 时的状态设置

- **修改文件**: `src/pages/detection/Order.tsx`

### 实现细节

```typescript
// 修复后（第 138、143、148 行）：
getDetectionOrgOptions().then((d) => setOrgOptions(d ?? [])).catch(() => {});
getDetectionItemTypes().then((d) => setItemTypes(d ?? [])).catch(() => {});
getGeneProfileOptions().then((d) => setProfileOptions(d ?? [])).catch(() => {});
```

### 完成证据

- 代码修改已应用：三处 `.then(setXxx)` 改为 `.then((d) => setXxx(d ?? []))`

- 浏览器验证：页面正常渲染，控制台无错误

***

## Task 2: 修复 getDetectionCalendar 空值保护

- **优先级**: high

- **状态**: completed

- **关联 AC**: AC-2

- **目标**: 修复 `getDetectionCalendar` 返回 null 时的 `rows.forEach` 调用

- **修改文件**: `src/pages/detection/Order.tsx`

### 实现细节

```typescript
// 修复后（第 121-122 行）：
getDetectionCalendar(start, end).then((rows: CalendarDayCount[] | null) => {
  if (!rows) return;
  ...
});
```

### 完成证据

- 代码修改已应用：添加 `if (!rows) return;` 空值检查

- 浏览器验证：页面正常渲染

***

## Task 3: 修复 getDetectionCalendarByDate 空值保护

- **优先级**: high

- **状态**: completed

- **关联 AC**: AC-2

- **目标**: 修复 `getDetectionCalendarByDate` 返回 null 时的状态设置

- **修改文件**: `src/pages/detection/Order.tsx`

### 实现细节

```typescript
// 修复后（第 276 行）：
setDateOrders(rows ?? []);
```

### 完成证据

- 代码修改已应用：`setDateOrders(rows)` → `setDateOrders(rows ?? [])`

- 浏览器验证：列表正常渲染

***

## Task 4: 修复 ProTable request 回调空值保护

- **优先级**: high

- **状态**: completed

- **关联 AC**: AC-3

- **目标**: 修复 `getDetectionOrders` 返回 null 时的 `res.list` / `res.total` 访问

- **修改文件**: `src/pages/detection/Order.tsx`

### 实现细节

```typescript
// 修复后（第 454 行）：
return { data: res?.list ?? [], success: true, total: res?.total ?? 0 };
```

### 完成证据

- 代码修改已应用：`res.list` → `res?.list ?? []`, `res.total` → `res?.total ?? 0`

- 浏览器验证：ProTable 正常渲染空状态

***

## Task 5: TypeScript 编译 + 浏览器验证

- **优先级**: high

- **状态**: completed

- **关联 AC**: AC-4, AC-5

- **目标**: 编译通过 + 浏览器页面正常渲染

### 完成证据

- TypeScript 编译通过：`npx tsc --noEmit` 输出为空（exit code 0）

- 浏览器验证：页面标题"预约订单 - 赛鸽基因后台"正常显示，表格和搜索区正常渲染

- 控制台无 `Cannot read properties of null` 错误

- 截图保存：localhost-3014-detection-order-v123.png

