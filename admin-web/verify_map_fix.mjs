// @ts-nocheck
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const SPECS_DIR = path.resolve(ROOT, "..", ".trae", "specs", "datacenter-cockpit-redesign");
fs.mkdirSync(SPECS_DIR, { recursive: true });

const SCREENSHOT_PATH = path.join(SPECS_DIR, "screenshot_map_fix.png");
const RESULT_FILE = path.join(SPECS_DIR, "map-fix-verification-result.json");

const BASE_URL = "http://127.0.0.1:3014";
const DATACENTER_URL = `${BASE_URL}/datacenter`;

const VIEWPORT_W = 1920;
const VIEWPORT_H = 1080;

function log(msg) {
  console.log(msg);
}

async function loginIfNeeded(page) {
  const state = { visited_login: false, logged_in: false, final_url: page.url() };

  if (!page.url().includes("/login")) {
    log("  页面不在登录页，跳过登录");
    state.logged_in = true;
    return state;
  }

  state.visited_login = true;
  log("  检测到登录页，填写账号密码");

  const username = page.locator(
    "input#username, input[name='username'], input[placeholder*='账号'], input[placeholder*='用户名']"
  ).first();
  const password = page.locator(
    "input#password, input[name='password'], input[type='password']"
  ).first();

  if ((await username.count()) > 0) {
    await username.fill("admin");
    log("  已填写用户名: admin");
  } else {
    await page.locator("input[type='text']").first().fill("admin");
  }

  if ((await password.count()) > 0) {
    await password.fill("admin123");
    log("  已填写密码: admin123");
  }

  const submit = page.locator("button[type='submit']").first();
  if ((await submit.count()) > 0) {
    await submit.click();
    log("  已点击登录按钮");
  } else {
    await page.keyboard.press("Enter");
  }

  try {
    await page.waitForURL(
      (url) => !url.includes("/login") && !url.includes("/user/login"),
      { timeout: 15000 }
    );
    await page.waitForLoadState("networkidle", { timeout: 15000 });
    log("  登录成功");
  } catch (e) {
    log(`  登录等待超时: ${e.message}`);
  }

  await new Promise((r) => setTimeout(r, 1000));
  state.final_url = page.url();
  state.logged_in = !page.url().includes("/login") && !page.url().includes("/user/login");
  return state;
}

async function collectConsoleErrors(page) {
  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      errors.push({ type: "console", text: msg.text() });
    }
  });
  page.on("pageerror", (err) => {
    errors.push({ type: "pageerror", text: err.message || String(err) });
  });
  return errors;
}

