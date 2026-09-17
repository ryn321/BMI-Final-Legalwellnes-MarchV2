# Proxy Bodyless-Status Fix Implementation Plan

> **For agentic workers:** Execute inline with the installed test-driven workflow. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent Netlify’s Next.js server handler from converting valid upstream `204`, `205`, and `304` responses into HTTP 500 errors.

**Architecture:** The catch-all proxy will decide whether a response may legally contain a body before reading, transforming, or forwarding it. Bodyless statuses and `HEAD` use `null`; all other responses keep the existing streaming and content-transformation behaviour.

**Tech Stack:** Next.js 16 route handlers, Fetch API, Node.js 22 test runner, Netlify deploy previews, Python Playwright.

---

### Task 1: Reproduce the Netlify response-shape failure

**Files:**
- Create: `tests/proxy-bodyless-status.test.mjs`
- Modify: `package.json`

- [ ] Write a response-shaped upstream fixture with `status`, `statusText`, `headers`, a non-null `ReadableStream` body, and a `.text()` method that records or throws when called.
- [ ] Stub `globalThis.fetch`, import `GET` and `HEAD` from `app/[[...path]]/route.ts`, and call the route with synthetic contexts.
- [ ] Use a non-JavaScript path and a response-shaped `304` with a non-null stream to reproduce the current `Response constructor: Invalid response status code 304` failure before the fix.
- [ ] Separately use a JavaScript path/content type with a response-shaped `304`; its `.text()` increments a counter. Final behaviour must return `304`, `body === null`, preserve `ETag` and `Last-Modified`, and leave the counter at zero.
- [ ] Repeat transform-suppression fixtures for `204` with `text/html` and `205` with JavaScript content, asserting status preservation, null bodies, unchanged validators, and zero `.text()` calls.
- [ ] Assert `HEAD` stays bodyless for upstream `200`.
- [ ] Retain a body-bearing JavaScript `200` test proving the current client consent transformation still runs.
- [ ] Change `npm test` to run `tests/*.test.mjs`, then run the new test file and record the expected pre-fix failure.

### Task 2: Implement the minimal body-eligibility guard

**Files:**
- Modify: `app/[[...path]]/route.ts`

- [ ] Add a focused helper or boolean equivalent to:

```ts
const responseMayHaveBody = method !== "HEAD" && ![204, 205, 304].includes(upstreamResponse.status);
```

- [ ] Initialize `responseBody` to `null` when the response may not contain a body; otherwise keep `upstreamResponse.body`.
- [ ] Gate both HTML and JavaScript `.text()` transformations on `responseMayHaveBody`.
- [ ] Preserve the upstream status, status text, headers, ETag/Last-Modified validators, redirect rewriting, and `x-legal-wellness-origin` header.
- [ ] Run the focused test, complete `npm test`, `npm run typecheck`, live approved-origin verification, and `npm run build`.
- [ ] Commit the implementation and tests as one reviewable fix.

### Task 3: Verify the real conditional request and browser flow locally

**Files:**
- Create: `scripts/verify-proxy-cache-flow.py`

- [ ] Use the installed Python Playwright 1.60 runtime and standard-library HTTP clients. Accept `--expect defect|healthy` plus one HTTPS base origin.
- [ ] Fetch `/news`, dynamically extract its current `/_next/static/chunks/*.js` paths, issue an explicit full `GET` to every discovered chunk, require `200` plus JavaScript content type, and record each ETag.
- [ ] Issue an explicit conditional `GET` with `If-None-Match` for every chunk that supplied an ETag. Require at least one `304`, no `500`, empty `304` bodies, and preserved validators. This integration gate runs against Netlify preview and production, where the server handler owns the asset fallback; local reserved-asset routing is not used as proof.
- [ ] Run a fresh headless Chromium load of `/news`; require the restored newsletter prompt and nine article links, with zero console, page, JavaScript-MIME, or hydration errors. Capture `console.error` and uncaught page errors and exit nonzero on any result.
- [ ] In `--expect defect` mode, require the restored newsletter marker and nine exact article paths in server HTML, then succeed only when at least one conditional chunk GET returns `500` while the same approved-origin chunk is valid and the browser reports the matching 500/MIME/chunk-load signature. The application-error screen is expected because the defect prevents rendering; fail if the baseline unexpectedly appears healthy or a different failure occurs.
- [ ] In `--expect healthy` mode, require all normal chunk GETs to return `200`, at least one conditional GET to return bodyless `304`, no conditional request to return `500`, the newsletter prompt and nine article links to render on the first load, and the browser to report zero console/page/MIME/hydration errors after reload.
- [ ] Run `python3 scripts/verify-proxy-cache-flow.py --expect defect https://legalwellness.co.za` before the fix and require a successful known-defect detection.
- [ ] Inspect the final diff and obtain independent code review.

### Task 4: Prepare and execute the protected release

**Files:**
- Record the exact plan and audit evidence outside the repository.

- [ ] Freeze the candidate commit, tree, diff digest, exact changed-file/blob manifest, GitHub base, current Netlify production deploy, success gates, and single revert rollback path.
- [ ] Obtain fresh plan-bound authorization before creating GitHub objects, a branch, PR, preview, merge, or production deploy.
- [ ] Create the exact reviewed tree through the installed GitHub connector, open one PR, and wait for one Netlify deploy preview.
- [ ] Run `python3 scripts/verify-proxy-cache-flow.py --expect healthy <exact-preview-origin>`. Require dynamically discovered normal chunk GETs to return `200`, conditional GETs to return bodyless `304` rather than `500`, and the browser flow to report zero console/page/MIME/hydration errors. Recheck `/`, `/contact`, `/privacy`, `GET /api/contact`, and synthetic invalid-ID rejection.
- [ ] Merge once only if every preview gate passes; verify the merge tree, one production deploy, the custom-domain conditional request, full browser load, and core endpoints.
- [ ] On a named production regression, use the single rollback path: create and merge a PR reverting the complete release merge, including implementation, tests, and documentation; wait for its Netlify deployment and recheck the exact baseline tree and endpoints.
