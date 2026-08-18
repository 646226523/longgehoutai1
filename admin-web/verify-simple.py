"""
Verify refactored competition verification flow.
More robust version with fallbacks.
"""
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

        def on_response(response):
            url = response.url
            if '/api/competition/verify-list' in url:
                try:
                    body = response.json()
                    api_data['verify_list'] = body
                    total = body.get('data', {}).get('total', 0) if isinstance(body.get('data'), dict) else 0
                    print(f"  [API] verify-list: status={response.status}, total={total}")
                except Exception as e:
                    api_data['verify_list'] = {'status': response.status, 'error': str(e)}
        
        page.on("response", on_response)

        # 1. Login
        print("1. Logging in...")
        page.goto(LOGIN_URL, wait_until="domcontentloaded")
        page.wait_for_load_state("networkidle")
        
        # Wait for login form to appear
        try:
            page.wait_for_selector('input:has-placeholder("账号"), input#username, input[type="text"]', timeout=10000)
        except:
            print("   Warning: Could not find username input by placeholder, trying other selectors...")
        
        time.sleep(1)
        
        # Try multiple selectors for username
        username_selectors = [
            'input[placeholder*="账号"]',
            'input[placeholder*="用户名"]',
            'input#username',
            'input[name="username"]',
            'input[type="text"]:first-of-type',
        ]
        
        username_input = None
        for selector in username_selectors:
            try:
                el = page.locator(selector).first
                if el.count() > 0:
                    username_input = el
                    print(f"   Found username input with: {selector}")
                    break
            except:
                pass
        
        if username_input:
            username_input.fill("admin")
        
        # Password input
        password_input = page.locator('input[type="password"]').first
        if password_input.count() > 0:
            password_input.fill("admin123")
        
        # Try to find and click login button
        login_btn_selectors = [
            'button:has-text("登录")',
            'button:has-text("登 录")',
            'button[type="submit"]',
            'button.ant-btn-primary',
        ]
        
        clicked = False
        for selector in login_btn_selectors:
            try:
                btn = page.locator(selector).first
                if btn.count() > 0 and btn.is_visible():
                    print(f"   Found login button with: {selector}")
                    btn.click()
                    clicked = True
                    break
            except:
                pass
        
        if not clicked:
            # Press Enter as fallback
            print("   No button found, pressing Enter on password field")
            password_input.press("Enter")
        
        try:
            page.wait_for_url(lambda url: "/login" not in url, timeout=15000)
            page.wait_for_load_state("networkidle")
            time.sleep(2)
            print("   Login successful!")
            results["login_success"] = True
        except Exception as e:
            print(f"   Login might have failed: {e}")
            take_screenshot(page, "login-fail")
            # Check current URL
            current_url = page.url
            print(f"   Current URL after login attempt: {current_url}")
            page_text = page.inner_text()
            print(f"   Page text: {page_text[:500]}")
            # Even if URL is still /login, try to proceed
            results["login_success"] = "/login" not in current_url
            if "/login" in current_url:
                # Maybe there's an error message
                results["login_error"] = page_text[:500]
                # Let's still try to access the page (maybe token is set somehow)
                print("   Proceeding anyway to test page...")

        # 2. Navigate to Verify List
        print("\n2. Navigating to Verify List...")
        page.goto(VERIFY_LIST_URL, wait_until="domcontentloaded")
        
        # Wait for API call
        try:
            page.wait_for_response(lambda r: '/api/competition/verify-list' in r.url, timeout=10000)
            print("   API call detected")
        except:
            print("   Warning: API call not detected within timeout")
        
        page.wait_for_load_state("networkidle")
        time.sleep(1)
        
        take_screenshot(page, "verify-list-page")
        
        # Analyze
        main_content = page.locator("main, .ant-layout-content").first
        page_text = main_content.inner_text() if main_content.count() > 0 else page.inner_text("body")
        print(f"   Page contains '赛事核验': {'赛事核验' in page_text}")
        print(f"   Page contains '核验统计': {'核验统计' in page_text}")
        
        rows = page.locator(".ant-table-tbody > tr")
        row_count = rows.count()
        print(f"   Table rows: {row_count}")
        
        progress_count = page.locator(".ant-progress").count()
        print(f"   Progress bars: {progress_count}")
        
        tag_count = page.locator(".ant-tag").count()
        print(f"   Tags: {tag_count}")
        
        results["verify_list"] = {
            "page_text_snippet": page_text[:500],
            "table_rows": row_count,
            "progress_bars": progress_count,
            "tags": tag_count,
            "api_data_present": 'verify_list' in api_data,
        }
        
        # Check API data status
        if 'verify_list' in api_data:
            vd = api_data['verify_list']
            if isinstance(vd, dict) and 'body' in vd:
                body = vd['body']
                if isinstance(body, dict) and body.get('data'):
                    data = body['data']
                    if isinstance(data, dict):
                        results["verify_list"]["api_total"] = data.get('total', 0)
                        results["verify_list"]["api_list_len"] = len(data.get('list', []))
        
        # 3. Test batch verify if we have data
        if row_count > 0:
            print("\n3. Testing batch verify...")
            # Try clicking the "select all" checkbox in the table header first
            select_all_checkbox = page.locator(".ant-table-thead input[type='checkbox']").first
            if select_all_checkbox.count() > 0:
                print("   Clicking select-all checkbox...")
                select_all_checkbox.click()
                time.sleep(0.5)
                
                batch_btn = page.get_by_role("button", name="批量核验")
                if batch_btn.count() > 0 and batch_btn.is_enabled():
                    batch_btn.click()
                    time.sleep(0.5)
                    
                    confirm_btn = page.get_by_role("button", name="确 认")
                    if confirm_btn.count() > 0:
                        confirm_btn.click()
                        time.sleep(2)
                        take_screenshot(page, "batch-verify-done")
                        results["batch_verify"] = "executed"
                    else:
                        results["batch_verify"] = "no_confirm_dialog"
                else:
                    results["batch_verify"] = "button_disabled"
            else:
                # Try clicking first row checkbox directly
                first_row = page.locator(".ant-table-row").first
                checkbox = first_row.locator("input[type='checkbox']").first
                if checkbox.count() > 0:
                    checkbox.click()
                    time.sleep(0.5)
                    
                    batch_btn = page.get_by_role("button", name="批量核验")
                    if batch_btn.count() > 0 and batch_btn.is_enabled():
                        batch_btn.click()
                        time.sleep(0.5)
                        
                        confirm_btn = page.get_by_role("button", name="确 认")
                        if confirm_btn.count() > 0:
                            confirm_btn.click()
                            time.sleep(2)
                            take_screenshot(page, "batch-verify-done")
                            results["batch_verify"] = "executed_row"
                        else:
                            results["batch_verify"] = "no_confirm_dialog"
                else:
                    results["batch_verify"] = "no_checkbox_found"
        else:
            results["batch_verify"] = "no_data"
        
        # 4. Navigate to detail
        print("\n4. Testing Verify Detail...")
        
        # Determine competition ID to navigate to
        comp_id = None
        if 'verify_list' in api_data:
            vd = api_data['verify_list']
            if isinstance(vd, dict) and 'body' in vd:
                body = vd['body']
                if isinstance(body, dict) and body.get('data'):
                    data = body['data']
                    if isinstance(data, dict) and data.get('list') and len(data['list']) > 0:
                        comp_id = data['list'][0].get('id')
        
        if not comp_id:
            # Check if we have a "开始核验" button to click
            start_btn = page.get_by_role("button", name="开始核验")
            if start_btn.count() > 0:
                start_btn.first.click()
                page.wait_for_load_state("networkidle")
                time.sleep(1)
                take_screenshot(page, "verify-detail")
            else:
                # Try navigating directly to a known competition
                comp_id = 11  # Fallback to a known competition ID
                print(f"   Navigating directly to competition {comp_id}")
                page.goto(f"{BASE_URL}/competition/verify/{comp_id}")
                page.wait_for_load_state("networkidle")
                time.sleep(1)
                take_screenshot(page, "verify-detail-direct")
        else:
            print(f"   Navigating to competition {comp_id}")
            page.goto(f"{BASE_URL}/competition/verify/{comp_id}")
            page.wait_for_load_state("networkidle")
            time.sleep(1)
            take_screenshot(page, "verify-detail")
        
        # Analyze detail page
        main_content = page.locator("main, .ant-layout-content").first
        detail_text = main_content.inner_text() if main_content.count() > 0 else page.inner_text("body")
        results["verify_detail"] = {
            "has_scanner_card": "扫码设备联动" in detail_text,
            "has_device_status": "设备已连接" in detail_text,
            "has_scan_input": page.locator("input[placeholder*='足环号'], input[placeholder*='扫码']").count() > 0,
            "has_scan_button": page.get_by_role("button", name="模拟扫码").count() > 0,
            "page_snippet": detail_text[:500],
        }
        
        # 5. Test scan simulation if possible
        print("\n5. Testing scan simulation...")
        scan_input = page.locator("input[placeholder*='足环号'], input[placeholder*='扫码']").first
        scan_btn = page.get_by_role("button", name="模拟扫码").first
        
        if scan_input.count() > 0 and scan_btn.count() > 0:
            test_ring = "CHN-2026-000001"
            scan_input.fill(test_ring)
            time.sleep(0.3)
            scan_btn.click()
            time.sleep(1)
            take_screenshot(page, "scan-result")
            
            updated_text = page.inner_text("body")
            results["simulated_scan"] = {
                "executed": True,
                "log_has_ring": test_ring in updated_text,
            }
        else:
            results["simulated_scan"] = "missing_elements"

        # Final summary
        print("\n6. Summary:")
        print(f"   Console errors: {len(console_errors)}")
        print(f"   Console warnings: {len(console_warnings)}")
        
        results["console"] = {
            "errors": console_errors[:10],
            "warnings": console_warnings[:10],
        }
        results["api_data"] = api_data

        with open(RESULT_FILE, "w", encoding="utf-8") as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        print(f"\nResults saved to {RESULT_FILE}")

        browser.close()

if __name__ == "__main__":
    main()
