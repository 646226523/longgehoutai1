import { chromium } from 'playwright';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
import fs from 'fs';
import path from 'path';

const screenshotDir = path.resolve(process.cwd(), 'screenshots');
if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

const results = {};
let consoleWarnings = [];

function captureConsole(page) {
  consoleWarnings = [];
  page.on('console', msg => {
    consoleWarnings.push({ type: msg.type(), text: msg.text() });
  });
}

function getSceneConsoleStats() {
  const antdCount = consoleWarnings.filter(m => 
    (m.type === 'warning' || m.type === 'error') &&
    (m.text.startsWith('[antd:') || m.text.includes('Warning: [antd') || m.text.includes('antd'))
  ).length;
  const otherErrors = consoleWarnings.filter(m => 
    m.type === 'error' && !m.text.includes('antd') && !m.text.includes('[antd:')
  ).length;
  return { antdCount, otherErrors, sample: consoleWarnings.slice(0, 5) };
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function clickTab(page, tabKey, tabText) {
  // Use data-node-key attribute for precise tab matching
  const tab = page.locator(`[data-node-key="${tabKey}"]`).first();
  if (await tab.count() > 0) {
    try {
      await tab.click({ timeout: 5000 });
      await sleep(1500);
      return true;
    } catch (e) {
      console.log(`点击 tab ${tabKey} 失败: ${String(e.message).slice(0, 60)}, 尝试备用方式`);
    }
  }
  // Fallback: role tab + name
  try {
    const roleTab = page.getByRole('tab', { name: new RegExp(tabText) }).first();
    await roleTab.click({ timeout: 5000 });
    await sleep(1500);
    return true;
  } catch (e) {
    console.log(`备用点击 tab ${tabText} 也失败: ${String(e.message || e).slice(0, 60)}`);
    return false;
  }
}

(async () => {
  const browser = await chromium.launch({ 
    headless: true, 
    executablePath: CHROME_PATH,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
  });
  const context = await browser.newContext({
    viewport: { width: 1680, height: 1080 },
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();
  
  captureConsole(page);

  // ===== SCENE 1: 进入上链审核页 =====
  console.log('\n=== 场景 1：进入上链审核页 ===');
  try {
    await page.goto('http://127.0.0.1:5173/nft/audit', { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(3000);
    
    // If redirected to login, login with mock credentials
    const url = page.url();
    console.log('Current URL:', url);
    if (url.includes('/user/login') || url.includes('/login')) {
      console.log('检测到登录页，尝试 mock 登录 (admin/admin123)...');
      await page.screenshot({ path: path.join(screenshotDir, 'scene0-login-page.png') });
      
      // Fill via JS (most reliable for ProForm)
      await page.waitForTimeout(1500);
      try {
        await page.evaluate(() => {
          const allInputs = Array.from(document.querySelectorAll('input'));
          const uInput = allInputs.find(i => 
            i.name === 'username' || i.id === 'username' || 
            i.placeholder?.includes('账号') || i.placeholder?.includes('用户')
          );
          if (uInput) {
            uInput.focus();
            document.execCommand('insertText', false, 'admin');
          }
          const pInput = allInputs.find(i => 
            i.type === 'password' || i.name === 'password' || 
            i.id === 'password' || i.placeholder?.includes('密码')
          );
          if (pInput) {
            pInput.focus();
            document.execCommand('insertText', false, 'admin123');
          }
        });
      } catch (e) {}
      await sleep(1500);
      
      // Click submit
      try {
        await page.locator('button[type="submit"]').first().click({ timeout: 5000 });
      } catch {
        try {
          await page.keyboard.press('Enter');
        } catch {}
      }
      await sleep(4000);
      console.log('登录后 URL:', page.url());
      await page.screenshot({ path: path.join(screenshotDir, 'scene0-after-login.png') });
      
      if (!page.url().includes('/nft/audit')) {
        await page.goto('http://127.0.0.1:5173/nft/audit', { waitUntil: 'networkidle', timeout: 30000 });
        await sleep(3000);
      }
    }
    
    // Check 4 tabs by data-node-key
    const tabKeys = [
      { key: 'pending', text: '待审核资产' },
      { key: 'minting', text: '上链中' },
      { key: 'completed', text: '已完成' },
      { key: 'rejected', text: '已驳回' },
    ];
    const tabResults = [];
    for (const t of tabKeys) {
      const count = await page.locator(`[data-node-key="${t.key}"]`).count();
      tabResults.push({ tab: t.text, key: t.key, found: count > 0 });
    }
    console.log('Tab 检查结果:', tabResults);
    
    await page.screenshot({ path: path.join(screenshotDir, 'scene1-audit-page.png') });
    const stats = getSceneConsoleStats();
    results.scene1 = {
      tabs: tabResults,
      allTabsFound: tabResults.every(t => t.found),
      antdWarnings: stats.antdCount,
      otherErrors: stats.otherErrors,
      screenshot: 'scene1-audit-page.png',
    };
    console.log('场景1完成，AntD 警告:', stats.antdCount, '其他错误:', stats.otherErrors);
  } catch (e) {
    console.error('场景1错误:', e.message);
    results.scene1 = { error: e.message, antdWarnings: -1 };
  }

  // ===== SCENE 2: 单条审核通过并等待 completed =====
  console.log('\n=== 场景 2：单条审核通过并跳上链中 → 等待 completed ===');
  try {
    captureConsole(page);
    await clickTab(page, 'pending', '待审核资产');
    
    // Find approve buttons (table row actions with icon)
    const allButtons = page.locator('tbody button, tbody .ant-btn');
    const totalBtns = await allButtons.count();
    console.log(`表格里共有 ${totalBtns} 个按钮`);
    
    // Get button texts and find the approve one
    let approveClicked = false;
    let clickedIndex = -1;
    for (let i = 0; i < Math.min(totalBtns, 6); i++) {
      const btn = allButtons.nth(i);
      const attrs = await btn.evaluate(b => ({
        text: b.textContent?.slice(0, 20),
        title: b.getAttribute('title') || '',
        aria: b.getAttribute('aria-label') || '',
        iconHtml: b.innerHTML?.slice(0, 100)
      })).catch(() => ({}));
      const signature = (attrs.text + attrs.title + attrs.aria + attrs.iconHtml).toLowerCase();
      console.log(`  button[${i}]: text="${attrs.text}" title="${attrs.title}" aria="${attrs.aria}"`);
      if (signature.includes('check') || signature.includes('通过') || 
          signature.includes('✅') || signature.includes('approve') ||
          attrs.text?.replace(/\d/g, '').trim() === '通过') {
        console.log(`  → 点击通过按钮 #${i}`);
        try {
          await btn.click({ timeout: 5000 });
          approveClicked = true;
          clickedIndex = i;
          break;
        } catch (e) {
          console.log(`    点击失败: ${e.message?.slice(0, 60)}`);
        }
      }
    }
    
    // Handle Popconfirm: look for confirm text and click
    if (approveClicked) {
      await sleep(1500);
      // Find popconfirm overlay OK button
      const popBtns = page.locator('.ant-popover button, .ant-popconfirm button, .ant-modal button').filter({ hasText: /确定|确认|OK|是|通过/ });
      const popCount = await popBtns.count();
      console.log(`找到 ${popCount} 个 Popconfirm 按钮`);
      if (popCount > 0) {
        try {
          await popBtns.first().click({ timeout: 5000 });
          console.log('点击了 Popconfirm 确认按钮');
        } catch (e) {
          console.log('Popconfirm 点击失败，尝试直接 Enter');
          await page.keyboard.press('Enter');
        }
      } else {
        // Fallback JS click on any visible popconfirm button
        try {
          await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('.ant-popover button, .ant-popconfirm button, .ant-btn'));
            const ok = btns.find(b => /确定|确认|OK|是|通过/i.test(b.textContent || ''));
            ok?.click();
          });
        } catch {}
      }
      await sleep(3000);
    }
    
    // Capture toast/message text
    const toastText = await page.evaluate(() => {
      const notices = Array.from(document.querySelectorAll('.ant-message, .ant-notification-notice, [role="status"]'));
      return notices.map(n => n.innerText).join(' | ').slice(0, 500);
    }).catch(() => '');
    const hasSuccessToast = toastText.includes('审核通过') || toastText.includes('创建上链任务') || toastText.includes('成功');
    console.log('Toast 文本:', toastText.slice(0, 250));
    console.log('hasSuccessToast =', hasSuccessToast);
    
    // Switch to minting tab
    const mintingOk = await clickTab(page, 'minting', '上链中');
    console.log('切到 上链中 Tab:', mintingOk);
    await page.screenshot({ path: path.join(screenshotDir, 'scene2-minting-tab.png') });
    
    // Switch to completed tab
    const completedOk = await clickTab(page, 'completed', '已完成');
    console.log('切到 已完成 Tab:', completedOk);
    await sleep(2000);
    
    // Look for tx_hash 0x...
    const hasTxHash = await page.evaluate(() => {
      return /0x[a-fA-F0-9]{24,}/.test(document.body.innerText);
    }).catch(() => false);
    console.log('completed 页检测到 tx_hash (0x...) =', hasTxHash);
    
    await page.screenshot({ path: path.join(screenshotDir, 'scene2-completed-tab.png') });
    const stats = getSceneConsoleStats();
    results.scene2 = {
      approveClicked,
      clickedIndex,
      hasSuccessToast,
      toastText: toastText.slice(0, 200),
      mintingTabSwitched: mintingOk,
      completedTabSwitched: completedOk,
      hasTxHash,
      antdWarnings: stats.antdCount,
      otherErrors: stats.otherErrors,
      screenshots: ['scene2-minting-tab.png', 'scene2-completed-tab.png'],
    };
    console.log('场景2完成，AntD 警告:', stats.antdCount);
  } catch (e) {
    console.error('场景2错误:', e.message);
    results.scene2 = { error: e.message, antdWarnings: -1 };
  }

  // ===== SCENE 3: 进度条区块确认 1→12 增长 =====
  console.log('\n=== 场景 3：进度条区块确认 1→12 增长 ===');
  try {
    captureConsole(page);
    await clickTab(page, 'pending', '待审核资产');
    await sleep(1500);
    
    // Approve a 2nd row
    const allButtons = page.locator('tbody button, tbody .ant-btn');
    const totalBtns = await allButtons.count();
    let secondApproved = false;
    let foundIdx = -1;
    // Try to find second approve button
    for (let i = 0; i < Math.min(totalBtns, 10); i++) {
      const btn = allButtons.nth(i);
      const signature = await btn.evaluate(b => {
        const s = (b.textContent || '') + (b.getAttribute('title') || '') + (b.getAttribute('aria-label') || '');
        return s.toLowerCase();
      }).catch(() => '');
      if (signature.includes('check') || signature.includes('通过') || signature.includes('✅') || signature.includes('approve')) {
        // Skip first if we clicked it in scene2 (find another one)
        if (foundIdx === -1) { 
          foundIdx = i; // first one, continue search
          continue;
        }
        try {
          await btn.click({ timeout: 5000 });
          secondApproved = true;
          console.log(`点击了第二个通过按钮 #${i}`);
          break;
        } catch {}
      }
    }
    // If only one approve exists, try clicking it anyway
    if (!secondApproved && foundIdx >= 0) {
      try {
        await allButtons.nth(foundIdx).click({ timeout: 5000 }).catch(() => {});
        secondApproved = true;
      } catch {}
    }
    
    // Confirm popconfirm
    if (secondApproved) {
      await sleep(1500);
      try {
        await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('.ant-popover button, .ant-popconfirm button'));
          const ok = btns.find(b => /确定|确认|OK|是|通过/i.test(b.textContent || ''));
          ok?.click();
        });
      } catch {}
      await sleep(2000);
    }
    
    await clickTab(page, 'minting', '上链中');
    await sleep(2500);
    
    await page.screenshot({ path: path.join(screenshotDir, 'scene3-progress-before.png') });
    
    const progressBefore = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tbody tr'));
      const progressCells = rows.map(r => {
        const progress = r.querySelector('.ant-progress, [role="progressbar"]');
        const taskStatus = r.innerText?.match(/\d+\/12|confirming|区块|确认|pending|executing|completed/i)?.[0];
        const aria = progress?.getAttribute?.('aria-valuenow');
        const fullText = progress?.innerText?.slice(0, 60) || '';
        return { ariaValuenow: aria, match: taskStatus, text: fullText.slice(0, 80) };
      }).filter(p => p.ariaValuenow || p.match || p.text);
      return progressCells.slice(0, 8);
    }).catch(() => []);
    console.log('进度条 BEFORE:\n' + progressBefore.map(p => JSON.stringify(p)).join('\n'));
    
    const hasProgressPatternBefore = progressBefore.some(p => 
      /\d+\/12|confirming|确认|区块|progress|executing/i.test(p.match || '' + p.text || '')
    );
    
    await sleep(6000);
    
    await page.screenshot({ path: path.join(screenshotDir, 'scene3-progress-after.png') });
    
    const progressAfter = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tbody tr'));
      const progressCells = rows.map(r => {
        const progress = r.querySelector('.ant-progress, [role="progressbar"]');
        const taskStatus = r.innerText?.match(/\d+\/12|confirming|区块|确认|pending|executing|completed/i)?.[0];
        const aria = progress?.getAttribute?.('aria-valuenow');
        const fullText = progress?.innerText?.slice(0, 60) || '';
        return { ariaValuenow: aria, match: taskStatus, text: fullText.slice(0, 80) };
      }).filter(p => p.ariaValuenow || p.match || p.text);
      return progressCells.slice(0, 8);
    }).catch(() => []);
    console.log('进度条 AFTER:\n' + progressAfter.map(p => JSON.stringify(p)).join('\n'));
    
    // Check for growth / pattern
    const confirmRegex = /\d+\/12|confirming|区块|确认/;
    const hasProgressText = (progressBefore.some(p => confirmRegex.test(p.match || '' + p.text || '')) ||
                            progressAfter.some(p => confirmRegex.test(p.match || '' + p.text || '')));
    // Value growth check
    let grew = false;
    for (let i = 0; i < Math.min(progressBefore.length, progressAfter.length); i++) {
      const b = parseInt(progressBefore[i]?.ariaValuenow || '0');
      const a = parseInt(progressAfter[i]?.ariaValuenow || '0');
      if (!isNaN(b) && !isNaN(a) && a > b) { grew = true; break; }
    }
    
    const stats = getSceneConsoleStats();
    results.scene3 = {
      secondApproved,
      hasProgressPattern: hasProgressText,
      progressValueGrew: grew,
      progressBefore,
      progressAfter,
      antdWarnings: stats.antdCount,
      otherErrors: stats.otherErrors,
      screenshots: ['scene3-progress-before.png', 'scene3-progress-after.png'],
    };
    console.log('场景3完成，AntD 警告:', stats.antdCount, ' 模式存在:', hasProgressText, ' 值增长:', grew);
  } catch (e) {
    console.error('场景3错误:', e.message);
    results.scene3 = { error: e.message, antdWarnings: -1 };
  }

  // ===== SCENE 4: 批量驳回 =====
  console.log('\n=== 场景 4：批量驳回 ===');
  try {
    captureConsole(page);
    await clickTab(page, 'pending', '待审核资产');
    await sleep(2000);
    
    // Check 2 row checkboxes (skip header checkbox - first <th> one)
    const bodyCheckboxes = page.locator('tbody .ant-checkbox-input, tbody input[type="checkbox"]');
    const cbCount = await bodyCheckboxes.count();
    console.log(`tbody 复选框数量: ${cbCount}`);
    let checked2 = false;
    if (cbCount >= 2) {
      try {
        await bodyCheckboxes.nth(0).check({ timeout: 3000, force: true });
        await sleep(300);
        await bodyCheckboxes.nth(1).check({ timeout: 3000, force: true });
        checked2 = true;
        await sleep(1000);
        console.log('已勾选 2 行复选框');
      } catch (e) {
        console.log('复选框勾选失败（Playwright locator），尝试 JS 勾选');
        try {
          await page.evaluate(() => {
            const cbs = Array.from(document.querySelectorAll('tbody input[type="checkbox"]'));
            cbs.slice(0, 2).forEach(c => { if (!c.checked) { c.click(); } });
          });
          checked2 = true;
          await sleep(1000);
        } catch {}
      }
    }
    
    // Find and click batch reject button
    const rejectBtnsByText = page.locator('button').filter({ hasText: /批量驳回|驳回\s*\(\s*2\s*\)|批量.*驳回/ });
    const batchRejectBtnCount = await rejectBtnsByText.count();
    console.log(`批量驳回按钮数: ${batchRejectBtnCount}`);
    if (batchRejectBtnCount > 0) {
      try { await rejectBtnsByText.first().click({ timeout: 5000 }); }
      catch {
        try {
          await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const target = btns.find(b => /批量驳回|驳回.*\(2\)|驳回.*数量/.test(b.textContent || ''));
            target?.click();
          });
        } catch {}
      }
    } else {
      // Fallback: find any reject button, then filter
      try {
        await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'));
          const target = btns.find(b => /驳回|reject|❌/.test(b.textContent || ''));
          target?.click();
        });
      } catch {}
    }
    await sleep(2500);
    
    // Fill reject reason in Modal / ModalForm
    const filledReason = await page.evaluate(() => {
      const textareas = Array.from(document.querySelectorAll('.ant-modal-body textarea, .ant-modal textarea, .ant-modal-body input[type="text"], [name="audit_remark"] textarea, [name="reject_reason"] textarea, textarea'));
      let target = textareas[0] || document.querySelector('.ant-modal input');
      if (target) {
        target.focus();
        document.execCommand('insertText', false, '信息不完整：缺少足环号与赛绩');
        target.dispatchEvent(new Event('input', { bubbles: true }));
        target.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
      return false;
    }).catch(() => false);
    console.log('填写驳回理由成功:', filledReason);
    await sleep(1000);
    
    // Submit modal
    const submitted = await page.evaluate(() => {
      const modalBtns = Array.from(document.querySelectorAll('.ant-modal button, .ant-modal-footer button'));
      const submit = modalBtns.find(b => /提交|确定|确认|驳回|OK|完成/i.test(b.textContent || ''));
      if (submit) { submit.click(); return true; }
      return false;
    }).catch(() => false);
    console.log('Modal 提交点击成功:', submitted);
    await sleep(2500);
    
    const toastText = await page.evaluate(() => {
      const notices = Array.from(document.querySelectorAll('.ant-message, .ant-notification-notice, [role="status"]'));
      return notices.map(n => n.innerText).join(' | ').slice(0, 500);
    }).catch(() => '');
    console.log('批量驳回 Toast:', toastText.slice(0, 200));
    
    // Switch to rejected tab
    const rejectedOk = await clickTab(page, 'rejected', '已驳回');
    console.log('切到已驳回 Tab:', rejectedOk);
    await sleep(2000);
    
    // Hover test: look for reject reason text or ellipsis
    const { hasRejectReasonText, foundRejectRows } = await page.evaluate(() => {
      const body = document.body.innerText;
      const has = body.includes('信息不完整') || body.includes('足环号') || body.includes('赛绩') || body.includes('驳回理由') || body.includes('audit_remark');
      // Try to count rejected rows (rough estimate via text)
      const rows = Array.from(document.querySelectorAll('tbody tr'));
      return { hasRejectReasonText: has, foundRejectRows: rows.length };
    }).catch(() => ({ hasRejectReasonText: false, foundRejectRows: 0 }));
    console.log('找到驳回理由文字:', hasRejectReasonText, ' rejected 行数:', foundRejectRows);
    
    // Try hover on tooltip column if any
    try {
      const firstEllipsis = page.locator('.ant-typography-expand, .ant-tooltip, [class*="ellipsis"]').first();
      if (await firstEllipsis.count() > 0) {
        await firstEllipsis.hover({ timeout: 3000 }).catch(() => {});
        await sleep(800);
      }
    } catch {}
    
    await page.screenshot({ path: path.join(screenshotDir, 'scene4-rejected-tab.png') });
    const stats = getSceneConsoleStats();
    results.scene4 = {
      checked2,
      filledReason,
      submitted,
      hasRejectReason: hasRejectReasonText,
      rejectedRows: foundRejectRows,
      toastText: toastText.slice(0, 200),
      antdWarnings: stats.antdCount,
      otherErrors: stats.otherErrors,
      screenshot: 'scene4-rejected-tab.png',
    };
    console.log('场景4完成，AntD 警告:', stats.antdCount);
  } catch (e) {
    console.error('场景4错误:', e.message);
    results.scene4 = { error: e.message, antdWarnings: -1 };
  }

  // ===== SCENE 5: 预览 Drawer 打开/关闭 =====
  console.log('\n=== 场景 5：预览 Drawer 打开/关闭 ===');
  try {
    captureConsole(page);
    await clickTab(page, 'pending', '待审核资产');
    await sleep(2000);
    
    // Find preview button (Eye icon)
    const previewFound = await page.evaluate(() => {
      const tds = Array.from(document.querySelectorAll('tbody button, tbody .ant-btn, [role="button"]'));
      const previewBtn = tds.find(b => {
        const t = b.textContent + (b.getAttribute?.('aria-label') || '') + b.innerHTML;
        return /预览|👁|eye|Eye|查看|show/.test(t);
      });
      if (previewBtn) { previewBtn.click(); return true; }
      // Try EyeOutlined icon parent
      const icons = document.querySelectorAll('[class*="EyeOutlined"], [aria-label*="eye"], [class*="eye"], svg[data-icon="eye"]');
      const eye = icons[0];
      if (eye) {
        // click closest button/anchor
        let el = eye;
        while (el && el.tagName !== 'BUTTON' && el.tagName !== 'A' && el.tagName !== 'BODY') el = el.parentElement;
        if (el && el.tagName !== 'BODY') { el.click(); return true; }
      }
      return false;
    }).catch(() => false);
    console.log('找到并点击预览按钮:', previewFound);
    await sleep(2500);
    
    // Check drawer content sections
    const drawerCheck = await page.evaluate(() => {
      const drawerSel = '.ant-drawer-body, [class*="drawer-body"], [role="dialog"]';
      const drawer = document.querySelector(drawerSel);
      if (!drawer) return { open: false, hasNftCard: false, hasInfoDetail: false, hasGeneInfo: false };
      const txt = drawer.innerText || '';
      return {
        open: true,
        hasNftCard: /NFT|预览卡|封面|链上|图片|IPFS/i.test(txt),
        hasInfoDetail: /信息详情|属性|足环号|品系|羽色|鸽主|血统|性别|眼砂/.test(txt),
        hasGeneInfo: /基因|档案|DNA|血统|遗传|赛绩|家族/.test(txt),
        snippet: txt.slice(0, 300)
      };
    }).catch(() => ({ open: false }));
    console.log('Drawer 检查:', JSON.stringify(drawerCheck));
    
    await page.screenshot({ path: path.join(screenshotDir, 'scene5-drawer-open.png') });
    
    // Try to close drawer - either click approve inside, or click X, or click esc, or click overlay
    const closed = await page.evaluate(() => {
      // Try approve button inside drawer first
      const btns = Array.from(document.querySelectorAll('.ant-drawer-body button, .ant-drawer-footer button, .ant-drawer button'));
      const approve = btns.find(b => /审核通过|通过|approve/i.test(b.textContent || ''));
      if (approve) { approve.click(); return 'drawer-approve'; }
      // Try close X button
      const close = document.querySelector('.ant-drawer-close, [aria-label="close"], [class*="drawer-close"]');
      if (close) { (close).click(); return 'drawer-x'; }
      // Else click mask
      const mask = document.querySelector('.ant-drawer-mask, .ant-drawer-mask-hidden');
      if (mask) { (mask).click(); return 'drawer-mask'; }
      return 'none';
    }).catch(() => 'err');
    console.log('关闭 Drawer 方式:', closed);
    await sleep(2000);
    
    await page.screenshot({ path: path.join(screenshotDir, 'scene5-drawer-closed.png') });
    
    const stats = getSceneConsoleStats();
    results.scene5 = {
      previewButtonClicked: previewFound,
      drawerOpen: drawerCheck.open,
      hasNftCard: drawerCheck.hasNftCard,
      hasInfoDetail: drawerCheck.hasInfoDetail,
      hasGeneInfo: drawerCheck.hasGeneInfo,
      threeSectionsAtLeastOne: (drawerCheck.hasNftCard || drawerCheck.hasInfoDetail || drawerCheck.hasGeneInfo),
      closeMethod: closed,
      antdWarnings: stats.antdCount,
      otherErrors: stats.otherErrors,
      screenshots: ['scene5-drawer-open.png', 'scene5-drawer-closed.png'],
    };
    console.log('场景5完成，AntD 警告:', stats.antdCount);
  } catch (e) {
    console.error('场景5错误:', e.message);
    results.scene5 = { error: e.message, antdWarnings: -1 };
  }

  // ===== SCENE 6: 今日统计看板数字更新 =====
  console.log('\n=== 场景 6：今日统计看板数字更新 ===');
  try {
    captureConsole(page);
    await clickTab(page, 'completed', '已完成');
    await sleep(1500);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)).catch(() => {});
    await sleep(800);
    
    // Extract stats before - look for Statistic cards at bottom
    const statsBefore = await page.evaluate(() => {
      // Search page for "今日审核通过" patterns with numbers
      const body = document.body.innerText;
      
      // Find all Statistic values via .ant-statistic-content-value
      const statValues = Array.from(document.querySelectorAll('.ant-statistic, [class*="Statistic"]'))
        .map(el => {
          const title = el.querySelector('.ant-statistic-title, [class*="statistic-title"]')?.innerText || '';
          const value = el.querySelector('.ant-statistic-content-value, [class*="statistic-content"]')?.innerText || '';
          return { title: title.slice(0, 40), value: value.replace(/[^\d]/g, '').slice(0, 6) };
        })
        .filter(s => s.title.length > 0 || s.value.length > 0);
      
      // Regex fallback
      const regexStats = {};
      const approvedMatch = body.match(/今日审核通过[\s\S]{0,10}?(\d+)/);
      const mintedMatch = body.match(/今日上链成功[\s\S]{0,10}?(\d+)/);
      const todayAny = [...body.matchAll(/今日[^\d]{0,8}(\d+)/g)].map(m => m[1]);
      if (approvedMatch) regexStats.todayApproved = parseInt(approvedMatch[1]);
      if (mintedMatch) regexStats.todayMintSuccess = parseInt(mintedMatch[1]);
      regexStats.todayAnyNumbers = todayAny;
      
      return { statValues, regexStats, bodyPreview: body.slice(body.length - 1500) };
    }).catch(() => ({ statValues: [], regexStats: {} }));
    console.log('统计 BEFORE 卡片匹配:', JSON.stringify(statsBefore.statValues.slice(0, 6)));
    console.log('统计 BEFORE 正则匹配:', JSON.stringify(statsBefore.regexStats));
    
    // Switch to pending and approve another
    await clickTab(page, 'pending', '待审核资产');
    await sleep(2000);
    const { thirdApproved, toastAfterApprove } = await page.evaluate(() => {
      const tds = Array.from(document.querySelectorAll('tbody button, tbody .ant-btn'));
      let approved = false;
      for (const b of tds) {
        const sig = (b.textContent || '') + (b.getAttribute('title') || '') + (b.getAttribute('aria-label') || '') + b.innerHTML;
        if (/check|通过|✅|approve/i.test(sig.toLowerCase())) {
          b.click();
          approved = true;
          break;
        }
      }
      return { thirdApproved: approved, toastAfterApprove: '' };
    }).catch(() => ({ thirdApproved: false }));
    console.log('第三条审核通过点击成功:', thirdApproved);
    
    // Handle popconfirm
    if (thirdApproved) {
      await sleep(1500);
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('.ant-popover button, .ant-popconfirm button'));
        const ok = btns.find(b => /确定|确认|OK|是|通过/i.test(b.textContent || ''));
        ok?.click();
      }).catch(() => {});
      await sleep(3000);
    }
    
    // Wait and refresh stats
    await sleep(5000);
    try {
      await page.evaluate(() => {
        // Call component refresh if exposed
        if (typeof window.refreshStats === 'function') window.refreshStats();
      });
    } catch {}
    await sleep(1500);
    
    // Reload page for stable comparison
    try {
      await page.reload({ waitUntil: 'networkidle', timeout: 25000 });
      await sleep(3500);
    } catch (e) {
      console.log('reload 超时，继续');
    }
    
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)).catch(() => {});
    await sleep(800);
    await page.screenshot({ path: path.join(screenshotDir, 'scene6-stats-after.png') });
    
    const statsAfter = await page.evaluate(() => {
      const statValues = Array.from(document.querySelectorAll('.ant-statistic, [class*="Statistic"]'))
        .map(el => {
          const title = el.querySelector('.ant-statistic-title, [class*="statistic-title"]')?.innerText || '';
          const value = el.querySelector('.ant-statistic-content-value, [class*="statistic-content"]')?.innerText || '';
          return { title: title.slice(0, 40), value: value.replace(/[^\d]/g, '').slice(0, 6) };
        })
        .filter(s => s.title.length > 0 || s.value.length > 0);
      
      const body = document.body.innerText;
      const regexStats = {};
      const approvedMatch = body.match(/今日审核通过[\s\S]{0,10}?(\d+)/);
      const mintedMatch = body.match(/今日上链成功[\s\S]{0,10}?(\d+)/);
      const todayAny = [...body.matchAll(/今日[^\d]{0,8}(\d+)/g)].map(m => m[1]);
      if (approvedMatch) regexStats.todayApproved = parseInt(approvedMatch[1]);
      if (mintedMatch) regexStats.todayMintSuccess = parseInt(mintedMatch[1]);
      regexStats.todayAnyNumbers = todayAny;
      
      return { statValues, regexStats, bodyPreview: body.slice(body.length - 1500) };
    }).catch(() => ({ statValues: [], regexStats: {} }));
    console.log('统计 AFTER 卡片匹配:', JSON.stringify(statsAfter.statValues.slice(0, 6)));
    console.log('统计 AFTER 正则匹配:', JSON.stringify(statsAfter.regexStats));
    
    // Diff check (approve count should +1 if both found numeric)
    let approvedCountIncreased = false;
    const b = statsBefore.regexStats.todayApproved;
    const a = statsAfter.regexStats.todayApproved;
    if (typeof b === 'number' && typeof a === 'number' && a > b) approvedCountIncreased = true;
    
    const stats = getSceneConsoleStats();
    results.scene6 = {
      thirdApproved,
      statsBeforeStatCards: statsBefore.statValues,
      statsAfterStatCards: statsAfter.statValues,
      statsBeforeRegex: statsBefore.regexStats,
      statsAfterRegex: statsAfter.regexStats,
      approvedCountIncreased,
      antdWarnings: stats.antdCount,
      otherErrors: stats.otherErrors,
      screenshot: 'scene6-stats-after.png',
    };
    console.log('场景6完成，AntD 警告:', stats.antdCount, '今日审核通过增长:', approvedCountIncreased);
  } catch (e) {
    console.error('场景6错误:', e.message);
    results.scene6 = { error: e.message, antdWarnings: -1 };
  }

  // ===== Write results & cleanup =====
  console.log('\n=========== 全部场景完成，保存结果 ===========');
  const outputPath = path.join(process.cwd(), 'browser-test-results.json');
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log('结果已保存到:', outputPath);
  
  await context.close();
  await browser.close();
  
  // Print summary
  console.log('\n=== 测试汇总 ===');
  for (const key of Object.keys(results)) {
    const r = results[key];
    if (r.error) {
      console.log(`${key}: ❌ 错误 - ${r.error.slice(0, 100)}`);
    } else {
      console.log(`${key}: ✅ AntD警告=${r.antdWarnings} 其他错误=${r.otherErrors}`);
    }
  }
})();
