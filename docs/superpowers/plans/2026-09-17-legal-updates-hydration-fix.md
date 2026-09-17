# Legal Updates Hydration Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the broken newsletter prompt and six unreliable article cards from the fully hydrated Legal Updates page while redirecting their direct URLs and preserving the approved origin, contact form, privacy page, and three retained guides.

**Architecture:** A focused policy module owns the exact article paths, scoped pre-paint CSS, post-load compatibility bootstrap, HTML injection, and redirect predicate. The catch-all gateway applies redirects before upstream fetches and injects the policy only into valid HTML. The approved-origin verifier fails closed when page markers, injection anchors, card counts, or CSP compatibility drift.

**Tech Stack:** Next.js 16 route handlers, JavaScript ES modules, Node.js 22 test runner and coverage, Netlify deploy previews, Chrome hydration/accessibility validation.

---

## File map

- Create `lib/legal-updates-policy.mjs`: policy constants, exact selectors, safe markup generation, idempotent HTML injection, and hidden-path predicate.
- Modify `app/[[...path]]/route.ts`: return six exact `307` redirects before upstream fetch and inject the policy into proxied HTML.
- Modify `scripts/verify-approved-origin.mjs`: export pure contract checks and enforce newsletter/card/guidance/anchor/CSP gates against the live approved origin.
- Create `tests/legal-updates-policy.test.mjs`: unit tests for paths, selectors, idempotence, fail-closed anchors, and generated policy scope.
- Create `tests/legal-updates-route.test.mjs`: route-level tests for redirects, retained routes, HTML injection, and untouched non-HTML/HEAD responses.
- Create `tests/approved-origin-contract.test.mjs`: fixture tests for exact marker counts, duplicate/missing anchors, and incompatible CSP.
- Create `scripts/verify-news-browser.py`: executable Chromium validation for cold load, client navigation, hidden-link redirects, accessibility-visible content, console errors, and post-hydration DOM changes.
- Modify `package.json`: run every test file and add an 80% line/function/branch coverage gate for the new policy module.
- Modify `README.md`: record the presentation-only Legal Updates policy and direct-path redirects.

### Task 1: Write policy tests and implement the focused policy module

**Files:**
- Create: `tests/legal-updates-policy.test.mjs`
- Create: `lib/legal-updates-policy.mjs`

- [ ] **Step 1: Write failing tests for the exact policy contract**

The tests must import the module and assert:

```js
assert.deepEqual(HIDDEN_ARTICLE_PATHS, [
  "/news/consumer-protection-opt-out-2025",
  "/news/wills-estates-amendment-bill",
  "/news/raf-amendment-2025",
  "/news/rental-housing-act-2025",
  "/news/family-law-mediation-rules",
  "/news/labor-law-dismissal-code",
]);
assert.deepEqual(RETAINED_ARTICLE_PATHS, [
  "/news/labour-procedures",
  "/news/divorce-procedures",
  "/news/wills-estate-matters",
]);
assert.equal(isHiddenArticlePath("/news/raf-amendment-2025"), true);
assert.equal(isHiddenArticlePath("/news/labour-procedures"), false);
```

Also test one `<style id="lw-legal-updates-policy">`, one `<script id="lw-legal-updates-bootstrap">`, every exact hidden path, the hero/newsletter/card/guidance selectors, post-`load` plus two-frame scheduling, legacy fallback gating, and absence of unrelated page/form strings.

Extract and execute the generated bootstrap with `node:vm` in a deterministic fake browser surface. In the modern `CSS.supports("selector(:has(*))")` case, prove it waits for `load` and two animation frames, keeps/inserts one style, and performs no content/attribute mutation. In the unsupported case, provide exact newsletter/card/guidance fixtures plus a fake `MutationObserver`; prove the fallback hides only approved targets, adjusts only the approved guidance block, batches callbacks, and hides a newly appended matching card after the observer callback.

- [ ] **Step 2: Write failing tests for safe HTML injection**

