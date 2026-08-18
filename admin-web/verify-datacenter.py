from __future__ import annotations

import json
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
SPECS_DIR = ROOT.parent / ".trae" / "specs" / "datacenter-cockpit-redesign"
SPECS_DIR.mkdir(parents=True, exist_ok=True)
RESULT_FILE = SPECS_DIR / "verification-result.json"

BASE_URL = "http://127.0.0.1:3014"
DATACENTER_URL = f"{BASE_URL}/datacenter"

VIEWPORT_W = 1920
VIEWPORT_H = 1080


def log(msg: str) -> None:
    print(msg, flush=True)


def login_if_needed(page) -> dict:
    state = {"visited_login": False, "logged_in": False, "final_url": page.url}

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

    submit = page.locator(
        "button[type='submit']"
    ).first
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
    state["final_url"] = page.url
    state["logged_in"] = "/login" not in page.url and "/user/login" not in page.url
    return state


def verify_layout(page) -> dict:
    results = {}

    log("=== 7. 验证检查点 ===")

    # --- Checkpoint 1: 左侧指标卡是否为紧凑2列布局 ---
    log("  检查点1: 左侧指标卡紧凑2列布局")
    left_grid = page.locator(
        "div[style*='grid-template-columns: repeat(2, 1fr)']"
    ).first
    metric_cards = page.locator(
        "div[style*='grid-template-columns: repeat(2, 1fr)'] > div"
    )
    card_count = metric_cards.count()
    results["left_metric_cards"] = {
        "check": "左侧指标卡为紧凑2列布局",
        "card_count": card_count,
        "pass": card_count >= 4,
        "detail": f"检测到 {card_count} 个指标卡（预期 4 个）",
    }
    log(f"    指标卡数量: {card_count} -> {'通过' if card_count >= 4 else '失败'}")

    # --- Checkpoint 2: 右侧面板宽度是否为 320px ---
    log("  检查点2: 右侧面板宽度 320px")
    right_width_data = page.evaluate("""
        (function() {
            var panels = document.querySelectorAll('div[style*="width: 320px"]');
            if (panels.length > 0) {
                var rect = panels[0].getBoundingClientRect();
                return { found: true, width: rect.width, style: panels[0].style.width };
            }
            var grid = document.querySelector('div[style*="grid-template-columns: 1fr 2fr 320px"]');
            if (grid && grid.children[2]) {
                var colRect = grid.children[2].getBoundingClientRect();
                return { found: true, width: colRect.width, fromGrid: true };
            }
            return { found: false };
        })()
    """)

    right_width_ok = right_width_data.get("found", False)
    actual_width = right_width_data.get("width", 0)
    results["right_panel_width"] = {
        "check": "右侧面板固定宽度 320px",
        "found": right_width_ok,
        "actual_width": actual_width,
        "pass": right_width_ok and 300 <= actual_width <= 340,
        "detail": f"实际宽度: {actual_width}px",
    }
    log(f"    右侧面板宽度: {actual_width}px -> {'通过' if results['right_panel_width']['pass'] else '失败'}")

    # --- Checkpoint 3: 右侧内容无横向溢出 ---
    log("  检查点3: 右侧内容无横向溢出")
    overflow_data = page.evaluate("""
        (function() {
            var panel = document.querySelector('div[style*="width: 320px"]');
            if (!panel) {
                var grid = document.querySelector('div[style*="grid-template-columns: 1fr 2fr 320px"]');
                if (grid && grid.children[2]) {
                    panel = grid.children[2];
                }
            }
            if (panel) {
                return {
                    panelScrollWidth: panel.scrollWidth,
                    panelClientWidth: panel.clientWidth,
                    hasOverflow: panel.scrollWidth > panel.clientWidth + 2
                };
            }
            return { error: "right panel not found" };
        })()
    """)

    right_no_overflow = not overflow_data.get("hasOverflow", True)
    results["right_no_horizontal_overflow"] = {
        "check": "右侧内容无横向溢出",
        "overflow_info": overflow_data,
        "pass": right_no_overflow,
        "detail": "无横向滚动" if right_no_overflow else "存在横向溢出",
    }
    log(f"    横向溢出: {'无' if right_no_overflow else '有'} -> {'通过' if right_no_overflow else '失败'}")

    # --- Checkpoint 4: 底部飞行数据是否紧凑 ---
    log("  检查点4: 底部飞行数据紧凑")
    bottom_data = page.evaluate("""
        (function() {
            var spans = document.querySelectorAll('span');
            for (var i = 0; i < spans.length; i++) {
                var span = spans[i];
                if (span.textContent && span.textContent.indexOf('鸽子实时飞行数据') !== -1) {
                    var headerDiv = span.parentElement;
                    var rect = headerDiv.getBoundingClientRect();
                    var cardDiv = headerDiv;
                    for (var j = 0; j < 10; j++) {
                        cardDiv = cardDiv.parentElement;
                        if (!cardDiv) break;
                        var cs = cardDiv.getAttribute('style') || '';
                        if (cs.indexOf('border-radius') !== -1 && cs.indexOf('background') !== -1 && cs.indexOf('rgb(26') !== -1) {
                            break;
                        }
                    }
                    var rowHeight = 0;
                    if (cardDiv) {
                        var gridChildren = cardDiv.querySelectorAll('div[style*="grid-template-columns"]');
                        if (gridChildren.length > 0) {
                            rowHeight = gridChildren[0].getBoundingClientRect().height;
                        }
                    }
                    return {
                        headerFound: true,
                        headerHeight: rect.height,
                        rowHeight: rowHeight,
                        isCompact: rect.height > 0 && rect.height <= 60
                    };
                }
            }
            return { headerFound: false, isCompact: false };
        })()
    """)

    results["bottom_flight_compact"] = {
        "check": "底部飞行数据紧凑",
        "info": bottom_data,
        "pass": bottom_data.get("isCompact", False),
        "detail": f"标题栏高度: {bottom_data.get('headerHeight', 0)}px",
    }
    log(f"    底部紧凑: {'通过' if results['bottom_flight_compact']['pass'] else '失败'}")

    # --- Checkpoint 5: 页面无整体横向滚动 ---
    log("  检查点5: 页面无整体横向滚动")
    scroll_data = page.evaluate("""
        (function() {
            var html = document.documentElement;
            var body = document.body;
            return {
                htmlScrollWidth: html.scrollWidth,
                htmlClientWidth: html.clientWidth,
                bodyScrollWidth: body.scrollWidth,
                bodyClientWidth: body.clientWidth,
                viewportWidth: window.innerWidth,
                htmlHasOverflow: html.scrollWidth > html.clientWidth + 2,
                bodyHasOverflow: body.scrollWidth > body.clientWidth + 2
            };
        })()
    """)

    no_horizontal_scroll = (
        not scroll_data.get("htmlHasOverflow", True)
        and not scroll_data.get("bodyHasOverflow", True)
    )
    results["no_page_horizontal_scroll"] = {
        "check": "页面无整体横向滚动",
        "scroll_info": scroll_data,
        "pass": no_horizontal_scroll,
        "detail": "无横向滚动" if no_horizontal_scroll else "存在横向滚动",
    }
    log(f"    页面横向滚动: {'无' if no_horizontal_scroll else '有'} -> {'通过' if no_horizontal_scroll else '失败'}")

    # --- 额外检查: 指标卡紧凑模式 ---
    log("  额外检查: 指标卡紧凑模式高度")
    card_data = page.evaluate("""
        (function() {
            var grids = document.querySelectorAll('div[style*="grid-template-columns: repeat(2, 1fr)"]');
            for (var i = 0; i < grids.length; i++) {
                var grid = grids[i];
                var cards = grid.children;
                if (cards.length >= 4) {
                    var heights = [];
                    for (var j = 0; j < cards.length; j++) {
                        var rect = cards[j].getBoundingClientRect();
                        heights.push(rect.height);
                    }
                    var maxH = 0;
                    for (var k = 0; k < heights.length; k++) {
                        if (heights[k] > maxH) maxH = heights[k];
                    }
                    return {
                        count: cards.length,
                        heights: heights,
                        maxHeight: maxH,
                        allCompact: maxH > 0 && maxH <= 250
                    };
                }
            }
            return { count: 0, allCompact: false };
        })()
    """)

    results["metric_cards_compact"] = {
        "check": "指标卡紧凑模式",
        "info": card_data,
        "pass": card_data.get("allCompact", False),
        "detail": f"卡片数: {card_data.get('count', 0)}, 最大高度: {card_data.get('maxHeight', 0)}px",
    }
    log(f"    指标卡紧凑: {'通过' if results['metric_cards_compact']['pass'] else '失败'}")

    # --- 额外检查: 三栏布局 ---
    log("  额外检查: 三栏布局")
    align_data = page.evaluate("""
        (function() {
            var mainGrid = document.querySelector('div[style*="grid-template-columns: 1fr 2fr 320px"]');
            if (!mainGrid) return { found: false };
            var children = mainGrid.children;
            var rects = [];
            for (var i = 0; i < children.length; i++) {
                var rect = children[i].getBoundingClientRect();
                rects.push({
                    index: i,
                    left: rect.left,
                    top: rect.top,
                    width: rect.width,
                    height: rect.height
                });
            }
            return {
                found: true,
                columnCount: children.length,
                rects: rects
            };
        })()
    """)

    results["three_column_layout"] = {
        "check": "三栏布局正确",
        "info": align_data,
        "pass": align_data.get("found", False) and align_data.get("columnCount", 0) >= 3,
        "detail": f"三栏布局: {'存在' if align_data.get('found') else '不存在'}, 列数: {align_data.get('columnCount', 0)}",
    }
    log(f"    三栏布局: {'通过' if results['three_column_layout']['pass'] else '失败'}")

    return results


