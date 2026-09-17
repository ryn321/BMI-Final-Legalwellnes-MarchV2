#!/usr/bin/env python3
import json
import re
import subprocess
import sys
import tempfile
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright


ARTICLE_PATH = "/news/small-claims-court-limit-2026"
ARTICLE_TITLE = "Small Claims Court Limit Increased to R30 000"
ARTICLE_ALT = "Small Claims Court entrance and access to justice"
SOURCE_LINKS = {
    "Official Small Claims Court guidance": "https://justice.gov.za/scc/scc.htm",
    "Government Gazette 55038, Notice 7717": "https://justice.gov.za/legislation/notices/2026/20260720-gg55038gon7717-SCC-Amount-Increase-R30000.pdf",
    "Justice Ministry announcement": "https://www.justice.gov.za/m_statements/2026/20260722-SCC-Monetary-Jurisdiction-R30000.html",
    "Small Claims Court FAQ": "https://justice.gov.za/scc/scc_info.htm",
}
NOTICE_LIST_URL = "https://justice.gov.za/legislation/notices/notice_list.html"
EXPECTED_ORDER = [
    "/news/labour-procedures",
    "/news/divorce-procedures",
    "/news/wills-estate-matters",
    ARTICLE_PATH,
]
CARD_SELECTOR = "div.group.relative.border.border-border.rounded-2xl"


def fail(message):
    raise AssertionError(message)


def parse_origin(value):
    parsed = urlparse(value)
    loopback = parsed.hostname in {"127.0.0.1", "localhost"}
    if parsed.scheme != "https" and not (loopback and parsed.scheme == "http"):
        fail("base origin must use HTTPS, except loopback HTTP")
    if not parsed.hostname or parsed.username or parsed.password or parsed.query or parsed.fragment:
        fail("base origin must be a plain origin")
    if parsed.path not in {"", "/"}:
        fail("base origin must not contain a path")
    return value.rstrip("/")


def http_get(url):
    for attempt in range(2):
        try:
            with urlopen(Request(url, method="GET"), timeout=25) as response:
                return response.status, dict(response.headers.items()), response.read()
        except HTTPError as error:
            return error.code, dict(error.headers.items()), error.read()
        except URLError as error:
            if attempt == 1:
                fail(f"GET failed for {url}: {error.reason}")


def header_value(headers, name):
    wanted = name.lower()
    return next((value for key, value in headers.items() if key.lower() == wanted), None)


def normalise(value):
    return re.sub(r"\s+", " ", value).strip()


def verify_official_sources():
    results = {}
    for label, url in SOURCE_LINKS.items():
        status, headers, body = http_get(url)
        if status != 200:
            fail(f"official source returned {status}: {label}")
        results[label] = len(body)
        if label == "Government Gazette 55038, Notice 7717":
            content_type = header_value(headers, "Content-Type") or ""
            if "pdf" not in content_type.lower() or len(body) < 1000:
                fail("Gazette source is not a non-empty PDF")
            with tempfile.NamedTemporaryFile(suffix=".pdf") as pdf:
                pdf.write(body)
                pdf.flush()
                completed = subprocess.run(
                    ["pdftotext", pdf.name, "-"], capture_output=True, check=True
                )
            text = normalise(completed.stdout.decode("utf-8", errors="replace")).lower()
            for marker in ["55038", "7717", "20 july 2026"]:
                if marker not in text:
                    fail(f"Gazette PDF is missing marker: {marker}")
            continue

        text = normalise(body.decode("utf-8", errors="replace"))
        if label == "Official Small Claims Court guidance":
            for marker in ["R 30 000", "01 Aug 2026", "14 days", "Clerk"]:
                if marker.lower() not in text.lower():
                    fail(f"guidance source is missing marker: {marker}")
        elif label == "Justice Ministry announcement":
            for marker in ["R30 000", "R20 000", "1 August 2026"]:
                if marker.lower() not in text.lower():
                    fail(f"announcement source is missing marker: {marker}")
        else:
            for marker in [
                "Representation by an attorney or advocate is not allowed",
                "Clerks of the Small Claims Courts will assist you free of charge",
                "Anyone except juristic persons",
                "claims against the State",
                "Municipalities/Local Government",
            ]:
                if marker.lower() not in text.lower():
                    fail(f"FAQ source is missing marker: {marker}")
    notice_status, _, notice_body = http_get(NOTICE_LIST_URL)
    if notice_status != 200:
        fail(f"official Gazette notice list returned {notice_status}")
    notice_text = normalise(notice_body.decode("utf-8", errors="replace"))
    for marker in ["R30 000", "GG 55038", "GoN 7717", "20 July 2026"]:
        if marker.lower() not in notice_text.lower():
            fail(f"Gazette notice list is missing marker: {marker}")
    results["Official Gazette notice list"] = len(notice_body)
    return results


