from __future__ import annotations

import json
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

FLAG_SELECTOR = "svg line[x1='11'][x2='11']"


def log(message: str) -> None:
    print(message, flush=True)


def screenshot(page, name: str) -> None:
    page.screenshot(path=str(OUT / name), full_page=True)


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


def login(page) -> dict:
    state = {"visited_login": False, "logged_in": False, "final_url": page.url}
    if "/login" not in page.url:
        return state
    state["visited_login"] = True
    username = page.locator("input#username, input[name='username'], input[placeholder*='账号'], input[placeholder*='用户名']").first
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
        page.wait_for_url(lambda url: "/login" not in url, timeout=12000)
        page.wait_for_load_state("networkidle", timeout=15000)
    except Exception:
        pass
    state["final_url"] = page.url
    state["logged_in"] = "/login" not in page.url
    return state


def find_map_container(page):
    """定位真实地图容器（RealMapSelector 的高度为 480 的 relative 容器）。"""
    # 通过包含搜索 Select 与三个按钮的块，向下找地图容器
    card = page.locator("div:has(> div > input.ant-select-selection-search-input)").first
    return card


def find_map_search_input(page):
    """精确定位 RealMapSelector 的 POI 搜索框。

    RealMapSelector 的搜索 Select 使用内联 style width:280px，页面其它下拉（如赛事类型）
    不具备该特征，可据此唯一匹配。返回可直接点击/填写的输入元素。
    """
    map_select = page.locator("div.ant-select[style*='width: 280px']").first
    return map_select.locator(".ant-select-selection-search-input")


