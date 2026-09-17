import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  HIDDEN_ARTICLE_PATHS,
  RETAINED_ARTICLE_PATHS,
} from "../lib/legal-updates-policy.mjs";

const origin = "https://legal-wellness-master-final.netlify.app";
const serverIdField = '<input id="consultation-idNumber" type="text" placeholder="SA ID Number…" required=""';
const clientIdField = 'id:"consultation-idNumber",name:"id-number",type:"text",placeholder:"SA ID Number…",required:!0,value:n.idNumber,onChange:e=>i({...n,idNumber:e.target.value})';
const serverSubmitMarker = ">Submit Request</button></form>";
const clientSubmitMarker = '"Submit Request"})]})]})';
const cardClass = "group relative bg-foreground/5 border border-border rounded-2xl overflow-hidden hover:bg-foreground/10 transition-colors duration-300 flex flex-col h-full";
const cardTitleClass = "text-xl font-bold text-foreground mb-4 line-clamp-2 group-hover:text-accent transition-colors duration-300";

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countMatches(value, pattern) {
  return [...value.matchAll(pattern)].length;
}

function parseCsp(csp) {
  const directives = new Map();
  for (const rawDirective of csp.split(";")) {
    const parts = rawDirective.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) continue;
    const name = parts.shift().toLowerCase();
    if (directives.has(name)) throw new Error(`CSP contains duplicate ${name}`);
    directives.set(name, parts);
  }
  return directives;
}

function assertInlineAllowed(directives, kind) {
  const order = kind === "script"
    ? ["script-src-elem", "script-src", "default-src"]
    : ["style-src-elem", "style-src", "default-src"];
  const effectiveName = order.find((name) => directives.has(name));
  if (!effectiveName) return;
  const sources = directives.get(effectiveName);
  const hasNonceOrHash = sources.some((source) => (
    /^'nonce-/i.test(source) || /^'(?:sha256|sha384|sha512)-/i.test(source)
  ));
  if (hasNonceOrHash || !sources.includes("'unsafe-inline'")) {
    throw new Error(`CSP ${effectiveName} blocks the inline ${kind} policy`);
  }
}

function assertOne(html, pattern, label) {
  const count = countMatches(html, pattern);
  if (count !== 1) throw new Error(`Expected one ${label}; found ${count}`);
}

export function verifyLegalUpdatesOriginContract({ html, csp }) {
  assertOne(html, /<\/head\s*>/gi, "usable </head> anchor");
  assertOne(html, /<\/body\s*>/gi, "usable </body> anchor");
  assertOne(html, /<img\b[^>]*\balt=["']Legal Updates["'][^>]*>/gi, "Legal Updates hero marker");

  const newsletterAndGuidance = /<section class=["']container mx-auto px-6 pt-12 text-center["']>\s*<h3\b[^>]*>Click on Newsletter<\/h3>\s*<a\b[^>]*href=["']mailto:client@legalwellness\.co\.za["'][^>]*>Click here for more information<\/a>\s*<\/section>\s*<section class=["']container mx-auto px-6 pt-4 pb-12["']>[\s\S]*?Legal Updates give you practical guidance to:[\s\S]*?<\/section>/gi;
  assertOne(html, newsletterAndGuidance, "pinned newsletter and adjacent guidance structure");

  const allPaths = [...HIDDEN_ARTICLE_PATHS, ...RETAINED_ARTICLE_PATHS];
  const cardSegments = html.split(`<div class="${cardClass}"`).slice(1);
  if (cardSegments.length !== allPaths.length) {
    throw new Error(`Expected ${allPaths.length} pinned article-card wrappers; found ${cardSegments.length}`);
  }
  for (const path of allPaths) {
    const escapedPath = escapeRegExp(path);
    const structural = new RegExp(`<h3 class=["']${escapeRegExp(cardTitleClass)}["']>\\s*<a\\b[^>]*href=["']${escapedPath}["']`, "i");
    const structuralCount = cardSegments.filter((segment) => structural.test(segment)).length;
    if (structuralCount !== 1) {
      throw new Error(`Expected one pinned article card for ${path}; found ${structuralCount}`);
    }
    assertOne(html, new RegExp(`href=["']${escapedPath}["']`, "gi"), `unique article link for ${path}`);
  }

  if (csp?.trim()) {
    const directives = parseCsp(csp);
    assertInlineAllowed(directives, "script");
    assertInlineAllowed(directives, "style");
  }

  return {
    hiddenCardCount: HIDDEN_ARTICLE_PATHS.length,
    retainedCardCount: RETAINED_ARTICLE_PATHS.length,
    status: "verified",
  };
}

async function main() {
  const response = await fetch(origin, { redirect: "error" });
  if (!response.ok) throw new Error(`Approved origin returned HTTP ${response.status}`);

  const html = await response.text();
  for (const marker of [
    "<title>Legal Wellness | Dignity, Integrity &amp; Excellence</title>",
    "mailto:client@legalwellness.co.za",
    serverIdField,
    serverSubmitMarker,
  ]) {
    if (!html.includes(marker)) throw new Error(`Approved-origin marker missing: ${marker}`);
  }

  const chunkPaths = [...new Set(html.match(/\/_next\/static\/chunks\/[A-Za-z0-9._-]+\.js/g) ?? [])];
  let clientMarkerCount = 0;
  let clientSubmitMarkerCount = 0;
  for (const chunkPath of chunkPaths) {
    const chunkResponse = await fetch(new URL(chunkPath, origin));
    if (!chunkResponse.ok) throw new Error(`Chunk ${chunkPath} returned HTTP ${chunkResponse.status}`);
    const chunk = await chunkResponse.text();
    if (chunk.includes(clientIdField)) clientMarkerCount += 1;
    if (chunk.includes(clientSubmitMarker)) clientSubmitMarkerCount += 1;
  }

  if (clientMarkerCount !== 1) {
    throw new Error(`Expected one frozen client ID-field marker; found ${clientMarkerCount}`);
  }
  if (clientSubmitMarkerCount !== 1) {
    throw new Error(`Expected one frozen client submit marker; found ${clientSubmitMarkerCount}`);
  }

  const newsResponse = await fetch(new URL("/news", origin), { redirect: "error" });
  if (!newsResponse.ok) throw new Error(`Approved-origin /news returned HTTP ${newsResponse.status}`);
  const newsContract = verifyLegalUpdatesOriginContract({
    html: await newsResponse.text(),
    csp: newsResponse.headers.get("content-security-policy"),
  });

  console.log(JSON.stringify({
    origin,
    chunkCount: chunkPaths.length,
    clientMarkerCount,
    clientSubmitMarkerCount,
    ...newsContract,
  }));
}

const isCli = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isCli) await main();
