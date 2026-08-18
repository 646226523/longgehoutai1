from __future__ import annotations

import json
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "screenshots"
OUT.mkdir(parents=True, exist_ok=True)
RESULT_FILE = ROOT / "verify-map-results.json"

BASE_URL = "http://127.0.0.1:3014"
LOGIN_URL = f"{BASE_URL}/login"
COMPETITION_LIST_URL = f"{BASE_URL}/competition/list"
SYSTEM_CONFIG_URL = f"{BASE_URL}/system/config"


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


def login(page) -> dict:
    state = {"visited_login": False, "logged_in": False, "final_url": page.url}
    if "/login" not in page.url:
        return state
    state["visited_login"] = True
    log("检测到登录页，开始填写账号密码")
    screenshot(page, "verify-login-page.png")

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


def get_token(page) -> str:
    try:
        return page.evaluate(
            "() => localStorage.getItem('admin_access_token') || localStorage.getItem('access_token') || localStorage.getItem('token') || sessionStorage.getItem('access_token') || ''"
        )
    except Exception:
        return ""


def check_map_config_api(page) -> dict:
    token = get_token(page)
    if not token:
        return {"ok": False, "reason": "no token"}
    try:
        result = page.evaluate(
            """async (t) => {
                const res = await fetch('/api/system/map-config', {
                    headers: { 'Authorization': 'Bearer ' + t }
                });
                const body = await res.json();
                return { status: res.status, body };
            }""",
            token,
        )
        data = (result.get("body") or {}).get("data") or {}
        keys = ["provider", "amap_key", "baidu_key", "tencent_key"]
        present = {k: (k in data) for k in keys}
        return {"ok": result.get("status") == 200 and all(present.values()), "status": result.get("status"), "present": present, "data": data}
    except Exception as exc:
        return {"ok": False, "reason": str(exc)}


def inspect_competition_map(page) -> dict:
    page.goto(COMPETITION_LIST_URL, wait_until="domcontentloaded", timeout=30000)
    page.wait_for_load_state("networkidle")
    time.sleep(1)

    login_state = login(page)
    if login_state["logged_in"]:
        page.goto(COMPETITION_LIST_URL, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_load_state("networkidle")

    list_visible = page.get_by_text("赛事列表", exact=True).count() > 0
    create_button = page.get_by_role("button", name="新增赛事")
    create_button_visible = create_button.count() > 0 and create_button.first.is_visible()
    if create_button_visible:
        create_button.first.click()
        page.get_by_text("赛线地图", exact=True).wait_for(state="visible", timeout=10000)
        page.wait_for_load_state("networkidle")
        time.sleep(1.5)

    body_text = page.locator("body").inner_text(timeout=5000)
    map_svg = page.locator("svg[viewBox='0 0 800 500']")
    map_base_visible = (
        map_svg.count() > 0
        and map_svg.first.is_visible()
        and map_svg.first.locator("defs #seaGradient").count() > 0
        and map_svg.first.locator("g[filter='url(#mapShadow)']").count() > 0
    )
    # 未配置 Key 时的引导提示（info 类型）
    guide_alert = page.locator(".ant-alert-info:has-text('未配置地图服务')")
    guide_alert_visible = guide_alert.count() > 0 and guide_alert.first.is_visible()
    # 不应渲染真实地图容器（无 AMap/BMapGL/TMap 全局）
    real_map_rendered = page.evaluate(
        "() => !!(window.AMap || window.BMapGL || window.TMap)"
    )

    screenshot(page, "verify-competition-form.png")

    return {
        "login_state": login_state,
        "url": page.url,
        "list_visible": list_visible,
        "create_button_visible": create_button_visible,
        "map_card_visible": page.get_by_text("赛线地图", exact=True).first.is_visible(),
        "map_base_visible": map_base_visible,
        "guide_alert_visible": guide_alert_visible,
        "real_map_rendered": real_map_rendered,
        "has_map_config_text": "地图配置" in body_text or "map" in body_text,
    }


def inspect_system_config(page) -> dict:
    page.goto(SYSTEM_CONFIG_URL, wait_until="domcontentloaded", timeout=30000)
    page.wait_for_load_state("networkidle")
    time.sleep(1.5)

    tab = page.locator(".ant-tabs-tab:has-text('地图配置')")
    tab_visible = tab.count() > 0 and tab.first.is_visible()
    if tab_visible:
        tab.first.click()
        page.wait_for_load_state("networkidle")
        time.sleep(1)

    body_text = page.locator("body").inner_text(timeout=5000)
    keys = ["map_provider", "map_amap_key", "map_baidu_key", "map_tencent_key"]
    keys_present = {k: (k in body_text) for k in keys}
    names_present = {
        "地图服务商": "地图服务商" in body_text,
        "高德地图 Key": "高德地图 Key" in body_text,
        "百度地图 Key": "百度地图 Key" in body_text,
        "腾讯地图 Key": "腾讯地图 Key" in body_text,
    }
    screenshot(page, "verify-system-config.png")

    return {
        "url": page.url,
        "tab_visible": tab_visible,
        "keys_present": keys_present,
        "names_present": names_present,
        "has_config_page": "系统配置" in body_text,
    }


def get_console_summary(warnings, errors) -> dict:
    antd = [w for w in warnings if "antd" in w["text"].lower() or w["text"].startswith("[antd:")]
    other_errors = [e for e in errors if "antd" not in e["text"].lower() and e["type"] != "warning"]
    return {
        "antd_warning_count": len(antd),
        "other_error_count": len(other_errors),
        "sample_warnings": warnings[:5],
        "sample_errors": errors[:5],
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

        log("=== 1. 登录页 ===")
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

        log("=== 2. 赛事页地图回退与引导提示 ===")
        results["competition"] = inspect_competition_map(page)

        log("=== 3. 系统配置页地图分组 ===")
        results["system_config"] = inspect_system_config(page)

        log("=== 4. /api/system/map-config 接口 ===")
        results["map_config_api"] = check_map_config_api(page)

        results["console"] = get_console_summary(warnings, errors)

        context.close()
        browser.close()

    RESULT_FILE.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")

    log("=== 验证结果摘要 ===")
    log(json.dumps(results, ensure_ascii=False, indent=2))
    log(f"结果已写入: {RESULT_FILE}")

    has_failed = (
        not results["login"]["has_brand"]
        or not results["login"]["has_username_input"]
        or not results["login"]["has_password_input"]
        or not results["competition"]["list_visible"]
        or not results["competition"]["create_button_visible"]
        or not results["competition"]["map_card_visible"]
        or not results["competition"]["map_base_visible"]
        or not results["competition"]["guide_alert_visible"]
        or results["competition"]["real_map_rendered"]
        or not results["system_config"]["tab_visible"]
        or not all(results["system_config"]["keys_present"].values())
        or not results["map_config_api"]["ok"]
        or results["console"]["other_error_count"] > 0
    )
    return 1 if has_failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
