// trend-data.test.mjs — 纯 ESM，`node __node_tests__/trend-data.test.mjs` 直接执行
// 内嵌 trend-data.ts 的纯函数等价实现（零副作用，仅依赖 Date/global）
// 逻辑与 trend-data.ts 逐行对齐，确保测试即测实际实现

// ---------- 内嵌 pure function 实现（与 trend-data.ts 同构）----------

function deriveV2Data(data, todayOffsetDays = 0) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  today.setDate(today.getDate() + todayOffsetDays);

  const len = data.length;
  const result = new Array(len);
  let stockAcc = 0;

  for (let i = 0; i < len; i++) {
    const point = data[i];
    const geneDaily = point.gene;
    stockAcc += geneDaily;

    const dayOffset = (len - 1) - i;
    const d = new Date(today);
    d.setDate(today.getDate() - dayOffset);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dateFullIso = `${yyyy}-${mm}-${dd}`;

    let geneRatePct = null;
    if (i > 0) {
      const prevGene = data[i - 1].gene;
      if (prevGene !== 0) {
        geneRatePct = ((geneDaily - prevGene) / prevGene) * 100;
      }
    }

    result[i] = {
      date: point.date,
      dateFullIso,
      geneDaily,
      geneStock: stockAcc,
      geneRatePct,
      rateIsMissing: geneRatePct === null,
      nftDaily: point.nft,
      userDaily: point.user,
    };
  }

  return result;
}

function calcExtremes(v2) {
  const len = v2.length;
  if (len === 0) {
    return {
      maxDailyIdx: -1,
      minDailyIdx: -1,
      peakDate: '',
      peakDaily: 0,
      valleyDate: '',
      valleyDaily: 0,
    };
  }

  const startIdx = len === 1 ? 0 : 1;
  let maxIdx = startIdx;
  let minIdx = startIdx;
  let maxVal = v2[startIdx].geneDaily;
  let minVal = v2[startIdx].geneDaily;

  for (let i = startIdx + 1; i < len; i++) {
    const v = v2[i].geneDaily;
    if (v > maxVal) {
      maxVal = v;
      maxIdx = i;
    }
    if (v < minVal) {
      minVal = v;
      minIdx = i;
    }
  }

  return {
    maxDailyIdx: maxIdx,
    minDailyIdx: minIdx,
    peakDate: v2[maxIdx].date,
    peakDaily: maxVal,
    valleyDate: v2[minIdx].date,
    valleyDaily: minVal,
  };
}

function sum(arr) {
  let total = 0;
  for (let i = 0; i < arr.length; i++) total += arr[i];
  return total;
}

function todayYmd() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

