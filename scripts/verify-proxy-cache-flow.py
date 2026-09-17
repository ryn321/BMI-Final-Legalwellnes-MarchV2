#!/usr/bin/env python3
import argparse
import json
import re
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen

from playwright.sync_api import Error as PlaywrightError
from playwright.sync_api import sync_playwright


CHUNK_PATTERN = re.compile(r"/_next/static/chunks/[A-Za-z0-9._-]+\.js")
APPROVED_ORIGIN = "https://legal-wellness-master-final.netlify.app"


def fail(message):
    raise AssertionError(message)


def validate_origin(value):
    parsed = urlparse(value)
    if parsed.scheme != "https" or not parsed.hostname:
        fail("base origin must use HTTPS")
    if parsed.username or parsed.password or parsed.query or parsed.fragment:
        fail("base origin must not contain credentials, query, or fragment")
    if parsed.path not in {"", "/"}:
        fail("base origin must not contain a path")
    return value.rstrip("/")


def http_get(url, headers=None):
    request = Request(url, method="GET", headers=headers or {})
    for attempt in range(2):
        try:
            with urlopen(request, timeout=20) as response:
                return response.status, dict(response.headers.items()), response.read()
        except HTTPError as error:
            return error.code, dict(error.headers.items()), error.read()
        except URLError as error:
            if attempt == 1:
                fail(f"network GET failed for {url}: {error.reason}")


def header_value(headers, name):
    wanted = name.lower()
    return next((value for key, value in headers.items() if key.lower() == wanted), None)


def verify_http(base_origin):
    status, _, html_bytes = http_get(f"{base_origin}/news")
    if status != 200:
        fail(f"news HTML returned {status}")
    html = html_bytes.decode("utf-8")
    if "Click on Newsletter" not in html:
        fail("restored newsletter marker is absent from news HTML")
    article_paths = set(re.findall(r'href=["\'](/news/[^"\']+)["\']', html))
    if len(article_paths) != 9:
        fail(f"restored news HTML exposes {len(article_paths)} article paths instead of nine")
    chunk_paths = sorted(set(CHUNK_PATTERN.findall(html)))
    if not chunk_paths:
        fail("news HTML exposed no JavaScript chunks")

    records = []
    known_conditional_defect = False
    conditional_304_count = 0
    for path in chunk_paths:
        url = urljoin(base_origin + "/", path.lstrip("/"))
        normal_status, normal_headers, normal_body = http_get(url)
        normal_type = header_value(normal_headers, "Content-Type") or ""
        etag = header_value(normal_headers, "ETag")
        if normal_status == 200 and "javascript" not in normal_type.lower():
            fail(f"normal GET for {path} returned non-JavaScript content type {normal_type!r}")

        reference_status = None
        reference_type = ""
        if not etag:
            reference_status, reference_headers, _ = http_get(
                urljoin(APPROVED_ORIGIN + "/", path.lstrip("/"))
            )
            reference_type = header_value(reference_headers, "Content-Type") or ""
            if reference_status == 200 and "javascript" in reference_type.lower():
                etag = header_value(reference_headers, "ETag")

        conditional_status = None
        conditional_headers = {}
        conditional_body = b""
        if etag:
            conditional_status, conditional_headers, conditional_body = http_get(
                url, {"If-None-Match": etag}
            )
            if conditional_status == 500:
                if reference_status is None:
                    reference_status, reference_headers, _ = http_get(
                        urljoin(APPROVED_ORIGIN + "/", path.lstrip("/"))
                    )
                    reference_type = header_value(reference_headers, "Content-Type") or ""
                if reference_status == 200 and "javascript" in reference_type.lower():
                    known_conditional_defect = True
            if conditional_status == 304:
                conditional_304_count += 1
                if conditional_body:
                    fail(f"conditional 304 for {path} contained a body")
                returned_etag = header_value(conditional_headers, "ETag")
                if returned_etag and returned_etag != etag:
                    fail(f"conditional 304 for {path} changed ETag")

        records.append({
            "path": path,
            "normalStatus": normal_status,
            "etag": etag,
            "conditionalStatus": conditional_status,
            "normalBytes": len(normal_body),
            "referenceStatus": reference_status,
        })

    return records, known_conditional_defect, conditional_304_count


def verify_browser(base_origin, require_visible_content):
    errors = []
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        try:
            context = browser.new_context()
            page = context.new_page()
            page.on(
                "console",
                lambda message: errors.append(f"console:{message.text}")
                if message.type == "error"
                else None,
            )
            page.on("pageerror", lambda error: errors.append(f"page:{error}"))
            page.goto(f"{base_origin}/news", wait_until="load")
            page.wait_for_timeout(500)
            if require_visible_content:
                if not page.get_by_role(
                    "heading", name="Click on Newsletter", exact=True
                ).is_visible():
                    fail("restored newsletter heading is not visible on first load")
                if page.locator('a[href^="/news/"]:visible').count() != 9:
                    fail("restored Legal Updates page does not show nine article links on first load")

            page.reload(wait_until="load")
            page.wait_for_timeout(500)
        finally:
            browser.close()
    return errors


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--expect", choices=["defect", "healthy"], required=True)
    parser.add_argument("base_origin")
    args = parser.parse_args()
    base_origin = validate_origin(args.base_origin)

    records, conditional_defect, conditional_304_count = verify_http(base_origin)
    browser_errors = verify_browser(base_origin, args.expect == "healthy")
    known_browser_defect = any(
        "500" in error
        or "MIME type" in error
        or "Invalid response status code 304" in error
        or "Failed to load chunk" in error
        for error in browser_errors
    )
    defect_observed = conditional_defect and known_browser_defect

    if args.expect == "defect":
        if not defect_observed:
            fail("known conditional 304-to-500 defect and matching browser MIME failure were not both observed")
        unknown_browser_errors = [
            error
            for error in browser_errors
            if "500" not in error
            and "MIME type" not in error
            and "Failed to load chunk" not in error
            and "Invalid response status code 304" not in error
        ]
        if unknown_browser_errors:
            fail(f"unexpected browser errors: {' | '.join(unknown_browser_errors)}")
    else:
        bad_normal = [record for record in records if record["normalStatus"] != 200]
        bad_conditional = [
            record
            for record in records
            if record["etag"] and record["conditionalStatus"] != 304
        ]
        if bad_normal:
            fail(f"normal chunk GET failures: {bad_normal}")
        if conditional_304_count == 0:
            fail("no conditional chunk GET returned 304")
        if bad_conditional:
            fail(f"conditional chunk GET failures: {bad_conditional}")
        if browser_errors:
            fail(f"browser errors: {' | '.join(browser_errors)}")

    print(json.dumps({
        "baseOrigin": base_origin,
        "expected": args.expect,
        "chunkCount": len(records),
        "conditional304Count": conditional_304_count,
        "browserErrorCount": len(browser_errors),
        "defectObserved": defect_observed,
        "status": "verified",
    }))


if __name__ == "__main__":
    try:
        main()
    except (AssertionError, PlaywrightError) as error:
        print(json.dumps({"status": "failed", "error": str(error)}), file=sys.stderr)
        sys.exit(1)
