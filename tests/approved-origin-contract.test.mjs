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

const consumerPath = "/news/consumer-protection-opt-out-2025";
const consumerTitle = "New Consumer Protection Rules: The 2025 Direct Marketing Opt-Out Registry";
const consumerSummary = "The NCC is establishing a strict new opt-out registry for direct marketing. Discover how this protects your privacy and what it means for businesses.";
const card = (path) => {
  const consumer = path === consumerPath;
  const title = consumer ? consumerTitle : "Article";
  return `<div class="group relative bg-foreground/5 border border-border rounded-2xl overflow-hidden hover:bg-foreground/10 transition-colors duration-300 flex flex-col h-full"><div><img alt="${consumer ? consumerTitle : title}" src="${consumer ? "/assets/news/consumer.png" : "/assets/news/generic.png"}"><div>${consumer ? "Consumer Law" : "Category"}</div></div><div><div><span>${consumer ? "February 1, 2026" : "Date"}</span><span>${consumer ? "Ilse Marlow" : "Author"}</span></div><h3 class="text-xl font-bold text-foreground mb-4 line-clamp-2 group-hover:text-accent transition-colors duration-300"><a href="${path}">${title}</a></h3><p>${consumer ? consumerSummary : "Summary"}</p></div></div>`;
};
const newsletter = '<section class="container mx-auto px-6 pt-12 text-center"><h3 class="text-2xl font-bold text-foreground mb-4">Click on Newsletter</h3><a href="mailto:client@legalwellness.co.za">Click here for more information</a></section>';
const guidance = '<section class="container mx-auto px-6 pt-4 pb-12"><div><p>Legal Updates give you practical guidance to:</p></div></section>';

function validHtml() {
  return `<html><head></head><body><img alt="Legal Updates">${newsletter}${guidance}<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">${[...hidden, ...retained].map(card).join("")}</div></body></html>`;
}

test("accepts the exact structural origin contract without CSP", () => {
  assert.deepEqual(verifyLegalUpdatesOriginContract({ html: validHtml(), csp: null }), {
    cloneSourceCount: 1,
    gridCount: 1,
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
    validHtml().replace(card(hidden[0]), "").replace("</body>", `${card(hidden[0])}</body>`),
    validHtml().replace(card(retained[0]), card(retained[0]) + card(retained[0])),
    validHtml().replace('<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">', ""),
    validHtml().replace("</body>", '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"></div></body>'),
    validHtml().replace(consumerTitle, "Wrong consumer title"),
    validHtml().replace("/assets/news/consumer.png", "/assets/news/wrong.png"),
    validHtml().replace("Consumer Law", "Wrong category"),
    validHtml().replace("February 1, 2026", "Wrong date"),
    validHtml().replace("Ilse Marlow", "Wrong author"),
    validHtml().replace(consumerSummary, "Wrong summary"),
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
