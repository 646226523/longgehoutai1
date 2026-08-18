from __future__ import annotations

import json
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "screenshots"
OUT.mkdir(parents=True, exist_ok=True)
BASE_URL = "http://127.0.0.1:3014"
LOGIN_URL = f"{BASE_URL}/login"
COMPETITION_LIST_URL = f"{BASE_URL}/competition/list"


def log(m): print(m, flush=True)


def screenshot(page, name):
    page.screenshot(path=str(OUT / name), full_page=True)


def login(page) -> bool:
    page.goto(LOGIN_URL, wait_until="domcontentloaded", timeout=30000)
    page.wait_for_load_state("networkidle")
    time.sleep(1)
    u = page.locator("input#username, input[name='username'], input[placeholder*='账号']").first
    p = page.locator("input#password, input[type='password']").first
    if u.count() > 0: u.fill("admin")
    if p.count() > 0: p.fill("admin123")
    s = page.locator("button[type='submit'], button:has-text('登录')").first
    if s.count() > 0: s.click()
    else: page.keyboard.press("Enter")
    try:
        page.wait_for_url(lambda url: "/login" not in url, timeout=15000)
        page.wait_for_load_state("networkidle"); time.sleep(1)
    except Exception as e:
        log(f"登录超时: {e}"); return False
    return "/login" not in page.url


def search_and_select(page, keyword):
    try:
        clear_btn = page.locator(".ant-select[style*='width: 280px'] .ant-select-clear").first
        if clear_btn.count() > 0 and clear_btn.is_visible():
            clear_btn.click(); page.wait_for_timeout(300)
    except Exception:
        pass
    search_input = page.locator(".ant-select[style*='width: 280px'] .ant-select-selection-search-input").first
    search_input.click(); page.wait_for_timeout(200)
    search_input.type(keyword, delay=80)
    page.wait_for_timeout(2000)
    option = page.locator(".ant-select-item-option").first
    option.wait_for(state="visible", timeout=8000)
    option.click()
    page.wait_for_timeout(800)
    log(f"  已搜索选择: {keyword}")


def dump_state(page, tag):
    state = {
        "tag": tag,
        "start_box_text": "",
        "end_box_text": "",
        "switch_count": page.locator("span.ant-switch").count(),
        "manual_input_count": page.locator("input[placeholder='手动输入空距']").count(),
        "route_alert": "",
    }
    try:
        # 起点/终点信息面板文字（右侧地图下方）
        body = page.locator("body").inner_text(timeout=3000)
        # 赛线设定区域中的起点/终点
        start_area = page.locator("div[style*='#f6ffed']").first
        end_area = page.locator("div[style*='#fff1f0']").first
        if start_area.count() > 0: state["start_box_text"] = start_area.inner_text()[:200]
        if end_area.count() > 0: state["end_box_text"] = end_area.inner_text()[:200]
        if "起点与终点不能相同" in body: state["route_alert"] = "起点与终点不能相同"
        if "超出中国范围" in body: state["route_alert"] = "坐标超出中国范围"
        if "计算异常" in body: state["route_alert"] = "空距计算异常"
    except Exception as e:
        state["error"] = str(e)
    log(f"  [{tag}] {json.dumps(state, ensure_ascii=False)}")
    return state


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, channel="chrome",
                                    args=["--no-sandbox", "--disable-setuid-sandbox"])
        ctx = browser.new_context(viewport={"width": 1440, "height": 1000}, ignore_https_errors=True)
        page = ctx.new_page()
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda m: errors.append(f"[{m.type}] {m.text}") if m.type == "error" else None)

        if not login(page):
            log("登录失败"); browser.close(); return

        page.goto(COMPETITION_LIST_URL, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_load_state("networkidle"); time.sleep(1)
        page.get_by_role("button", name="新增赛事").first.click()
        page.get_by_text("赛线地图").wait_for(state="visible", timeout=10000)
        page.wait_for_load_state("networkidle"); time.sleep(1)

        # 等待地图就绪
        page.wait_for_function(
            """(sel) => { const el = document.querySelector(sel); return el && !el.disabled; }""",
            arg=".ant-select[style*='width: 280px'] .ant-select-selection-search-input", timeout=20000)

        name_input = page.locator("input[placeholder='请输入赛事名称']")
        if name_input.count() > 0: name_input.fill("调试-手动空距")

        log("== 搜索北京（设起点）==")
        search_and_select(page, "北京")
        dump_state(page, "after-start-beijing")

        log("== 搜索北京（设终点，同点）==")
        search_and_select(page, "北京")
        dump_state(page, "after-end-beijing")

        log("== 搜索上海（改终点）==")
        search_and_select(page, "上海")
        dump_state(page, "after-end-shanghai")

        log("== 点击手动空距开关 ==")
        sw = page.locator("span.ant-switch")
        if sw.count() > 0:
            sw.first.click()
            page.wait_for_timeout(800)
            dump_state(page, "after-switch-on")
            mi = page.locator("input[placeholder='手动输入空距']")
            if mi.count() > 0:
                mi.fill("0")
                page.wait_for_timeout(300)
                log("  已填 0")
                dump_state(page, "after-fill-0")
        else:
            log("  开关不存在（autoDistance=0）")

        screenshot(page, "debug-case5-state.png")

        log("== 提交 ==")
        page.get_by_role("button", name="确认发布").click()
        page.wait_for_timeout(1500)
        modal = page.locator(".ant-modal")
        if modal.count() > 0 and modal.first.is_visible():
            log("弹窗内容:")
            log(modal.first.inner_text())
            screenshot(page, "debug-case5-modal.png")
        else:
            log("无弹窗")
            log("当前URL: " + page.url)

        log("== console errors ==")
        for e in errors:
            log("  " + e[:150])
        browser.close()


if __name__ == "__main__":
    main()
