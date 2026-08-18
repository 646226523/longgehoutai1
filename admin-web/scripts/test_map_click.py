from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1400, "height": 900})
    
    # Collect console logs
    logs = []
    page.on('console', lambda msg: logs.append(f"[{msg.type}] {msg.text}"))
    
    page.goto('http://127.0.0.1:3014/datacenter')
    page.wait_for_load_state('networkidle')
    page.wait_for_timeout(8000)
    
    # Click on canvas
    canvas = page.locator('canvas').last
    if canvas.count() > 0:
        box = canvas.bounding_box()
        print(f"Canvas bounding box: {box}")
        if box:
            x = box['x'] + box['width'] * 0.5
            y = box['y'] + box['height'] * 0.5
            print(f"Clicking at {x}, {y}")
            page.mouse.click(x, y)
            page.wait_for_timeout(500)
    else:
        print("No canvas found!")
    
    page.wait_for_timeout(1000)
    
    # Print all logs
    print("\n=== Console Logs ===")
    for log in logs[-20:]:
        print(log)
    
    # Check if there's something covering the canvas
    print("\n=== Page Structure ===")
    # Get elementFromPoint at canvas center
    if canvas.count() > 0 and box:
        x = box['x'] + box['width'] * 0.5
        y = box['y'] + box['height'] * 0.5
        element = page.evaluate(f"""() => {{
            const el = document.elementFromPoint({x}, {y});
            return el ? el.tagName + '.' + el.className : 'null';
        }}""")
        print(f"Element at canvas center: {element}")
    
    page.screenshot(path='/tmp/map_test.png', full_page=False)
    print("\nScreenshot saved to /tmp/map_test.png")
    
    browser.close()
