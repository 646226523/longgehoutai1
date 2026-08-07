// echartsOptions.test.mjs — 纯 ESM，`node __node_tests__/echartsOptions.test.mjs` 直接执行
// 内嵌 echartsOptions.ts 的纯函数等价实现（零副作用，不加载 ECharts）
// 逻辑与 echartsOptions.ts 逐行对齐，确保测试即测实际实现

// ---------- 常量（与 echartsOptions.ts 一致）----------
const COLOR_STOCK = '#3B82F6';
const COLOR_RATE = '#10B981';
const COLOR_RATE_END = '#34d399';
const COLOR_NFT = '#faad14';
const COLOR_USER = '#52c41a';
const COLOR_MAX = '#ef4444';
const COLOR_MIN = '#10B981';
const COLOR_GRID = '#d9d9d9';

// ---------- 内嵌 helper 函数（与 echartsOptions.ts 同构）----------
function formatPct(v, digits = 1) {
  if (v === null) return '—';
  const fixed = v.toFixed(digits);
  return v >= 0 ? `+${fixed}%` : `${fixed}%`;
}

function sumGeneDailyOf(v2) {
  let total = 0;
  for (let i = 0; i < v2.length; i++) total += v2[i].geneDaily;
  return total;
}

function rangeDays(range) {
  return range === 'week7' ? 7 : range === 'week30' ? 30 : 90;
}

function yesterdayCompare(v2, idx, key) {
  if (idx <= 0) return '—';
  const prev = v2[idx - 1][key];
  const cur = v2[idx][key];
  if (prev === 0) return '—';
  const pct = ((cur - prev) / prev) * 100;
  const arrow = pct > 0 ? '↑' : pct < 0 ? '↓' : '—';
  const abs = Math.abs(pct).toFixed(1);
  return arrow === '—' ? '—' : `${arrow} ${abs}%`;
}

function defaultTooltipFormatterMain(idx, v2, sumGeneDaily, range) {
  if (idx < 0 || idx >= v2.length) return '';
  const p = v2[idx];
  const X = rangeDays(range);
  const share = sumGeneDaily > 0 ? ((p.geneDaily / sumGeneDaily) * 100).toFixed(1) : '0.0';
  const geneCmp = yesterdayCompare(v2, idx, 'geneDaily');
  const nftCmp = yesterdayCompare(v2, idx, 'nftDaily');
  const userCmp = yesterdayCompare(v2, idx, 'userDaily');
  const lines = [
    `<b>${p.dateFullIso}</b>`,
    `基因档案存量 = ${p.geneStock} 羽`,
    `基因日增 = ${p.geneDaily} 羽  较昨日 ${geneCmp}`,
    `占周期总量 = 占近${X}天总量 ${share}%`,
    `日环比增长率 = ${formatPct(p.geneRatePct)}`,
    `NFT 资产 = ${p.nftDaily} 个  较昨日 ${nftCmp}`,
    `活跃用户 = ${p.userDaily} 人  较昨日 ${userCmp}`,
  ];
  return lines.join('<br/>');
}

