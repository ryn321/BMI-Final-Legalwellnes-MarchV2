# Small Claims Court Article Implementation Plan

> **For agentic workers:** Execute inline with the installed test-driven workflow. Steps use checkbox syntax.

**Goal:** Add one current official-source-backed Small Claims Court article and present four Legal Updates cards in a balanced responsive grid.

**Architecture:** A local Next.js article route serves the sourced content with dedicated security headers. The existing post-hydration policy clones one structurally verified upstream card, rewrites it to the local article, maintains one idempotent card through client navigation, and scopes a two-column desktop layout to the Legal Updates grid.

**Tech Stack:** Next.js 16, React 19 server components, JavaScript policy bootstrap, Node.js test runner, Python Playwright 1.60, Netlify previews.

---

### Task 1: Pin the upstream card/grid contract and policy output

**Files:**
- Modify: `scripts/verify-approved-origin.mjs`
- Modify: `tests/approved-origin-contract.test.mjs`
- Modify: `tests/legal-updates-policy.test.mjs`

- [ ] Pin the grid selector `div.grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-3.gap-8`, card wrapper selector `div.group.relative.bg-foreground\\/5.border.border-border.rounded-2xl`, and clone-source path `/news/consumer-protection-opt-out-2025`.
- [ ] Add failing fixture tests for exactly one named grid and exactly one clone-source wrapper nested directly inside that grid with: image alt `New Consumer Protection Rules: The 2025 Direct Marketing Opt-Out Registry` and source containing `/assets/news/consumer.png`; category `Consumer Law`; date `February 1, 2026`; byline `Ilse Marlow`; anchor href `/news/consumer-protection-opt-out-2025`; anchor text `New Consumer Protection Rules: The 2025 Direct Marketing Opt-Out Registry`; and exact summary `The NCC is establishing a strict new opt-out registry for direct marketing. Discover how this protects your privacy and what it means for businesses.`
- [ ] Add failures for missing/duplicate grid, missing clone source, or missing source subnodes.
- [ ] Add failing policy tests for the exact new path, title, category, date, Legal Wellness byline, summary, unique marker, full-navigation marker, batched observer, and scoped two-column media rule.
- [ ] Run focused tests and confirm failure before implementation.
- [ ] Implement the pure origin-contract checks and generated policy markers; rerun focused tests to green.

### Task 2: Implement the idempotent fourth card and balanced grid

**Files:**
- Modify: `lib/legal-updates-policy.mjs`
- Modify: `tests/legal-updates-policy.test.mjs`

- [ ] Extend the scoped CSS so only the Legal Updates grid becomes two columns at 768px and above, with a centred bounded width; retain one column below 768px.
- [ ] Add `installSmallClaimsCard()` after hydration. It must return without mutation unless all exact runtime selectors match once.
- [ ] Clone the verified source card, mark it with `data-lw-small-claims-card`, remove hidden/animation state, copy the generic Legal Updates hero image source, and replace alt/category/date/byline/title/summary/link.
- [ ] Add a primary-click handler that prevents upstream client routing and calls `location.assign()`; preserve modified-click native behaviour.
- [ ] Run one batched mutation observer in all browsers. On DOM replacement/navigation it may reinsert one card; if the marker exists it performs no mutation and cannot self-loop.
- [ ] Keep all six hidden-path rules and redirects unchanged.

### Task 3: Create the sourced local article page and headers

**Files:**
- Create: `app/news/small-claims-court-limit-2026/page.tsx`
- Modify: `next.config.ts`
- Create: `tests/small-claims-page.test.mjs`

- [ ] Write failing source/header tests before the page exists. Assert that the static article route file wins by path, contains a local-only marker `data-lw-local-article="small-claims-2026"`, exact title/byline/date/facts/disclaimer, and these exact labelled links:
  - `Official Small Claims Court guidance` -> `https://justice.gov.za/scc/scc.htm`
  - `Government Gazette 55038, Notice 7717` -> `https://justice.gov.za/legislation/notices/2026/20260720-gg55038gon7717-SCC-Amount-Increase-R30000.pdf`
  - `Justice Ministry announcement` -> `https://www.justice.gov.za/m_statements/2026/20260722-SCC-Monetary-Jurisdiction-R30000.html`
  - `Small Claims Court FAQ` -> `https://justice.gov.za/scc/scc_info.htm`
