from __future__ import annotations

import time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
BASE_URL = "http://127.0.0.1:3014"
LOGIN_URL = f"{BASE_URL}/login"
COMPETITION_LIST_URL = f"{BASE_URL}/competition/list"


def log(m):
    print(m, flush=True)


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, channel="chrome", args=["--no-sandbox", "--disable-setuid-sandbox"])
    context = browser.new_context(viewport={"width": 1440, "height": 1000})
    page = context.new_page()

    page.goto(LOGIN_URL, wait_until="domcontentloaded", timeout=30000)
    page.wait_for_load_state("networkidle")
    time.sleep(1)
    username = page.locator("input#username, input[name='username'], input[placeholder*='账号']").first
    password = page.locator("input#password, input[type='password']").first
    if username.count() > 0:
        username.fill("admin")
    if password.count() > 0:
        password.fill("admin123")
    submit = page.locator("button[type='submit'], button:has-text('登录')").first
    if submit.count() > 0:
        submit.click()
    else:
        page.keyboard.press("Enter")
    page.wait_for_url(lambda url: "/login" not in url, timeout=15000)
    page.wait_for_load_state("networkidle")
    time.sleep(1)
    log("登录完成")

    page.goto(COMPETITION_LIST_URL, wait_until="domcontentloaded", timeout=30000)
    page.wait_for_load_state("networkidle")
    time.sleep(1)
    page.get_by_role("button", name="新增赛事").first.click()
    page.get_by_text("赛线地图").wait_for(state="visible", timeout=10000)
    time.sleep(1.5)

    log("=== 所有 .ant-select-selection-search-input ===")
    inputs = page.locator(".ant-select-selection-search-input")
    log(f"count={inputs.count()}")
    for i in range(inputs.count()):
        el = inputs.nth(i)
        box = el.bounding_box()
        ph = el.get_attribute("placeholder")
        sel_ancestor = el.locator("xpath=ancestor::div[contains(@class,'ant-select')][1]")
        style = sel_ancestor.get_attribute("style")
        log(f"  [{i}] placeholder={repr(ph)} box={box} select_style={repr(style)[:80]}")

    log("=== 所有可见 .ant-select ===")
    sels = page.locator(".ant-select:visible")
    log(f"count={sels.count()}")
    for i in range(sels.count()):
        el = sels.nth(i)
        box = el.bounding_box()
        style = el.get_attribute("style")
        text = el.inner_text()[:40]
        log(f"  [{i}] box={box} style={repr(style)[:80]} text={repr(text)}")

    browser.close()
