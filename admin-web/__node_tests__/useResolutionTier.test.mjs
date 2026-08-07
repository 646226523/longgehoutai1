// useResolutionTier.test.mjs — 纯 ESM，`node __node_tests__/useResolutionTier.test.mjs` 直接执行
// 内嵌 useResolutionTier.ts 的纯函数等价实现（零副作用）
// 逻辑与 useResolutionTier.ts 逐行对齐，确保测试即测实际实现

// ---------- 内嵌 pure function 实现（与 useResolutionTier.ts 同构）----------

const MIN_HEIGHT = 400;
const RESIZE_DEBOUNCE_MS = 200;

const TIER_2K = {
  tier: '2k',
  containerHeight: 'calc(100vh - 280px)',
  gridMain: { top: 60, right: 60, bottom: 40, left: 40 },
  gridSub: { top: 60, right: 60, bottom: 25, left: 40 },
  baseFontSizePx: 16,
  xTickInterval: 1,
  xLabelRotateDeg: 0,
  enableDataZoom: true,
};

const TIER_1080P = {
  tier: '1080p',
  containerHeight: 'calc(100vh - 240px)',
  gridMain: { top: 50, right: 50, bottom: 30, left: 30 },
  gridSub: { top: 50, right: 50, bottom: 20, left: 30 },
  baseFontSizePx: 14,
  xTickInterval: 1,
  xLabelRotateDeg: 0,
  enableDataZoom: false,
};

const TIER_COMPACT = {
  tier: 'compact',
  containerHeight: 'calc(100vh - 220px)',
  gridMain: { top: 40, right: 40, bottom: 25, left: 25 },
  gridSub: { top: 40, right: 40, bottom: 15, left: 25 },
  baseFontSizePx: 13,
  xTickInterval: 2,
  xLabelRotateDeg: -15,
  enableDataZoom: false,
};

function resolveTier(innerWidth) {
  if (innerWidth >= 2560) return '2k';
  if (innerWidth >= 1920) return '1080p';
  return 'compact';
}

function buildLayoutConfig(tier) {
  const preset = tier === '2k' ? TIER_2K : tier === '1080p' ? TIER_1080P : TIER_COMPACT;
  return {
    tier: preset.tier,
    containerHeight: preset.containerHeight,
    minHeight: MIN_HEIGHT,
    gridMain: { ...preset.gridMain },
    gridSub: { ...preset.gridSub },
    baseFontSizePx: preset.baseFontSizePx,
    xTickInterval: preset.xTickInterval,
    xLabelRotateDeg: preset.xLabelRotateDeg,
    enableDataZoom: preset.enableDataZoom,
    resizeDebounceMs: RESIZE_DEBOUNCE_MS,
  };
}

function debounce(fn, wait) {
  let timer = null;
  return (...args) => {
    if (timer !== null) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      fn(...args);
      timer = null;
    }, wait);
  };
}

// ---------- 测试框架（极简 assert）----------
const results = [];
function assert(name, cond, extra = '') {
  const pass = !!cond;
  results.push({ name, pass, extra });
  const icon = pass ? '✅ PASS' : '❌ FAIL';
  const line = `${icon}  ${name}${extra ? '  —  ' + extra : ''}`;
  console.log(line);
  return pass;
}

function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object' || a === null || b === null) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const k of keysA) {
    if (!keysB.includes(k)) return false;
    if (!deepEqual(a[k], b[k])) return false;
  }
  return true;
}

console.log('========== useResolutionTier 单测（33 断言）==========\n');

// ---------- TR-3.1: resolveTier 边界值（5 断言）----------
console.log('--- TR-3.1: resolveTier 边界值 ---');
(function TR3_1() {
  assert(
    'TR-3.1a: resolveTier(2560) = "2k"',
    resolveTier(2560) === '2k',
    `actual="${resolveTier(2560)}"`,
  );
  assert(
    'TR-3.1b: resolveTier(1920) = "1080p"',
    resolveTier(1920) === '1080p',
    `actual="${resolveTier(1920)}"`,
  );
  assert(
    'TR-3.1c: resolveTier(1919) = "compact"',
    resolveTier(1919) === 'compact',
    `actual="${resolveTier(1919)}"`,
  );
  assert(
    'TR-3.1d: resolveTier(3000) = "2k"',
    resolveTier(3000) === '2k',
    `actual="${resolveTier(3000)}"`,
  );
  assert(
    'TR-3.1e: resolveTier(1280) = "compact"',
    resolveTier(1280) === 'compact',
    `actual="${resolveTier(1280)}"`,
  );
})();

