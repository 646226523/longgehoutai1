from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    console_errors = []
    page.on("console", lambda msg: console_errors.append(f"[{msg.type}] {msg.text}") if msg.type == "error" else None)

    print("=== 1. Navigating to login page ===")
    page.goto("http://localhost:3014")
    page.wait_for_load_state("networkidle")
    page.screenshot(path="p:/龙鸽项目/longgehoutai/test-screenshots/login-flow/01-login-page.png")
    print(f"URL after load: {page.url}")

    print("\n=== 2. Attempting login ===")
    username_input = page.locator('input#username')
    password_input = page.locator('input#password')

    if username_input.count() > 0:
        username_input.fill("admin")
        password_input.fill("admin123")
        page.screenshot(path="p:/龙鸽项目/longgehoutai/test-screenshots/login-flow/02-filled-credentials.png")

        submit_btn = page.locator('button:has-text("登 录")')
        if submit_btn.count() == 0:
            submit_btn = page.locator('button[type="submit"]')
        submit_btn.click()
        print("Clicked login button")

        page.wait_for_timeout(2000)
        page.screenshot(path="p:/龙鸽项目/longgehoutai/test-screenshots/login-flow/03-after-login.png")
        print(f"URL after login attempt: {page.url}")
    else:
        print("ERROR: Cannot find login form inputs!")
        print(f"Page title: {page.title()}")
        print(f"Page content snippet: {page.content()[:500]}")

    print("\n=== 3. Checking login result ===")
    page.wait_for_load_state("networkidle")
    page.screenshot(path="p:/龙鸽项目/longgehoutai/test-screenshots/login-flow/04-final-state.png")
    print(f"Final URL: {page.url}")

    page_content = page.content()
    if "工作台" in page_content or "Dashboard" in page_content or "首页" in page_content:
        print("SUCCESS: Login succeeded, on dashboard")
    elif "登录" in page_content:
        print("FAIL: Still on login page")
        error_alert = page.locator('.ant-alert-message')
        if error_alert.count() > 0:
            print(f"Error message: {error_alert.first.inner_text()}")
    else:
        print(f"Unknown state, URL: {page.url}")

    print("\n=== 4. Console errors ===")
    if console_errors:
        for err in console_errors:
            print(f"  {err}")
    else:
        print("  No console errors")

    browser.close()
    print("\nDone.")
