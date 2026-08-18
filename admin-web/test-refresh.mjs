import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'http://localhost:3014';
const SCREENSHOT_DIR = path.resolve('p:/龙鸽项目/longgehoutai/test-screenshots/refresh-optimization');

const PAGES = [
  { url: '/competition/list', name: '赛事列表' },
  { url: '/system/admin', name: '管理员管理' },
  { url: '/loft/list', name: '公棚列表' },
];

const results = {};
const consoleErrors = [];

function log(msg) {
  console.log(`[TEST] ${msg}`);
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

async function screenshot(page, filename) {
  const filepath = path.join(SCREENSHOT_DIR, filename);
  await page.screenshot({ path: filepath, fullPage: true });
  log(`截图已保存: ${filepath}`);
  return filepath;
}

function collectConsole(page) {
  const errors = [];
  const warnings = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push({ type: msg.type(), text: msg.text() });
    }
    if (msg.type() === 'warning') {
      warnings.push({ type: msg.type(), text: msg.text() });
    }
  });

  page.on('pageerror', exc => {
    errors.push({ type: 'pageerror', text: String(exc) });
  });

  return { errors, warnings };
}

async function login(page) {
  log('导航到登录页...');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);

  await screenshot(page, '01-login-page.png');

  log('填写登录表单...');

  const usernameInput = page.locator('input[placeholder="请输入用户名"]');
  const passwordInput = page.locator('input[placeholder="请输入密码"]');

  const usernameCount = await usernameInput.count();
  const passwordCount = await passwordInput.count();
  log(`用户名输入框: ${usernameCount} 个, 密码输入框: ${passwordCount} 个`);

  if (usernameCount > 0) {
    await usernameInput.first().click({ force: true });
    await usernameInput.first().fill('admin', { force: true });
  }
  if (passwordCount > 0) {
    await passwordInput.first().click({ force: true });
    await passwordInput.first().fill('admin123', { force: true });
  }

  await screenshot(page, '02-login-filled.png');

  log('点击登录按钮...');
  const loginBtn = page.locator('.login-glass-card button.ant-btn-primary').first();
  await loginBtn.click({ force: true });

  try {
    await page.waitForURL(url => !url.includes('/login'), { timeout: 15000 });
  } catch (e) {
    log(`等待URL跳转超时: ${e.message}`);
  }
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);

  await screenshot(page, '03-after-login.png');
  log(`登录后当前URL: ${page.url()}`);

  return !page.url().includes('/login');
}

