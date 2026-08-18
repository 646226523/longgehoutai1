from __future__ import annotations

import json
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "screenshots"
OUT.mkdir(parents=True, exist_ok=True)
RESULT_FILE = ROOT / "submit-errors-verify.json"

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


def login(page) -> bool:
    log("访问登录页...")
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

    try:
        page.wait_for_url(lambda url: "/login" not in url, timeout=15000)
        page.wait_for_load_state("networkidle")
        time.sleep(1)
    except Exception as e:
        log(f"登录等待超时: {e}")
        return False

    logged_in = "/login" not in page.url
    log(f"登录完成: logged_in={logged_in}, url={page.url}")
    return logged_in


def wait_map_ready(page) -> bool:
    """等待真实地图搜索框可交互（status==='ready' 时 Select 才可用）"""
    try:
        search_input = page.locator(".ant-select[style*='width: 280px'] .ant-select-selection-search-input").first
        page.wait_for_function(
            """(sel) => {
                const el = document.querySelector(sel);
                return el && !el.disabled;
            }""",
            arg=".ant-select[style*='width: 280px'] .ant-select-selection-search-input",
            timeout=20000,
        )
        return True
    except Exception as e:
        log(f"  - 地图搜索框未就绪: {e}")
        return False


def search_and_select(page, keyword: str) -> bool:
    """在地图搜索框输入关键字并选择第一个结果"""
    try:
        clear_btn = page.locator(".ant-select[style*='width: 280px'] .ant-select-clear").first
        if clear_btn.count() > 0 and clear_btn.is_visible():
            clear_btn.click()
            page.wait_for_timeout(300)
    except Exception:
        pass

    search_input = page.locator(".ant-select[style*='width: 280px'] .ant-select-selection-search-input").first
    search_input.click()
    page.wait_for_timeout(200)
    search_input.type(keyword, delay=80)
    page.wait_for_timeout(2000)  # 等待 POI 建议返回

    option = page.locator(".ant-select-item-option").first
    option.wait_for(state="visible", timeout=8000)
    option.click()
    page.wait_for_timeout(800)
    log(f"  - 已通过搜索选择: {keyword}")
    return True


def modal_visible(page) -> bool:
    modal = page.locator(".ant-modal")
    return modal.count() > 0 and modal.first.is_visible()


def modal_text(page) -> str:
    modal = page.locator(".ant-modal").first
    return modal.inner_text()


def close_modal(page) -> None:
    btn = page.get_by_role("button", name="知道了")
    if btn.count() > 0 and btn.first.is_visible():
        btn.first.click()
        page.wait_for_timeout(600)