Cover one successful injection, idempotent reinjection, missing `</head>`, duplicate `</head>`, missing `</body>`, duplicate `</body>`, and case-insensitive valid anchors. Invalid anchors must return `{ html: original, modified: false, reason }` without partial injection.

- [ ] **Step 3: Run the focused tests and verify failure**

Run: `node --test tests/legal-updates-policy.test.mjs`

Expected: FAIL because `lib/legal-updates-policy.mjs` does not exist.

- [ ] **Step 4: Implement the minimal policy module**

Export frozen hidden and retained path arrays, `isHiddenArticlePath(pathname)`, `LEGAL_UPDATES_STYLE`, `LEGAL_UPDATES_BOOTSTRAP`, and `injectLegalUpdatesPolicy(html)`.

The CSS must be scoped by:

```css
body:has(img[alt="Legal Updates"])
```

Use the pinned newsletter selector, the pinned `div.group.relative.bg-foreground\/5.border.border-border.rounded-2xl` card boundary, and exact `href` selectors. Restore guidance padding through the exact newsletter-section adjacent sibling. The bootstrap must make no DOM/content/attribute change before `load`, wait two `requestAnimationFrame` callbacks, verify the style remains present, and run a batched `MutationObserver` fallback only when `CSS.supports("selector(:has(*))")` is false.

- [ ] **Step 5: Run the focused tests and verify success**

Run: `node --test tests/legal-updates-policy.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit the unit**

```bash
git add lib/legal-updates-policy.mjs tests/legal-updates-policy.test.mjs
git commit -m "Add hydration-safe Legal Updates policy"
```

### Task 2: Integrate redirects and HTML injection into the gateway

**Files:**
- Modify: `app/[[...path]]/route.ts:1-94`
- Create: `tests/legal-updates-route.test.mjs`

- [ ] **Step 1: Write failing route tests**

Import `GET` and `HEAD` and use a temporary `globalThis.fetch` stub. For every hidden path, assert normal and percent-encoded GET/HEAD variants return status `307`, `Location: /news`, and zero upstream fetches. Assert malformed percent encoding fails safely without a policy bypass. For every retained path, assert the upstream fetch occurs and the route does not redirect.

Test an HTML response with valid head/body anchors and assert one injected style/bootstrap plus removal of stale `etag` and `last-modified`. Test JSON, JavaScript, and `HEAD` responses remain uninjected. Keep the existing contact-consent HTML and JavaScript transformations covered.

- [ ] **Step 2: Run route tests and verify failure**

Run: `node --experimental-strip-types --test tests/legal-updates-route.test.mjs`

Expected: FAIL because the route has no redirect or policy integration.

- [ ] **Step 3: Implement the gateway integration**

Import the policy module. Build the comparison path from the already-decoded route-param segments, and independently decode `incomingUrl.pathname` with a guarded helper for tests and direct runtime consistency. A decoding failure must not be treated as a hidden-path match and must never throw an unhandled exception. Before creating the upstream request, redirect both `GET` and `HEAD`:

```ts
if ((method === "GET" || method === "HEAD") && isHiddenArticlePath(decodedPathname)) {
  return Response.redirect(new URL("/news", incomingUrl.origin), 307);
}
```

After the existing consent insertion for HTML, call `injectLegalUpdatesPolicy`. Mark the response modified when either transformation changes the body. Preserve current header stripping and location rewriting.

- [ ] **Step 4: Run policy, route, and existing contact tests**

Run: `node --experimental-strip-types --test tests/legal-updates-policy.test.mjs tests/legal-updates-route.test.mjs tests/contact-validation.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit the integration**

```bash
git add 'app/[[...path]]/route.ts' tests/legal-updates-route.test.mjs
git commit -m "Apply Legal Updates policy in gateway"
```

### Task 3: Add fail-closed approved-origin and CSP verification

**Files:**
- Modify: `scripts/verify-approved-origin.mjs:1-44`
- Create: `tests/approved-origin-contract.test.mjs`

- [ ] **Step 1: Write failing contract fixture tests**

