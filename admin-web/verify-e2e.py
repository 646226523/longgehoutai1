from __future__ import annotations

import json
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
RESULT_FILE = ROOT / "verify-e2e-result.json"
SCREENSHOT_DIR = ROOT / "verify-e2e-screenshots"
SCREENSHOT_DIR.mkdir(exist_ok=True)

BASE_URL = "http://127.0.0.1:3014"
LOGIN_URL = f"{BASE_URL}/login"
VERIFY_LIST_URL = f"{BASE_URL}/competition/verify"

results: dict[str, object] = {}
api_data: dict[str, object] = {}

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
            text = msg.text
            if msg.type == "error":
                console_errors.append(text)
            elif msg.type == "warning":
                console_warnings.append(text)
        
        page.on("console", on_console)

        # Step 0: Intercept API responses
        def on_response(response):
            url = response.url
            if '/api/competition/verify-list' in url:
                try:
                    body = response.json()
                    api_data['verify_list'] = body
                    total = body.get('data', {}).get('total', 0) if isinstance(body.get('data'), dict) else 0
                    print(f"  [API] verify-list: total={total}")
                except Exception as e:
                    api_data['verify_list'] = {'error': str(e)}
        
        page.on("response", on_response)

        # Step 1: Login
        print("1. Logging in...")
        page.goto(LOGIN_URL, wait_until="domcontentloaded")
        page.wait_for_load_state("networkidle")
        time.sleep(2)  # Give extra time for login page to fully render
        
        try:
            page.fill('input[placeholder*="账号"], input#username', "admin", timeout=5000)
            page.fill('input[type="password"]', "admin123", timeout=5000)
            
            # Wait for login button to be visible and clickable
            login_btn = page.wait_for_selector('button:has-text("登录")', timeout=5000)
            if login_btn:
                login_btn.click()
            else:
                page.fill('input[type="password"]', "admin123")
                page.press('input[type="password"]', "Enter")
                
            page.wait_for_url(lambda url: "/login" not in url, timeout=15000)
            page.wait_for_load_state("networkidle")
            time.sleep(1)
            print("   Login successful!")
        except Exception as e:
            print(f"   Login failed: {e}")
            # Take a screenshot of login page for debugging
            take_screenshot(page, "login-page-error")
            page_text = page.inner_text()
            print(f"   Page text at login: {page_text[:300]}")
            results["login_success"] = False
            with open(RESULT_FILE, "w", encoding="utf-8") as f:
                json.dump(results, f, indent=2, ensure_ascii=False)
            browser.close()
            return

        results["login_success"] = True

        # Step 2: Navigate to Verify List
        print("\n2. Navigating to Verify List...")
        page.goto(VERIFY_LIST_URL, wait_until="domcontentloaded")
        # Wait for the API call to complete
        page.wait_for_response(lambda r: '/api/competition/verify-list' in r.url, timeout=10000)
        time.sleep(1)
        
        take_screenshot(page, "verify-list")
        
        # Analyze the page
        page_text = page.inner_text()
        print(f"   Page text contains '核验统计': {'核验统计' in page_text}")
        print(f"   Page text contains '赛事核验': {'赛事核验' in page_text}")
        
        # Check for table data
        rows = page.locator(".ant-table-tbody > tr")
        row_count = rows.count()
        print(f"   Table row count: {row_count}")
        
        # Check for progress bars
        progress_count = page.locator(".ant-progress").count()
        print(f"   Progress bar count: {progress_count}")
        
        # Check for tags
        tag_count = page.locator(".ant-tag").count()
        print(f"   Tag count: {tag_count}")
        
        # Check for buttons
        batch_btn_exists = page.get_by_role("button", name="批量核验").count() > 0
        start_btn_exists = page.get_by_role("button", name="开始核验").count() > 0
        
        results["verify_list"] = {
            "page_text_has_stats": "核验统计" in page_text,
            "page_text_has_header": "赛事核验" in page_text,
            "table_rows": row_count,
            "progress_bars": progress_count,
            "tags": tag_count,
            "has_batch_button": batch_btn_exists,
            "has_start_button": start_btn_exists,
            "api_data_available": 'verify_list' in api_data,
        }
        
        # Step 3: Test batch verify if we have data
        if row_count > 0:
            print("\n3. Testing batch verify...")
            # Click the first row checkbox
            first_checkbox = rows.first.locator("input[type='checkbox']")
            if first_checkbox.count() > 0:
                first_checkbox.click()
                time.sleep(0.5)
                
                # Click batch verify
                batch_btn = page.get_by_role("button", name="批量核验")
                if batch_btn.count() > 0 and batch_btn.is_enabled():
                    batch_btn.click()
                    time.sleep(0.5)
                    
                    # Confirm dialog
                    confirm_btn = page.get_by_role("button", name="确 认")
                    if confirm_btn.count() > 0:
                        confirm_btn.click()
                        time.sleep(2)
                        take_screenshot(page, "batch-verify-done")
                        print("   Batch verify executed!")
                        results["batch_verify"] = "executed"
                    else:
                        print("   Confirm button not found.")
                        results["batch_verify"] = "no_confirm"
                else:
                    print("   Batch button not enabled/found.")
                    results["batch_verify"] = "button_issue"
            else:
                results["batch_verify"] = "no_checkbox"
        else:
            # No data - but we know the API has data, so this might be a rendering issue
            print("\n3. No table rows found on page.")
            print("   Checking if there's an empty state message...")
            empty_indicator = page.locator(".ant-empty, :text('暂无数据')")
            print(f"   Empty indicator visible: {empty_indicator.count() > 0}")
            results["batch_verify"] = "no_data_on_page"

        # Step 4: Navigate to Verify Detail for first competition
        print("\n4. Navigating to Verify Detail...")
        if start_btn_exists:
            page.get_by_role("button", name="开始核验").first.click()
            page.wait_for_load_state("networkidle")
            time.sleep(2)
            take_screenshot(page, "verify-detail")
            
            # Check detail page content
            detail_text = page.inner_text()
            print(f"   Detail page has '扫码设备联动': {'扫码设备联动' in detail_text}")
            print(f"   Detail page has '设备已连接': {'设备已连接' in detail_text}")
            print(f"   Detail page has '最近扫描记录': {'最近扫描记录' in detail_text}")
            
            scan_input = page.locator("input[placeholder*='足环号'], input[placeholder*='扫码']")
            print(f"   Scan input found: {scan_input.count() > 0}")
            
            scan_button = page.get_by_role("button", name="模拟扫码")
            print(f"   Scan button found: {scan_button.count() > 0}")
            
            results["verify_detail"] = {
                "has_scanner_card": "扫码设备联动" in detail_text,
                "has_device_status": "设备已连接" in detail_text,
                "has_scan_input": scan_input.count() > 0,
                "has_scan_button": scan_button.count() > 0,
                "has_scan_log": "最近扫描记录" in detail_text,
            }
            
            # Step 5: Test simulated scan
            print("\n5. Testing simulated scan...")
            if scan_input.count() > 0 and scan_button.count() > 0:
                test_ring = "CHN-2026-000001"
                scan_input.fill(test_ring)
                time.sleep(0.3)
                scan_button.click()
                time.sleep(1)
                take_screenshot(page, "scan-result")
                
                # Check if scan log updated
                updated_text = page.inner_text()
                log_has_ring = test_ring in updated_text
                print(f"   Scan log has ring number: {log_has_ring}")
                results["simulated_scan"] = {
                    "executed": True,
                    "log_updated": log_has_ring,
                }
            else:
                results["simulated_scan"] = "missing_elements"
        else:
            # If we couldn't click "开始核验", try navigating directly to the first competition
            if 'verify_list' in api_data and isinstance(api_data['verify_list'], dict):
                list_data = api_data['verify_list'].get('data', {})
                if isinstance(list_data, dict) and list_data.get('list') and len(list_data['list']) > 0:
                    first_id = list_data['list'][0]['id']
                    print(f"   Navigating directly to /competition/verify/{first_id}")
                    page.goto(f"{BASE_URL}/competition/verify/{first_id}")
                    page.wait_for_load_state("networkidle")
                    time.sleep(2)
                    take_screenshot(page, "verify-detail-direct")
                    
                    detail_text = page.inner_text()
                    results["verify_detail"] = {
                        "has_scanner_card": "扫码设备联动" in detail_text,
                        "has_device_status": "设备已连接" in detail_text,
                        "detail_page_text_snippet": detail_text[:500],
                    }
                    results["simulated_scan"] = "not_tested_due_to_navigation"
                else:
                    results["verify_detail"] = "no_data_in_api"
                    results["simulated_scan"] = "not_tested"
            else:
                results["verify_detail"] = "cannot_navigate"
                results["simulated_scan"] = "not_tested"

        # Summary
        print("\n6. Final Summary:")
        print(f"   Console errors: {len(console_errors)}")
        print(f"   Console warnings: {len(console_warnings)}")
        print(f"   API calls intercepted: {list(api_data.keys())}")
        
        results["console"] = {
            "errors": console_errors[:10],
            "warnings": console_warnings[:10],
            "error_count": len(console_errors),
            "warning_count": len(console_warnings),
        }
        results["api_data"] = api_data

        with open(RESULT_FILE, "w", encoding="utf-8") as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        print(f"\nResults saved to {RESULT_FILE}")

        browser.close()

if __name__ == "__main__":
    main()
