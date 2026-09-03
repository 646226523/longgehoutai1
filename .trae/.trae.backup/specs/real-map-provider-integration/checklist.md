# 验证清单

## 后台地图配置
- [x] `system_config` 初始化包含 `map` 分组 4 个配置项（map_provider / map_amap_key / map_baidu_key / map_tencent_key）
- [x] `GET /api/system/configs?group=map` 返回地图配置
- [x] 系统配置页出现"地图配置"分组，可保存服务商与三家 Key

## 坐标转换
- [x] GCJ-02→WGS-84 转换误差 < 50m
- [x] WGS-84→GCJ-02→WGS-84 往返误差 < 1m
- [x] 百度 BD-09→WGS-84 链路转换正确

## 真实地图渲染与选点
- [x] RealMapSelector 支持高德/百度/腾讯三家 SDK 动态加载
- [x] 地图支持缩放/平移控件
- [x] 点击选点、标记拖拽、起点/终点/中途点标记与赛线折线绘制
- [x] POI 地址搜索与逆地理编码回填地址
- [x] 对外回调输出 WGS-84 坐标与地址

## MapSelector 统一入口
- [x] 配置了对应服务商 Key 时渲染真实地图
- [x] 未配置 Key / Key 无效 / SDK 加载失败时回退现有 SVG 地图并显示引导提示
- [x] 两种模式下 props 契约与回调格式一致（WGS-84 + 地址）
- [x] `CompetitionForm` 无需改动即可工作

## 数据持久化
- [x] 真实地图选点后保存的经纬度为 WGS-84，与 SVG 模式数据一致
- [x] 空距按新坐标自动重算正确
- [x] 编辑赛事能正确回填真实地图标记与地址

## 质量与构建
- [x] 后端 `tsc --noEmit` 零错误
- [x] 前端 `npm run type-check` 零错误
- [x] 前端 `npm run build` 成功
- [x] 赛事赛线规划页面控制台零错误（含无效 Key 回退场景）
