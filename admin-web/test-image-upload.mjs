import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const screenshotDir = path.resolve(process.cwd(), 'screenshots-upload-test');
if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

const results = {
  tokenInjected: false,
  login: { success: false, url: '', error: '' },
  navigation: { success: false, url: '', error: '' },
  drawer: { opened: false },
  upload: {
    clickWorks: false,
    fileInputFound: false,
    uploadRequestSent: false,
    uploadRequestStatus: 0,
    uploadRequestMethod: '',
    uploadRequestUrl: '',
    uploadRequestBodyPreview: '',
    uploadResponse: '',
    previewUpdated: false,
    previewType: '',
    consoleErrors: [],
    networkErrors: [],
    error: '',
  },
  secondUpload: { sent: false, status: 0, response: '' },
};

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

(async () => {
  console.log('=== 基因档案图片上传功能测试 ===\n');

  const browser = await chromium.launch({
    headless: true,
    executablePath: CHROME_PATH,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });

  const context = await browser.newContext({
    viewport: { width: 1680, height: 1080 },
    ignoreHTTPSErrors: true,
  });

  const page = await context.newPage();

  const consoleErrors = [];
  const consoleWarnings = [];
  page.on('console', (msg) => {
    if (msg.type === 'error') consoleErrors.push({ type: msg.type, text: msg.text });
    if (msg.type === 'warning') consoleWarnings.push({ type: msg.type, text: msg.text });
  });

  const networkErrors = [];
  page.on('requestfailed', (request) => {
    networkErrors.push({
      url: request.url(),
      failure: request.failure()?.errorText || 'unknown',
    });
  });

  const uploadRequests = [];
  page.on('request', (request) => {
    if (request.url().includes('/upload')) {
      uploadRequests.push({
        url: request.url(),
        method: request.method(),
        body: request.postData()?.slice(0, 500) || '',
        timestamp: Date.now(),
      });
    }
  });

  const uploadResponses = [];
  page.on('response', (response) => {
    if (response.url().includes('/upload')) {
      const entry = {
        url: response.url(),
        status: response.status(),
        body: '',
        timestamp: Date.now(),
      };
      response.text().then((text) => {
        entry.body = text.slice(0, 1000);
      }).catch(() => {});
      uploadResponses.push(entry);
    }
  });

  try {
    // STEP 1: Inject token and navigate
    console.log('STEP 1: 注入 Token 并导航...');
    const accessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJ0eXBlIjoiYWNjZXNzIiwiaWF0IjoxNzg2Nzc4NTE3LCJleHAiOjE3ODY3ODU3MTd9.p6xsiojRMY3hNXtCiH-KFOuW6iCCa1huLRkaBSbr2B0';
    const refreshToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsInVzZXJuYW1lIjoiYWRtaW4iLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc4Njc3ODUxNywiZXhwIjoxNzg3MzgzMzE3fQ.QBXA96Z32PEQr-UmG_-u6w7Z6_WehOvo1KR49nOalus';
    const userInfo = JSON.stringify({ id: 1, username: 'admin', nickname: '超级管理员', avatar: null, roles: ['admin'], permissions: [] });

    await page.goto('http://127.0.0.1:3014/login', { waitUntil: 'networkidle', timeout: 30000 });
    await page.evaluate(({ accessToken, refreshToken, userInfo }) => {
      localStorage.setItem('admin_access_token', accessToken);
      localStorage.setItem('admin_refresh_token', refreshToken);
      localStorage.setItem('admin_user_info', userInfo);
    }, { accessToken, refreshToken, userInfo });

    results.tokenInjected = true;
    console.log('  Token 已注入');

    // Navigate to gene list
    console.log('  导航到基因档案列表...');
    await page.goto('http://127.0.0.1:3014/gene/list', { waitUntil: 'networkidle', timeout: 30000 });
    await sleep(3000);

    results.navigation.url = page.url();
    results.navigation.success = page.url().includes('/gene/list');
    results.login.success = true;
    console.log(`  导航结果: ${results.navigation.success ? '成功' : '失败'}, URL: ${results.navigation.url}`);
    await page.screenshot({ path: path.join(screenshotDir, '01-gene-list.png') });

    // STEP 2: Click "新增档案" button
    console.log('\nSTEP 2: 点击新增档案按钮...');
    const createBtn = page.locator('button:has-text("新增档案")').first();
    if ((await createBtn.count()) > 0) {
      await createBtn.click();
      await sleep(2000);
      results.drawer.opened = true;
      console.log('  抽屉已打开');
      await page.screenshot({ path: path.join(screenshotDir, '02-drawer-opened.png') });
    } else {
      results.navigation.error = '未找到"新增档案"按钮';
      console.log('  错误: 未找到"新增档案"按钮');
    }

    // STEP 3: Find image uploader
    console.log('\nSTEP 3: 定位图片上传组件...');

    // Find via text content
    const uploadArea = page.locator('div:has-text("点击/拖拽/粘贴")').first();
    const uploadAreaCount = await uploadArea.count();
    console.log(`  文本匹配 "点击/拖拽/粘贴" 数量: ${uploadAreaCount}`);

    // Also try via role
    const roleButton = page.locator('div[role="button"][tabindex="0"]');
    const roleButtonCount = await roleButton.count();
    console.log(`  div[role="button"][tabindex="0"] 数量: ${roleButtonCount}`);

    // Check the upload area DOM
    const uploaderInfo = await page.evaluate(() => {
      const allDivs = Array.from(document.querySelectorAll('div[role="button"][tabindex="0"]'));
      const results = allDivs.map((d, i) => ({
        index: i,
        text: d.textContent?.slice(0, 50) || '',
        hasImg: d.querySelector('img') !== null,
        hasFileInput: d.querySelector('input[type="file"]') !== null,
        fileAccept: d.querySelector('input[type="file"]')?.accept || '',
        width: d.offsetWidth,
        height: d.offsetHeight,
      }));
      return results;
    });
    console.log(`  上传组件详情: ${JSON.stringify(uploaderInfo)}`);

    // Find the upload div - it should be the one with file input and specific size
    let uploadDivIndex = -1;
    for (const info of uploaderInfo) {
      if (info.hasFileInput && info.width >= 180 && info.width <= 220) {
        uploadDivIndex = info.index;
        break;
      }
    }

    // Fallback: find by text
    if (uploadDivIndex === -1) {
      for (let i = 0; i < uploaderInfo.length; i++) {
        if (uploaderInfo[i].text.includes('点击/拖拽/粘贴') || uploaderInfo[i].text.includes('JPG')) {
          uploadDivIndex = i;
          break;
        }
      }
    }

    console.log(`  上传组件索引: ${uploadDivIndex}`);

    if (uploadDivIndex >= 0) {
      // STEP 4: Upload image via file input
      console.log('\nSTEP 4: 通过文件输入框上传图片...');

      const fileInput = page.locator('input[type="file"]').first();
      const fileInputCount = await fileInput.count();
      results.upload.fileInputFound = fileInputCount > 0;
      console.log(`  文件输入框数量: ${fileInputCount}`);

      if (fileInputCount > 0) {
        const testImagePath = path.resolve(process.cwd(), 'public', '鸽子1.jpg');
        console.log(`  上传测试图片: ${testImagePath}`);

        await fileInput.setInputFiles(testImagePath);
        results.upload.clickWorks = true;
        console.log('  文件已选择，等待上传处理...');

        // Wait for upload to complete
        await sleep(5000);

        // Check preview after upload
        const previewState = await page.evaluate(() => {
          const container = Array.from(document.querySelectorAll('div[role="button"][tabindex="0"]'))
            .find(d => d.querySelector('input[type="file"]'));
          if (!container) return { found: false };
          const allImgs = container.querySelectorAll('img');
          const placeholderImg = container.querySelector('img[alt="点击上传"]');
          const uploadedImg = Array.from(allImgs).find(i => i.src && !i.alt?.includes('点击上传'));
          return {
            found: true,
            totalImgs: allImgs.length,
            hasPlaceholderImg: !!placeholderImg,
            uploadedImgSrc: uploadedImg?.src?.slice(0, 150) || '',
            isBase64: uploadedImg?.src?.startsWith('data:') || false,
            isHttp: uploadedImg?.src?.startsWith('http') || false,
            hasRemoveBtn: container.querySelectorAll('button').length > 0,
            containerText: container.textContent?.slice(0, 80) || '',
          };
        });

        results.upload.previewUpdated = previewState.hasPlaceholderImg === false || previewState.uploadedImgSrc !== '';
        results.upload.previewType = previewState.isBase64 ? 'base64' : previewState.isHttp ? 'http' : 'none';
        console.log(`  预览状态: ${JSON.stringify(previewState)}`);

        // Check network
        console.log('\n  网络请求检查:');
        console.log(`    上传请求数: ${uploadRequests.length}`);
        for (const req of uploadRequests) {
          console.log(`    ${req.method} ${req.url}`);
          console.log(`    Body(前300字符): ${req.body.slice(0, 300)}`);
        }
        console.log(`    上传响应数: ${uploadResponses.length}`);
        for (const res of uploadResponses) {
          console.log(`    ${res.status} ${res.url}`);
          console.log(`    Body(前300字符): ${res.body.slice(0, 300)}`);
        }

        if (uploadRequests.length > 0) {
          results.upload.uploadRequestSent = true;
          results.upload.uploadRequestMethod = uploadRequests[0].method;
          results.upload.uploadRequestUrl = uploadRequests[0].url;
          results.upload.uploadRequestBodyPreview = uploadRequests[0].body.slice(0, 300);
        }
        if (uploadResponses.length > 0) {
          results.upload.uploadRequestStatus = uploadResponses[0].status;
          results.upload.uploadResponse = uploadResponses[0].body.slice(0, 300);
        }

        await page.screenshot({ path: path.join(screenshotDir, '03-after-upload.png') });

        // Check console
        console.log('\n  控制台日志:');
        console.log(`    错误: ${consoleErrors.length}`);
        for (const e of consoleErrors) console.log(`      [${e.type}] ${e.text.slice(0, 200)}`);
        console.log(`    警告: ${consoleWarnings.length}`);
        for (const w of consoleWarnings.slice(0, 5)) console.log(`      [${w.type}] ${w.text.slice(0, 150)}`);

        results.upload.consoleErrors = consoleErrors;
        results.upload.networkErrors = networkErrors;
      }

      // STEP 5: Test second image upload
      console.log('\nSTEP 5: 测试第二张图片上传...');
      if (results.upload.fileInputFound) {
        const testImage2Path = path.resolve(process.cwd(), 'public', '鸽子2.jpg');

        // Remove first image if possible
        const removeBtn = page.locator('button[title="移除图片"]').first();
        if ((await removeBtn.count()) > 0) {
          await removeBtn.click();
          await sleep(500);
          console.log('  已清除第一张图片');
        }

        const fileInputs = page.locator('input[type="file"]');
        if ((await fileInputs.count()) > 0) {
          await fileInputs.first().setInputFiles(testImage2Path);
          await sleep(5000);

          results.secondUpload.sent = uploadRequests.length > 1;
          if (uploadResponses.length > 1) {
            results.secondUpload.status = uploadResponses[1].status;
            results.secondUpload.response = uploadResponses[1].body.slice(0, 300);
          }
          console.log(`  第二张图片: 请求数=${uploadRequests.length}, 响应数=${uploadResponses.length}`);
        }

        await page.screenshot({ path: path.join(screenshotDir, '04-second-upload.png') });
      }
    } else {
      results.upload.error = '未找到上传组件';
      console.log('  错误: 未找到上传组件');
    }

    // Final screenshot
    await page.screenshot({ path: path.join(screenshotDir, '05-final.png') });

  } catch (err) {
    console.error(`\n测试过程出错: ${err.message}`);
    results.upload.error = err.message;
  } finally {
    await browser.close();
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('测试结果总结');
  console.log('='.repeat(60));
  console.log(`Token注入: ${results.tokenInjected ? '✅' : '❌'}`);
  console.log(`导航: ${results.navigation.success ? '✅' : '❌'} (${results.navigation.url})`);
  console.log(`抽屉打开: ${results.drawer.opened ? '✅' : '❌'}`);
  console.log('');
  console.log('图片上传测试:');
  console.log(`  文件输入框存在: ${results.upload.fileInputFound ? '✅' : '❌'}`);
  console.log(`  上传请求已发送: ${results.upload.uploadRequestSent ? '✅' : '❌'}`);
  console.log(`  请求方法: ${results.upload.uploadRequestMethod || 'N/A'}`);
  console.log(`  请求URL: ${results.upload.uploadRequestUrl || 'N/A'}`);
  console.log(`  请求Body预览: ${results.upload.uploadRequestBodyPreview ? results.upload.uploadRequestBodyPreview.slice(0, 200) : 'N/A'}`);
  console.log(`  响应状态码: ${results.upload.uploadRequestStatus || 'N/A'}`);
  console.log(`  响应内容: ${results.upload.uploadResponse ? results.upload.uploadResponse.slice(0, 200) : 'N/A'}`);
  console.log(`  预览已更新: ${results.upload.previewUpdated ? '✅' : '❌'} (类型: ${results.upload.previewType || 'N/A'})`);
  console.log(`  控制台错误数: ${results.upload.consoleErrors.length}`);
  console.log(`  网络错误数: ${results.upload.networkErrors.length}`);
  if (results.upload.error) console.log(`  错误信息: ${results.upload.error}`);

  console.log('');
  console.log('第二次上传:');
  console.log(`  请求已发送: ${results.secondUpload.sent ? '✅' : '❌'}`);
  console.log(`  响应状态: ${results.secondUpload.status || 'N/A'}`);
  console.log(`  响应内容: ${results.secondUpload.response ? results.secondUpload.response.slice(0, 200) : 'N/A'}`);

  // Save results
  const resultFile = path.join(screenshotDir, 'test-results.json');
  fs.writeFileSync(resultFile, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`\n结果已保存到: ${resultFile}`);
  console.log(`截图目录: ${screenshotDir}`);
})();