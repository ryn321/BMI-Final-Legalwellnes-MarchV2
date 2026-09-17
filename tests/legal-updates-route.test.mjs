import assert from "node:assert/strict";
import test from "node:test";

const route = await import("../app/[[...path]]/route.ts");

const hidden = [
  "consumer-protection-opt-out-2025",
  "wills-estates-amendment-bill",
  "raf-amendment-2025",
  "rental-housing-act-2025",
  "family-law-mediation-rules",
  "labor-law-dismissal-code",
];

async function call(handler, url, path, fetchImpl, method = "GET") {
  const previous = globalThis.fetch;
  globalThis.fetch = fetchImpl;
  try {
    return await handler(new Request(url, { method }), { params: Promise.resolve({ path }) });
  } finally {
    globalThis.fetch = previous;
  }
}

test("redirects exact normal and encoded hidden GET and HEAD paths without upstream fetch", async () => {
  for (const slug of hidden) {
    for (const method of ["GET", "HEAD"]) {
      for (const urlSlug of [slug, slug.replace("r", "%72")]) {
        let fetches = 0;
        const handler = method === "HEAD" ? route.HEAD : route.GET;
        const response = await call(handler, `https://legalwellness.co.za/news/${urlSlug}`, ["news", slug], async () => {
          fetches += 1;
          throw new Error("must not fetch");
        }, method);
        assert.equal(response.status, 307);
        assert.equal(new URL(response.headers.get("location")).pathname, "/news");
        assert.equal(fetches, 0);
        assert.equal(await response.text(), "");
      }
    }
  }
});

test("does not redirect retained, extended, or malformed paths", async () => {
  const fetchImpl = async () => new Response("ok", { headers: { "content-type": "text/plain" } });
  for (const [url, path] of [
    ["https://legalwellness.co.za/news/labour-procedures", ["news", "labour-procedures"]],
    ["https://legalwellness.co.za/news/raf-amendment-2025/extra", ["news", "raf-amendment-2025", "extra"]],
    ["https://legalwellness.co.za/news/%E0%A4%A", ["news", "%E0%A4%A"]],
  ]) {
    const response = await call(route.GET, url, path, fetchImpl);
    assert.equal(response.status, 200);
    assert.equal(await response.text(), "ok");
  }
});

test("redirects when either the decoded URL or decoded route parameters match", async () => {
  let fetches = 0;
  const fetchImpl = async () => {
    fetches += 1;
    return new Response("unexpected");
  };

  const routeParamMatch = await call(
    route.GET,
    "https://legalwellness.co.za/news/harmless",
    ["news", "raf-amendment-2025"],
    fetchImpl,
  );
  assert.equal(routeParamMatch.status, 307);

  const urlMatch = await call(
    route.GET,
    "https://legalwellness.co.za/news/%72af-amendment-2025",
    ["news", "harmless"],
    fetchImpl,
  );
  assert.equal(urlMatch.status, 307);
  assert.equal(fetches, 0);
});

test("injects the Legal Updates policy and keeps the existing consent transform", async () => {
  const html = "<html><head></head><body><form><button>Submit Request</button></form></body></html>";
  const response = await call(route.GET, "https://legalwellness.co.za/contact", ["contact"], async () => new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      etag: "old",
      "last-modified": "yesterday",
    },
  }));
  const body = await response.text();
  assert.match(body, /lw-legal-updates-policy/);
  assert.match(body, /lw-legal-updates-bootstrap/);
  assert.match(body, /Privacy Notice/);
  assert.equal(response.headers.has("etag"), false);
  assert.equal(response.headers.has("last-modified"), false);
});

test("does not inject into non-HTML or retained HEAD responses", async () => {
  const jsonResponse = await call(route.GET, "https://legalwellness.co.za/data.json", ["data.json"], async () => new Response('{"ok":true}', {
    headers: { "content-type": "application/json" },
  }));
  const jsonBody = await jsonResponse.text();
  assert.equal(jsonBody, '{"ok":true}');
  assert.doesNotMatch(jsonBody, /lw-legal-updates/);

  const headResponse = await call(route.HEAD, "https://legalwellness.co.za/news/labour-procedures", ["news", "labour-procedures"], async () => new Response(null, {
    headers: { "content-type": "text/html" },
  }), "HEAD");
  assert.equal(await headResponse.text(), "");
});
