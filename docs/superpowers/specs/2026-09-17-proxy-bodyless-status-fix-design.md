# Proxy bodyless-status fix design

**Status:** Approved
**Date:** 2026-09-17
**Production target:** `https://legalwellness.co.za`

## Problem

The live gateway forwards browser cache validators to the approved origin. When the origin returns `304 Not Modified`, the gateway passes the upstream body stream into a new `Response` with status `304`. The Fetch API forbids response bodies for `204`, `205`, and `304`. Netlify therefore throws `TypeError: Response constructor: Invalid response status code 304` and returns HTTP 500 with no JavaScript MIME type. Browsers then refuse required Next.js chunks and cannot complete hydration.

Netlify production logs confirm this exact exception. The same chunk succeeds through the approved origin and Netlify deploy/branch URLs, while the custom-domain server-handler path returns 500 for conditional requests. The defect exists in the restored baseline and is independent of the Legal Updates presentation policy.

## Design

Add one body-eligibility decision in the catch-all proxy route:

- `HEAD` responses always use a null body.
- Status `204`, `205`, and `304` responses always use a null body.
- HTML and JavaScript transformations run only when a response may legally contain a body.
- All other statuses retain the current streaming and transformation behaviour.
- Status, status text, cache validators, location rewriting, security headers, and the approved-origin marker remain unchanged.

This is a transport correctness fix. It does not alter page content, article visibility, contact handling, DNS, Netlify configuration, or the approved origin.

## Verification

Test first at route level:

- `GET` with a response-shaped upstream `304` carrying a non-null `ReadableStream` returns `304`, a null body, and the upstream cache validator without throwing or calling `.text()`.
- The same non-null-stream fixture proves upstream `204` and `205` responses become bodyless and retain their status.
- `HEAD` remains bodyless even for a normal upstream `200`.
- HTML/JavaScript transforms still run for body-bearing `200` responses.
- Existing contact tests, TypeScript validation, origin verification, and the production build remain green.

The route-level non-null-stream fixtures are the local proof because stock `next start` serves reserved `/_next/static` files before the catch-all route. Defect-mode integration proves the restored nine-card content in server HTML, then requires the exact conditional chunk `500` plus matching browser MIME/chunk-load failure; the broken browser is expected to show Netlify's application-error screen. Netlify deploy preview is the first healthy asset-path proof: dynamically discovered chunks must pass normal and conditional GETs, and the fully rendered browser page must show the newsletter prompt and nine article links with no console, MIME, hydration, or page errors. Production must pass the same healthy checks on the custom domain before the change is complete.

## Release and rollback

Release through one reviewed pull request and one Git-triggered Netlify production deployment after the preview passes. Record the exact commit, tree, diff, PR, preview, and production deploy identifiers.

The frozen rollback baseline is GitHub main commit `e0b7fbd3cb960d87ee6f8a3bdab7000aa77dce11`, tree `ee04aafbb07808f146cf43e0a4f04a8c8282cb05`, and Netlify production deploy `6aabf022f924b000084a2a73`.

The release pull request includes the fix, its tests, and its design/plan documentation. Rollback uses one path: create and merge a pull request reverting that complete release merge, then wait for the Git-triggered Netlify deployment to reach `ready`. Reverting the complete merge returns GitHub to the exact baseline tree. Verify the conditional custom-domain chunk request returns the baseline result and `/`, `/contact`, `/privacy`, and `GET /api/contact` retain their expected responses. The Legal Updates cleanup remains out of scope until this transport fix is stable.