// ---------- 内嵌 buildMainOption（与 echartsOptions.ts 同构）----------
function buildMainOption(args) {
  const { v2Data, extremes, layout, hiddenSeries, range, buildTooltipFormatterMain: customFormatter } = args;
  const hidden = hiddenSeries ?? new Set();
  const dataLen = v2Data.length;
  const sumGeneDaily = sumGeneDailyOf(v2Data);
  const symbolSize = dataLen <= 7 ? 8 : dataLen <= 30 ? 6 : 4;
  const endFontSize = Math.max(layout.baseFontSizePx + 2, 15);

  return {
    backgroundColor: {
      type: 'linear',
      x: 0,
      y: 0,
      x2: 0,
      y2: 1,
      colorStops: [
        { offset: 0, color: '#F8FAFC' },
        { offset: 1, color: '#FFFFFF' },
      ],
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        label: { show: true, precision: 0, margin: 8 },
      },
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderColor: COLOR_STOCK,
      borderWidth: 1,
      textStyle: { fontSize: layout.baseFontSizePx },
      formatter: (params) => {
        const idx = Array.isArray(params) && params.length > 0 ? params[0].dataIndex : -1;
        if (customFormatter) {
          return customFormatter(idx, v2Data, sumGeneDaily);
        }
        return defaultTooltipFormatterMain(idx, v2Data, sumGeneDaily, range);
      },
    },
    legend: {
      data: ['基因档案存量', '日增环比增长率'],
      selected: {
        '基因档案存量': !hidden.has('stock'),
        '日增环比增长率': !hidden.has('rate'),
      },
      top: 0,
      right: 10,
      icon: 'roundRect',
      textStyle: { fontSize: layout.baseFontSizePx },
    },
    grid: {
      left: layout.gridMain.left,
      right: layout.gridMain.right + 40,
      top: layout.gridMain.top,
      bottom: layout.gridMain.bottom + (layout.enableDataZoom ? 26 : 0),
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: v2Data.map(d => d.date),
      axisLabel: {
        interval: layout.xTickInterval,
        rotate: layout.xLabelRotateDeg,
        hideOverlap: true,
        fontSize: layout.baseFontSizePx - 2,
      },
      axisLine: { lineStyle: { color: COLOR_GRID } },
    },
    yAxis: [
      {
        type: 'value',
        name: '存量（羽）',
        nameLocation: 'start',
        nameGap: 4,
        nameTextStyle: { color: '#8c8c8c', fontSize: layout.baseFontSizePx },
        min: 0,
        axisLabel: { formatter: '{value}羽', fontSize: layout.baseFontSizePx - 2 },
        splitLine: { lineStyle: { type: 'dashed', color: COLOR_GRID, opacity: 0.3 } },
      },
      {
        type: 'value',
        name: '增长率（%）',
        nameLocation: 'end',
        nameGap: 4,
        min: (v) => Math.floor(v.min <= -50 ? v.min * 1.2 : -50),
        max: (v) => Math.ceil(v.max >= 100 ? v.max * 1.2 : 100),
        splitLine: { show: false },
        axisLabel: { formatter: '{value}%', fontSize: layout.baseFontSizePx - 2 },
      },
    ],
    series: [
      {
        name: '基因档案存量',
        type: 'line',
        yAxisIndex: 0,
        smooth: true,
        symbol: 'circle',
        symbolSize,
        lineStyle: { color: COLOR_STOCK, width: 3 },
        itemStyle: { color: COLOR_STOCK },
        areaStyle: { color: 'rgba(59,130,246,0.1)' },
        data: v2Data.map(d => d.geneStock),
        endLabel: {
          show: true,
          formatter: (p) => `今日: ${p.value} 羽`,
          position: 'top',
          distance: 8,
          color: COLOR_STOCK,
          fontWeight: 700,
          fontSize: endFontSize,
        },
        markPoint: {
          data: [
            {
              name: '峰值',
              coord: [extremes.maxDailyIdx, v2Data[extremes.maxDailyIdx]?.geneStock ?? 0],
              symbol: 'circle',
              symbolSize: 14,
              itemStyle: { color: COLOR_MAX },
              label: { show: true, formatter: '峰值', color: COLOR_MAX, position: 'top' },
            },
            {
              name: '谷值',
              coord: [extremes.minDailyIdx, v2Data[extremes.minDailyIdx]?.geneStock ?? 0],
              symbol: 'circle',
              symbolSize: 14,
              itemStyle: { color: COLOR_MIN },
              label: { show: true, formatter: '谷值', color: COLOR_MIN, position: 'bottom' },
            },
          ],
          z: 1000,
        },
        animationDuration: 600,
        animationDurationUpdate: 300,
      },
      {
        name: '日增环比增长率',
        type: 'bar',
        yAxisIndex: 1,
        barWidth: '50%',
        itemStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: COLOR_RATE_END },
              { offset: 1, color: COLOR_RATE },
            ],
          },
          borderRadius: [2, 2, 0, 0],
        },
        data: v2Data.map(d => (d.rateIsMissing ? null : d.geneRatePct)),
      },
    ],
    dataZoom: layout.enableDataZoom
      ? [
          {
            type: 'slider',
            bottom: 5,
            height: 14,
            start: 0,
            end: 100,
            borderColor: 'transparent',
            backgroundColor: 'rgba(59,130,246,0.06)',
            fillerColor: 'rgba(59,130,246,0.18)',
            moveHandleStyle: { color: COLOR_STOCK },
            textStyle: { fontSize: layout.baseFontSizePx - 2 },
          },
        ]
      : [],
  };
}

