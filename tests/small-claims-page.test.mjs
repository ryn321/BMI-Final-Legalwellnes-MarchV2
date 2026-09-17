import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pagePath = new URL("../app/news/small-claims-court-limit-2026/page.tsx", import.meta.url);
const pageSource = await readFile(pagePath, "utf8");
const nextConfig = (await import("../next.config.ts")).default;

const sources = [
  ["Official Small Claims Court guidance", "https://justice.gov.za/scc/scc.htm"],
  ["Government Gazette 55038, Notice 7717", "https://justice.gov.za/legislation/notices/2026/20260720-gg55038gon7717-SCC-Amount-Increase-R30000.pdf"],
  ["Justice Ministry announcement", "https://www.justice.gov.za/m_statements/2026/20260722-SCC-Monetary-Jurisdiction-R30000.html"],
  ["Small Claims Court FAQ", "https://justice.gov.za/scc/scc_info.htm"],
];

test("article source contains the approved facts, byline, disclaimer and exact sources", () => {
  for (const marker of [
    'data-lw-local-article="small-claims-2026"',
    "Small Claims Court Limit Increased to R30 000",
    "17 September 2026",
    "Legal Wellness",
    "1 August 2026",
    "14 days",
    "Representation by an attorney or advocate is not allowed",
    "general information",
    "not legal advice",
  ]) assert.match(pageSource, new RegExp(marker));

  for (const [label, href] of sources) {
    assert.match(pageSource, new RegExp(label));
    assert.match(pageSource, new RegExp(href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.equal((pageSource.match(/target="_blank"/g) ?? []).length >= 4, true);
  assert.equal((pageSource.match(/rel="noopener noreferrer"/g) ?? []).length >= 4, true);
});

test("article route receives the exact security headers", async () => {
  assert.equal(typeof nextConfig.headers, "function");
  const rules = await nextConfig.headers();
  const rule = rules.find((entry) => entry.source === "/news/small-claims-court-limit-2026");
  assert.ok(rule);
  const headers = Object.fromEntries(rule.headers.map(({ key, value }) => [key.toLowerCase(), value]));
  assert.equal(headers["x-content-type-options"], "nosniff");
  assert.equal(headers["referrer-policy"], "strict-origin-when-cross-origin");
  assert.equal(headers["x-frame-options"], "DENY");
  assert.equal(headers["permissions-policy"], "camera=(), microphone=(), geolocation=()");
  const csp = headers["content-security-policy"];
  for (const directive of [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ]) assert.ok(csp.includes(directive), directive);
});