def attach_errors(page):
    errors = []
    page.on(
        "console",
        lambda message: errors.append(f"console:{message.text}")
        if message.type == "error"
        else None,
    )
    page.on("pageerror", lambda error: errors.append(f"page:{error}"))
    return errors


def wait_policy(page):
    page.evaluate(
        "() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))"
    )
    page.get_by_role("link", name=ARTICLE_TITLE, exact=True).wait_for(
        state="visible", timeout=5_000
    )
    page.wait_for_timeout(250)


def card_boxes(page):
    boxes = []
    for path in EXPECTED_ORDER:
        anchor = page.locator(f'a[href="{path}"]:visible')
        if anchor.count() != 1:
            fail(f"expected one visible card link for {path}, found {anchor.count()}")
        box = anchor.evaluate(
            f"element => element.closest('{CARD_SELECTOR}').getBoundingClientRect().toJSON()"
        )
        boxes.append(box)
    return boxes


def assert_desktop_grid(boxes):
    if len(boxes) != 4:
        fail("desktop grid does not contain four cards")
    if abs(boxes[0]["y"] - boxes[1]["y"]) > 5 or abs(boxes[2]["y"] - boxes[3]["y"]) > 5:
        fail("desktop cards do not form two rows")
    if abs(boxes[0]["x"] - boxes[2]["x"]) > 5 or abs(boxes[1]["x"] - boxes[3]["x"]) > 5:
        fail("desktop cards do not form two columns")
    if boxes[1]["x"] <= boxes[0]["x"] or boxes[2]["y"] <= boxes[0]["y"]:
        fail("desktop card order is not two-by-two")
    widths = [box["width"] for box in boxes]
    if max(widths) - min(widths) > 3:
        fail("desktop card widths differ by more than 3px")


def assert_article_response(response):
    if response is None or urlparse(response.url).path != ARTICLE_PATH:
        fail("article activation did not produce the expected document response")
    headers = response.headers
    if "x-legal-wellness-origin" in headers:
        fail("article response came from the proxy instead of the local route")
    expected_headers = {
        "x-content-type-options": "nosniff",
        "referrer-policy": "strict-origin-when-cross-origin",
        "x-frame-options": "DENY",
        "permissions-policy": "camera=(), microphone=(), geolocation=()",
    }
    for name, value in expected_headers.items():
        if headers.get(name) != value:
            fail(f"article response header mismatch: {name}")
    csp = headers.get("content-security-policy", "")
    for directive in [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline'",
        "object-src 'none'",
        "frame-ancestors 'none'",
    ]:
        if directive not in csp:
            fail(f"article CSP missing {directive}")


def assert_article_page(page):
    if page.locator('[data-lw-local-article="small-claims-2026"]').count() != 1:
        fail("local article marker is missing")
    if page.get_by_role("heading", name=ARTICLE_TITLE, exact=True).count() != 1:
        fail("article h1 is missing")
    body = page.locator("body").inner_text()
    for marker in ["R30 000", "1 August 2026", "14 days", "not legal advice"]:
        if marker not in body:
            fail(f"article body missing {marker}")
    for label, href in SOURCE_LINKS.items():
        link = page.get_by_role("link", name=label, exact=True)
        if link.count() != 1 or link.get_attribute("href") != href:
            fail(f"article source link mismatch: {label}")
        if link.get_attribute("target") != "_blank" or link.get_attribute("rel") != "noopener noreferrer":
            fail(f"article source link safety mismatch: {label}")


