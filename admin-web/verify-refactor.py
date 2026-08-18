from __future__ import annotations

import json
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
RESULT_FILE = ROOT / "verify-refactor-result.json"
SCREENSHOT_DIR = ROOT / "verify-refactor-screenshots"
SCREENSHOT_DIR.mkdir(exist_ok=True)

BASE_URL = "http://127.0.0.1:3014"
LOGIN_URL = f"{BASE_URL}/login"
VERIFY_LIST_URL = f"{BASE_URL}/competition/verify"

results: dict[str, object] = {}
api_responses = {}

def take_screenshot(page, name: str):
    filepath = SCREENSHOT_DIR / f"{name}.png"
    page.screenshot(path=str(filepath))
    print(f"  [Screenshot] {filepath}")

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, channel="chrome", args=["--no-sandbox", "--disable-setuid-sandbox"])
        context = browser.new_context(viewport={"width": 1440, "height": 1000}, ignore_https_errors=True)
        page = context.new_page()

        console_errors = []
        console_warnings = []

        def on_console(msg):
            if msg.type == "error":
                console_errors.append(msg.text)
            elif msg.type == "warning":
                console_warnings.append(msg.text)
        
        page.on("console", on_console)

        # 拦截 API 响应
        def on_response(response):
            url = response.url
            if '/api/competition/verify-list' in url:
                try:
                    body = response.json()
                    api_responses['verify_list'] = {
                        'status': response.status,
                        'body': body,
                    }
                    print(f"  [API] verify-list: status={response.status}, total={body.get('data', {}).get('total', 'N/A') if isinstance(body.get('data'), dict) else 'N/A'}")
                except Exception as e:
                    api_responses['verify_list'] = {'status': response.status, 'error': str(e)}
        
        page.on("response", on_response)

        # 1. 登录
        print("1. Logging in...")
        page.goto(LOGIN_URL, wait_until="domcontentloaded")
        page.wait_for_load_state("networkidle")
        time.sleep(1)
        
        username_input = page.locator('input[placeholder*="账号"], input#username').first
        password_input = page.locator('input[type="password"]').first
        
        if username_input.count() > 0 and password_input.count() > 0:
            username_input.click()
            username_input.fill("admin")
            password_input.click()
            password_input.fill("admin123")
            
            login_btn = page.locator('button:has-text("登录")').first
            if login_btn.count() > 0:
                login_btn.click()
            else:
                password_input.press("Enter")
                
            try:
                page.wait_for_url(lambda url: "/login" not in url, timeout=10000)
                page.wait_for_load_state("networkidle")
                time.sleep(1)
                print("   Login successful!")
            except Exception as e:
                print(f"   Login failed: {e}")
                results["login_success"] = False
                with open(RESULT_FILE, "w", encoding="utf-8") as f:
                    json.dump(results, f, indent=2, ensure_ascii=False)
                browser.close()
                return

        results["login_success"] = True

        # 2. 访问核验列表页
        print("\n2. Navigating to Verify List...")
        page.goto(VERIFY_LIST_URL, wait_until="domcontentloaded")
        page.wait_for_load_state("networkidle")
        time.sleep(2)
        
        take_screenshot(page, "verify-list-page")
        
        # 诊断: 获取页面主要内容
        main_content = page.locator("main, .ant-layout-content, #root div").first
        page_text = main_content.inner_text() if main_content.count() > 0 else page.inner_text()
        print(f"   Page text (first 500 chars): {page_text[:500]}")
        
        # 检查页面元素
        has_progress = page.locator(".ant-progress").count() > 0
        has_tags = page.locator(".ant-tag").count() > 0
        has_batch_button = page.get_by_role("button", name="批量核验").count() > 0
        has_search = page.locator("input[placeholder*='赛事名称'], input[placeholder*='请输入']").count() > 0
        
        # 检查表格数据
        table_rows = page.locator(".ant-table-tbody tr")
        row_count = table_rows.count()
        print(f"   Table rows: {row_count}")
        
        if row_count == 0:
            # 检查空状态
            empty_text = page.locator(".ant-empty-description, :text('暂无数据')")
            print(f"   Empty state detected: {empty_text.count() > 0}")
        
        # 检查统计卡片是否渲染
        statistic_titles = page.locator(".ant-statistic-title")
        stat_count = statistic_titles.count()
        print(f"   Statistic titles count: {stat_count}")
        for i in range(min(stat_count, 4)):
            print(f"     Stat {i}: {statistic_titles.nth(i).inner_text()}")
        
        results["verify_list"] = {
            "page_loaded": True,
            "has_progress_bars": has_progress,
            "has_status_tags": has_tags,
            "has_batch_verify_button": has_batch_button,
            "has_search_filter": has_search,
            "table_rows_count": row_count,
            "stat_card_titles_count": stat_count,
        }
        print(f"   Results: {results['verify_list']}")

        # 3. 测试批量核验
        print("\n3. Testing batch verify...")
        try:
            # 如果有数据，勾选并核验
            if row_count > 0:
                # 尝试找到复选框
                checkbox = page.locator(".ant-table-row:first-child input[type='checkbox']")
                if checkbox.count() > 0:
                    checkbox.click()
                    time.sleep(0.5)
                    
                    batch_btn = page.get_by_role("button", name="批量核验")
                    if batch_btn.count() > 0 and batch_btn.is_enabled():
                        batch_btn.click()
                        time.sleep(1)
                        confirm_btn = page.get_by_role("button", name="确 认")
                        if confirm_btn.count() > 0:
                            confirm_btn.click()
                            time.sleep(2)
                            take_screenshot(page, "batch-verify-result")
                            results["batch_verify"] = "executed"
                            print("   Batch verify executed.")
                        else:
                            results["batch_verify"] = "no_confirm_dialog"
                            print("   No confirm dialog.")
                    else:
                        results["batch_verify"] = "button_disabled"
                        print("   Batch verify button disabled.")
                else:
                    results["batch_verify"] = "no_checkbox"
                    print("   No checkbox found.")
            else:
                results["batch_verify"] = "no_data"
                print("   No data rows to test batch verify.")
        except Exception as e:
            print(f"   Error in batch verify: {e}")
            results["batch_verify"] = f"error: {e}"

        # 4. 进入核验详情页
        print("\n4. Navigating to Verify Detail...")
        try:
            # 尝试查找"开始核验"按钮（可能在表格操作列）
            detail_btn = page.get_by_role("button", name="开始核验").first
            if detail_btn.count() > 0:
                print("   Found '开始核验' button, clicking...")
                detail_btn.click()
                page.wait_for_load_state("networkidle")
                time.sleep(2)
                
                take_screenshot(page, "verify-detail-page")
                
                page_text = page.inner_text()
                print(f"   Detail page text (first 500): {page_text[:500]}")
                
                has_scanner_card = page.locator("text=扫码设备联动").count() > 0
                has_device_status = page.locator("text=设备已连接").count() > 0
                has_scan_input = page.locator("input[placeholder*='足环号'], input[placeholder*='扫码']").count() > 0
                has_scan_log = page.locator("text=最近扫描记录").count() > 0
                
                results["verify_detail"] = {
                    "page_loaded": True,
                    "has_scanner_card": has_scanner_card,
                    "has_device_status": has_device_status,
                    "has_scan_input": has_scan_input,
                    "has_scan_log": has_scan_log,
                }
                print(f"   Results: {results['verify_detail']}")
                
                # 5. 测试模拟扫码
                print("\n5. Testing simulated scan...")
                scan_input = page.locator("input[placeholder*='足环号'], input[placeholder*='扫码']").first
                if scan_input.count() > 0:
                    test_ring = "CHN-2026-000001"
                    scan_input.fill(test_ring)
                    time.sleep(0.3)
                    
                    scan_btn = page.get_by_role("button", name="模拟扫码")
                    if scan_btn.count() > 0:
                        scan_btn.click()
                        time.sleep(1)
                        take_screenshot(page, "scan-result")
                        
                        log_updated = page.locator(f"text={test_ring}").count() > 0
                        results["simulated_scan"] = {
                            "executed": True,
                            "log_updated": log_updated,
                        }
                        print(f"   Results: {results['simulated_scan']}")
                    else:
                        results["simulated_scan"] = "no_scan_button"
                        print("   No scan button found.")
                else:
                    results["simulated_scan"] = "no_scan_input"
                    print("   No scan input found.")
            else:
                print("   No '开始核验' button found on list page.")
                results["verify_detail"] = "no_data"
                results["simulated_scan"] = "not_tested"
        except Exception as e:
            print(f"   Error in verify detail: {e}")
            results["verify_detail"] = f"error: {e}"
            results["simulated_scan"] = "not_tested"

        # 6. 汇总结果
        print("\n6. Summary:")
        print(f"   Console errors: {len(console_errors)}")
        print(f"   Console warnings: {len(console_warnings)}")
        
        results["console"] = {
            "errors_count": len(console_errors),
            "warnings_count": len(console_warnings),
            "errors": console_errors[:5],
            "warnings": console_warnings[:5],
        }
        
        results["api_responses"] = api_responses

        with open(RESULT_FILE, "w", encoding="utf-8") as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        print(f"\nResults saved to {RESULT_FILE}")

        browser.close()

if __name__ == "__main__":
    main()