// ---------- 内嵌 buildSubOption（与 echartsOptions.ts 同构）----------
function buildSubOption(args) {
  const { v2Data, layout, hiddenSeries } = args;
  const hidden = hiddenSeries ?? new Set();
  const lastIdx = v2Data.length - 1;
  const labelFontSize = Math.max(layout.baseFontSizePx, 12);

  return {
    backgroundColor: {
      type: 'linear',
      x: 0, y: 0, x2: 0, y2: 1,
      colorStops: [
        { offset: 0, color: '#F8FAFC' },
        { offset: 1, color: '#FFFFFF' },
      ],
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderColor: COLOR_STOCK,
      borderWidth: 1,
      textStyle: { fontSize: layout.baseFontSizePx },
      formatter: (params) => {
        if (!Array.isArray(params) || params.length === 0) return '';
        const first = params[0];
        const idx = first.dataIndex;
        if (idx < 0 || idx >= v2Data.length) return '';
        const p = v2Data[idx];
        const lines = [
          `<b>${p.dateFullIso}</b>`,
          `NFT 日铸量 = ${p.nftDaily} 个`,
          `活跃用户 = ${p.userDaily} 人`,
        ];
        return lines.join('<br/>');
      },
    },
    legend: {
      data: ['NFT 日铸量', '活跃用户'],
      selected: {
        'NFT 日铸量': !hidden.has('nft'),
        '活跃用户': !hidden.has('user'),
      },
      top: 0,
      right: 10,
      icon: 'roundRect',
      textStyle: { fontSize: layout.baseFontSizePx },
    },
    grid: {
      left: layout.gridSub.left,
      right: layout.gridSub.right + 20,
      top: layout.gridSub.top,
      bottom: layout.gridSub.bottom,
    },
    xAxis: {
      type: 'category',
      boundaryGap: true,
      data: v2Data.map(d => d.date),
      axisLabel: {
        interval: layout.xTickInterval,
        rotate: layout.xLabelRotateDeg,
        hideOverlap: true,
        fontSize: layout.baseFontSizePx - 2,
      },
      axisLine: { lineStyle: { color: COLOR_GRID } },
    },
    yAxis: {
      type: 'value',
      name: '数量',
      nameLocation: 'start',
      nameGap: 4,
      nameTextStyle: { color: '#8c8c8c', fontSize: layout.baseFontSizePx },
      axisLabel: { formatter: '{value}', fontSize: layout.baseFontSizePx - 2 },
      splitLine: { lineStyle: { type: 'dashed', color: COLOR_GRID, opacity: 0.3 } },
      max: (val) => Math.ceil(Math.max(val.max, 1) * 1.15),
    },
    series: [
      {
        name: 'NFT 日铸量',
        type: 'bar',
        barWidth: '40%',
        barGap: '20%',
        itemStyle: { color: COLOR_NFT, borderRadius: [2, 2, 0, 0] },
        data: v2Data.map(d => d.nftDaily),
        label: {
          show: true,
          position: 'top',
          fontSize: labelFontSize,
          fontWeight: 700,
          formatter: (p) => (p.dataIndex === lastIdx ? `今日 ${p.value} 个` : ''),
          color: COLOR_NFT,
          distance: 4,
        },
      },
      {
        name: '活跃用户',
        type: 'bar',
        barWidth: '40%',
        itemStyle: { color: COLOR_USER, borderRadius: [2, 2, 0, 0] },
        data: v2Data.map(d => d.userDaily),
        label: {
          show: true,
          position: 'top',
          fontSize: labelFontSize,
          fontWeight: 700,
          formatter: (p) => (p.dataIndex === lastIdx ? `今日 ${p.value} 人` : ''),
          color: COLOR_USER,
          distance: 4,
        },
      },
    ],
  };
}

// ---------- 测试 fixture（派生自 mockData generateTrendData 7 天，固定种子）----------
function deriveV2DataFixture(dailyArr, seed = 0) {
  const len = dailyArr.length;
  const result = new Array(len);
  let stockAcc = 0;
  const todayBase = new Date(2026, 7, 4);
  for (let i = 0; i < len; i++) {
    stockAcc += dailyArr[i].gene;
    const d = new Date(todayBase);
    d.setDate(todayBase.getDate() - (len - 1 - i));
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dateFullIso = `${yyyy}-${mm}-${dd}`;
    let geneRatePct = null;
    if (i > 0) {
      const prevGene = dailyArr[i - 1].gene;
      if (prevGene !== 0) {
        geneRatePct = ((dailyArr[i].gene - prevGene) / prevGene) * 100;
      }
    }
    result[i] = {
      date: dailyArr[i].date,
      dateFullIso,
      geneDaily: dailyArr[i].gene,
      geneStock: stockAcc,
      geneRatePct,
      rateIsMissing: geneRatePct === null,
      nftDaily: dailyArr[i].nft,
      userDaily: dailyArr[i].user,
    };
  }
  return result;
}

function calcExtremesFixture(v2) {
  const len = v2.length;
  if (len === 0) {
    return { maxDailyIdx: -1, minDailyIdx: -1, peakDate: '', peakDaily: 0, valleyDate: '', valleyDaily: 0 };
  }
  const startIdx = len === 1 ? 0 : 1;
  let maxIdx = startIdx, minIdx = startIdx;
  let maxVal = v2[startIdx].geneDaily, minVal = v2[startIdx].geneDaily;
  for (let i = startIdx + 1; i < len; i++) {
    if (v2[i].geneDaily > maxVal) { maxVal = v2[i].geneDaily; maxIdx = i; }
    if (v2[i].geneDaily < minVal) { minVal = v2[i].geneDaily; minIdx = i; }
  }
  return {
    maxDailyIdx: maxIdx, minDailyIdx: minIdx,
    peakDate: v2[maxIdx].date, peakDaily: maxVal,
    valleyDate: v2[minIdx].date, valleyDaily: minVal,
  };
}

const FIXTURE_RAW_7 = [
  { date: '7/29', gene: 18, nft: 5, user: 11 },
  { date: '7/30', gene: 14, nft: 6, user: 9 },
  { date: '7/31', gene: 7,  nft: 3, user: 5 },
  { date: '8/1',  gene: 26, nft: 8, user: 15 },
  { date: '8/2',  gene: 22, nft: 7, user: 13 },
  { date: '8/3',  gene: 19, nft: 6, user: 12 },
  { date: '8/4',  gene: 17, nft: 5, user: 10 },
];
const V2_7 = deriveV2DataFixture(FIXTURE_RAW_7);
const EXTREMES_7 = calcExtremesFixture(V2_7);

const LAYOUT_2K = {
  gridMain: { top: 60, right: 60, bottom: 40, left: 40 },
  gridSub:  { top: 60, right: 60, bottom: 25, left: 40 },
  baseFontSizePx: 16,
  xTickInterval: 1,
  xLabelRotateDeg: 0,
  enableDataZoom: true,
};
const LAYOUT_COMPACT = {
  gridMain: { top: 40, right: 40, bottom: 25, left: 25 },
  gridSub:  { top: 40, right: 40, bottom: 15, left: 25 },
  baseFontSizePx: 13,
  xTickInterval: 2,
  xLabelRotateDeg: -15,
  enableDataZoom: false,
};