- [ ] Map claims in test fixtures: amount/effective date -> guidance, Gazette and announcement; demand process -> guidance; representation/eligibility/exclusions -> FAQ.
- [ ] Write failing tests for exact path-specific headers: `nosniff`; `strict-origin-when-cross-origin`; `DENY`; permissions policy; and CSP directives `default-src 'self'`, `script-src 'self' 'unsafe-inline'`, `style-src 'self' 'unsafe-inline'`, `img-src 'self' data:`, `font-src 'self' data:`, `connect-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`.
- [ ] Create metadata, Legal Wellness header/navigation, article body, four official-source links, general-information notice, contact block, and responsive inline design.
- [ ] State exactly: R30 000; effective 1 August 2026; attorney/advocate representation not allowed at the hearing; prior advice allowed; clerks assist; 14-day demand period; examples and eligibility/exclusions from official guidance.
- [ ] Avoid individual lawyer attribution, invented quotations, and guarantees about outcomes.
- [ ] Add the exact path-specific header values above in `next.config.ts`. Browser verification must also confirm `x-legal-wellness-origin` is absent, proving the local route won over the proxy catch-all.
- [ ] Run TypeScript and production build.

### Task 4: Expand executable browser and cache verification

**Files:**
- Modify: `scripts/verify-news-browser.py`
- Modify: `scripts/verify-proxy-cache-flow.py`
- Create: `scripts/verify-small-claims-article.py`

- [ ] Update the existing Legal Updates verifier to require four visible article links and the new heading while retaining all six hidden-link, navigation and mutation scenarios.
- [ ] Keep cleaned cache mode at four visible article links while preserving normal `200`, conditional bodyless `304`, reload and zero-error gates.
- [ ] In the targeted verifier use desktop viewport `1280x900`: four card bounding boxes must form two x-columns and two y-rows within 5px tolerance, with widths within 3px. Use mobile viewport `390x844`: all four cards share one x-column within 3px, y-values increase, and `scrollWidth <= innerWidth`.
- [ ] Require one accessible new article link inside an `h3`, exact informative image alt, correct DOM/focus order after the third retained card, keyboard Tab focus, and a computed outline or box shadow when focus-visible.
- [ ] For both primary click and Enter, wrap activation in an expected document-navigation event, require the local-only response marker and absence of `x-legal-wellness-origin`, then assert facts, disclaimer, exact four source labels/hrefs and `target="_blank" rel="noopener noreferrer"`.
- [ ] Exercise browser back then forward: `/news` must contain exactly one injected card with no stale source title/href, and forward must return to the local page. Simulate repeated grid DOM replacement and require one card, no observer loop and zero console/hydration errors.
- [ ] At release time GET all four official URLs and fail closed on unavailable or mismatched content. Require:
  - guidance: `R 30 000`, `01 Aug 2026`, `14 days`, and `Clerk`;
  - Gazette PDF: non-empty PDF whose extracted text includes `55038`, `7717`, and `20 July 2026`; the PDF does not expose the notice body as machine-readable text, so amount/effective-date verification is cross-checked against the official notice list and current SCC guidance;
  - official Gazette notice list `https://justice.gov.za/legislation/notices/notice_list.html`: `R30 000`, `GG 55038`, `GoN 7717`, and `20 July 2026`;
  - Ministry announcement: `R30 000`, `R20 000`, and `1 August 2026`;
  - FAQ: `Representation by an attorney or advocate is not allowed`, `Clerks of the Small Claims Courts will assist you free of charge`, `Anyone except juristic persons`, `claims against the State`, and `Municipalities/Local Government`.
- [ ] Run all local tests, coverage, typecheck, approved-origin gate, build, nine/expanded Legal Updates scenarios, targeted article verifier and cache-flow baseline checks.
- [ ] Obtain independent combined code/legal review and fix any findings.

### Task 5: Freeze and execute the protected release

- [ ] Record exact base/main commit/tree, current Netlify production deploy, candidate commit/tree/diff and changed-file/blob manifest.
- [ ] Freeze one plan with exact preview and production success gates, exclusions and complete-release-revert rollback to baseline commit `389e24f0704ab2ba9af46be2240ec40d02f56961`, tree `b7eff66d04f2fe33f03c326e6b4ab0b0511fcaf3`, deploy `6aac01c7309d4d0008b8bd76`.
- [ ] Immediately before branch creation and again before merge, require GitHub main to equal baseline commit/tree and the runtime source commit to have that sole parent. Any intervening main commit stops execution and requires a newly frozen plan.
- [ ] Obtain fresh plan-bound authorization before GitHub/Netlify mutation.
- [ ] Create exact blobs/tree/runtime commit through the installed GitHub connector, one branch and one PR.
- [ ] Require preview to pass cleaned cache flow, expanded news verifier, targeted article/layout/accessibility verifier, redirects, retained articles, core/contact/privacy and invalid-ID checks.
- [ ] Merge once only after all preview gates pass; repeat every gate on production.
- [ ] On a named regression, revert the complete release merge and verify exact baseline tree, healthy three-card page, cache flow, article path returning baseline HTTP `404`, client navigation, and core endpoints.