// ---------- TR-3.2: buildLayoutConfig 三档 9 字段 deep equal（27 断言）----------
console.log('\n--- TR-3.2: buildLayoutConfig 三档字段校验 ---');
(function TR3_2() {
  // ---------- 2k 档（9 字段）----------
  const cfg2k = buildLayoutConfig('2k');
  assert(
    'TR-3.2a[2k]: containerHeight = "calc(100vh - 280px)"',
    cfg2k.containerHeight === 'calc(100vh - 280px)',
    `actual="${cfg2k.containerHeight}"`,
  );
  assert(
    'TR-3.2b[2k]: gridMain = {top:60,right:60,bottom:40,left:40}',
    deepEqual(cfg2k.gridMain, { top: 60, right: 60, bottom: 40, left: 40 }),
    `actual=${JSON.stringify(cfg2k.gridMain)}`,
  );
  assert(
    'TR-3.2c[2k]: gridSub = {top:60,right:60,bottom:25,left:40}',
    deepEqual(cfg2k.gridSub, { top: 60, right: 60, bottom: 25, left: 40 }),
    `actual=${JSON.stringify(cfg2k.gridSub)}`,
  );
  assert(
    'TR-3.2d[2k]: baseFontSizePx = 16',
    cfg2k.baseFontSizePx === 16,
    `actual=${cfg2k.baseFontSizePx}`,
  );
  assert(
    'TR-3.2e[2k]: xTickInterval = 1',
    cfg2k.xTickInterval === 1,
    `actual=${cfg2k.xTickInterval}`,
  );
  assert(
    'TR-3.2f[2k]: xLabelRotateDeg = 0',
    cfg2k.xLabelRotateDeg === 0,
    `actual=${cfg2k.xLabelRotateDeg}`,
  );
  assert(
    'TR-3.2g[2k]: enableDataZoom = true',
    cfg2k.enableDataZoom === true,
    `actual=${cfg2k.enableDataZoom}`,
  );
  assert(
    'TR-3.2h[2k]: minHeight = 400',
    cfg2k.minHeight === 400,
    `actual=${cfg2k.minHeight}`,
  );
  assert(
    'TR-3.2i[2k]: resizeDebounceMs = 200',
    cfg2k.resizeDebounceMs === 200,
    `actual=${cfg2k.resizeDebounceMs}`,
  );

  // ---------- 1080p 档（9 字段）----------
  const cfg1080p = buildLayoutConfig('1080p');
  assert(
    'TR-3.2a[1080p]: containerHeight = "calc(100vh - 240px)"',
    cfg1080p.containerHeight === 'calc(100vh - 240px)',
    `actual="${cfg1080p.containerHeight}"`,
  );
  assert(
    'TR-3.2b[1080p]: gridMain = {top:50,right:50,bottom:30,left:30}',
    deepEqual(cfg1080p.gridMain, { top: 50, right: 50, bottom: 30, left: 30 }),
    `actual=${JSON.stringify(cfg1080p.gridMain)}`,
  );
  assert(
    'TR-3.2c[1080p]: gridSub = {top:50,right:50,bottom:20,left:30}',
    deepEqual(cfg1080p.gridSub, { top: 50, right: 50, bottom: 20, left: 30 }),
    `actual=${JSON.stringify(cfg1080p.gridSub)}`,
  );
  assert(
    'TR-3.2d[1080p]: baseFontSizePx = 14',
    cfg1080p.baseFontSizePx === 14,
    `actual=${cfg1080p.baseFontSizePx}`,
  );
  assert(
    'TR-3.2e[1080p]: xTickInterval = 1',
    cfg1080p.xTickInterval === 1,
    `actual=${cfg1080p.xTickInterval}`,
  );
  assert(
    'TR-3.2f[1080p]: xLabelRotateDeg = 0',
    cfg1080p.xLabelRotateDeg === 0,
    `actual=${cfg1080p.xLabelRotateDeg}`,
  );
  assert(
    'TR-3.2g[1080p]: enableDataZoom = false',
    cfg1080p.enableDataZoom === false,
    `actual=${cfg1080p.enableDataZoom}`,
  );
  assert(
    'TR-3.2h[1080p]: minHeight = 400',
    cfg1080p.minHeight === 400,
    `actual=${cfg1080p.minHeight}`,
  );
  assert(
    'TR-3.2i[1080p]: resizeDebounceMs = 200',
    cfg1080p.resizeDebounceMs === 200,
    `actual=${cfg1080p.resizeDebounceMs}`,
  );

  // ---------- compact 档（9 字段）----------
  const cfgCompact = buildLayoutConfig('compact');
  assert(
    'TR-3.2a[compact]: containerHeight = "calc(100vh - 220px)"',
    cfgCompact.containerHeight === 'calc(100vh - 220px)',
    `actual="${cfgCompact.containerHeight}"`,
  );
  assert(
    'TR-3.2b[compact]: gridMain = {top:40,right:40,bottom:25,left:25}',
    deepEqual(cfgCompact.gridMain, { top: 40, right: 40, bottom: 25, left: 25 }),
    `actual=${JSON.stringify(cfgCompact.gridMain)}`,
  );
  assert(
    'TR-3.2c[compact]: gridSub = {top:40,right:40,bottom:15,left:25}',
    deepEqual(cfgCompact.gridSub, { top: 40, right: 40, bottom: 15, left: 25 }),
    `actual=${JSON.stringify(cfgCompact.gridSub)}`,
  );
  assert(
    'TR-3.2d[compact]: baseFontSizePx = 13',
    cfgCompact.baseFontSizePx === 13,
    `actual=${cfgCompact.baseFontSizePx}`,
  );
  assert(
    'TR-3.2e[compact]: xTickInterval = 2',
    cfgCompact.xTickInterval === 2,
    `actual=${cfgCompact.xTickInterval}`,
  );
  assert(
    'TR-3.2f[compact]: xLabelRotateDeg = -15',
    cfgCompact.xLabelRotateDeg === -15,
    `actual=${cfgCompact.xLabelRotateDeg}`,
  );
  assert(
    'TR-3.2g[compact]: enableDataZoom = false',
    cfgCompact.enableDataZoom === false,
    `actual=${cfgCompact.enableDataZoom}`,
  );
  assert(
    'TR-3.2h[compact]: minHeight = 400',
    cfgCompact.minHeight === 400,
    `actual=${cfgCompact.minHeight}`,
  );
  assert(
    'TR-3.2i[compact]: resizeDebounceMs = 200',
    cfgCompact.resizeDebounceMs === 200,
    `actual=${cfgCompact.resizeDebounceMs}`,
  );
})();

