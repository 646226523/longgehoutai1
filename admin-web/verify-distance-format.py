from __future__ import annotations

import json
import re
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
RESULT_FILE = ROOT / "verify-distance-format.json"

BASE_URL = "http://127.0.0.1:3014"
LOGIN_URL = f"{BASE_URL}/login"
COMPETITION_LIST_URL = f"{BASE_URL}/competition/list"

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
            if msg.type == "warning":
                console_warnings.append(msg.text)
        
        page.on("console", on_console)

        # 登录
        print("Navigating to login page...")
        page.goto(LOGIN_URL, wait_until="domcontentloaded")
        page.wait_for_load_state("networkidle")
        time.sleep(1)  # 额外等待 React 渲染

        # 等待输入框可见并填入值
        print("Filling form...")
        username_input = page.locator('input[placeholder*="账号"], input#username').first
        password_input = page.locator('input[type="password"]').first
        
        if username_input.count() > 0 and password_input.count() > 0:
            # 使用 type 方法模拟真实输入，触发 React onChange
            username_input.click()
            username_input.fill("admin")
            password_input.click()
            password_input.fill("admin123")
            print("Form filled.")
            
            # 查找并点击登录按钮
            login_btn = page.locator('button:has-text("登录")').first
            if login_btn.count() > 0:
                print("Clicking login button...")
                login_btn.click()
            else:
                print("Pressing Enter...")
                password_input.press("Enter")
                
            try:
                page.wait_for_url(lambda url: "/login" not in url, timeout=10000)
                page.wait_for_load_state("networkidle")
                print("Login successful!")
            except Exception as e:
                print(f"Login wait timeout: {e}")
                print("Current URL:", page.url)
                # 可能还在登录页，检查错误
                if "login" in page.url:
                    error_msg = page.locator('.ant-message, .ant-form-item-explain').first
                    if error_msg.count() > 0:
                        print("Login error message:", error_msg.inner_text())
        else:
            print("Cannot find login inputs!")
            print("Page HTML snippet:", page.locator("body").inner_html()[:1000])

        # 检查列表空距格式
        print("\nNavigating to competition list...")
        page.goto(COMPETITION_LIST_URL, wait_until="domcontentloaded")
        page.wait_for_load_state("networkidle")
        time.sleep(2)  # 等待列表加载

        # 等待表格加载
        try:
            page.wait_for_selector("table.ant-table", timeout=5000)
        except:
            print("Table not found, may be empty or loading failed.")
            # 检查是否被重定向到登录页
            if "login" in page.url:
                print("Redirected to login page, authentication failed.")
            pass
        
        # 查找包含 km 的单元格
        distance_cells = page.locator("td.ant-table-cell").filter(has_text="km")
        cell_count = distance_cells.count()
        print(f"Found {cell_count} distance cells.")
        
        is_formatted = True
        for i in range(cell_count):
            text = distance_cells.nth(i).inner_text()
            print(f"Cell {i}: '{text}'")
            # 检查是否为 "数字.两位小数 km" 格式
            if not re.match(r"-?\d+\.\d{2}\s*km", text):
                is_formatted = False
                print(f"Warning: Cell not formatted correctly: {text}")

        print(f"All formatted to 2 decimals: {is_formatted}")

        # 进入新增页面以触发 InputNumber 和 message 的使用
        if page.get_by_role("button", name="新增赛事").count() > 0:
            print("\nNavigating to create competition...")
            page.get_by_role("button", name="新增赛事").first.click()
            page.wait_for_load_state("networkidle")
            time.sleep(1)
            
            # 尝试提交一个空表单来触发 message
            if page.get_by_role("button", name="确认发布").count() > 0:
                page.get_by_role("button", name="确认发布").first.click()
                page.wait_for_timeout(500)

        # 筛选特定警告
        has_inputnumber_warning = any("InputNumber" in msg and "addonAfter" in msg for msg in console_errors)
        has_message_warning = any("Static function can not consume context" in msg for msg in console_errors)

        print(f"\nHas InputNumber addonAfter warning: {has_inputnumber_warning}")
        print(f"Has message static function warning: {has_message_warning}")

        results = {
            "distance_formatted": is_formatted,
            "has_inputnumber_warning": has_inputnumber_warning,
            "has_message_warning": has_message_warning,
            "all_console_errors": console_errors,
            "all_console_warnings": console_warnings,
        }
        
        with open(RESULT_FILE, "w", encoding="utf-8") as f:
            json.dump(results, f, indent=2, ensure_ascii=False)

        print("\nResults saved to", RESULT_FILE)
        browser.close()

if __name__ == "__main__":
    main()