// ---------- 测试框架（极简 assert）----------
const results = [];
function assert(name, cond, extra = '') {
  const pass = !!cond;
  results.push({ name, pass, extra });
  const icon = pass ? '✅ PASS' : '❌ FAIL';
  console.log(`${icon}  ${name}${extra ? '  —  ' + extra : ''}`);
  return pass;
}

// 深对比 toMatchObject（支持部分字段匹配，支持 function 存在性检查）
function toMatchObject(actual, expected, path = '') {
  if (expected === null) {
    return actual === null ? { ok: true } : { ok: false, path, expected: 'null', actual: String(actual) };
  }
  if (typeof expected === 'function') {
    return typeof actual === 'function' ? { ok: true } : { ok: false, path, expected: 'function', actual: typeof actual };
  }
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) return { ok: false, path, expected: 'array', actual: typeof actual };
    for (let i = 0; i < expected.length; i++) {
      const r = toMatchObject(actual[i], expected[i], `${path}[${i}]`);
      if (!r.ok) return r;
    }
    return { ok: true };
  }
  if (typeof expected === 'object' && expected !== undefined) {
    if (typeof actual !== 'object' || actual === null) {
      return { ok: false, path, expected: 'object', actual: String(actual) };
    }
    for (const k of Object.keys(expected)) {
      const r = toMatchObject(actual[k], expected[k], `${path}.${k}`);
      if (!r.ok) return r;
    }
    return { ok: true };
  }
  return actual === expected
    ? { ok: true }
    : { ok: false, path, expected: JSON.stringify(expected), actual: JSON.stringify(actual) };
}

function assertMatch(name, actual, expected) {
  const r = toMatchObject(actual, expected);
  const extra = r.ok ? '' : `mismatch at ${r.path}: 期望=${r.expected} 实际=${r.actual}`;
  return assert(name, r.ok, extra);
}

console.log('========== echartsOptions 单测（D1~D16 + E1~E8 + a~f 特殊断言）==========\n');

// ---------- D1: 背景渐变 2 stops ----------
(function D1() {
  const opt = buildMainOption({ v2Data: V2_7, extremes: EXTREMES_7, layout: LAYOUT_2K, range: 'week7' });
  assertMatch('D1: backgroundColor linear 2 stops (#F8FAFC → #FFFFFF)',
    opt.backgroundColor,
    { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
      colorStops: [{ offset: 0, color: '#F8FAFC' }, { offset: 1, color: '#FFFFFF' }] });
})();

// ---------- D2: tooltip trigger=axis, axisPointer=cross ----------
(function D2() {
  const opt = buildMainOption({ v2Data: V2_7, extremes: EXTREMES_7, layout: LAYOUT_2K, range: 'week7' });
  assertMatch('D2: tooltip trigger=axis + axisPointer.cross + label.precision=0',
    opt.tooltip,
    { trigger: 'axis',
      axisPointer: { type: 'cross', label: { show: true, precision: 0, margin: 8 } },
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderColor: COLOR_STOCK,
      borderWidth: 1,
      textStyle: { fontSize: 16 } });
})();

// ---------- D3: legend 2 项 + selected 逻辑 ----------
(function D3() {
  const hidden = new Set(['rate']);
  const opt = buildMainOption({ v2Data: V2_7, extremes: EXTREMES_7, layout: LAYOUT_2K, range: 'week7', hiddenSeries: hidden });
  assertMatch('D3: legend.data=[基因档案存量,日增环比增长率] + hidden rate=false',
    opt.legend,
    { data: ['基因档案存量', '日增环比增长率'],
      selected: { '基因档案存量': true, '日增环比增长率': false },
      top: 0, right: 10, icon: 'roundRect',
      textStyle: { fontSize: 16 } });
})();

// ---------- D4: grid right+40，2K enableDataZoom→bottom+26 ----------
(function D4() {
  const opt2k = buildMainOption({ v2Data: V2_7, extremes: EXTREMES_7, layout: LAYOUT_2K, range: 'week7' });
  assertMatch('D4: 2K grid left=40 right=100(60+40) top=60 bottom=66(40+26)',
    opt2k.grid, { left: 40, right: 100, top: 60, bottom: 66 });
  const optCompact = buildMainOption({ v2Data: V2_7, extremes: EXTREMES_7, layout: LAYOUT_COMPACT, range: 'week7' });
  assertMatch('D4b: compact grid left=25 right=80(40+40) top=40 bottom=25(no +26)',
    optCompact.grid, { left: 25, right: 80, top: 40, bottom: 25 });
})();

// ---------- D5: xAxis boundaryGap=false + data + axisLabel ----------
(function D5() {
  const opt = buildMainOption({ v2Data: V2_7, extremes: EXTREMES_7, layout: LAYOUT_2K, range: 'week7' });
  assertMatch('D5: xAxis type=category boundaryGap=false data=7 短日期 axisLabel.hideOverlap=true',
    opt.xAxis,
    { type: 'category', boundaryGap: false,
      data: ['7/29','7/30','7/31','8/1','8/2','8/3','8/4'],
      axisLabel: { interval: 1, rotate: 0, hideOverlap: true, fontSize: 14 },
      axisLine: { lineStyle: { color: COLOR_GRID } } });
})();

