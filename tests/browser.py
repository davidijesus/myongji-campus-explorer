"""Functional checks against the bundled UI, not a substitute for native device tests.
Run: pip install playwright; playwright install chromium; python tests/browser.py
A system Chromium may be selected with CHROMIUM_EXECUTABLE. No network service is used.
"""
from pathlib import Path
from datetime import datetime
import json
import os
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
html = (ROOT / "preview.html").read_text()
results = []
errors = []

def check(name, condition):
    if not condition:
        raise AssertionError(name)
    results.append({"check": name, "result": "passed"})
    print("PASS", name, flush=True)

def state(page):
    return page.evaluate("window.MCE.getState()")

with sync_playwright() as p:
    executable = os.environ.get("CHROMIUM_EXECUTABLE")
    if not executable and Path('/usr/bin/chromium').exists():
        executable = '/usr/bin/chromium'
    browser = p.chromium.launch(executable_path=executable, headless=True, args=['--no-sandbox'])
    page = browser.new_page(viewport={"width":390,"height":844}, device_scale_factor=1)
    page.set_default_timeout(6000)
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.clock.install(time=datetime.fromisoformat('2026-09-30T12:00:00+09:00'))
    page.set_content(html, wait_until='load')
    page.wait_for_timeout(700)
    check('Standalone page loads with meaningful content', page.locator('#app').inner_text().startswith('MYONGJI'))
    check('Persistent fictional-map labeling', 'Fictional demo map' in page.locator('#mode-bar').inner_text())
    check('No horizontal page overflow at 390 px', page.evaluate('document.documentElement.scrollWidth <= innerWidth'))
    check('Renderer starts or provides usable fallback', page.evaluate('window.MCE.diagnostics() !== undefined'))
    renderer = page.evaluate('window.MCE.diagnostics()')
    page.screenshot(path=str(ROOT/'docs/mobile.png'))
    # Search, selection, entrance and correct tab transitions.
    page.locator('#search').fill('도서관')
    check('Korean name returns the same library', page.locator('#results .place-card').count() == 1)
    page.locator('#results .place-card').click()
    check('Library selection identifies an entrance', state(page)['entranceId']=='demo-library-entrance')
    page.locator('[data-action="directions"]').click()
    page.locator('#route-start').select_option('demo-gate-node')
    page.locator('#avoid-stairs').check()
    page.locator('[data-action="calculate-route"]').click()
    check('Route ends at selected entrance', state(page)['route']['nodeIds'][-1]=='demo-library-node')
    check('Walking route has graph distance, not straight-line guess', state(page)['route']['distanceM']>0)
    route=state(page)['route']
    page.locator('[data-action="view"]').click()
    check('2D switch preserves selected destination and route',state(page)['twoD'] and state(page)['route']==route)
    page.locator('[data-action="view"]').click()
    page.locator('[data-action="favorite"]').click()
    check('Favorite stores selected ID', 'demo-library' in state(page)['favorites'])
    page.locator('[data-action="sheet"]').click()
    page.wait_for_timeout(400)
    page.screenshot(path=str(ROOT/'docs/mobile-route.png'))
    # Native Naver not executed here; demo never emits a real destination.
    page.locator('[data-action="sheet"]').click()
    page.locator('[data-action="naver-walk"]').click()
    check('Demo destinations cannot open real Naver routes', 'disabled for fictional places' in page.locator('#toast').inner_text())
    # Food content and filters.
    page.locator('[data-tab="food"]').click()
    check('Food shows two labeled sample venues',page.locator('.food-card').count()==2)
    check('Unknown hours are explicitly represented',page.get_by_text('Hours unknown',exact=True).count()==1)
    page.locator('[data-action="open-filter"]').click()
    check('Open filter excludes unknown hours',page.locator('.food-card').count()==1)
    page.locator('[data-action="open-filter"]').click()
    page.locator('#budget').select_option('5000')
    check('Budget filter is applied to known price range',page.locator('.food-card').count()==0)
    page.locator('#budget').select_option('8000')
    page.screenshot(path=str(ROOT/'docs/mobile-food.png'))
    page.locator('.food-body [data-place]').first.click()
    check('Food Show on map returns to visible map',state(page)['tab']=='explore' and state(page)['selected']=='demo-coffee')
    # Event schedule is deterministic for the test date, and uses KST.
    page.locator('[data-tab="events"]').click()
    check('Upcoming events exclude completed fixture',page.locator('.event-card').count()==2)
    check('Event timezone is visible', 'KST' in page.locator('#filters').inner_text())
    page.screenshot(path=str(ROOT/'docs/mobile-events.png'))
    page.locator('[data-event-place]').first.click()
    check('Event venue returns to Explore',state(page)['tab']=='explore' and state(page)['selected']=='demo-union')
    # Actual live seed remains separate and honest.
    page.locator('[data-action="mode"]').click()
    check('Real mode does not show fictional buildings',state(page)['mode']=='live' and page.locator('#map-empty').is_visible())
    check('Real map makes missing survey explicit','still need a survey' in page.locator('#map-empty').inner_text())
    page.screenshot(path=str(ROOT/'docs/mobile-real-directory.png'))
    page.locator('[data-action="directions"]').click()
    check('No verified path produces a limitation, not fake geometry','No verified campus route' in page.locator('#dialog-content').inner_text())
    page.locator('[data-action="close-dialog"]').click()
    page.locator('[data-action="view"]').click()
    check('Browser geographic view explains native requirement','requires the native mobile build' in page.locator('#toast').inner_text())
    # Permission denial simulated at browser adapter boundary only.
    page.evaluate("Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition:(success,error)=>error({code:1})}})")
    page.locator('[data-action="location"]').click()
    check('Denied permission retains browsing and manual start','choose a start manually' in page.locator('#toast').inner_text())
    page.evaluate("window.dispatchEvent(new Event('offline'))")
    check('Offline state explains unavailable live services','Offline' in page.locator('#toast').inner_text())
    page.evaluate("window.MCE.receive({type:'location',reading:{lat:37.2,lon:127.1,accuracyM:100,timestamp:Date.now()}})")
    check('Weak location state is explicit','weak' in page.locator('#toast').inner_text())
    page.evaluate("window.MCE.receive({type:'location',reading:{lat:37.2,lon:127.1,accuracyM:10,timestamp:Date.now()-60000}})")
    check('Stale location state is explicit','stale' in page.locator('#toast').inner_text())
    check('Location history is not stored',state(page)['locationStored'] is False)
    # Language, device font scale and lifecycle.
    page.locator('[data-action="mode"]').click()
    page.locator('[data-action="view"]').click()
    page.locator('[data-action="language"]').click()
    check('Korean interface preserves selection and map mode', state(page)['language']=='ko' and state(page)['selected']=='demo-library' and state(page)['twoD'])
    check('Korean document language is set',page.evaluate('document.documentElement.lang')=='ko')
    page.locator('[data-action="view"]').click()
    page.screenshot(path=str(ROOT/'docs/mobile-korean.png'))
    page.evaluate("window.MCE.receive({type:'font-scale',scale:1.5})")
    check('System font-scale bridge increases body text',page.locator('.place-description').evaluate("e=>parseFloat(getComputedStyle(e).fontSize)")>=19.5)
    check('Enlarged text does not overflow the page horizontally',page.evaluate('document.documentElement.scrollWidth <= innerWidth'))
    page.screenshot(path=str(ROOT/'docs/mobile-large-text.png'))
    page.evaluate("window.MCE.receive({type:'font-scale',scale:1});window.MCE.receive({type:'reduced-motion',enabled:true});window.MCE.receive({type:'lifecycle',active:false})")
    page.wait_for_timeout(500)
    before=page.evaluate('window.MCE.diagnostics().frames')
    page.wait_for_timeout(400)
    check('Renderer pauses while backgrounded',page.evaluate('window.MCE.diagnostics().frames')==before)
    page.evaluate("window.MCE.receive({type:'lifecycle',active:true})")
    page.locator('[data-action="language"]').click()
    page.wait_for_timeout(600)
    before=page.evaluate('window.MCE.diagnostics().frames')
    page.wait_for_timeout(400)
    check('Scene is not continuously rendering while idle',page.evaluate('window.MCE.diagnostics().frames')==before)
    # Desktop geometry/layout and screenshots.
    page.set_viewport_size({'width':1440,'height':1000})
    page.wait_for_timeout(600)
    page.screenshot(path=str(ROOT/'docs/desktop.png'))
    check('Desktop layout has no horizontal overflow',page.evaluate('document.documentElement.scrollWidth <= innerWidth'))
    page.set_viewport_size({'width':390,'height':700})
    page.wait_for_timeout(400)
    check('Small phone retains bottom navigation',page.locator('.bottom-nav').bounding_box()['y']<700)
    page.screenshot(path=str(ROOT/'docs/mobile-small.png'))
    check('No uncaught UI exceptions',not errors)
    browser_version=browser.version
    browser.close()
report={'date':'2026-09-29','browser':browser_version,'viewportChecks':['390x844','390x700','1440x1000'],'renderer':renderer,'scope':'Bundled web UI via Playwright set_content. No iOS/Android device, SDK authentication, or OS deep-link execution. Geolocation denial, offline event and native messages are simulated.','checks':results,'pageErrors':errors}
(ROOT/'docs/browser-results.json').write_text(json.dumps(report,indent=2))
print(json.dumps({'passed':len(results),'failed':len(errors),'renderer':renderer,'browser':browser_version},indent=2))
