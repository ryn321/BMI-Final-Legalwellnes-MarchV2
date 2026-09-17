# Legal Updates hydration-safe cleanup design

**Status:** Approved design, pending implementation plan
**Date:** 2026-09-17
**Production target:** `https://legalwellness.co.za/news`
**Approved upstream content authority:** `https://legal-wellness-master-final.netlify.app`

## Objective

Remove the broken “Click on Newsletter” prompt from the rendered Legal Updates page, restore the spacing above the guidance panel, show only the three reviewed general service guides, and redirect the six unreliable article URLs to `/news`.

The three retained guides are:

- `/news/labour-procedures`
- `/news/divorce-procedures`
- `/news/wills-estate-matters`

The six hidden and redirected articles are:

- `/news/consumer-protection-opt-out-2025`
- `/news/wills-estates-amendment-bill`
- `/news/raf-amendment-2025`
- `/news/rental-housing-act-2025`
- `/news/family-law-mediation-rules`
- `/news/labor-law-dismissal-code`

The article source is retained unchanged. No form, email, DNS, domain, access, billing, or hosting setting changes are part of this design.

## Observed failure

The first release transformed the server-rendered HTML successfully. The browser then hydrated the page from the approved origin's static client bundle and recreated the newsletter prompt. The server response therefore passed while the final browser page failed the acceptance criteria. That release was rolled back.

The revised implementation must enforce the policy after hydration and on client-side navigation. Server HTML checks alone are insufficient.

## Considered approaches

### 1. Edit the approved origin source

This is the cleanest long-term solution because the source component would render the final content directly. The current gateway repository does not contain that source, and the approved origin remains the content authority. This option is unavailable until the source handover is completed.

### 2. Rewrite origin JavaScript bundles

The gateway can attempt exact string replacements in the origin's generated chunks. Generated chunk names and minified source can change without notice, and Next.js may serve reserved static assets outside the catch-all proxy route. The failed release demonstrated that bundle-level enforcement cannot currently be proven end to end.

### 3. Inject a hydration-safe page policy in the gateway

This is the selected approach. The gateway injects one scoped, non-mutating stylesheet before `</head>` so the unwanted content is hidden before first paint, plus one inert bootstrap script before `</body>`. CSS changes presentation only and leaves React's server-rendered elements and attributes unchanged. The bootstrap waits until the browser `load` event and two animation frames before checking that the stylesheet remains installed and enabling a legacy fallback when required. The stylesheet uses a Legal Updates hero marker, the exact newsletter structure, and the six exact article paths. It also applies to later client-side navigation. Direct requests to the six article paths are redirected by the gateway before reaching the origin.

This approach keeps the approved origin unchanged, is limited to the requested content, and can be verified against the fully loaded browser DOM.

## Architecture

### Policy module

Create a focused module that owns:

- the six hidden article paths;
- the three retained article paths used by tests;
- the `/news` redirect decision;
- generation of the idempotent pre-paint stylesheet and post-load browser policy markup;
- the HTML injection function.

Keeping these values in one module prevents the redirect list, browser policy, and tests from drifting.

### Gateway routing

Before proxying, the catch-all route checks the decoded request path. Each hidden article path returns a temporary `307` redirect to `/news`, preserving the official domain. No other path is redirected.

For proxied HTML responses, the gateway injects the scoped stylesheet once before `</head>` and the bootstrap once before `</body>`. Injection is allowed on every HTML page so that a visitor who loads another page first and reaches `/news` through Next.js client navigation already has the policy installed. The stylesheet is available before first paint. The bootstrap waits for `load` and two animation frames before verifying that the stylesheet remains installed. On a later client transition, the installed stylesheet applies as soon as the matching `/news` structure appears.

Non-HTML responses and `HEAD` responses remain byte-for-byte untouched. Modified HTML responses have stale validators removed, following the gateway's existing transformation behaviour.

### Browser policy

The installed stylesheet is scoped by the unique Legal Updates hero image marker `body:has(img[alt="Legal Updates"])`. It hides:

- the single newsletter section matching the pinned current structure `section.container.mx-auto.px-6.pt-12.text-center` with a direct `h3` followed by the direct `mailto:client@legalwellness.co.za` link; and
- the pinned article-card container `div.group.relative.bg-foreground\/5.border.border-border.rounded-2xl` when it contains a link to one of the six exact hidden paths.

