import assert from "node:assert/strict";
import test from "node:test";

const {
  isTemporarilyUnpublishedArticlePath,
  transformApprovedOriginContent,
} = await import("../lib/proxy-content.ts");

const newsletterHtml = '<section class="container mx-auto px-6 pt-12 text-center"><h3 class="text-2xl font-bold text-foreground mb-4">Click on Newsletter</h3><a href="mailto:client@legalwellness.co.za" class="text-accent hover:underline font-bold text-lg mb-8 inline-block rounded focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none">Click here for more information</a></section>';
const guidanceHtml = '<section class="container mx-auto px-6 pt-4 pb-12">';

const newsletterScript = '(0,t.jsxs)("section",{className:"container mx-auto px-6 pt-12 text-center",children:[(0,t.jsx)("h3",{className:"text-2xl font-bold text-foreground mb-4",children:"Click on Newsletter"}),(0,t.jsx)("a",{href:"mailto:client@legalwellness.co.za",className:"text-accent hover:underline font-bold text-lg mb-8 inline-block rounded focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none",children:"Click here for more information"})]})';
const guidanceScript = 'className:"container mx-auto px-6 pt-4 pb-12"';

test("removes the broken newsletter prompt and restores section spacing in server HTML", () => {
  const source = `<main>${newsletterHtml}${guidanceHtml}<div>Guidance</div></section></main>`;
  const transformed = transformApprovedOriginContent(source, "text/html");

  assert.equal(transformed.includes("Click on Newsletter"), false);
  assert.equal(transformed.includes("Click here for more information"), false);
  assert.equal(transformed.includes("mailto:client@legalwellness.co.za"), false);
  assert.equal(transformed.includes('class="container mx-auto px-6 pt-12 pb-12"'), true);
});

test("removes the newsletter prompt from the hydration bundle and preserves the guidance panel", () => {
  const source = `${newsletterScript},(0,t.jsx)("section",{${guidanceScript},children:"Guidance"})`;
  const transformed = transformApprovedOriginContent(source, "application/javascript");

  assert.equal(transformed.includes("Click on Newsletter"), false);
  assert.equal(transformed.includes("Click here for more information"), false);
  assert.equal(transformed.includes("mailto:client@legalwellness.co.za"), false);
  assert.equal(transformed.includes('className:"container mx-auto px-6 pt-12 pb-12"'), true);
  assert.equal(transformed.includes('children:"Guidance"'), true);
});

test("does not alter unrelated pages or scripts", () => {
  const source = '<section class="container mx-auto px-6 pt-4 pb-12">Unrelated</section>';
  assert.equal(transformApprovedOriginContent(source, "text/plain"), source);
});

test("hides the six articles that require legal correction", () => {
  const transformed = transformApprovedOriginContent("<html><head></head><body></body></html>", "text/html");

  for (const slug of [
    "consumer-protection-opt-out-2025",
    "wills-estates-amendment-bill",
    "raf-amendment-2025",
    "rental-housing-act-2025",
    "family-law-mediation-rules",
    "labor-law-dismissal-code",
  ]) {
    assert.equal(transformed.includes(`a[href="/news/${slug}"]`), true);
  }
  assert.equal(transformed.includes("display:none!important"), true);
});

test("redirects unpublished article paths while keeping approved service guides available", () => {
  assert.equal(isTemporarilyUnpublishedArticlePath("/news/rental-housing-act-2025"), true);
  assert.equal(isTemporarilyUnpublishedArticlePath("/news/family-law-mediation-rules"), true);
  assert.equal(isTemporarilyUnpublishedArticlePath("/news/labour-procedures"), false);
  assert.equal(isTemporarilyUnpublishedArticlePath("/news/divorce-procedures"), false);
  assert.equal(isTemporarilyUnpublishedArticlePath("/news/wills-estate-matters"), false);
  assert.equal(isTemporarilyUnpublishedArticlePath("/news"), false);
});
