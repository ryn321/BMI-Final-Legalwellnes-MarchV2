# Small Claims Court article and balanced grid design

**Status:** Approved
**Date:** 2026-09-17
**Public target:** `https://legalwellness.co.za/news`

## Objective

Add one current, primary-source-backed Legal Wellness article so the Legal Updates page has four useful entries in a balanced two-by-two layout. Keep the six reviewed unreliable articles hidden and redirected.

## Article

- **Path:** `/news/small-claims-court-limit-2026`
- **Title:** `Small Claims Court Limit Increased to R30 000`
- **Category:** `Civil Claims`
- **Publication/review date:** `17 September 2026`
- **Byline:** `Legal Wellness`
- **Summary:** South Africa's Small Claims Court monetary limit increased from R20 000 to R30 000 on 1 August 2026, allowing more everyday civil disputes to use the simpler small-claims process.

The article will explain:

1. Government Gazette 55038, Notice 7717, dated 20 July 2026, determined R30 000 as the amount under sections 15 and 16 of the Small Claims Courts Act.
2. The increase took effect on 1 August 2026.
3. Official Justice guidance describes the court as a simpler forum for certain civil disputes. Representation by an attorney or advocate is not allowed at the hearing, although a person may obtain legal advice beforehand at their own cost and court clerks assist free of charge.
4. Common examples may include unpaid loans or debts, faulty goods, incomplete services, certain vehicle-related disputes, and qualifying claims arising from credit agreements, depending on the facts and the Act.
5. The official process starts by contacting the other party, followed by a written letter of demand. The official guide gives the recipient 14 days to settle before the claimant approaches the Small Claims Court clerk at the nearest Magistrate's Court with the demand, proof of delivery, supporting documents, and the other party's details.
6. The official guidance says a claim exceeding R30 000 may be instituted for a lesser amount. The article will state that users should ask the clerk or obtain advice before choosing how to proceed.
7. Eligibility and exclusions will be prominent: juristic persons may not institute claims; claims cannot be brought against the State or municipalities/local government; a person under 18 needs a parent or guardian; and specified matters such as defamation-related damages, dissolution of marriage, validity of a will, certain status matters, and some specific-performance claims are excluded.

The page will link visibly to:

- Department of Justice Small Claims Court guidance: `https://justice.gov.za/scc/scc.htm`
- Government Gazette 55038, Notice 7717: `https://justice.gov.za/legislation/notices/2026/20260720-gg55038gon7717-SCC-Amount-Increase-R30000.pdf`
- Justice Ministry announcement: `https://www.justice.gov.za/m_statements/2026/20260722-SCC-Monetary-Jurisdiction-R30000.html`
- Department of Justice Small Claims Court FAQ: `https://justice.gov.za/scc/scc_info.htm`

The article will state that it is general information reviewed on 17 September 2026, not legal advice, and that users should consult the Small Claims Court clerk or obtain advice about their facts.

## Page implementation

Create a local Next.js article page. It will use Legal Wellness colours, logo assets proxied from the approved origin, clear heading hierarchy, a restrained content width, source links, contact details, and responsive inline styles. No individual lawyer attribution or quotation will be invented. The exact article path will receive its own headers through `next.config.ts`: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`, and `Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`. Inline styles are permitted by that exact CSP because Next.js and the page require them; tests and browser verification will assert directive semantics and the actual response headers.

## News-card implementation

Extend the existing post-hydration policy bootstrap:

- The origin contract must first confirm exactly one Legal Updates grid and exactly one clone-source card containing the expected image, category, date, byline, title link, and summary nodes. Missing or duplicate structures fail the build and runtime insertion does nothing.
- After hydration, clone that confirmed news-card structure outside React reconciliation, then replace its image, category, date, byline, title, summary, and link with the approved article values.
- Mark the card with a unique data attribute and keep insertion idempotent.
- Give the cloned link an explicit primary-click handler that uses `location.assign()` so navigation leaves the upstream React application and loads the local Next.js article as a full document. Modified clicks retain normal anchor behaviour.
- Reinsert it after client navigation or repeated React DOM replacement through one batched mutation observer. Observer callbacks must stop after finding the unique marker and must not self-loop.
- Continue hiding the six unreliable source cards through the existing exact-path policy.
- At widths of 768px and above, override only the Legal Updates article grid to two columns with a bounded centred width; retain one column on smaller screens.

The existing three guides remain unchanged. The new card is the fourth visible card.

## Verification

- Existing policy, proxy, contact, CSP and origin-contract tests remain green.
- Unit tests verify the new card's exact path/title/category/date/byline markers, two-column scoped CSS, idempotent bootstrap markers, and absence from the hidden redirect set.
- Desktop browser verification requires a two-by-two grid, four visible cards, no newsletter prompt, no hidden article, and zero console/hydration errors after reload and repeated client navigation/DOM replacement. Exactly one injected card must remain.
- Mobile verification requires one card per row without horizontal overflow.
- The fourth card must expose one accessible link with the exact article name inside an `h3`, an informative `alt` value, visible keyboard focus, and correct focus order after the third retained card.
- Opening the fourth card by click or Enter must perform a full-document navigation to the local article page. Back and forward navigation must preserve one injected card and no stale original text/link.
- The local article page must contain the exact R30 000 amount, 1 August 2026 effective date, visible official sources with descriptive labels and safe external-link `rel`, general-information notice, correct heading hierarchy, security headers, keyboard access, and zero browser errors.
- Healthy cache-flow verification must continue to return JavaScript `200` and bodyless conditional `304` responses.

## Release and rollback

The rollback baseline is GitHub main commit `389e24f0704ab2ba9af46be2240ec40d02f56961`, tree `b7eff66d04f2fe33f03c326e6b4ab0b0511fcaf3`, and Netlify deploy `6aac01c7309d4d0008b8bd76`.

Release through one reviewed PR, one passing Netlify preview and one Git-triggered production deploy. Rollback reverts the complete article/layout merge and waits for its Netlify deployment. Verification must confirm the exact baseline tree, healthy cache flow, three-card restoration, absence of the new card, the new article path no longer resolving locally, client navigation, and existing contact/privacy checks.
