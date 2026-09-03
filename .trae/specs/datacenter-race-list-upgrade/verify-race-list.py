from __future__ import annotations

import json
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
SCREENSHOT_PATH = ROOT / "screenshot.png"
RESULT_FILE = ROOT / "verification-result.json"

BASE_URL = "http://127.0.0.1:3014"
DATACENTER_URL = f"{BASE_URL}/datacenter"

VIEWPORT_W = 1920
VIEWPORT_H = 1080


def log(msg: str) -> None:
    print(msg, flush=True)


def login_if_needed(page) -> dict:
    state = {"visited_login": False, "logged_in": False}

    if "/login" not in page.url and "/user/login" not in page.url:
        log("  页面不在登录页，跳过登录")
        state["logged_in"] = True
        return state

    state["visited_login"] = True
    log("  检测到登录页，填写账号密码")

    username = page.locator(
        "input#username, input[name='username'], "
        "input[placeholder*='账号'], input[placeholder*='用户名'], "
        "input[placeholder*='用户']"
    ).first
    password = page.locator(
        "input#password, input[name='password'], input[type='password']"
    ).first

    if username.count() > 0:
        username.fill("admin")
        log("  已填写用户名: admin")
    else:
        page.locator("input[type='text']").first.fill("admin")

    if password.count() > 0:
        password.fill("admin123")
        log("  已填写密码: admin123")

    submit = page.locator("button[type='submit']").first
    if submit.count() > 0:
        submit.click()
        log("  已点击登录按钮")
    else:
        page.keyboard.press("Enter")

    try:
        page.wait_for_url(
            lambda url: "/login" not in url and "/user/login" not in url,
            timeout=15000,
        )
        page.wait_for_load_state("networkidle", timeout=15000)
        log("  登录成功")
    except Exception as e:
        log(f"  登录等待超时: {e}")

    time.sleep(1)
    state["logged_in"] = "/login" not in page.url and "/user/login" not in page.url
    return state


def switch_to_race_tab(page) -> dict:
    result = {"tab_clicked": False, "tab_found": False}

    log("  等待 Tab 元素出现...")
    try:
        page.wait_for_selector(".ant-tabs-tab", timeout=10000)
    except Exception:
        log("  Tab 元素等待超时")
        return result

    tabs = page.locator(".ant-tabs-tab")
    tab_count = tabs.count()
    log(f"  检测到 {tab_count} 个 Tab")

    for i in range(tab_count):
        tab = tabs.nth(i)
        text = tab.inner_text()
        log(f"    Tab[{i}]: '{text}'")
        if "赛事" in text:
            tab.click()
            result["tab_found"] = True
            result["tab_clicked"] = True
            time.sleep(2)
            log(f"  已点击 '赛事实时' Tab")
            return result

    log("  未找到包含 '赛事' 的 Tab")
    return result