def verify_error_popup(page) -> dict:
    results = {}

    log("\n=== 进入新增赛事表单 ===")
    page.goto(COMPETITION_LIST_URL, wait_until="domcontentloaded", timeout=30000)
    page.wait_for_load_state("networkidle")
    time.sleep(1)

    create_button = page.get_by_role("button", name="新增赛事")
    if not (create_button.count() > 0 and create_button.first.is_visible()):
        log("ERROR: '新增赛事' button not found")
        return results
    create_button.first.click()
    page.get_by_text("赛线地图").wait_for(state="visible", timeout=10000)
    page.wait_for_load_state("networkidle")
    time.sleep(1)

    map_ready = wait_map_ready(page)
    results["map_ready"] = map_ready
    screenshot(page, "submit-errors-form.png")

    confirm_button = page.get_by_role("button", name="确认发布")

    # -------------------------------------------------------------------------
    log("\nCase 1: 未填写任何信息，直接提交")
    confirm_button.click()
    page.wait_for_timeout(600)
    results["case_1_empty_all"] = {
        "has_modal": modal_visible(page),
        "modal_title": page.locator(".ant-modal-title").inner_text() if modal_visible(page) else "",
    }
    if modal_visible(page):
        text = modal_text(page)
        results["case_1_empty_all"]["has_name_missing"] = "赛事名称：未填写" in text
        results["case_1_empty_all"]["has_start_missing"] = "起点（司放地）：未选择" in text
        results["case_1_empty_all"]["has_end_missing"] = "终点（归巢地）：未选择" in text
        log(f"  - 弹窗标题: {results['case_1_empty_all']['modal_title']}")
        log(f"  - 名称/起点/终点缺失提示齐全: {results['case_1_empty_all']['has_name_missing'] and results['case_1_empty_all']['has_start_missing'] and results['case_1_empty_all']['has_end_missing']}")
        screenshot(page, "case-1-empty-all.png")
        close_modal(page)

    # -------------------------------------------------------------------------
    log("\nCase 2: 填了名称，但未选起点/终点")
    name_input = page.locator("input[placeholder='请输入赛事名称']")
    if name_input.count() > 0:
        name_input.fill("测试赛-报错弹窗验证")
    confirm_button.click()
    page.wait_for_timeout(600)
    results["case_2_no_start"] = {"has_modal": modal_visible(page)}
    if modal_visible(page):
        text = modal_text(page)
        results["case_2_no_start"]["has_start_missing"] = "起点（司放地）：未选择" in text
        results["case_2_no_start"]["has_end_missing"] = "终点（归巢地）：未选择" in text
        results["case_2_no_start"]["no_name_warning"] = "赛事名称" not in text  # 名称已填，不应再报名称缺失
        log(f"  - 起点/终点缺失提示正常: {results['case_2_no_start']['has_start_missing'] and results['case_2_no_start']['has_end_missing']}")
        log(f"  - 不再误报名称缺失: {results['case_2_no_start']['no_name_warning']}")
        screenshot(page, "case-2-no-start-end.png")
        close_modal(page)

    # -------------------------------------------------------------------------
    log("\nCase 3: 已填名称，搜索选择起点（北京），未选终点")
    if map_ready:
        search_and_select(page, "北京")
    confirm_button.click()
    page.wait_for_timeout(600)
    results["case_3_no_end"] = {"has_modal": modal_visible(page)}
    if modal_visible(page):
        text = modal_text(page)
        results["case_3_no_end"]["has_end_missing"] = "终点（归巢地）：未选择" in text
        results["case_3_no_end"]["no_start_warning"] = "起点（司放地）" not in text  # 起点已选，不应再报起点缺失
        log(f"  - 终点缺失提示正常: {results['case_3_no_end']['has_end_missing']}")
        log(f"  - 不再误报起点缺失: {results['case_3_no_end']['no_start_warning']}")
        screenshot(page, "case-3-no-end.png")
        close_modal(page)

    # -------------------------------------------------------------------------
    log("\nCase 4: 起点/终点都选北京（坐标相同）")
    if map_ready:
        search_and_select(page, "北京")  # 起点已有 → pickMode=none 时第二次搜索会设置为终点（相同坐标）
    page.wait_for_timeout(1000)  # 等待 routeWarning 计算
    confirm_button.click()
    page.wait_for_timeout(600)
    results["case_4_same_points"] = {"has_modal": modal_visible(page)}
    if modal_visible(page):
        text = modal_text(page)
        results["case_4_same_points"]["has_same_point_warning"] = "起点与终点不能相同" in text
        log(f"  - 起点终点相同提示正常: {results['case_4_same_points']['has_same_point_warning']}")
        screenshot(page, "case-4-same-points.png")
        close_modal(page)

    # -------------------------------------------------------------------------
    log("\nCase 5: 终点改为上海，开启手动空距但填 0（无效）")
    if map_ready:
        search_and_select(page, "上海")  # 起点已有 → 设置为终点（上海，与起点不同）
    page.wait_for_timeout(1000)

    # 开启手动空距开关（autoDistance>0 后开关才渲染；antd v5 Switch 渲染为 button.ant-switch）
    manual_switch = page.locator(".ant-switch")
    if manual_switch.count() > 0:
        manual_switch.first.click()
        log("  - 已开启手动空距")
        page.wait_for_timeout(500)
    # 把空距清为 0（无效值）
    manual_input = page.locator("input[placeholder='手动输入空距']")
    if manual_input.count() > 0:
        manual_input.fill("0")
        page.wait_for_timeout(300)

    confirm_button.click()
    page.wait_for_timeout(600)
    results["case_5_override_distance_zero"] = {"has_modal": modal_visible(page)}
    if modal_visible(page):
        text = modal_text(page)
        results["case_5_override_distance_zero"]["has_distance_warning"] = "手动空距" in text
        log(f"  - 手动空距无效提示正常: {results['case_5_override_distance_zero']['has_distance_warning']}")
        screenshot(page, "case-5-manual-zero.png")
        close_modal(page)

    # -------------------------------------------------------------------------
    log("\nCase 6: 手动空距填正常值 1080.0，全部信息正确")
    manual_input = page.locator("input[placeholder='手动输入空距']")
    if manual_input.count() > 0:
        manual_input.fill("1080.0")
        log("  - 已填写正常手动空距: 1080.0 km")

    confirm_button.click()
    page.wait_for_timeout(2500)  # 等待提交完成

    results["case_6_all_valid"] = {
        "popup_shown": modal_visible(page),
        "url": page.url,
        "form_closed": page.get_by_role("button", name="确认发布").count() == 0,
        "table_visible": page.get_by_text("赛事列表", exact=True).count() > 0,
    }
    log(f"  - 错误弹窗是否显示: {results['case_6_all_valid']['popup_shown']}")
    log(f"  - 表单已关闭（回到列表）: {results['case_6_all_valid']['form_closed']}")
    screenshot(page, "case-6-all-valid.png")

