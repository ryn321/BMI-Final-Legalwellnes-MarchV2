import assert from "node:assert/strict";
import test from "node:test";

const { verifyLegalUpdatesOriginContract } = await import("../scripts/verify-approved-origin.mjs");

const hidden = [
  "/news/consumer-protection-opt-out-2025",
  "/news/wills-estates-amendment-bill",
  "/news/raf-amendment-2025",
  "/news/rental-housing-act-2025",
  "/news/family-law-mediation-rules",
  "/news/labor-law-dismissal-code",
];
const retained = [
  "/news/labour-procedures",
  "/news/divorce-procedures",
  "/news/wills-estate-matters",
];

const card = (path) => `<div class="group relative bg-foreground/5 border border-border rounded-2xl overflow-hidden hover:bg-foreground/10 transition-colors duration-300 flex flex-col h-full"><div><h3 class="text-xl font-bold text-foreground mb-4 line-clamp-2 group-hover:text-accent transition-colors duration-300"><a href="${path}">Article</a></h3></div></div>`;
const newsletter = '<section class="container mx-auto px-6 pt-12 text-center"><h3 class="text-2xl font-bold text-foreground mb-4">Click on Newsletter</h3><a href="mailto:client@legalwellness.co.za">Click here for more information</a></section>';
const guidance = '<section class="container mx-auto px-6 pt-4 pb-12"><div><p>Legal Updates give you practical guidance to:</p></div></section>';

function validHtml() {
  return `<html><head></head><body><img alt="Legal Updates">${newsletter}${guidance}${[...hidden, ...retained].map(card).join("")}</body></html>`;
}

test("accepts the exact structural origin contract without CSP", () => {
  assert.deepEqual(verifyLegalUpdatesOriginContract({ html: validHtml(), csp: null }), {
    hiddenCardCount: 6,
    retainedCardCount: 3,
    status: "verified",
  });
});

test("fails when exact structures or anchors are missing or duplicated", () => {
  const cases = [
    validHtml().replace('<img alt="Legal Updates">', ""),
    validHtml().replace(newsletter, ""),
    validHtml().replace(guidance, ""),
    validHtml().replace(card(hidden[0]), `<a href="${hidden[0]}">footer link</a>`),
    validHtml().replace(card(retained[0]), card(retained[0]) + card(retained[0])),
    validHtml().replace("</head>", ""),
    validHtml().replace("</head>", "</head></head>"),
    validHtml().replace("</body>", ""),
    validHtml().replace("</body>", "</body></body>"),
  ];
  for (const html of cases) {
    assert.throws(() => verifyLegalUpdatesOriginContract({ html, csp: null }));
  }
});

test("applies CSP element-directive precedence and rejects nonce/hash overrides", () => {
  const allowed = [
    null,
    "default-src 'self' 'unsafe-inline'",
    "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'",
    "default-src 'none'; script-src 'none'; script-src-elem 'unsafe-inline'; style-src 'none'; style-src-elem 'unsafe-inline'",
  ];
  for (const csp of allowed) assert.doesNotThrow(() => verifyLegalUpdatesOriginContract({ html: validHtml(), csp }));

  const blocked = [
    "default-src 'self'",
    "default-src 'none'; script-src 'unsafe-inline'; script-src-elem 'none'; style-src 'unsafe-inline'",
    "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; style-src-elem 'none'",
    "script-src 'unsafe-inline' 'nonce-abc'; style-src 'unsafe-inline'",
    "script-src 'unsafe-inline'; style-src 'unsafe-inline' 'sha256-abc'",
  ];
  for (const csp of blocked) {
    assert.throws(() => verifyLegalUpdatesOriginContract({ html: validHtml(), csp }), /CSP/);
  }
});
