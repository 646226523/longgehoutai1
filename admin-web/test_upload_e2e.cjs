// Upload test script using Playwright
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function testUpload() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const messages = [];
  page.on('console', msg => {
    messages.push(`${msg.type}: ${msg.text}`);
  });
  page.on('pageerror', err => {
    messages.push(`PAGE_ERROR: ${err}`);
  });

  console.log('1. Logging in...');
  await page.goto('http://localhost:3014/login');
  await page.waitForLoadState('networkidle');
  
  // Fill login form
  await page.locator('input[placeholder*="用户名"], input[type="text"]').first().fill('admin');
  await page.locator('input[type="password"]').first().fill('admin123');
  await page.getByRole('button', { name: /登录|确定/ }).first().click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
  
  console.log('2. Navigating to detection org page...');
  await page.goto('http://localhost:3014/detection/org');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  
  console.log('3. Clicking "新增机构" button...');
  const addButton = page.getByRole('button', { name: '新增机构' });
  await addButton.waitFor({ state: 'visible', timeout: 10000 });
  await addButton.click();
  await page.waitForTimeout(1000);
  
  console.log('4. Creating test file for upload...');
  const testDir = path.join(__dirname, 'test_files');
  if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });
  const testFilePath = path.join(testDir, 'qualification_cert.pdf');
  fs.writeFileSync(testFilePath, 'This is a test PDF file for upload verification.');
  
  try {
    console.log('5. Finding file input and uploading...');
    const fileInput = page.locator('input[type="file"]').first();
    await fileInput.waitFor({ state: 'attached', timeout: 5000 });
    await fileInput.setInputFiles(testFilePath);
    
    console.log('6. Waiting for upload to complete...');
    await page.waitForTimeout(3000);
    
    // Take screenshot of result
    const screenshotPath = path.join(__dirname, 'upload_test_result.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log('Screenshot saved to upload_test_result.png');
    
    // Check results
    const pageText = await page.innerText('body');
    
    console.log('\n=== UPLOAD TEST RESULTS ===');
    console.log('Page contains "上传失败":', pageText.includes('上传失败'));
    console.log('Page contains "无URL返回":', pageText.includes('无URL返回'));
    console.log('Page contains "qualification_cert":', pageText.includes('qualification_cert'));
    console.log('Page contains "已上传":', pageText.includes('已上传'));
    console.log('Page contains "暂无资质文件":', pageText.includes('暂无资质文件'));
    
    // Check console messages
    const errorMsgs = messages.filter(m => 
      m.includes('error') || m.includes('ERROR') || m.includes('失败')
    );
    
    console.log('\n=== CONSOLE MESSAGES (last 15) ===');
    messages.slice(-15).forEach(m => console.log('  ' + m));
    
    if (errorMsgs.length > 0) {
      console.log('\n❌ ERROR MESSAGES FOUND:');
      errorMsgs.forEach(m => console.log('  ' + m));
    } else {
      console.log('\n✅ No error messages in console!');
    }
    
    // Final verdict
    const hasUploadError = pageText.includes('上传失败') || pageText.includes('无URL返回');
    const fileDisplayed = pageText.includes('qualification_cert') || 
                          (pageText.includes('已上传') && !pageText.includes('暂无资质文件'));
    
    console.log('\n=== FINAL VERDICT ===');
    if (!hasUploadError && fileDisplayed) {
      console.log('✅ TEST PASSED - File uploaded successfully and displayed in preview!');
    } else if (hasUploadError) {
      console.log('❌ TEST FAILED - Upload error detected!');
    } else if (!fileDisplayed) {
      console.log('⚠️  WARNING - No upload error but file not displayed in preview');
      console.log('  Checking file list in DOM...');
      
      // Try to find file list items
      const fileItems = page.locator('.ant-upload-list-item');
      const fileCount = await fileItems.count();
      console.log(`  Upload list items found: ${fileCount}`);
      
      if (fileCount > 0) {
        for (let i = 0; i < fileCount; i++) {
          const item = fileItems.nth(i);
          const itemText = await item.innerText();
          console.log(`  File ${i + 1}: ${itemText}`);
        }
      }
    }
    
    // Check right panel preview
    const rightPanel = page.locator('.ant-drawer-body').first();
    if (await rightPanel.isVisible()) {
      const panelText = await rightPanel.innerText();
      if (panelText.includes('资质文件') || panelText.includes('qualification_cert')) {
        console.log('  ✅ Right panel shows qualification files');
      }
    }
    
  } finally {
    // Cleanup test files
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
    if (fs.existsSync(testDir)) {
      fs.rmdirSync(testDir, { recursive: true });
    }
    await browser.close();
  }
}

testUpload().catch(console.error);