Refactor the verifier to export `verifyLegalUpdatesOriginContract({ html, csp })`. Use a minimal valid fixture with one hero marker, one exact newsletter block, its exact adjacent guidance block, all nine exact links each inside exactly one pinned article-card wrapper, one `</head>`, and one `</body>`.

Assert failure for every missing or duplicate required structure, a card link outside its pinned wrapper, a duplicate link in a footer/navigation element, each missing/duplicate anchor, a CSP lacking permission for the inline style, and a CSP lacking permission for the inline script. Cover `script-src-elem` and `style-src-elem` precedence over `script-src`/`style-src`, those directives' precedence over `default-src`, explicit `*-src-elem 'none'`, and nonce/hash sources that make `'unsafe-inline'` ineffective. Assert success when CSP is absent or explicitly compatible without nonce/hash restrictions.

- [ ] **Step 2: Run contract tests and verify failure**

Run: `node --test tests/approved-origin-contract.test.mjs`

Expected: FAIL because the pure contract verifier is not exported.

- [ ] **Step 3: Implement pure checks and retain the live CLI**

Use exact structural regular expressions around the pinned newsletter, adjacent guidance, and card wrapper; bare href counts are insufficient. Check both anchors before allowing injection. Parse CSP directives conservatively in browser precedence order: `script-src-elem`, `script-src`, `default-src` for the bootstrap and `style-src-elem`, `style-src`, `default-src` for the stylesheet. Require effective `'unsafe-inline'` and reject effective nonce/hash source lists because modern CSP ignores `'unsafe-inline'` when they are present. Fail closed for unrecognised restrictive combinations. Keep the current home-page contact and bundle-marker checks, then fetch `/news` and pass its HTML plus CSP header through the new contract.

Only execute live fetches when the module is the CLI entry point so fixture tests remain offline.

- [ ] **Step 4: Run fixture and live-origin checks**

Run: `node --test tests/approved-origin-contract.test.mjs`

Expected: PASS.

Run: `node scripts/verify-approved-origin.mjs`

Expected: JSON with all contact markers, nine exact article-card markers, both injection anchors, compatible CSP, and `status: "verified"`.

- [ ] **Step 5: Commit the verifier**

```bash
git add scripts/verify-approved-origin.mjs tests/approved-origin-contract.test.mjs
git commit -m "Verify Legal Updates origin contract"
```

### Task 4: Wire complete tests, coverage, and documentation

**Files:**
- Modify: `package.json:9-15`
- Modify: `README.md`

- [ ] **Step 1: Update test scripts**

Set:

```json
"test": "node --experimental-strip-types --test tests/*.test.mjs",
"test:coverage": "node --experimental-strip-types --test --experimental-test-coverage --test-coverage-include=lib/legal-updates-policy.mjs --test-coverage-lines=80 --test-coverage-functions=80 --test-coverage-branches=80 tests/*.test.mjs"
```

- [ ] **Step 2: Document the bounded policy**

Add that `/news` uses a presentation-only, hydration-safe gateway policy for the reviewed article set; the six source articles remain unchanged; their exact direct paths return `307` to `/news`; the approved origin remains authoritative.

- [ ] **Step 3: Run all local gates**

Run: `npm test`

Expected: all tests PASS.

Run: `npm run test:coverage`

Expected: line, function, and branch coverage at least 80% for the policy module.

Run: `npm run typecheck`

Expected: PASS.

Run: `npm run build`

Expected: origin verification, tests, typecheck, and Next production build all PASS.

- [ ] **Step 4: Inspect the complete diff**

Run: `git diff --check origin/main...HEAD && git diff --stat origin/main...HEAD`

Expected: only the nine planned implementation files plus the approved specification and plan; no generated files, credentials, DNS, mail, form-recipient, or environment changes.

- [ ] **Step 5: Commit the final wiring**

```bash
git add package.json README.md docs/superpowers/specs/2026-09-17-legal-updates-hydration-fix-design.md docs/superpowers/plans/2026-09-17-legal-updates-hydration-fix.md
git commit -m "Document Legal Updates release gates"
```