def verify_race_panel(page) -> dict:
    results = {}

    log("=== 6. 关键验证点 ===")

    # --- 检查点1: 确认不存在 ant-table 相关的 table/thead/tbody ---
    log("  检查点1: 确认不存在 ant-table 表格结构")
    ant_table_count = page.locator(".ant-table").count()
    table_count = page.locator("table.ant-table").count()
    thead_count = page.locator("thead.ant-table-thead").count()
    tbody_count = page.locator("tbody.ant-table-tbody").count()

    no_table = ant_table_count == 0 and table_count == 0
    results["no_ant_table"] = {
        "check": "不存在 ant-table 表格",
        "ant_table_count": ant_table_count,
        "table_count": table_count,
        "thead_count": thead_count,
        "tbody_count": tbody_count,
        "pass": no_table,
        "detail": f"ant-table={ant_table_count}, table.ant-table={table_count}, thead={thead_count}, tbody={tbody_count}",
    }
    log(f"    ant-table={ant_table_count}, thead={thead_count}, tbody={tbody_count} -> {'通过' if no_table else '失败'}")

    # --- 检查点2: 检查是否存在多个 div 卡片结构（带渐变背景） ---
    log("  检查点2: 检查 div 卡片结构（带渐变背景样式）")
    race_cards_data = page.evaluate("""
        (function() {
            var cards = [];
            var allDivs = document.querySelectorAll('div[style*="linear-gradient"]');
            for (var i = 0; i < allDivs.length; i++) {
                var div = allDivs[i];
                var style = div.getAttribute('style') || '';
                var rect = div.getBoundingClientRect();
                if (rect.height > 30 && rect.height < 400 && rect.width > 200) {
                    cards.push({
                        text: div.textContent.trim().substring(0, 100),
                        height: Math.round(rect.height),
                        width: Math.round(rect.width),
                        hasGradient: style.indexOf('linear-gradient') !== -1,
                        hasBorder: style.indexOf('border') !== -1,
                        style: style.substring(0, 200)
                    });
                }
            }
            return { count: cards.length, cards: cards.slice(0, 10) };
        })()
    """)

    card_count = race_cards_data.get("count", 0)
    results["card_structure"] = {
        "check": "存在多个 div 卡片结构（带渐变背景）",
        "card_count": card_count,
        "pass": card_count >= 3,
        "detail": f"检测到 {card_count} 个渐变背景卡片（预期 >= 3）",
        "sample_cards": race_cards_data.get("cards", []),
    }
    log(f"    卡片数量: {card_count} -> {'通过' if results['card_structure']['pass'] else '失败'}")

    # --- 检查点3: 检查 Progress 组件渲染的进度条 ---
    log("  检查点3: 检查 Progress 组件进度条")
    progress_data = page.evaluate("""
        (function() {
            var progressComponents = document.querySelectorAll('.ant-progress');
            var progressBars = document.querySelectorAll('.ant-progress-inner');
            var svgProgress = document.querySelectorAll('.ant-progress svg');
            var canvasElements = document.querySelectorAll('.ant-progress canvas');
            
            var results = [];
            for (var i = 0; i < progressComponents.length; i++) {
                var comp = progressComponents[i];
                var outer = comp.querySelector('.ant-progress-outside');
                var inner = comp.querySelector('.ant-progress-inner');
                var text = comp.querySelector('.ant-progress-text');
                results.push({
                    hasOutside: !!outer,
                    hasInner: !!inner,
                    hasText: !!text,
                    textContent: text ? text.textContent.trim() : ''
                });
            }
            
            return {
                progressCount: progressComponents.length,
                barCount: progressBars.length,
                svgCount: svgProgress.length,
                canvasCount: canvasElements.length,
                details: results.slice(0, 10)
            };
        })()
    """)

    progress_count = progress_data.get("progressCount", 0)
    results["progress_components"] = {
        "check": "存在 Progress 组件渲染的进度条",
        "progress_count": progress_count,
        "bar_count": progress_data.get("barCount", 0),
        "pass": progress_count >= 3,
        "detail": f"检测到 {progress_count} 个 Progress 组件（预期 >= 3）",
    }
    log(f"    Progress 组件: {progress_count} -> {'通过' if results['progress_components']['pass'] else '失败'}")

    # --- 检查点4: 检查核心信息展示 ---
    log("  检查点4: 检查赛事核心信息（名称、状态、进度、线路、操作按钮）")
    core_info = page.evaluate("""
        (function() {
            var raceSection = null;
            var activePane = document.querySelector('.ant-tabs-tabpane-active');
            if (activePane) {
                raceSection = activePane;
            }
            
            if (!raceSection) {
                var panes = document.querySelectorAll('.ant-tabs-tabpane');
                for (var p = 0; p < panes.length; p++) {
                    var pane = panes[p];
                    if (pane.textContent.indexOf('赛事') !== -1 || pane.textContent.indexOf('2026') !== -1) {
                        raceSection = pane;
                        break;
                    }
                }
            }
            
            if (!raceSection) {
                raceSection = document;
            }
            
            var text = raceSection.textContent || '';
            
            var hasRaceName = text.indexOf('2026') !== -1 || text.indexOf('春季') !== -1 || 
                             text.indexOf('千公里') !== -1 || text.indexOf('赛事') !== -1 ||
                             text.indexOf('挑战赛') !== -1 || text.indexOf('公里') !== -1;
                             
            var statusTags = [];
            var allTags = raceSection.querySelectorAll('.ant-tag');
            for (var i = 0; i < allTags.length; i++) {
                var tagText = allTags[i].textContent.trim();
                if (tagText && tagText.length < 20) {
                    statusTags.push(tagText);
                }
            }
            var hasStatusTag = statusTags.length > 0;
            
            var progressBars = raceSection.querySelectorAll('.ant-progress');
            var hasProgress = progressBars.length > 0;
            
            var hasRoute = text.indexOf('线路') !== -1 || text.indexOf('→') !== -1 || 
                           text.indexOf('公里') !== -1;
            
            var detailButtons = [];
            var flylineButtons = [];
            var allBtns = raceSection.querySelectorAll('button, .ant-btn');
            for (var b = 0; b < allBtns.length; b++) {
                var btnText = allBtns[b].textContent.trim();
                if (btnText === '详情') detailButtons.push(btnText);
                if (btnText === '飞线') flylineButtons.push(btnText);
            }
            
            var raceNames = [];
            var styleDivs = raceSection.querySelectorAll('div[style*="font-weight: 600"]');
            for (var j = 0; j < styleDivs.length; j++) {
                var txt = styleDivs[j].textContent.trim();
                if (txt.length > 3 && txt.length < 80) {
                    raceNames.push(txt);
                }
            }
            
            return {
                hasRaceName: hasRaceName,
                raceNames: raceNames.slice(0, 10),
                hasStatusTag: hasStatusTag,
                statusTags: statusTags,
                hasProgress: hasProgress,
                progressCount: progressBars.length,
                hasRoute: hasRoute,
                hasDetailButton: detailButtons.length > 0,
                hasFlyLineButton: flylineButtons.length > 0,
                detailButtonCount: detailButtons.length,
                flylineButtonCount: flylineButtons.length,
                totalTextLength: text.length,
                preview: text.substring(0, 500)
            };
        })()
    """)

    results["core_info"] = {
        "check": "展示赛事核心信息",
        "race_names_found": core_info.get("raceNames", []),
        "has_race_name": core_info.get("hasRaceName", False),
        "has_status_tag": core_info.get("hasStatusTag", False),
        "status_tags": core_info.get("statusTags", []),
        "has_progress": core_info.get("hasProgress", False),
        "has_route": core_info.get("hasRoute", False),
        "has_detail_button": core_info.get("hasDetailButton", False),
        "has_flyline_button": core_info.get("hasFlyLineButton", False),
        "pass": (
            core_info.get("hasRaceName", False) and
            core_info.get("hasStatusTag", False) and
            core_info.get("hasProgress", False) and
            (core_info.get("hasRoute", False) or len(core_info.get("raceNames", [])) > 0) and
            core_info.get("hasDetailButton", False) and
            core_info.get("hasFlyLineButton", False)
        ),
        "detail": (
            f"名称={core_info.get('hasRaceName')}({core_info.get('raceNames', [])[:3]}), "
            f"状态={core_info.get('hasStatusTag')}({core_info.get('statusTags', [])[:5]}), "
            f"进度={core_info.get('hasProgress')}(count={core_info.get('progressCount', 0)}), "
            f"线路={core_info.get('hasRoute')}, "
            f"详情按钮={core_info.get('hasDetailButton')}(n={core_info.get('detailButtonCount', 0)}), "
            f"飞线按钮={core_info.get('hasFlyLineButton')}(n={core_info.get('flylineButtonCount', 0)})"
        ),
    }
    log(f"    核心信息: {'通过' if results['core_info']['pass'] else '失败'}")
    log(f"      名称={core_info.get('hasRaceName')}, 状态标签={core_info.get('statusTags', [])}, 线路={core_info.get('hasRoute')}")
    log(f"      详情按钮={core_info.get('hasDetailButton')}, 飞线按钮={core_info.get('hasFlyLineButton')}")

    # --- 检查点5: 右侧面板截图区域验证 ---
    log("  检查点5: 右侧面板区域验证")
    right_panel_data = page.evaluate("""
        (function() {
            var rightPanel = null;
            var tabs = document.querySelectorAll('.ant-tabs');
            for (var t = 0; t < tabs.length; t++) {
                var tab = tabs[t];
                var rect = tab.getBoundingClientRect();
                if (rect.width > 200 && rect.width < 400 && rect.right > 1500) {
                    rightPanel = tab;
                    break;
                }
            }
            
            if (!rightPanel) {
                var panels = document.querySelectorAll('div[style*="width: 320px"]');
                if (panels.length > 0) rightPanel = panels[0];
            }
            
            if (rightPanel) {
                var rect = rightPanel.getBoundingClientRect();
                var activeTab = rightPanel.querySelector('.ant-tabs-tab-active');
                var allTabs = rightPanel.querySelectorAll('.ant-tabs-tab');
                var tabTexts = [];
                for (var i = 0; i < allTabs.length; i++) {
                    tabTexts.push(allTabs[i].textContent.trim());
                }
                return {
                    found: true,
                    rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) },
                    hasTabs: true,
                    activeTabText: activeTab ? activeTab.textContent.trim() : '',
                    tabCount: allTabs.length,
                    tabTexts: tabTexts
                };
            }
            return { found: false };
        })()
    """)

    results["right_panel_structure"] = {
        "check": "右侧面板结构正确",
        "panel_found": right_panel_data.get("found", False),
        "panel_rect": right_panel_data.get("rect", {}),
        "has_tabs": right_panel_data.get("hasTabs", False),
        "active_tab": right_panel_data.get("activeTabText", ""),
        "tab_texts": right_panel_data.get("tabTexts", []),
        "pass": right_panel_data.get("found", False) and right_panel_data.get("hasTabs", False),
        "detail": f"面板存在={right_panel_data.get('found')}, Tabs={right_panel_data.get('tabTexts', [])}, 激活={right_panel_data.get('activeTabText', '')}",
    }
    log(f"    右侧面板: {'通过' if results['right_panel_structure']['pass'] else '失败'}")

    return results