async function testRefreshButton(page, pageUrl, pageName) {
  const pageResult = {
    name: pageName,
    url: pageUrl,
    refreshButtonVisible: false,
    loadingStateVisible: false,
    successToastVisible: false,
    timestampUpdated: false,
    timestampText: null,
    consoleErrors: [],
    screenshots: {},
  };

  log(`\n=== 测试页面: ${pageName} (${pageUrl}) ===`);

  try {
    await page.goto(`${BASE_URL}${pageUrl}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  } catch (e) {
    log(`导航失败: ${e.message}`);
    pageResult.error = `导航失败: ${e.message}`;
    return pageResult;
  }

  const pageScreenshotFile = `${pageName}-01-page-loaded.png`;
  pageResult.screenshots.pageLoaded = await screenshot(page, pageScreenshotFile);

  log('检查刷新按钮是否可见...');
  const refreshBtn = page.locator('button:has-text("刷新"), button.ant-btn:has(.anticon-reload)');
  const refreshBtnCount = await refreshBtn.count();

  if (refreshBtnCount > 0) {
    pageResult.refreshButtonVisible = true;
    log(`  刷新按钮已找到 (共 ${refreshBtnCount} 个), 使用第一个`);
  } else {
    pageResult.refreshButtonVisible = false;
    log('  刷新按钮未找到!');
    pageResult.screenshots.noRefreshBtn = await screenshot(page, `${pageName}-02-no-refresh-btn.png`);
    return pageResult;
  }

  const indicatorBefore = page.locator('.ant-space, .anticon-reload, .anticon-loading');
  const indicatorTextBefore = await page.locator('text=尚未刷新').count() > 0
    ? '尚未刷新'
    : (await page.locator('text=上次刷新').count() > 0 ? '上次刷新' : '未知');
  log(`  刷新指示器初始状态: ${indicatorTextBefore}`);

  pageResult.screenshots.beforeRefresh = await screenshot(page, `${pageName}-03-before-refresh.png`);

  log('点击刷新按钮...');
  const targetBtn = refreshBtn.first();
  await targetBtn.click();
  pageResult.screenshots.afterClick = await screenshot(page, `${pageName}-04-after-click.png`);

  await page.waitForTimeout(300);

  log('检查加载状态...');
  const loadingSpinner = page.locator('.anticon-loading, .ant-spin-dot, [class*="loading"]');
  const loadingVisible = await loadingSpinner.count() > 0;
  pageResult.loadingStateVisible = loadingVisible;
  log(`  加载状态可见: ${loadingVisible}`);

  const loadingIndicator = page.locator('text=正在刷新');
  const loadingTextVisible = await loadingIndicator.count() > 0;
  log(`  "正在刷新" 文本可见: ${loadingTextVisible}`);

  await page.waitForTimeout(2000);

  log('等待刷新完成...');
  try {
    await page.waitForSelector('.ant-message-success, .ant-message', {
      state: 'visible',
      timeout: 10000,
    });
    pageResult.successToastVisible = true;
    log('  成功Toast消息已出现!');
  } catch (e) {
    pageResult.successToastVisible = false;
    log(`  等待Toast超时: ${e.message}`);
  }

  await page.waitForTimeout(500);
  pageResult.screenshots.afterRefresh = await screenshot(page, `${pageName}-05-after-refresh.png`);

  log('检查刷新指示器时间戳...');
  const updatedIndicator = page.locator('text=上次刷新');
  const updatedCount = await updatedIndicator.count();

  const reloadIcons = page.locator('.anticon-reload');
  let indicatorFound = false;
  if (await reloadIcons.count() > 0) {
    const parentSpace = reloadIcons.first().locator('xpath=ancestor::span[contains(@class,"ant-space") or contains(@class,"ant-space")]');
    const hasTimestamp = await page.locator('text=上次刷新').count() > 0 ||
      await page.locator('text=/上次刷新\\s*:/').count() > 0;

    if (hasTimestamp) {
      pageResult.timestampUpdated = true;
      const timestampEl = page.locator('span:has-text("上次刷新")').first();
      pageResult.timestampText = await timestampEl.innerText().catch(() => '无法获取时间戳文本');
      indicatorFound = true;
      log(`  时间戳已更新: ${pageResult.timestampText}`);
    }
  }

  if (!indicatorFound) {
    const lastRefreshIndicator = page.locator('span').filter({ hasText: /上次刷新:/ });
    if (await lastRefreshIndicator.count() > 0) {
      pageResult.timestampUpdated = true;
      pageResult.timestampText = await lastRefreshIndicator.first().innerText().catch(() => '无法获取');
      log(`  时间戳已找到: ${pageResult.timestampText}`);
    } else {
      log('  未能找到时间戳文本');
    }
  }

  pageResult.screenshots.finalState = await screenshot(page, `${pageName}-06-final-state.png`);

  return pageResult;
}

async function main() {
  ensureDir(SCREENSHOT_DIR);
  log(`截图保存目录: ${SCREENSHOT_DIR}`);

  const browser = await chromium.launch({
    headless: true,
    channel: 'chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true,
  });

  const page = await context.newPage();

  const consoleCollector = collectConsole(page);

  log('=== 第1步: 登录 ===');
  const loginSuccess = await login(page);
  results.login = { success: loginSuccess, url: page.url() };

  if (!loginSuccess) {
    log('登录失败，终止测试');
    results.error = '登录失败';
    fs.writeFileSync(
      path.join(SCREENSHOT_DIR, 'test-report.json'),
      JSON.stringify(results, null, 2),
      'utf-8'
    );
    await browser.close();
    return 1;
  }

  log('=== 第2步: 测试各页面刷新按钮 ===');
  results.pages = [];

  for (const pageConfig of PAGES) {
    const pageResult = await testRefreshButton(page, pageConfig.url, pageConfig.name);
    results.pages.push(pageResult);

    pageResult.consoleErrors = [...consoleCollector.errors];
    pageResult.consoleWarnings = [...consoleCollector.warnings];

    await page.waitForTimeout(500);
  }

  log('\n=== 第3步: 验证控制台错误 ===');
  results.consoleSummary = {
    totalErrors: consoleCollector.errors.length,
    totalWarnings: consoleCollector.warnings.length,
    errors: consoleCollector.errors,
    warnings: consoleCollector.warnings,
  };

  log(`控制台错误数: ${consoleCollector.errors.length}`);
  log(`控制台警告数: ${consoleCollector.warnings.length}`);

  results.screenshotDir = SCREENSHOT_DIR;

  log('\n=== 第4步: 生成测试报告 ===');
  const reportPath = path.join(SCREENSHOT_DIR, 'test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2), 'utf-8');
  log(`测试报告已保存: ${reportPath}`);

  const mdReportPath = path.join(SCREENSHOT_DIR, 'test-report.md');
  let mdReport = '# 刷新按钮功能测试报告\n\n';
  mdReport += `**测试时间**: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}\n\n`;
  mdReport += `**测试页面数**: ${results.pages.length}\n\n`;
  mdReport += `---\n\n`;

  for (const pr of results.pages) {
    mdReport += `## ${pr.name} (${pr.url})\n\n`;
    mdReport += `| 检查项 | 结果 |\n`;
    mdReport += `|--------|------|\n`;
    mdReport += `| 刷新按钮可见 | ${pr.refreshButtonVisible ? '✅ 通过' : '❌ 失败'} |\n`;
    mdReport += `| 加载状态可见 | ${pr.loadingStateVisible ? '✅ 通过' : '❌ 失败'} |\n`;
    mdReport += `| 成功Toast出现 | ${pr.successToastVisible ? '✅ 通过' : '❌ 失败'} |\n`;
    mdReport += `| 时间戳已更新 | ${pr.timestampUpdated ? '✅ 通过' : '❌ 失败'} |\n`;
    if (pr.timestampText) {
      mdReport += `| 时间戳文本 | ${pr.timestampText} |\n`;
    }
    mdReport += `\n**截图:**\n`;
    for (const [key, value] of Object.entries(pr.screenshots)) {
      mdReport += `- ${key}: ${value}\n`;
    }
    mdReport += `\n`;
  }

  mdReport += `---\n\n`;
  mdReport += `## 控制台检查\n\n`;
  mdReport += `- 错误数量: ${results.consoleSummary.totalErrors}\n`;
  mdReport += `- 警告数量: ${results.consoleSummary.totalWarnings}\n`;
  if (results.consoleSummary.errors.length > 0) {
    mdReport += `\n**错误详情:**\n\n`;
    for (const err of results.consoleSummary.errors) {
      mdReport += `- [${err.type}] ${err.text}\n`;
    }
  }
  mdReport += `\n`;

  const allPassed = results.pages.every(
    p => p.refreshButtonVisible && p.loadingStateVisible && p.successToastVisible && p.timestampUpdated
  );
  mdReport += `## 最终结论\n\n`;
  mdReport += allPassed ? '✅ **所有测试通过!**' : '❌ **部分测试失败，请检查详情。**';
  mdReport += `\n`;

  fs.writeFileSync(mdReportPath, mdReport, 'utf-8');
  log(`Markdown报告已保存: ${mdReportPath}`);

  console.log('\n' + '='.repeat(60));
  console.log('测试报告摘要:');
  console.log('='.repeat(60));
  for (const pr of results.pages) {
    const status = [
      pr.refreshButtonVisible ? '按钮✅' : '按钮❌',
      pr.loadingStateVisible ? '加载✅' : '加载❌',
      pr.successToastVisible ? 'Toast✅' : 'Toast❌',
      pr.timestampUpdated ? '时间戳✅' : '时间戳❌',
    ].join(' | ');
    console.log(`  ${pr.name}: ${status}`);
  }
  console.log(`  控制台错误: ${results.consoleSummary.totalErrors}`);
  console.log(`  最终结果: ${allPassed ? '✅ 通过' : '❌ 部分失败'}`);
  console.log('='.repeat(60));

  await context.close();
  await browser.close();

  return allPassed ? 0 : 1;
}

main()
  .then(code => process.exit(code))
  .catch(err => {
    console.error('测试脚本异常:', err);
    process.exit(1);
  });