#!/usr/bin/env python3
import json
import re
import sys
from urllib.parse import urljoin, urlparse

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright


HIDDEN_PATHS = [
    "/news/consumer-protection-opt-out-2025",
    "/news/wills-estates-amendment-bill",
    "/news/raf-amendment-2025",
    "/news/rental-housing-act-2025",
    "/news/family-law-mediation-rules",
    "/news/labor-law-dismissal-code",
]

RETAINED_HEADINGS = [
    "Labour Procedures",
    "Divorce Procedures",
    "Wills & Estate-Related Matters",
]


def fail(message):
    raise AssertionError(message)


def parse_base_url(value):
    parsed = urlparse(value)
    loopback = parsed.hostname in {"127.0.0.1", "localhost"}
    if parsed.scheme != "https" and not (loopback and parsed.scheme == "http"):
        fail("base URL must use HTTPS, except loopback HTTP")
    if not parsed.hostname or parsed.username or parsed.password or parsed.query or parsed.fragment:
        fail("base URL must be a plain origin")
    if parsed.path not in {"", "/"}:
        fail("base URL must not contain a path")
    return value.rstrip("/")


def wait_two_frames(page):
    page.evaluate(
        "() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))"
    )


def attach_errors(page):
    errors = []
    page.on("console", lambda message: errors.append(f"console:{message.text}") if message.type == "error" else None)
    page.on("pageerror", lambda error: errors.append(f"page:{error}"))
    return errors


def assert_clean_news(page, errors, label):
    wait_two_frames(page)
    if page.get_by_role("heading", name="Click on Newsletter", exact=True).count() != 0:
        fail(f"{label}: newsletter heading remains role-visible")
    if page.get_by_role("link", name="Click here for more information", exact=True).count() != 0:
        fail(f"{label}: newsletter information link remains role-visible")

    for heading in RETAINED_HEADINGS:
        locator = page.get_by_role("heading", name=heading, exact=True)
        if locator.count() != 1 or not locator.is_visible():
            fail(f"{label}: retained heading is not uniquely visible: {heading}")

    visible_article_links = page.locator('a[href^="/news/"]:visible')
    if visible_article_links.count() != len(RETAINED_HEADINGS):
        fail(
            f"{label}: expected {len(RETAINED_HEADINGS)} visible article links, "
            f"found {visible_article_links.count()}"
        )

    for path in HIDDEN_PATHS:
        locator = page.locator(f'a[href="{path}"]')
        if locator.count() != 1:
            fail(f"{label}: hidden article link count for {path} is {locator.count()}")
        if locator.is_visible():
            fail(f"{label}: hidden article link is visible: {path}")

    if errors:
        fail(f"{label}: browser errors: {' | '.join(errors)}")


def new_page(browser):
    context = browser.new_context()
    page = context.new_page()
    errors = attach_errors(page)
    return context, page, errors


def main():
    if len(sys.argv) != 2:
        fail("usage: verify-news-browser.py <base-origin>")
    base_url = parse_base_url(sys.argv[1])

    scenario_count = 0
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        try:
            context, page, errors = new_page(browser)
            page.goto(urljoin(base_url + "/", "news"), wait_until="load")
            assert_clean_news(page, errors, "cold-news")
            scenario_count += 1
            context.close()

            context, page, errors = new_page(browser)
            page.goto(base_url + "/", wait_until="load")
            page.get_by_role("navigation").get_by_role(
                "link", name=re.compile(r"^legal updates$", re.IGNORECASE)
            ).click()
            page.wait_for_url(f"{base_url}/news")
            assert_clean_news(page, errors, "client-navigation")
            scenario_count += 1
            context.close()

            for path in HIDDEN_PATHS:
                context, page, errors = new_page(browser)
                page.goto(f"{base_url}/news", wait_until="load")
                wait_two_frames(page)
                anchor = page.locator(f'a[href="{path}"]')
                if anchor.count() != 1:
                    fail(f"hidden-click {path}: expected one hydrated anchor")
                with page.expect_response(
                    lambda response, expected=path: urlparse(response.url).path == expected,
                    timeout=15_000,
                ) as response_info:
                    anchor.evaluate("element => element.click()")
                response = response_info.value
                if response.status != 307:
                    fail(f"hidden-click {path}: expected 307, got {response.status}")
                page.wait_for_url(f"{base_url}/news")
                wait_two_frames(page)
                if urlparse(page.url).path != "/news":
                    fail(f"hidden-click {path}: final path is {urlparse(page.url).path}")
                if page.locator(f'a[href="{path}"]:visible').count() != 0:
                    fail(f"hidden-click {path}: unreliable article remains visible")
                if errors:
                    fail(f"hidden-click {path}: browser errors: {' | '.join(errors)}")
                scenario_count += 1
                context.close()

            context, page, errors = new_page(browser)
            page.goto(f"{base_url}/news", wait_until="load")
            wait_two_frames(page)
            page.locator(f'a[href="{HIDDEN_PATHS[0]}"]').evaluate(
                """element => {
                    const card = element.closest('div.group.relative.border.border-border.rounded-2xl');
                    const clone = card.cloneNode(true);
                    clone.id = 'lw-policy-mutation-test';
                    card.parentElement.appendChild(clone);
                }"""
            )
            wait_two_frames(page)
            if page.locator("#lw-policy-mutation-test").is_visible():
                fail("mutation: appended hidden card became visible")
            if errors:
                fail(f"mutation: browser errors: {' | '.join(errors)}")
            scenario_count += 1
            context.close()
        finally:
            browser.close()

    print(json.dumps({"baseUrl": base_url, "scenarioCount": scenario_count, "status": "verified"}))


if __name__ == "__main__":
    try:
        main()
    except (AssertionError, PlaywrightError) as error:
        print(json.dumps({"status": "failed", "error": str(error)}), file=sys.stderr)
        sys.exit(1)