def main() -> int:
    results: dict = {}

    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            channel="chrome",
            args=["--no-sandbox", "--disable-setuid-sandbox"],
        )
        context = browser.new_context(viewport={"width": 1500, "height": 950}, ignore_https_errors=True)
        page = context.new_page()

        warnings, errors = collect_console(page)

        log("=== 1. 打开登录页 ===")
        page.goto(LOGIN_URL, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_load_state("networkidle", timeout=15000)
        time.sleep(1.0)
        results["login"] = {
            "has_brand": page.locator("text=赛鸽基因溯源平台").count() > 0,
            "has_username_input": page.locator("input#username, input[name='username'], input[placeholder*='账号']").count() > 0,
        }
        screenshot(page, "login.png")

        log("=== 2. 登录 ===")
        login_state = login(page)
        results["login"]["logged_in"] = login_state["logged_in"]
        results["login"]["final_url"] = login_state["final_url"]
        log(f"logged_in={login_state['logged_in']} final={login_state['final_url']}")

        log("=== 3. 进入赛事列表并打开新增赛事 ===")
        page.goto(COMPETITION_LIST_URL, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_load_state("networkidle", timeout=15000)
        time.sleep(1.0)
        if "/login" in page.url:
            login_state = login(page)
            results["login"]["logged_in"] = login_state["logged_in"]
            page.goto(COMPETITION_LIST_URL, wait_until="domcontentloaded", timeout=30000)
            page.wait_for_load_state("networkidle", timeout=15000)

        create_btn = page.get_by_role("button", name="新增赛事")
        results["competition"] = {"list_visible": False, "create_button_visible": False}
        if create_btn.count() > 0:
            results["competition"]["create_button_visible"] = True
            results["competition"]["list_visible"] = True
            create_btn.first.click()
            page.get_by_text("赛线地图", exact=True).first.wait_for(state="visible", timeout=10000)
            time.sleep(3.0)  # 等待腾讯地图 SDK 与瓦片加载
            results["competition"]["has_competition_form_text"] = "赛线地图" in page.locator("body").inner_text()
            screenshot(page, "map-initial.png")

            # 地图区域是否存在
            body_text = page.locator("body").inner_text()
            has_select = page.locator(".ant-select-selection-search-input").count() > 0
            map_container = page.locator("div[style*='height: 480px']")
            results["competition"]["has_select"] = has_select
            results["competition"]["map_container_visible"] = map_container.count() > 0
            results["competition"]["has_tencent_canvas"] = page.locator("canvas").count() > 0
            results["competition"]["has_flag_marker"] = page.locator(FLAG_SELECTOR).count() > 0

            log("=== 4. 测试 POI 搜索（P1） ===")
            search_input = find_map_search_input(page)
            search_ok = False
            if search_input.count() > 0:
                search_input.click()
                search_input.type("北京站", delay=80)
                page.wait_for_timeout(3000)
                options = page.locator(".ant-select-item-option")
                n_options = options.count()
                results["competition"]["search_option_count"] = n_options
                log(f"搜索下拉选项数: {n_options}")
                screenshot(page, "map-search-results.png")
                if n_options > 0:
                    search_ok = True
                    options.first.click()
                    page.wait_for_timeout(2500)
                    # 选中后应放置一个标记（小旗子）
                    flag_count = page.locator(FLAG_SELECTOR).count()
                    results["competition"]["flag_after_start_search"] = flag_count
                    results["competition"]["start_label_visible"] = page.get_by_text("起点", exact=True).count() > 0
                    log(f"选中搜索结果后小旗子数量: {flag_count}")
                    screenshot(page, "map-after-start.png")

                    # 添加终点（再搜索一次并选中）
                    log("=== 5. 测试终点搜索与折线（P2） ===")
                    end_btn = page.get_by_role("button", name="选择终点")
                    if end_btn.count() > 0:
                        end_btn.first.click()
                        page.wait_for_timeout(500)
                        # 清除已选起点的下拉值，再输入终点关键字
                        clear_btn = page.locator("div.ant-select[style*='width: 280px'] .ant-select-clear").first
                        if clear_btn.count() > 0:
                            clear_btn.click()
                            page.wait_for_timeout(300)
                        search_input.click()
                        search_input.type("天津站", delay=80)
                        page.wait_for_timeout(3000)
                        end_options = page.locator(".ant-select-item-option")
                        results["competition"]["end_search_option_count"] = end_options.count()
                        if end_options.count() > 0:
                            end_options.first.click()
                            page.wait_for_timeout(2500)
                            flags = page.locator(FLAG_SELECTOR).count()
                            results["competition"]["flag_after_end_search"] = flags
                            results["competition"]["end_label_visible"] = page.get_by_text("终点", exact=True).count() > 0
                            # 起点+终点已设置，信息面板应显示计算出的空距（如“空距: 102.35 km”）
                            body_after = page.locator("body").inner_text()
                            import re
                            route_info_visible = bool(re.search(r"空距:\s*\d", body_after))
                            results["competition"]["route_info_visible"] = route_info_visible
                            results["competition"]["has_canvas_polyline_layer"] = page.locator("canvas").count() > 0
                            # 腾讯 DOMOverlay 小旗子已渲染：地图区域内存在旗杆 SVG
                            results["competition"]["tencent_flag_in_map"] = page.locator(FLAG_SELECTOR).count()
                            log(f"起点+终点后小旗子数量: {flags}")
                            screenshot(page, "map-start-end.png")
            results["competition"]["search_ok"] = search_ok

            results["competition"]["body_preview"] = body_text[:400]

        results["console"] = {
            "antd_spin_tip_warning_count": len([w for w in warnings if "Spin" in w["text"] and "tip" in w["text"]]),
            "antd_warning_count": len([w for w in warnings if w["text"].startswith("[antd:")]),
            "error_count": len(errors),
            "all_warnings": warnings[:8],
            "all_errors": errors[:8],
        }
        log("=== 控制台摘要 ===")
        log(json.dumps(results["console"], ensure_ascii=False, indent=2))

        context.close()
        browser.close()

    RESULT_FILE.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    log("=== 结果 ===")
    log(json.dumps(results, ensure_ascii=False, indent=2))
    log(f"结果已写入: {RESULT_FILE}")

    spin_warning = results["console"]["antd_spin_tip_warning_count"] > 0
    runtime_error = results["console"]["error_count"] > 0
    return 1 if spin_warning or runtime_error else 0


if __name__ == "__main__":
    raise SystemExit(main())