def verify_desktop_and_navigation(browser, base_origin):
    context = browser.new_context(viewport={"width": 1280, "height": 900})
    page = context.new_page()
    errors = attach_errors(page)
    page.goto(f"{base_origin}/news", wait_until="load")
    wait_policy(page)

    visible_hrefs = page.locator('a[href^="/news/"]:visible').evaluate_all(
        "elements => elements.map(element => element.getAttribute('href'))"
    )
    if visible_hrefs != EXPECTED_ORDER:
        fail(f"visible card order mismatch: {visible_hrefs}")
    if page.locator('[data-lw-small-claims-card="true"]').count() != 1:
        fail("injected card is not unique")
    assert_desktop_grid(card_boxes(page))

    anchor = page.get_by_role("link", name=ARTICLE_TITLE, exact=True)
    if anchor.count() != 1 or not anchor.evaluate("element => element.parentElement.tagName === 'H3'"):
        fail("new article link is not uniquely nested in h3")
    card = page.locator('[data-lw-small-claims-card="true"]')
    if card.locator(f'img[alt="{ARTICLE_ALT}"]').count() != 1:
        fail("new card image alt is incorrect")

    for _ in range(60):
        page.keyboard.press("Tab")
        if page.evaluate("() => document.activeElement && document.activeElement.getAttribute('href')") == ARTICLE_PATH:
            break
    else:
        fail("new article link is not keyboard reachable")
    focus_style = anchor.evaluate(
        "element => ({outline:getComputedStyle(element).outlineStyle, shadow:getComputedStyle(element).boxShadow})"
    )
    if focus_style["outline"] == "none" and focus_style["shadow"] == "none":
        fail("new article link has no visible focus treatment")

    with page.expect_navigation(wait_until="domcontentloaded") as navigation:
        anchor.click()
    assert_article_response(navigation.value)
    assert_article_page(page)

    page.go_back(wait_until="load")
    wait_policy(page)
    if page.locator('[data-lw-small-claims-card="true"]').count() != 1:
        fail("back navigation did not restore exactly one card")
    if page.locator('a[href="/news/consumer-protection-opt-out-2025"]:visible').count() != 0:
        fail("stale source card became visible after back navigation")

    page.evaluate(
        """selector => {
          const grid = document.querySelector(selector);
          const replacement = grid.cloneNode(true);
          replacement.querySelectorAll('[data-lw-small-claims-card="true"]').forEach(node => node.remove());
          grid.replaceWith(replacement);
        }""",
        r"div.grid.grid-cols-1.md\:grid-cols-2.lg\:grid-cols-3.gap-8",
    )
    wait_policy(page)
    page.wait_for_timeout(300)
    if page.locator('[data-lw-small-claims-card="true"]').count() != 1:
        fail("DOM replacement did not result in exactly one injected card")

    page.go_forward(wait_until="domcontentloaded")
    assert_article_page(page)
    if errors:
        fail(f"desktop/navigation browser errors: {' | '.join(errors)}")
    context.close()


def verify_keyboard_navigation(browser, base_origin):
    context = browser.new_context(viewport={"width": 1280, "height": 900})
    page = context.new_page()
    errors = attach_errors(page)
    page.goto(f"{base_origin}/news", wait_until="load")
    wait_policy(page)
    anchor = page.get_by_role("link", name=ARTICLE_TITLE, exact=True)
    anchor.focus()
    with page.expect_navigation(wait_until="domcontentloaded") as navigation:
        anchor.press("Enter")
    assert_article_response(navigation.value)
    assert_article_page(page)
    if errors:
        fail(f"keyboard-navigation browser errors: {' | '.join(errors)}")
    context.close()


def verify_mobile(browser, base_origin):
    context = browser.new_context(viewport={"width": 390, "height": 844})
    page = context.new_page()
    errors = attach_errors(page)
    page.goto(f"{base_origin}/news", wait_until="load")
    wait_policy(page)
    boxes = card_boxes(page)
    if any(abs(box["x"] - boxes[0]["x"]) > 3 for box in boxes[1:]):
        fail("mobile cards do not share one column")
    if any(boxes[index + 1]["y"] <= boxes[index]["y"] for index in range(3)):
        fail("mobile card order is not vertically increasing")
    overflow = page.evaluate("() => document.documentElement.scrollWidth - window.innerWidth")
    if overflow > 0:
        fail(f"mobile layout overflows horizontally by {overflow}px")
    if errors:
        fail(f"mobile browser errors: {' | '.join(errors)}")
    context.close()


def main():
    if len(sys.argv) != 2:
        fail("usage: verify-small-claims-article.py <base-origin>")
    base_origin = parse_origin(sys.argv[1])
    source_results = verify_official_sources()
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        try:
            verify_desktop_and_navigation(browser, base_origin)
            verify_keyboard_navigation(browser, base_origin)
            verify_mobile(browser, base_origin)
        finally:
            browser.close()
    print(json.dumps({
        "baseOrigin": base_origin,
        "officialSourceCount": len(source_results),
        "desktopGrid": "2x2",
        "mobileGrid": "1x4",
        "navigationModes": ["click", "enter", "back", "forward"],
        "status": "verified",
    }))


if __name__ == "__main__":
    try:
        main()
    except (AssertionError, PlaywrightError, subprocess.CalledProcessError) as error:
        print(json.dumps({"status": "failed", "error": str(error)}), file=sys.stderr)
        sys.exit(1)