def main() -> int:
    all_results: dict = {}

    with sync_playwright() as p:
        log("=== 启动浏览器 ===")
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

        log(f"=== 1. 访问首页 {BASE_URL} ===")
        page.goto(BASE_URL, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_load_state("networkidle", timeout=30000)
        time.sleep(1)

        log("=== 2. 检查登录状态 ===")
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

        log(f"=== 3. 访问数据中台 {DATACENTER_URL} ===")
        page.goto(DATACENTER_URL, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_load_state("networkidle", timeout=30000)
        time.sleep(2)

        log("=== 4. 等待页面完全加载 ===")
        try:
            page.wait_for_load_state("networkidle", timeout=20000)
        except Exception:
            log("  networkidle 等待超时，继续执行")
        time.sleep(2)

        log("=== 5. 截取全屏截图 ===")
        full_screenshot_path = str(SPECS_DIR / "screenshot_full.png")
        page.screenshot(path=full_screenshot_path, full_page=True)
        log(f"  全屏截图已保存: {full_screenshot_path}")

        log("=== 6. 运行验证检查点 ===")
        verification = verify_layout(page)
        all_results["verification"] = verification

        # --- 8. 截取右侧面板特写 ---
        log("=== 8. 截取右侧面板特写 ===")
        right_screenshot_path = str(SPECS_DIR / "screenshot_right.png")
        right_panel_el = page.locator("div[style*='width: 320px']").first
        if right_panel_el.count() > 0:
            right_panel_el.screenshot(path=right_screenshot_path)
            log(f"  右侧面板截图已保存: {right_screenshot_path}")
        else:
            page.screenshot(path=right_screenshot_path, clip={
                "x": VIEWPORT_W - 340, "y": 60, "width": 340, "height": VIEWPORT_H - 180
            })
            log(f"  右侧区域截图已保存(备用): {right_screenshot_path}")

        # --- 9. 截取底部飞行数据 ---
        log("=== 9. 截取底部飞行数据 ===")
        bottom_screenshot_path = str(SPECS_DIR / "screenshot_bottom.png")
        try:
            bottom_el = page.get_by_text("鸽子实时飞行数据").first
            if bottom_el.count() > 0:
                bottom_el.scroll_into_view_if_needed(timeout=3000)
                time.sleep(0.5)
                box = bottom_el.bounding_box()
                if box and box["width"] > 0 and box["height"] > 0:
                    clip_x = max(0, box["x"] - 10)
                    clip_y = max(0, box["y"] - 10)
                    clip_w = min(box["width"] + 20, VIEWPORT_W - clip_x)
                    clip_h = min(box["height"] + 20, VIEWPORT_H - clip_y, 300)
                    if clip_w > 0 and clip_h > 0:
                        page.screenshot(path=bottom_screenshot_path, clip={
                            "x": clip_x, "y": clip_y,
                            "width": clip_w, "height": clip_h,
                        })
                        log(f"  底部截图已保存: {bottom_screenshot_path}")
                    else:
                        raise Exception("clip area invalid")
                else:
                    raise Exception("bounding box invalid")
            else:
                raise Exception("element not found")
        except Exception as e:
            log(f"  底部精确截图失败({e})，使用备用方案")
            page.screenshot(path=bottom_screenshot_path, clip={
                "x": 0, "y": VIEWPORT_H - 200,
                "width": VIEWPORT_W, "height": 200,
            })
            log(f"  底部区域截图已保存(备用): {bottom_screenshot_path}")

        context.close()
        browser.close()

    # --- 10. 汇总验证结果 ---
    log("=== 10. 汇总验证结果 ===")
    checkpoints = all_results.get("verification", {})
    pass_count = sum(1 for v in checkpoints.values() if v.get("pass", False))
    total_count = len(checkpoints)

    summary = {
        "pass_count": pass_count,
        "total_count": total_count,
        "pass_rate": f"{pass_count}/{total_count}",
        "overall_pass": pass_count == total_count,
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

    log("\n=== 截图文件路径 ===")
    log(f"  全屏截图: {SPECS_DIR / 'screenshot_full.png'}")
    log(f"  右侧面板: {SPECS_DIR / 'screenshot_right.png'}")
    log(f"  底部飞行: {SPECS_DIR / 'screenshot_bottom.png'}")

    log(f"\n=== 最终结果: {summary['pass_rate']} {'通过' if summary['overall_pass'] else '未全部通过'} ===")

    return 0 if summary["overall_pass"] else 1


if __name__ == "__main__":
    raise SystemExit(main())