def main() -> int:
    all_results: dict = {}

    with sync_playwright() as p:
        log("=== 1. 启动浏览器 (headless, 1920x1080) ===")
        browser = p.chromium.launch(
            headless=True,
            channel="chrome",
            args=["--no-sandbox", "--disable-setuid-sandbox"],
        )
        context = browser.new_context(
            viewport={"width": VIEWPORT_W, "height": VIEWPORT_H},
            ignore_https_errors=True,
        )
        page = context.new_page()

        log(f"=== 2. 访问 {DATACENTER_URL} ===")
        page.goto(DATACENTER_URL, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_load_state("networkidle", timeout=30000)
        time.sleep(1)

        log("=== 3. 检查登录状态 ===")
        login_result = login_if_needed(page)
        all_results["login"] = login_result

        if not login_result.get("logged_in", False):
            log("登录失败，终止测试")
            context.close()
            browser.close()
            RESULT_FILE.write_text(
                json.dumps({"error": "登录失败", "login_result": login_result}, ensure_ascii=False, indent=2),
                encoding="utf-8",
            )
            return 1

        log("=== 4. 导航到数据中心页面 ===")
        if "/datacenter" not in page.url:
            log("  当前不在数据中心页面，导航到 /datacenter")
            page.goto(DATACENTER_URL, wait_until="domcontentloaded", timeout=30000)
        try:
            page.wait_for_load_state("networkidle", timeout=20000)
        except Exception:
            log("  networkidle 等待超时，继续执行")
        time.sleep(3)
        log(f"  当前页面: {page.url}")

        log("=== 5. 点击右侧面板 '赛事实时' Tab ===")
        tab_result = switch_to_race_tab(page)
        all_results["tab_switch"] = tab_result

        log("=== 等待 2 秒 ===")
        time.sleep(2)

        log("=== 截取右侧面板特写 ===")
        screenshot_taken = False
        right_panel_candidates = page.locator(".ant-tabs")
        for i in range(right_panel_candidates.count()):
            candidate = right_panel_candidates.nth(i)
            try:
                box = candidate.bounding_box()
                if box and box["width"] > 200 and box["width"] < 400 and box["x"] > 1500:
                    candidate.screenshot(path=str(SCREENSHOT_PATH))
                    log(f"  右侧面板截图已保存 (Tabs at x={int(box['x'])}, w={int(box['width'])})")
                    screenshot_taken = True
                    break
            except Exception:
                continue

        if not screenshot_taken:
            right_panel_el = page.locator("div[style*='width: 320px']").first
            if right_panel_el.count() > 0:
                right_panel_el.screenshot(path=str(SCREENSHOT_PATH))
                log(f"  右侧面板截图已保存(备用1): {SCREENSHOT_PATH}")
            else:
                page.screenshot(path=str(SCREENSHOT_PATH), clip={
                    "x": VIEWPORT_W - 340, "y": 60,
                    "width": 340, "height": VIEWPORT_H - 180
                })
                log(f"  右侧区域截图已保存(备用2): {SCREENSHOT_PATH}")

        log("=== 6. 运行关键验证 ===")
        verification = verify_race_panel(page)
        all_results["verification"] = verification

        context.close()
        browser.close()

    # --- 汇总结果 ---
    log("\n=== 7. 汇总验证结果 ===")
    checkpoints = all_results.get("verification", {})
    pass_count = sum(1 for v in checkpoints.values() if v.get("pass", False))
    total_count = len(checkpoints)

    summary = {
        "pass_count": pass_count,
        "total_count": total_count,
        "pass_rate": f"{pass_count}/{total_count}",
        "overall_pass": pass_count == total_count,
        "screenshot_path": str(SCREENSHOT_PATH),
        "checkpoints": {},
    }

    for key, val in checkpoints.items():
        status = "PASS" if val.get("pass") else "FAIL"
        summary["checkpoints"][key] = f"[{status}] {val.get('check', key)} | {val.get('detail', '')}"
        log(f"  [{status}] {val.get('check', key)} | {val.get('detail', '')}")

    all_results["summary"] = summary

    RESULT_FILE.write_text(
        json.dumps(all_results, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    log(f"\n结果已写入: {RESULT_FILE}")

    log(f"\n截图文件路径: {SCREENSHOT_PATH}")
    log(f"\n=== 最终结果: {summary['pass_rate']} {'全部通过' if summary['overall_pass'] else '未全部通过'} ===")

    return 0 if summary["overall_pass"] else 1


if __name__ == "__main__":
    raise SystemExit(main())