The guidance selector is the exact adjacent section following the matched newsletter section. Its top padding is restored from the current `pt-4` value to the visual equivalent of `pt-12`. Exact page, structure, and path selectors prevent unrelated cards or links from being hidden. The origin verification gate must prove one newsletter match, one guidance match, one match for each hidden card, and one match for each retained card before a release is built. Any missing or duplicate match fails closed.

The bootstrap makes no content or attribute changes before hydration. After `load` and two animation frames it verifies the stylesheet node and reinstalls that same style only if a client transition removed it. If the browser does not support `:has()`, a compatibility fallback then:

1. exits unless the current path is `/news`;
2. finds the newsletter section using the exact heading text, exact link text, and exact mail link;
3. hides that section from both visual and accessibility output;
4. finds each exact hidden article link and hides only its nearest article-card container;
5. adjusts the guidance section spacing using its exact introductory sentence;
6. observes DOM changes only in this legacy fallback so client navigation cannot restore the content;
7. batches repeated mutation callbacks to avoid unnecessary work.

The fallback runs after hydration, does not delete or rewrite article content, and changes presentation only. Modern browsers use only the persistent stylesheet and require no DOM mutation. If expected markers are absent, the policy safely does nothing to unmatched content.

### Origin and CSP contract

`verify:origin` must fail the build unless the current `/news` response contains:

- the unique Legal Updates hero marker;
- exactly one pinned newsletter structure with the exact heading text, link text, and mail target;
- exactly one pinned guidance structure;
- exactly one pinned card for every hidden and retained article path;
- a single usable `</head>` injection anchor;
- a single usable `</body>` injection anchor.

The check must also inspect the effective `Content-Security-Policy` response header. A policy that blocks the injected inline bootstrap or the installed inline style fails the build. The release cannot weaken or replace the origin CSP to make the injection work.

## Testing and release gates

Implementation follows test-first development.

Automated tests must prove:

- the pre-paint stylesheet and post-load bootstrap are each injected once and remain idempotent;
- injection fails closed without changing the response when either the single `</head>` or single `</body>` anchor is missing or duplicated;
- non-HTML and unrelated HTML content are preserved;
- all six exact paths redirect to `/news` with `307`;
- the three retained paths are not redirected;
- the generated browser policy contains only the approved newsletter markers and article paths;
- repeated DOM mutations do not restore a hidden target;
- origin marker counts and CSP compatibility fail closed when the contract is not met;
- existing contact validation tests still pass;
- TypeScript checking and the production build pass.

The deploy preview must then be checked in a real browser after hydration for a cold `/news` load, a client navigation from `/` to `/news`, and navigation to each hidden article path. For every hidden path, the test dispatches a click on the hydrated hidden card link in a fresh browser session so the Next client router, gateway redirect, and final render are exercised together. Acceptance requires:

- no visible or accessibility-tree occurrence of “Click on Newsletter” or “Click here for more information”;
- exactly the three retained article cards;
- no `console.error` message reporting a React hydration or reconciliation failure;
- the same visual and accessibility result after cold load and client navigation;
- the six hidden article URLs return `307` to `/news`;
- every hydrated hidden-card click finishes at `/news`, renders no content from the unreliable article, and produces no router or console error;
- the three retained article URLs return `200`;
- `/`, `/contact`, and `/privacy` return `200`;
- `GET /api/contact` remains `405` and a synthetic invalid-ID request remains `400` without sending email.

Production deployment may proceed only from the exact reviewed commit and tree after the preview passes. The same cold-load, client-navigation, accessibility, console, redirect, and endpoint checks are repeated against the public domain.

## Rollback

A named rollback is triggered if the newsletter prompt or any hidden article appears after hydration, a retained guide disappears, redirects differ from the approved list, hydration errors occur, or contact/privacy controls regress.

The immutable rollback baseline is Netlify deploy `6aabb5633fcca40008d79f4e`, GitHub main commit `ba4e363fdcf4397cf7e95b1d5fb54e42f9418eae`, and tree `ee04aafbb07808f146cf43e0a4f04a8c8282cb05`. The release plan must revalidate those identifiers immediately before merge.

Rollback republishes that exact Netlify deploy, reverts only the reviewed merge in a new pull request, and leaves source branches intact. Verification then confirms the repository tree equals `ee04aafbb07808f146cf43e0a4f04a8c8282cb05`, `/news` shows the prior prompt and nine cards after hydration, `/`, `/contact`, and `/privacy` return `200`, and `GET /api/contact` returns `405`.