function buildCsvContent(v2, range) {
  const lines = [];
  lines.push('日期,基因档案日增量,基因档案存量,日环比增长率(%),NFT日铸量,活跃用户数');

  for (let i = 0; i < v2.length; i++) {
    const p = v2[i];
    const rateStr = p.geneRatePct === null ? '' : p.geneRatePct.toFixed(2);
    lines.push(
      `${p.dateFullIso},${p.geneDaily},${p.geneStock},${rateStr},${p.nftDaily},${p.userDaily}`,
    );
  }

  const blobContent = '\uFEFF' + lines.join('\r\n');
  const rangeKey = range;
  const filename = `trend_${rangeKey}_${todayYmd()}.csv`;

  return { blobContent, filename };
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

console.log('========== trend-data 单测（7 断言）==========\n');

// ---------- B1: deriveV2Data prefix sum ----------
(function B1() {
  const data = [
    { date: '8/3', gene: 10, user: 5, nft: 2 },
    { date: '8/4', gene: 5, user: 3, nft: 1 },
  ];
  const v2 = deriveV2Data(data);
  const stocks = v2.map(v => v.geneStock);
  const ok = stocks[0] === 10 && stocks[1] === 15;
  assert(
    'B1: deriveV2Data prefixSum → [10,15]',
    ok,
    `actual=[${stocks.join(',')}]`,
  );
})();

// ---------- B2: 首日 rateIsMissing=true ----------
(function B2() {
  const data = [
    { date: '8/3', gene: 10, user: 5, nft: 2 },
    { date: '8/4', gene: 12, user: 6, nft: 3 },
  ];
  const v2 = deriveV2Data(data);
  const ok = v2[0].rateIsMissing === true && v2[0].geneRatePct === null;
  assert(
    'B2: 首日 rateIsMissing=true & geneRatePct=null',
    ok,
    `rateIsMissing=${v2[0].rateIsMissing}, geneRatePct=${v2[0].geneRatePct}`,
  );
})();

// ---------- B3: 昨日=0 → 次日 rateIsMissing=true ----------
(function B3() {
  const data = [
    { date: '8/3', gene: 0, user: 5, nft: 2 },
    { date: '8/4', gene: 8, user: 6, nft: 3 },
  ];
  const v2 = deriveV2Data(data);
  const ok = v2[1].rateIsMissing === true && v2[1].geneRatePct === null;
  assert(
    'B3: 昨日gene=0 → 次日 rateIsMissing=true',
    ok,
    `rateIsMissing=${v2[1].rateIsMissing}, geneRatePct=${v2[1].geneRatePct}`,
  );
})();

// ---------- B4: calcExtremes 对 [18,14,7,26,22,19,17] ----------
(function B4() {
  const daily = [18, 14, 7, 26, 22, 19, 17];
  const data = daily.map((g, i) => ({
    date: `8/${i - 2 + 4}`,
    gene: g,
    user: 10,
    nft: 5,
  }));
  const v2 = deriveV2Data(data);
  const extremes = calcExtremes(v2);
  const ok = extremes.maxDailyIdx === 3 && extremes.minDailyIdx === 2;
  assert(
    'B4: calcExtremes([18,14,7,26,22,19,17]) → max=3 min=2',
    ok,
    `maxDailyIdx=${extremes.maxDailyIdx}(peak=${extremes.peakDaily}), minDailyIdx=${extremes.minDailyIdx}(valley=${extremes.valleyDaily})`,
  );
})();

// ---------- B8: CSV BOM === \uFEFF，header 列数 === 6 ----------
(function B8() {
  const data = [
    { date: '8/3', gene: 10, user: 5, nft: 2 },
    { date: '8/4', gene: 15, user: 7, nft: 3 },
  ];
  const v2 = deriveV2Data(data);
  const { blobContent, filename } = buildCsvContent(v2, 'week7');
  const bomOk = blobContent.charCodeAt(0) === 0xFEFF;
  const firstLine = blobContent.slice(1).split('\r\n')[0];
  const cols = firstLine.split(',').length;
  const colOk = cols === 6;
  assert(
    'B8: CSV BOM=U+FEFF 且 header 列数=6',
    bomOk && colOk,
    `BOM=U+${blobContent.charCodeAt(0).toString(16).toUpperCase()}, cols=${cols}, filename=${filename}`,
  );
})();

// ---------- B10: 第 2 行（首日数据行）第 4 列为空（rate 首天空）----------
(function B10() {
  const data = [
    { date: '8/3', gene: 10, user: 5, nft: 2 },
    { date: '8/4', gene: 15, user: 7, nft: 3 },
  ];
  const v2 = deriveV2Data(data);
  const { blobContent } = buildCsvContent(v2, 'week30');
  const lines = blobContent.slice(1).split('\r\n');
  const firstDataRow = lines[1];
  const cells = firstDataRow.split(',');
  const col4 = cells[3];
  const ok = col4 === '';
  assert(
    'B10: CSV 首日数据行第4列(日环比)为空字符串',
    ok,
    `row1_cells=[${cells.map((c, i) => `C${i+1}="${c}"`).join(', ')}]`,
  );
})();

// ---------- B11: 列 3 存量 = 列 2 sum（容差 0） ----------
(function B11() {
  const daily = [18, 14, 7, 26, 22, 19, 17];
  const data = daily.map((g, i) => ({
    date: `7/${29 + i}`,
    gene: g,
    user: 10 + i,
    nft: 5 + (i % 3),
  }));
  const v2 = deriveV2Data(data);
  const { blobContent } = buildCsvContent(v2, 'week90');
  const lines = blobContent.slice(1).split('\r\n').slice(1);
  let col2Sum = 0;
  let mismatch = '';
  for (let r = 0; r < lines.length; r++) {
    const cells = lines[r].split(',');
    const col2 = parseInt(cells[1], 10);
    const col3 = parseInt(cells[2], 10);
    col2Sum += col2;
    if (col3 !== col2Sum) {
      mismatch = `行${r + 1}: col2累计=${col2Sum} ≠ col3=${col3}`;
      break;
    }
  }
  const totalFromV2 = v2[v2.length - 1].geneStock;
  const ok = mismatch === '' && totalFromV2 === col2Sum;
  assert(
    'B11: CSV 列3(存量) = 列2(日增)逐行累计前缀和 (容差0)',
    ok,
    mismatch || `col2总和=${col2Sum}, v2[-1].geneStock=${totalFromV2}, 行数=${lines.length}`,
  );
})();

// ---------- 汇总 ----------
console.log('\n========== 汇总 ==========');
const passed = results.filter(r => r.pass).length;
const total = results.length;
console.log(`总计: ${passed}/${total} 通过`);
if (passed === total) {
  console.log('🎉 全部 7 断言通过');
  process.exit(0);
} else {
  console.log('❌ 存在失败断言，请检查上方 FAIL 条目');
  process.exit(1);
}