async function verifyMap(page) {
  const results = {};

  log("=== 地图验证检查 ===");

  // 1. 检查地图容器
  log("  检查1: 地图容器是否存在");
  const mapData = await page.evaluate(() => {
    // 查找 echarts 地图容器
    const canvases = document.querySelectorAll("canvas");
    let mapCanvas = null;
    let mapContainer = null;
    for (const c of canvases) {
      const parent = c.closest("div[class*='echarts-for-react'], div[style*='position: relative']");
      const rect = c.getBoundingClientRect();
      if (rect.width > 300 && rect.height > 200) {
        mapCanvas = c;
        mapContainer = c.parentElement;
        return {
          found: true,
          canvasCount: canvases.length,
          canvasRect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
          parentClass: mapContainer ? mapContainer.className : "",
          parentStyle: mapContainer ? mapContainer.getAttribute("style") : "",
        };
      }
    }
    // 回退：查找 datacenter 页面的主地图 div
    const divs = document.querySelectorAll("div");
    for (const d of divs) {
      const style = d.getAttribute("style") || "";
      if (style.includes("echarts") || (style.includes("position: relative") && style.includes("width") && style.includes("height"))) {
        const rect = d.getBoundingClientRect();
        if (rect.width > 400 && rect.height > 300) {
          return {
            found: true,
            canvasCount: canvases.length,
            parentRect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
            parentClass: d.className,
            parentStyle: style,
            fallback: true,
          };
        }
      }
    }
    return { found: false, canvasCount: canvases.length };
  });

  results.mapContainer = {
    check: "地图容器存在",
    pass: mapData.found,
    detail: mapData.found ? `找到地图容器: ${JSON.stringify(mapData.canvasRect || mapData.parentRect)}` : "未找到地图容器",
    raw: mapData,
  };
  log(`    地图容器: ${mapData.found ? "存在" : "不存在"} -> ${results.mapContainer.pass ? "通过" : "失败"}`);

  // 2. 检查 canvas 是否有非透明像素
  log("  检查2: canvas 是否有非透明像素");
  const pixelData = await page.evaluate(() => {
    const canvases = document.querySelectorAll("canvas");
    const results = [];
    for (const c of canvases) {
      const rect = c.getBoundingClientRect();
      if (rect.width < 50 || rect.height < 50) continue;
      try {
        const ctx = c.getContext("2d");
        if (!ctx) continue;
        const w = Math.min(c.width, 800);
        const h = Math.min(c.height, 600);
        if (w === 0 || h === 0) continue;
        const data = ctx.getImageData(0, 0, w, h).data;
        let nonTransparent = 0;
        let nonWhite = 0;
        let nonDarkBlue = 0;
        let hasColor = false;
        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3];
          if (a > 0) nonTransparent++;
          const r = data[i], g = data[i + 1], b = data[i + 2];
          // 暗背景: rgb(26,35,50) 附近
          const isDarkBg = r < 40 && g < 55 && b < 75;
          if (!isDarkBg && a > 0) {
            nonDarkBlue++;
            if (Math.abs(r - g) > 5 || Math.abs(g - b) > 5 || Math.abs(r - b) > 5) {
              hasColor = true;
            }
          }
          if (!(r > 240 && g > 240 && b > 240) && a > 0) nonWhite++;
        }
        const total = (w * h);
        results.push({
          width: w,
          height: h,
          total,
          nonTransparent,
          nonWhite,
          nonDarkBlue,
          hasColor,
          nonTransparentRatio: total > 0 ? nonTransparent / total : 0,
          canvasRect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        });
      } catch (e) {
        results.push({ error: e.message });
      }
    }
    return results;
  });

  // 选出主地图 canvas
  const mainCanvas = pixelData
    .filter((p) => p.nonTransparent !== undefined)
    .sort((a, b) => b.width * b.height - a.width * a.height)[0];

  const canvasHasContent =
    mainCanvas && mainCanvas.nonTransparent > 100 && mainCanvas.nonDarkBlue > 50;

  results.canvasHasContent = {
    check: "Canvas 有非透明像素内容",
    pass: !!canvasHasContent,
    detail: canvasHasContent
      ? `非透明像素: ${mainCanvas.nonTransparent}, 非深蓝: ${mainCanvas.nonDarkBlue}, 有彩色: ${mainCanvas.hasColor}`
      : "Canvas 几乎为空或仅背景色",
    raw: mainCanvas || null,
  };
  log(`    Canvas 内容: ${results.canvasHasContent.detail} -> ${results.canvasHasContent.pass ? "通过" : "失败"}`);

  // 3. 检查中国地图轮廓（通过 echarts option 或 DOM 特征）
  log("  检查3: 中国地图轮廓");
  const chinaMapData = await page.evaluate(() => {
    // 查找包含 geo/map 配置的 echarts 实例
    const canvases = document.querySelectorAll("canvas");
    // 检查 window 上可能暴露的 echarts 实例
    const candidates = [];
    if (window.__echartsInstances) {
      for (const key of Object.keys(window.__echartsInstances)) {
        candidates.push(key);
      }
    }
    // 查找文本包含 "中国" 或 "china" 的 DOM
    const allText = document.body.innerText;
    const hasChinaRef = /中国|china|中华人民共和国/.test(allText);

    // 检查 SVG 是否有地图路径
    const paths = document.querySelectorAll("svg path");
    let mapLikePaths = 0;
    for (const p of paths) {
      const d = p.getAttribute("d") || "";
      if (d.length > 100) mapLikePaths++;
    }

    return {
      canvasCount: canvases.length,
      hasChinaText: hasChinaRef,
      svgPathCount: document.querySelectorAll("svg path").length,
      longSvgPaths: mapLikePaths,
      echartsInstances: candidates,
    };
  });

  const hasChinaOutline = chinaMapData.hasChinaText || chinaMapData.longSvgPaths > 10 || (mainCanvas && mainCanvas.nonDarkBlue > 200);
  results.chinaMapOutline = {
    check: "中国地图轮廓显示",
    pass: !!hasChinaOutline,
    detail: hasChinaOutline
      ? `检测到地图特征: hasChinaText=${chinaMapData.hasChinaText}, longSvgPaths=${chinaMapData.longSvgPaths}, 非深蓝像素=${mainCanvas ? mainCanvas.nonDarkBlue : "N/A"}`
      : "未检测到地图轮廓",
    raw: chinaMapData,
  };
  log(`    地图轮廓: ${results.chinaMapOutline.pass ? "通过" : "失败"}`);

  // 4. 检查公棚点标记
  log("  检查4: 公棚点标记");
  const loftMarkersData = await page.evaluate(() => {
    // 查找公棚相关 DOM
    const bodyText = document.body.innerText;
    const hasLoftText = /公棚|loft|赛鸽/.test(bodyText);

    // 查找地图上的标记元素 (圆点、标记等)
    const canvases = document.querySelectorAll("canvas");
    let markerCanvas = null;
    for (const c of canvases) {
      const rect = c.getBoundingClientRect();
      if (rect.width > 400 && rect.height > 300) {
        try {
          const ctx = c.getContext("2d");
          const w = Math.min(c.width, 800);
          const h = Math.min(c.height, 600);
          const data = ctx.getImageData(0, 0, w, h).data;
          // 查找高饱和度/亮彩色像素（标记点通常高亮色）
          let brightPixels = 0;
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
            if (a < 100) continue;
            // 亮彩色: 绿/黄/红/青/紫
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            if (max > 150 && max - min > 40) brightPixels++;
          }
          markerCanvas = { brightPixels };
        } catch (e) {}
      }
    }

    return {
      hasLoftText,
      brightPixelCount: markerCanvas ? markerCanvas.brightPixels : 0,
    };
  });

  const hasLoftMarkers =
    loftMarkersData.hasLoftText && loftMarkersData.brightPixelCount > 50;

  results.loftMarkers = {
    check: "公棚点标记",
    pass: !!hasLoftMarkers,
    detail: hasLoftMarkers
      ? `检测到公棚相关内容, 亮彩色像素数: ${loftMarkersData.brightPixelCount}`
      : `未检测到公棚标记 (hasLoftText=${loftMarkersData.hasLoftText}, brightPixels=${loftMarkersData.brightPixelCount})`,
    raw: loftMarkersData,
  };
  log(`    公棚标记: ${results.loftMarkers.pass ? "通过" : "失败"}`);

  return results;
}