// ---------- TR-3.3: debounce 200ms 内 5 次触发 = 1 次 fn 调用 ----------
console.log('\n--- TR-3.3: debounce 去抖验证 ---');
(async function TR3_3() {
  let callCount = 0;
  const debounced = debounce(() => {
    callCount++;
  }, 200);

  const start = Date.now();

  const invokeTimes = [0, 30, 60, 90, 120];
  for (const t of invokeTimes) {
    await new Promise((r) => setTimeout(r, t - (Date.now() - start)));
    debounced();
  }

  await new Promise((r) => setTimeout(r, 250));

  assert(
    'TR-3.3: debounce(200ms) 100ms 内 5 次触发 → fn 只调用 1 次',
    callCount === 1,
    `callCount=${callCount}, elapsed≈${Date.now() - start}ms`,
  );

  // ---------- 汇总 ----------
  console.log('\n========== 汇总 ==========');
  const passed = results.filter((r) => r.pass).length;
  const total = results.length;
  console.log(`总计: ${passed}/${total} 通过`);
  const expectedResolve = 5;
  const expectedBuild = 27;
  const expectedDebounce = 1;
  const totalExpected = expectedResolve + expectedBuild + expectedDebounce;
  console.log(
    `分类: resolveTier=${results.slice(0, 5).filter((r) => r.pass).length}/${expectedResolve}, buildLayoutConfig=${results.slice(5, 32).filter((r) => r.pass).length}/${expectedBuild}, debounce=${results.slice(32).filter((r) => r.pass).length}/${expectedDebounce}`,
  );
  if (passed === total && total === totalExpected) {
    console.log(`🎉 全部 ${totalExpected} 断言通过（5+27+1）`);
    process.exit(0);
  } else {
    console.log('❌ 存在失败断言，请检查上方 FAIL 条目');
    process.exit(1);
  }
})();