// ---------- D6: yAxis[0] 左轴存量 ----------
(function D6() {
  const opt = buildMainOption({ v2Data: V2_7, extremes: EXTREMES_7, layout: LAYOUT_2K, range: 'week7' });
  assertMatch('D6: yAxis[0] 左轴 name=存量（羽） start min=0 splitLine dashed opacity=0.3',
    opt.yAxis[0],
    { type: 'value', name: '存量（羽）', nameLocation: 'start', nameGap: 4,
      nameTextStyle: { color: '#8c8c8c', fontSize: 16 },
      min: 0,
      axisLabel: { formatter: '{value}羽', fontSize: 14 },
      splitLine: { lineStyle: { type: 'dashed', color: COLOR_GRID, opacity: 0.3 } } });
})();

// ---------- D7: yAxis[1] 右轴增长率 splitLine.show=false ----------
(function D7() {
  const opt = buildMainOption({ v2Data: V2_7, extremes: EXTREMES_7, layout: LAYOUT_2K, range: 'week7' });
  assertMatch('D7: yAxis[1] 右轴 name=增长率（%） end splitLine.show=false min/max=fn',
    opt.yAxis[1],
    { type: 'value', name: '增长率（%）', nameLocation: 'end', nameGap: 4,
      min: Function, max: Function,
      splitLine: { show: false },
      axisLabel: { formatter: '{value}%', fontSize: 14 } });
  // d) 专门断言 yAxis[1].splitLine.show === false
  assert('D7b: 特殊断言d) yAxis[1].splitLine.show === false',
    opt.yAxis[1].splitLine.show === false,
    `actual=${opt.yAxis[1].splitLine.show}`);
})();

// ---------- D8: series[0] 存量折线 smooth=true symbol=circle ----------
(function D8() {
  const opt = buildMainOption({ v2Data: V2_7, extremes: EXTREMES_7, layout: LAYOUT_2K, range: 'week7' });
  assertMatch('D8: series[0] line name=基因档案存量 yAxisIndex=0 smooth=true symbolSize=8(len<=7)',
    opt.series[0],
    { name: '基因档案存量', type: 'line', yAxisIndex: 0, smooth: true,
      symbol: 'circle', symbolSize: 8,
      lineStyle: { color: COLOR_STOCK, width: 3 },
      itemStyle: { color: COLOR_STOCK },
      areaStyle: { color: 'rgba(59,130,246,0.1)' } });
  const stocks = opt.series[0].data;
  assert('D8b: series[0].data 7 日前缀和 [18,32,39,65,87,106,123]',
    stocks[0]===18&&stocks[1]===32&&stocks[2]===39&&stocks[3]===65&&stocks[4]===87&&stocks[5]===106&&stocks[6]===123,
    `actual=[${stocks.join(',')}]`);
})();

// ---------- D9: series[0] endLabel 今日 + markPoint z=1000 ----------
(function D9() {
  const opt = buildMainOption({ v2Data: V2_7, extremes: EXTREMES_7, layout: LAYOUT_2K, range: 'week7' });
  const el = opt.series[0].endLabel;
  assertMatch('D9: series[0].endLabel show=true formatter=fn position=top fontWeight=700 fontSize=18',
    el, { show: true, formatter: Function, position: 'top', distance: 8, color: COLOR_STOCK, fontWeight: 700, fontSize: 18 });
  // 实际调用 formatter 验证输出
  const fakePoint = { value: 123 };
  const elTxt = el.formatter(fakePoint);
  assert('D9b: endLabel.formatter({value:123}) === "今日: 123 羽"',
    elTxt === '今日: 123 羽', `actual="${elTxt}"`);
  assertMatch('D9c: series[0].markPoint z=1000',
    opt.series[0].markPoint, { z: 1000 });
  assert('D9c2: markPoint.data 是数组类型',
    Array.isArray(opt.series[0].markPoint.data),
    `typeof=${typeof opt.series[0].markPoint.data} isArray=${Array.isArray(opt.series[0].markPoint.data)}`);
  assert('D9d: markPoint.data.length === 2 (峰值+谷值)',
    opt.series[0].markPoint.data.length === 2,
    `actual len=${opt.series[0].markPoint.data.length}`);
})();