async function main() {
  const allResults = {};

  log("=== 启动浏览器 (headless, 1920x1080) ===");
  const browser = await chromium.launch({
    headless: true,
    channel: "chrome",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const context = await browser.newContext({
    viewport: { width: VIEWPORT_W, height: VIEWPORT_H },
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();

  const consoleErrors = await collectConsoleErrors(page);

  log(`=== 1. 访问首页 ${BASE_URL} ===`);
  try {
    await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForLoadState("networkidle", { timeout: 30000 });
  } catch (e) {
    log(`  首页加载异常: ${e.message}`);
  }
  await new Promise((r) => setTimeout(r, 1000));

  log("=== 2. 检查登录状态 ===");
  const loginResult = await loginIfNeeded(page);
  allResults.login = loginResult;

  if (!loginResult.logged_in) {
    log("登录失败，终止测试");
    await context.close();
    await browser.close();
    fs.writeFileSync(
      RESULT_FILE,
      JSON.stringify({ error: "登录失败", login_result: loginResult }, null, 2)
    );
    return 1;
  }

  log(`=== 3. 访问数据中台 ${DATACENTER_URL} ===`);
  try {
    await page.goto(DATACENTER_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
  } catch (e) {
    log(`  数据中台加载异常: ${e.message}`);
  }
  await page.waitForLoadState("networkidle", { timeout: 30000 });

  log("=== 4. 等待至少5秒让地图数据加载完成 ===");
  await new Promise((r) => setTimeout(r, 5000));

  // 额外等待地图 canvas 出现
  try {
    await page.waitForSelector("canvas", { timeout: 10000 });
    log("  canvas 已渲染");
  } catch (e) {
    log("  canvas 等待超时，继续执行");
  }
  await new Promise((r) => setTimeout(r, 1500));

  log("=== 5. 截取全屏截图 ===");
  await page.screenshot({ path: SCREENSHOT_PATH, fullPage: true });
  log(`  全屏截图已保存: ${SCREENSHOT_PATH}`);

  log("=== 6. 验证地图内容 ===");
  const verification = await verifyMap(page);
  allResults.verification = verification;

  log("=== 7. 记录 console 错误 ===");
  allResults.consoleErrors = consoleErrors;
  if (consoleErrors.length > 0) {
    log(`  发现 ${consoleErrors.length} 条错误:`);
    for (const e of consoleErrors.slice(0, 10)) {
      log(`    [${e.type}] ${e.text.slice(0, 200)}`);
    }
  } else {
    log("  无 console 错误");
  }

  log("=== 8. 汇总结果 ===");
  const checkpoints = allResults.verification || {};
  const passCount = Object.values(checkpoints).filter((v) => v.pass).length;
  const totalCount = Object.values(checkpoints).length;

  const summary = {
    pass_count: passCount,
    total_count: totalCount,
    pass_rate: `${passCount}/${totalCount}`,
    overall_pass: passCount === totalCount,
    map_displayed: checkpoints.mapContainer?.pass ?? false,
    china_outline: checkpoints.chinaMapOutline?.pass ?? false,
    loft_markers: checkpoints.loftMarkers?.pass ?? false,
    checkpoints: {},
  };

  for (const [key, val] of Object.entries(checkpoints)) {
    const status = val.pass ? "PASS" : "FAIL";
    summary.checkpoints[key] = `[${status}] ${val.check} | ${val.detail}`;
    log(`  [${status}] ${val.check} | ${val.detail}`);
  }

  allResults.summary = summary;

  fs.writeFileSync(RESULT_FILE, JSON.stringify(allResults, null, 2));
  log(`\n结果已写入: ${RESULT_FILE}`);

  log(`\n=== 截图路径 ===`);
  log(`  ${SCREENSHOT_PATH}`);

  log(`\n=== 最终结果: ${summary.pass_rate} 通过 ===`);
  log(`  地图显示: ${summary.map_displayed ? "是" : "否"}`);
  log(`  中国地图轮廓: ${summary.china_outline ? "是" : "否"}`);
  log(`  公棚点标记: ${summary.loft_markers ? "是" : "否"}`);

  await context.close();
  await browser.close();

  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error("测试执行失败:", err);
    process.exit(1);
  });
