from playwright.sync_api import sync_playwright
import time

console_errors = []
console_warnings = []
page_errors = []

def capture_console(page):
    def on_console(msg):
        text = msg.text
        if msg.type == 'error':
            console_errors.append(text)
            print(f"[CONSOLE ERROR] {text[:200]}")
        elif msg.type == 'warning':
            console_warnings.append(text)
            if 'Map' in text or 'region' in text:
                print(f"[CONSOLE WARN] {text[:200]}")
    page.on('console', on_console)
    
    def on_page_error(err):
        page_errors.append(str(err))
        print(f"[PAGE ERROR] {str(err)[:200]}")
    page.on('pageerror', on_page_error)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1920, 'height': 1080})
    capture_console(page)
    
    # Navigate to the login page first
    page.goto('http://127.0.0.1:3014/', wait_until='networkidle', timeout=30000)
    time.sleep(2)
    
    # Check if we're redirected to login
    current_url = page.url
    print(f"Current URL after navigation: {current_url}")
    
    if 'login' in current_url:
        # Perform login
        print("Attempting login...")
        page.fill('input[type="text"], input[placeholder*="用户名"], input[placeholder*="账号"]', 'admin')
        page.fill('input[type="password"], input[placeholder*="密码"]', 'admin123')
        page.click('button[type="submit"], button:has-text("登录")')
        page.wait_for_load_state('networkidle', timeout=15000)
        time.sleep(2)
        print(f"URL after login: {page.url}")
    
    # Navigate to the data center page
    page.goto('http://127.0.0.1:3014/datacenter', wait_until='networkidle', timeout=30000)
    time.sleep(3)
    
    # Take screenshot of initial state
    page.screenshot(path='/tmp/datacenter_initial.png', full_page=False)
    print("Initial screenshot taken")
    
    # Find and click on a province (广东省 or any province)
    print("Looking for province elements...")
    
    # Try to find SVG path elements for provinces
    svg_paths = page.locator('svg path').all()
    print(f"Found {len(svg_paths)} SVG paths")
    
    # Try clicking on 广东省 or any province
    province_clicked = False
    try:
        # Try to find province by text or SVG element
        # Click on the map area - try different selectors
        map_container = page.locator('.echarts, [class*="chart"], svg').first
        if map_container.count() > 0:
            # Click somewhere on the map (center-left area where provinces are)
            box = map_container.bounding_box()
            if box:
                x = box['x'] + box['width'] * 0.7  # Right side of map (广东省 area)
                y = box['y'] + box['height'] * 0.6  # Lower area
                page.mouse.click(x, y)
                province_clicked = True
                print(f"Clicked at coordinates: {x}, {y}")
    except Exception as e:
        print(f"Error clicking province: {e}")
    
    if not province_clicked:
        # Try alternative - use JavaScript to trigger click on province
        try:
            page.evaluate("""
                () => {
                    // Try to find and click on a province element
                    const svg = document.querySelector('svg');
                    if (svg) {
                        // Dispatch a click event at the approximate location of 广东省
                        const event = new MouseEvent('click', {
                            bubbles: true,
                            cancelable: true,
                            view: window,
                            clientX: 800,
                            clientY: 500
                        });
                        svg.dispatchEvent(event);
                    }
                }
            """)
            print("Triggered click via JavaScript")
        except Exception as e:
            print(f"JS click error: {e}")
    
    # Wait for map to load
    time.sleep(5)
    
    # Take screenshot after province click
    page.screenshot(path='/tmp/datacenter_province.png', full_page=False)
    print("Province view screenshot taken")
    
    # Check console errors
    print("\n" + "="*60)
    print("CONSOLE ERRORS SUMMARY:")
    print("="*60)
    print(f"Total console errors: {len(console_errors)}")
    for err in console_errors:
        if 'Map' in err or 'region' in err or 'exists' in err:
            print(f"  [CRITICAL] {err[:300]}")
    print(f"\nTotal page errors: {len(page_errors)}")
    for err in page_errors:
        print(f"  PAGE ERROR: {err[:200]}")
    
    # Check for critical errors
    critical_errors = [e for e in console_errors if 'Map' in e and 'not exists' in e]
    if critical_errors:
        print(f"\n❌ FAIL: Found {len(critical_errors)} critical 'Map not exists' errors!")
    else:
        print("\n✅ PASS: No 'Map not exists' errors found!")
    
    # Try to click back to national view
    try:
        back_btn = page.locator('button:has-text("返回全国"), button:has-text("返回"), [class*="back"]')
        if back_btn.count() > 0:
            back_btn.first.click()
            time.sleep(2)
            page.screenshot(path='/tmp/datacenter_back.png', full_page=False)
            print("Back to national view screenshot taken")
    except:
        print("No back button found or clickable")
    
    browser.close()