### Task 5: Add executable hydrated-browser verification

**Files:**
- Create: `scripts/verify-news-browser.py`

- [ ] **Step 1: Write the failing browser verifier against the current live baseline**

Use the already-installed Python Playwright 1.60 runtime. The script accepts exactly one base URL argument. Require HTTPS for every non-loopback host; permit HTTP only for `127.0.0.1` or `localhost` local-build validation. Launch an isolated headless Chromium context for every scenario. Record `console.error`, uncaught page errors, response status/redirect chains, the final URL, visible headings/links, and role-visible article headings.

The scenarios are:

1. Cold-load `/news`, wait for `load` plus two animation frames, and assert no newsletter prompt/link and exactly the three retained article headings are visible and exposed through role queries.
2. Cold-load `/`, click the visible `LEGAL UPDATES` navigation link, and repeat the same checks without a full-page URL assignment.
3. For each hidden article path, cold-load `/news`, wait for hydration, find the hidden DOM anchor by exact href, call `element.click()` inside the page, wait for navigation, and assert final pathname `/news`, no unreliable article body/title is role-visible, and no router/console/page error occurred.
4. Clone and append one hidden card after hydration and assert the persistent stylesheet immediately keeps the clone invisible and absent from role-visible output.

Exit nonzero with a concise assertion name on any failure. Print one JSON success record containing the base URL and scenario counts on success.

- [ ] **Step 2: Run against the current live baseline and verify expected failure**

Run: `python3 scripts/verify-news-browser.py https://legalwellness.co.za`

Expected: FAIL because the current approved rollback intentionally still shows the prompt and nine cards. This proves the verifier detects the original defect.

- [ ] **Step 3: Run against the local production build**

In terminal one run: `PORT=4173 npm run start`

In terminal two run: `python3 scripts/verify-news-browser.py http://127.0.0.1:4173`

Expected: PASS with zero console/page errors and all nine browser scenarios complete.

- [ ] **Step 4: Commit the verifier**

```bash
git add scripts/verify-news-browser.py
git commit -m "Add hydrated Legal Updates browser verification"
```

### Task 6: Prepare the immutable release candidate and deploy-preview evidence

**Files:**
- No additional source changes expected.
- Record evidence under the existing protected-change audit workflow.

- [ ] **Step 1: Rebase the isolated branch onto current `origin/main`**

Fetch and confirm main still has the reviewed rollback tree. Rebase only if the base moved. Rerun all gates after any rebase.

- [ ] **Step 2: Freeze the candidate**

Record the source commit, tree hash, diff SHA-256, test/build results, current GitHub main commit/tree, current Netlify production deploy, and exact rollback deploy `6aabb5633fcca40008d79f4e`.

- [ ] **Step 3: Create a pull request and wait for the deploy preview**

This crosses the publication boundary and follows the current Security & Execution Mandates protected-change workflow. No merge or production deployment occurs at this step.

- [ ] **Step 4: Validate the deploy preview in Chrome**

Run the executable verifier:

`python3 scripts/verify-news-browser.py <exact-deploy-preview-origin>`

It must pass cold `/news`, `/` then client navigation to `/news`, every hidden hydrated-link click, and the post-hydration DOM-change scenario. Retain its JSON result with the preview evidence. Also verify:

- no newsletter prompt or information link;
- exactly the three retained guides;
- every hidden-link click ends at `/news` with no unreliable article body and no router/console error;
- six direct URLs return `307` and three retained URLs return `200`;
- `/`, `/contact`, and `/privacy` return `200`;
- `GET /api/contact` returns `405` and a synthetic invalid-ID POST returns `400` without sending email.

- [ ] **Step 5: Freeze the production merge plan**

If and only if every preview gate passes, prepare the exact protected merge/deploy plan with the candidate identifiers, before-state, exclusions, named rollback triggers, and immutable rollback action. Obtain fresh authorization for that unchanged plan before merging.
