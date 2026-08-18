from __future__ import annotations

import json
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "screenshots"
OUT.mkdir(parents=True, exist_ok=True)
RESULT_FILE = ROOT / "browser-test-results.json"

BASE_URL = "http://127.0.0.1:3014"
LOGIN_URL = f"{BASE_URL}/login"
COMPETITION_LIST_URL = f"{BASE_URL}/competition/list"


def log(message: str) -> None:
    print(message, flush=True)


def collect_console(page):
    warnings: list[dict[str, str]] = []
    errors: list[dict[str, str]] = []

    def on_console(msg):
      entry = {"type": msg.type, "text": msg.text}
      if msg.type in ("warning", "error"):
        warnings.append(entry)
      if msg.type == "error":
        errors.append(entry)

    def on_page_error(exc):
      errors.append({"type": "pageerror", "text": str(exc)})

    page.on("console", on_console)
    page.on("pageerror", on_page_error)
    return warnings, errors


def screenshot(page, name: str) -> None:
    page.screenshot(path=str(OUT / name), full_page=True)


def login_if_needed(page) -> dict:
    state = {"visited_login": False, "logged_in": False, "final_url": page.url}
    if "/login" not in page.url and "/user/login" not in page.url:
        return state

    state["visited_login"] = True
    log("检测到登录页，开始填写账号密码")
    screenshot(page, "login-page.png")

    username = page.locator("input#username, input[name='username'], input[placeholder*='账号'], input[placeholder*='用户名'], input[placeholder*='用户']").first
    password = page.locator("input#password, input[name='password'], input[type='password']").first

    if username.count() > 0:
        username.fill("admin")
    else:
        page.locator("input[type='text']").first.fill("admin")

    if password.count() > 0:
        password.fill("admin123")

    submit = page.locator("button[type='submit'], button:has-text('登录'), button:has-text('Login')").first
    if submit.count() > 0:
        submit.click()
    else:
        page.keyboard.press("Enter")

    try:
        page.wait_for_url(
            lambda url: "/login" not in url and "/user/login" not in url,
            timeout=10000,
        )
        page.wait_for_load_state("networkidle")
    except Exception:
        pass
    state["final_url"] = page.url
    state["logged_in"] = "/login" not in page.url and "/user/login" not in page.url
    return state


def get_warning_summary(warnings: list[dict[str, str]], errors: list[dict[str, str]]) -> dict:
    antd = [w for w in warnings if "antd" in w["text"].lower() or w["text"].startswith("[antd:")]
    other_errors = [e for e in errors if "antd" not in e["text"].lower() and "warning" not in e["type"].lower()]
    return {
        "antd_warning_count": len(antd),
        "other_error_count": len(other_errors),
        "sample_warnings": warnings[:5],
        "sample_errors": errors[:5],
    }


def inspect_competition_form(page) -> dict:
    page.goto(COMPETITION_LIST_URL, wait_until="domcontentloaded", timeout=30000)
    page.wait_for_load_state("networkidle")

    login_state = login_if_needed(page)
    if login_state["logged_in"]:
        page.goto(COMPETITION_LIST_URL, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_load_state("networkidle")

    list_visible = page.get_by_text("赛事列表", exact=True).count() > 0
    create_button = page.get_by_role("button", name="新增赛事")
    create_button_visible = create_button.count() > 0 and create_button.first.is_visible()
    if create_button_visible:
        create_button.first.click()
        page.get_by_text("赛线地图", exact=True).wait_for(state="visible", timeout=10000)

    body_text = page.locator("body").inner_text(timeout=5000)
    map_card_title = page.get_by_text("赛线地图", exact=True)
    map_card_visible = map_card_title.count() > 0 and map_card_title.first.is_visible()
    map_svg = page.locator("svg[viewBox='0 0 800 500']")
    map_base_visible = (
        map_svg.count() > 0
        and map_svg.first.is_visible()
        and map_svg.first.locator("defs #seaGradient").count() > 0
        and map_svg.first.locator("g[filter='url(#mapShadow)']").count() > 0
    )
    alert_locator = page.locator(".ant-alert-error")
    card_warning_visible = alert_locator.count() > 0 and alert_locator.first.is_visible()
    route_warning = any(
        warning in body_text
        for warning in (
            "赛线空距计算异常，请检查坐标",
            "起点与终点不能相同，请重新选择",
            "起点坐标超出中国范围",
            "终点坐标超出中国范围",
        )
    )

    screenshot(page, "competition-form.png")

    return {
        "login_state": login_state,
        "url": page.url,
        "list_visible": list_visible,
        "create_button_visible": create_button_visible,
        "has_competition_form_text": "赛线地图" in body_text,
        "map_card_visible": map_card_visible,
        "map_base_visible": map_base_visible,
        "card_warning_visible": card_warning_visible,
        "has_route_warning_text": route_warning,
        "body_preview": body_text[:500],
    }


def main() -> int:
    results: dict = {}

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            channel="chrome",
            args=["--no-sandbox", "--disable-setuid-sandbox"],
        )
        context = browser.new_context(viewport={"width": 1440, "height": 900}, ignore_https_errors=True)
        page = context.new_page()

        warnings, errors = collect_console(page)

        log("=== 1. 检查登录页 ===")
        page.goto(LOGIN_URL, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_load_state("networkidle")
        time.sleep(1.5)
        results["login"] = {
            "url": page.url,
            "title": page.title(),
            "has_brand": page.locator("text=赛鸽基因溯源平台").count() > 0,
            "has_username_input": page.locator("input#username, input[name='username'], input[placeholder*='账号'], input[placeholder*='用户名'], input[placeholder*='用户']").count() > 0,
            "has_password_input": page.locator("input#password, input[name='password'], input[type='password']").count() > 0,
        }
        screenshot(page, "login-check.png")

        log("=== 2. 登录并检查赛线地图 ===")
        results["competition"] = inspect_competition_form(page)

        results["console"] = get_warning_summary(warnings, errors)

        context.close()
        browser.close()

    RESULT_FILE.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")

    log("=== 验证结果摘要 ===")
    log(json.dumps(results, ensure_ascii=False, indent=2))
    log(f"结果已写入: {RESULT_FILE}")
    log(f"截图目录: {OUT}")

    has_failed = (
        not results["login"]["has_brand"]
        or not results["login"]["has_username_input"]
        or not results["login"]["has_password_input"]
        or not results["competition"]["list_visible"]
        or not results["competition"]["create_button_visible"]
        or not results["competition"]["has_competition_form_text"]
        or not results["competition"]["map_card_visible"]
        or not results["competition"]["map_base_visible"]
        or results["console"]["other_error_count"] > 0
    )
    return 1 if has_failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