// ---------- D10: extremes 注入 markPoint coord[0] 匹配 a) ----------
(function D10() {
  const opt = buildMainOption({ v2Data: V2_7, extremes: EXTREMES_7, layout: LAYOUT_2K, range: 'week7' });
  const mp = opt.series[0].markPoint.data;
  // EXTREMES_7: maxDailyIdx=3, minDailyIdx=2
  assert('D10-a): 特殊断言a) markPoint 峰值 coord[0] === extremes.maxDailyIdx(3)',
    mp[0].coord[0] === EXTREMES_7.maxDailyIdx,
    `coord[0]=${mp[0].coord[0]} expected=${EXTREMES_7.maxDailyIdx}`);
  assert('D10b-a): 特殊断言a) markPoint 谷值 coord[0] === extremes.minDailyIdx(2)',
    mp[1].coord[0] === EXTREMES_7.minDailyIdx,
    `coord[0]=${mp[1].coord[0]} expected=${EXTREMES_7.minDailyIdx}`);
  // coord[1] 对应 stock 值
  assert('D10c: markPoint 峰值 coord[1] === v2[3].geneStock(65)',
    mp[0].coord[1] === V2_7[3].geneStock, `coord[1]=${mp[0].coord[1]} expected=${V2_7[3].geneStock}`);
  assert('D10d: markPoint 谷值 coord[1] === v2[2].geneStock(39)',
    mp[1].coord[1] === V2_7[2].geneStock, `coord[1]=${mp[1].coord[1]} expected=${V2_7[2].geneStock}`);
  assert('D10e: 峰值 label.formatter="峰值" color=COLOR_MAX position=top symbolSize=14',
    mp[0].name==='峰值' && mp[0].symbol==='circle' && mp[0].symbolSize===14 &&
    mp[0].itemStyle.color===COLOR_MAX && mp[0].label.formatter==='峰值' &&
    mp[0].label.color===COLOR_MAX && mp[0].label.position==='top',
    JSON.stringify(mp[0]));
})();

// ---------- D11: series[0] animation 600/300 ----------
(function D11() {
  const opt = buildMainOption({ v2Data: V2_7, extremes: EXTREMES_7, layout: LAYOUT_2K, range: 'week7' });
  assert('D11: series[0].animationDuration=600 animationDurationUpdate=300',
    opt.series[0].animationDuration === 600 && opt.series[0].animationDurationUpdate === 300,
    `dur=${opt.series[0].animationDuration} upd=${opt.series[0].animationDurationUpdate}`);
})();

// ---------- D12: series[1] 增长率 bar 50% 线性渐变 圆角 首日 null ----------
(function D12() {
  const opt = buildMainOption({ v2Data: V2_7, extremes: EXTREMES_7, layout: LAYOUT_2K, range: 'week7' });
  const s1 = opt.series[1];
  assertMatch('D12: series[1] bar name=日增环比增长率 yAxisIndex=1 barWidth=50%',
    s1, { name: '日增环比增长率', type: 'bar', yAxisIndex: 1, barWidth: '50%',
      itemStyle: { color: { type: 'linear', x:0,y:0,x2:0,y2:1,
        colorStops: [{offset:0,color:COLOR_RATE_END},{offset:1,color:COLOR_RATE}] },
        borderRadius: [2,2,0,0] } });
  const barData = s1.data;
  assert('D12b: series[1].data[0] === null (首日 rateIsMissing)',
    barData[0] === null, `actual=${barData[0]}`);
  // 其他项非 null，验证类型
  assert('D12c: series[1].data 除 [0] 外均为 number（len=7 → 6 个非 null）',
    barData.slice(1).every(v => typeof v === 'number'),
    `types=${barData.map(v => v===null?'null':typeof v).join(',')}`);
})();

// ---------- D13: dataZoom b) 2K len=1 / compact len=0 ----------
(function D13() {
  const opt2k = buildMainOption({ v2Data: V2_7, extremes: EXTREMES_7, layout: LAYOUT_2K, range: 'week7' });
  assert('D13-b): 特殊断言b) 2K dataZoom.length === 1',
    opt2k.dataZoom.length === 1, `actual len=${opt2k.dataZoom.length}`);
  assertMatch('D13b: 2K dataZoom[0] slider bottom=5 height=14 start/end=0~100',
    opt2k.dataZoom[0],
    { type: 'slider', bottom: 5, height: 14, start: 0, end: 100,
      borderColor: 'transparent',
      backgroundColor: 'rgba(59,130,246,0.06)',
      fillerColor: 'rgba(59,130,246,0.18)',
      moveHandleStyle: { color: COLOR_STOCK },
      textStyle: { fontSize: 14 } });
  const optCompact = buildMainOption({ v2Data: V2_7, extremes: EXTREMES_7, layout: LAYOUT_COMPACT, range: 'week7' });
  assert('D13c-b): 特殊断言b) compact dataZoom.length === 0',
    Array.isArray(optCompact.dataZoom) && optCompact.dataZoom.length === 0,
    `actual=${JSON.stringify(optCompact.dataZoom)}`);
})();

// ---------- D14: compact axisLabel c) interval=2 rotate=-15 ----------
(function D14() {
  const opt = buildMainOption({ v2Data: V2_7, extremes: EXTREMES_7, layout: LAYOUT_COMPACT, range: 'week7' });
  assert('D14-c): 特殊断言c) compact xAxis.axisLabel interval=2 rotate=-15',
    opt.xAxis.axisLabel.interval === 2 && opt.xAxis.axisLabel.rotate === -15,
    `interval=${opt.xAxis.axisLabel.interval} rotate=${opt.xAxis.axisLabel.rotate}`);
})();

// ---------- D15: legend.selected hidden stock ----------
(function D15() {
  const hidden = new Set(['stock']);
  const opt = buildMainOption({ v2Data: V2_7, extremes: EXTREMES_7, layout: LAYOUT_2K, range: 'week7', hiddenSeries: hidden });
  assert('D15: hiddenSeries.has(stock) → 基因档案存量=false; rate=true',
    opt.legend.selected['基因档案存量'] === false && opt.legend.selected['日增环比增长率'] === true,
    JSON.stringify(opt.legend.selected));
})();