# -------------------------------------------------------------------------
    log("\nCase 7: 起点坐标超中国范围")
    # 先刷新页面回到空白表单
    page.goto(COMPETITION_LIST_URL, wait_until="domcontentloaded", timeout=30000)
    page.wait_for_load_state("networkidle")
    time.sleep(1)
    page.get_by_role("button", name="新增赛事").first.click()
    page.get_by_text("赛线地图").wait_for(state="visible", timeout=10000)
    page.wait_for_load_state("networkidle")
    time.sleep(1)
    wait_map_ready(page)
    name_input = page.locator("input[placeholder='请输入赛事名称']")
    if name_input.count() > 0:
        name_input.fill("超范围测试")
    # 搜索选择起点（北京）与终点（上海）
    search_and_select(page, "北京")
    page.wait_for_timeout(800)
    search_and_select(page, "上海")
    page.wait_for_timeout(1000)
    # 手动把起点经/纬度改为超中国范围（lng/lat = 200）
    start_lng = page.locator("input.ant-input-number-input").nth(0)
    start_lat = page.locator("input.ant-input-number-input").nth(1)
    start_lng.fill("200")
    page.wait_for_timeout(300)
    start_lat.fill("200")
    page.wait_for_timeout(800)  # 等待 routeWarning 计算
    try:
        confirm_button.click()
        page.wait_for_timeout(600)
    except Exception:
        log("  - 确认发布按钮异常，使用 fallback 点击")
        try:
            page.locator("button:has-text('确认发布')").click(force=True)
            page.wait_for_timeout(600)
        except Exception:
            pass
    results["case_7_out_of_china"] = {"has_modal": modal_visible(page)}
    if modal_visible(page):
        text = modal_text(page)
        results["case_7_out_of_china"]["has_start_out_of_china"] = "起点坐标超出中国范围" in text
        log(f"  - 起点超范围提示正常: {results['case_7_out_of_china']['has_start_out_of_china']}")
        screenshot(page, "case-7-out-of-china.png")
        close_modal(page)

    return results


def main() -> int:
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            channel="chrome",
            args=["--no-sandbox", "--disable-setuid-sandbox"],
        )
        context = browser.new_context(viewport={"width": 1440, "height": 1000}, ignore_https_errors=True)
        page = context.new_page()

        warnings, errors = collect_console(page)

        logged_in = login(page)
        if not logged_in:
            log("ERROR: 登录失败")
            browser.close()
            return 1

        results = verify_error_popup(page)
        summary = {
            "results": results,
            "console": {
                "warnings": warnings,
                "errors": errors,
                "warning_count": len(warnings),
                "error_count": len(errors),
            },
        }

        with open(RESULT_FILE, "w", encoding="utf-8") as f:
            json.dump(summary, f, indent=2, ensure_ascii=False)

        log("\n=== 验证结果汇总 ===")
        for case_name, case_result in results.items():
            if isinstance(case_result, dict):
                log(f"  {case_name}: {case_result}")

        # 判定：核心校验项全部通过
        cases = results.get("case_1_empty_all", {})
        case_1_ok = cases.get("has_name_missing") and cases.get("has_start_missing") and cases.get("has_end_missing")
        case_2_ok = results.get("case_2_no_start", {}).get("has_start_missing") and results.get("case_2_no_start", {}).get("has_end_missing")
        case_3_ok = results.get("case_3_no_end", {}).get("has_end_missing")
        case_4_ok = results.get("case_4_same_points", {}).get("has_same_point_warning")
        case_5_ok = results.get("case_5_override_distance_zero", {}).get("has_distance_warning")
        case_6_ok = not results.get("case_6_all_valid", {}).get("popup_shown") and results.get("case_6_all_valid", {}).get("form_closed")
        case_7_ok = results.get("case_7_out_of_china", {}).get("has_start_out_of_china")
        all_ok = all([case_1_ok, case_2_ok, case_3_ok, case_4_ok, case_5_ok, case_6_ok, case_7_ok])

        # 仅统计真正的错误（排除资源加载失败与 antd 弃用警告 Warning:）
        console_error_count = len(
            [
                e
                for e in errors
                if not e["text"].startswith("Failed to load resource:")
                and not e["text"].startswith("Warning:")
            ]
        )
        if console_error_count > 0:
            log(f"\n注意：浏览器控制台有 {console_error_count} 个错误，请查看")
            for e in errors[:5]:
                log(f"  - {e['type']}: {e['text'][:100]}")

        log(f"\n=== 最终判定: {'全部通过' if all_ok and console_error_count == 0 else '存在失败项'} ===")
        browser.close()
        return 0 if (all_ok and console_error_count == 0) else 1


if __name__ == "__main__":
    sys.exit(main())