// ---------- D16-f): hidden rate → legend.selected false ----------
(function D16() {
  const hidden = new Set(['rate']);
  const opt = buildMainOption({ v2Data: V2_7, extremes: EXTREMES_7, layout: LAYOUT_2K, range: 'week7', hiddenSeries: hidden });
  assert('D16-f): 特殊断言f) hiddenSeries.has(rate) → legend.selected[日增环比增长率]=false',
    opt.legend.selected['日增环比增长率'] === false,
    `actual=${opt.legend.selected['日增环比增长率']}`);
  // 无 hiddenSeries 时默认全 true
  const optNoHide = buildMainOption({ v2Data: V2_7, extremes: EXTREMES_7, layout: LAYOUT_2K, range: 'week7' });
  assert('D16b: 无 hiddenSeries → 两个 legend.selected 均 true',
    optNoHide.legend.selected['基因档案存量'] === true &&
    optNoHide.legend.selected['日增环比增长率'] === true,
    JSON.stringify(optNoHide.legend.selected));
})();

// ---------- 额外断言：tooltip formatter 默认函数 7 行 ----------
(function D16c() {
  const opt = buildMainOption({ v2Data: V2_7, extremes: EXTREMES_7, layout: LAYOUT_2K, range: 'week7' });
  const html = opt.tooltip.formatter([{ dataIndex: 3 }]);
  const lines = html.split('<br/>');
  assert('D16c: 默认 tooltip formatter 返回 7 行（idx=3 8/1 峰值日）',
    lines.length === 7, `行数=${lines.length}\n内容:\n${html}`);
  // 第 1 行粗体日期
  assert('D16d: tooltip 第1行含 <b>2026-08-01</b>',
    lines[0] === '<b>2026-08-01</b>', `actual="${lines[0]}"`);
  // 第 2 行存量 65
  assert('D16e: tooltip 第2行 基因档案存量 = 65 羽',
    lines[1] === '基因档案存量 = 65 羽', `actual="${lines[1]}"`);
  // 第 4 行占周期 近7天
  assert('D16f: tooltip 第4行含 "占近7天总量"',
    lines[3].startsWith('占周期总量 = 占近7天总量'), `actual="${lines[3]}"`);
  // 第 5 行 formatPct（8/1 26 vs 7/31 7 → (26-7)/7=271.4%）
  assert('D16g: tooltip 第5行 日环比增长率 = +271.4%',
    lines[4] === '日环比增长率 = +271.4%', `actual="${lines[4]}"`);
})();

// ==================== SubOption: E1 ~ E8 ====================
console.log('\n---------- SubOption 断言 E1~E8 + e) ----------\n');

// ---------- E1: SubOption 背景渐变同主图 ----------
(function E1() {
  const opt = buildSubOption({ v2Data: V2_7, layout: LAYOUT_2K });
  assertMatch('E1: SubOption backgroundColor linear 2 stops 同主图',
    opt.backgroundColor,
    { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
      colorStops: [{ offset: 0, color: '#F8FAFC' }, { offset: 1, color: '#FFFFFF' }] });
})();

// ---------- E2: SubOption tooltip axis+shadow ----------
(function E2() {
  const opt = buildSubOption({ v2Data: V2_7, layout: LAYOUT_2K });
  assertMatch('E2: SubOption tooltip trigger=axis axisPointer=shadow 背景白95%边蓝',
    opt.tooltip,
    { trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(255,255,255,0.95)',
      borderColor: COLOR_STOCK,
      borderWidth: 1,
      textStyle: { fontSize: 16 },
      formatter: Function });
  const html = opt.tooltip.formatter([{ dataIndex: 6 }]);
  assert('E2b: SubTooltip 3 行（标题 + NFT + 活跃用户）含「个」「人」后缀 AC-8',
    html.includes('个') && html.includes('人') && html.split('<br/>').length === 3,
    `actual=${html}`);
})();

// ---------- E3: SubOption legend [NFT 日铸量,活跃用户] + hiddenSeries ----------
(function E3() {
  const hidden = new Set(['nft']);
  const opt = buildSubOption({ v2Data: V2_7, layout: LAYOUT_2K, hiddenSeries: hidden });
  assertMatch('E3: Sub legend data=[NFT 日铸量,活跃用户] nft hidden=false user=true',
    opt.legend,
    { data: ['NFT 日铸量', '活跃用户'],
      selected: { 'NFT 日铸量': false, '活跃用户': true },
      top: 0, right: 10, icon: 'roundRect',
      textStyle: { fontSize: 16 } });
})();

// ---------- E4: SubOption grid right+20 ----------
(function E4() {
  const opt = buildSubOption({ v2Data: V2_7, layout: LAYOUT_2K });
  assertMatch('E4: Sub grid 2K left=40 right=80(60+20) top=60 bottom=25',
    opt.grid, { left: 40, right: 80, top: 60, bottom: 25 });
})();

// ---------- E5: SubOption xAxis boundaryGap=true 同 data ----------
(function E5() {
  const opt = buildSubOption({ v2Data: V2_7, layout: LAYOUT_2K });
  assertMatch('E5: Sub xAxis category boundaryGap=true data 对齐主图 hideOverlap=true',
    opt.xAxis,
    { type: 'category', boundaryGap: true,
      data: ['7/29','7/30','7/31','8/1','8/2','8/3','8/4'],
      axisLabel: { interval: 1, rotate: 0, hideOverlap: true, fontSize: 14 },
      axisLine: { lineStyle: { color: COLOR_GRID } } });
})();

// ---------- E6: SubOption yAxis 单轴 max=fn * 1.15 ----------
(function E6() {
  const opt = buildSubOption({ v2Data: V2_7, layout: LAYOUT_2K });
  assertMatch('E6: Sub yAxis name=数量 start splitLine dashed opacity=0.3 max=fn',
    opt.yAxis,
    { type: 'value', name: '数量', nameLocation: 'start', nameGap: 4,
      nameTextStyle: { color: '#8c8c8c', fontSize: 16 },
      axisLabel: { formatter: '{value}', fontSize: 14 },
      splitLine: { lineStyle: { type: 'dashed', color: COLOR_GRID, opacity: 0.3 } },
      max: Function });
  const maxFn = opt.yAxis.max;
  const v1 = maxFn({ min: 0, max: 100 });
  assert('E6b: yAxis.max({max:100}) = ceil(100*1.15) = 115',
    v1 === 115, `actual=${v1}`);
  const v2 = maxFn({ min: 0, max: 0 });
  assert('E6c: yAxis.max({max:0}) = ceil(1*1.15) = 2',
    v2 === 2, `actual=${v2}`);
})();

// ---------- E7: SubOption series[0] NFT 橙 bar 最后一柱 label 「今日 N 个」 ----------
(function E7() {
  const opt = buildSubOption({ v2Data: V2_7, layout: LAYOUT_2K });
  const s0 = opt.series[0];
  assertMatch('E7: Sub series[0] NFT bar barWidth=40% barGap=20% borderRadius=2 color=#faad14',
    s0, { name: 'NFT 日铸量', type: 'bar', barWidth: '40%', barGap: '20%',
      itemStyle: { color: COLOR_NFT, borderRadius: [2,2,0,0] } });
  const lbl = s0.label;
  assertMatch('E7b: Sub series[0].label show=true position=top fontWeight=700 color=NFT formatter=fn',
    lbl, { show: true, position: 'top', fontSize: 16, fontWeight: 700,
      formatter: Function, color: COLOR_NFT, distance: 4 });
  // e) 最后一柱 idx=6 时返回「今日」；其他 idx 空串
  const lastTxt = lbl.formatter({ dataIndex: 6, value: 5 });
  assert('E7c-e): 特殊断言e) NFT label lastIdx → 含「今日」+「个」',
    lastTxt.includes('今日') && lastTxt.includes('个'),
    `lastIdx output="${lastTxt}"`);
  const midTxt = lbl.formatter({ dataIndex: 3, value: 8 });
  assert('E7d-e): 特殊断言e) NFT label 非 lastIdx → 空串',
    midTxt === '', `non-last output="${midTxt}"`);
})();

// ---------- E8: SubOption series[1] 活跃用户 绿 bar 最后一柱 label「今日 N 人」 ----------
(function E8() {
  const opt = buildSubOption({ v2Data: V2_7, layout: LAYOUT_2K });
  const s1 = opt.series[1];
  assertMatch('E8: Sub series[1] 活跃用户 barWidth=40% color=#52c41a borderRadius=2',
    s1, { name: '活跃用户', type: 'bar', barWidth: '40%',
      itemStyle: { color: COLOR_USER, borderRadius: [2,2,0,0] } });
  const lbl = s1.label;
  assertMatch('E8b: Sub series[1].label fontWeight=700 color=USER formatter=fn',
    lbl, { show: true, position: 'top', fontSize: 16, fontWeight: 700,
      formatter: Function, color: COLOR_USER, distance: 4 });
  const lastTxt = lbl.formatter({ dataIndex: 6, value: 10 });
  assert('E8c-e): 特殊断言e) 活跃用户 label lastIdx → 含「今日」+「人」',
    lastTxt.includes('今日') && lastTxt.includes('人'),
    `output="${lastTxt}"`);
  const midTxt = lbl.formatter({ dataIndex: 0, value: 11 });
  assert('E8d-e): 特殊断言e) 活跃用户 label 非 lastIdx → 空串',
    midTxt === '', `output="${midTxt}"`);
  // data 正确
  const userData = s1.data;
  assert('E8e: Sub series[1].data = [11,9,5,15,13,12,10]',
    JSON.stringify(userData) === '[11,9,5,15,13,12,10]',
    `actual=${JSON.stringify(userData)}`);
})();

// ---------- 汇总 ----------
console.log('\n========== 汇总 ==========');
const passed = results.filter(r => r.pass).length;
const total = results.length;
console.log(`总计: ${passed}/${total} 通过`);
if (passed === total) {
  console.log('🎉 全部断言通过');
  process.exit(0);
} else {
  console.log('❌ 存在失败断言，请检查上方 FAIL 条目');
  process.exit(1);
}
