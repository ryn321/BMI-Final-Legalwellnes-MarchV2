import assert from "node:assert/strict";
import test from "node:test";

const route = await import("../app/[[...path]]/route.ts");

function upstreamFixture({ status, contentType, text = "upstream body" }) {
  let textCalls = 0;
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(text));
      controller.close();
    },
  });
  return {
    status,
    statusText: status === 304 ? "Not Modified" : "",
    headers: new Headers({
      "content-type": contentType,
      etag: '"frozen-etag"',
      "last-modified": "Thu, 17 Sep 2026 12:00:00 GMT",
    }),
    body,
    get textCalls() { return textCalls; },
    async text() {
      textCalls += 1;
      return text;
    },
  };
}

async function call(handler, { url, path, upstream, method = "GET" }) {
  const previous = globalThis.fetch;
  globalThis.fetch = async () => upstream;
  try {
    return await handler(new Request(url, { method }), {
      params: Promise.resolve({ path }),
    });
  } finally {
    globalThis.fetch = previous;
  }
}

function assertValidators(response) {
  assert.equal(response.headers.get("etag"), '"frozen-etag"');
  assert.equal(response.headers.get("last-modified"), "Thu, 17 Sep 2026 12:00:00 GMT");
}

test("forwards a response-shaped 304 stream as a null-body 304", async () => {
  const upstream = upstreamFixture({ status: 304, contentType: "application/octet-stream" });
  const response = await call(route.GET, {
    url: "https://legalwellness.co.za/cache-probe.bin",
    path: ["cache-probe.bin"],
    upstream,
  });
  assert.equal(response.status, 304);
  assert.equal(response.body, null);
  assert.equal(upstream.textCalls, 0);
  assertValidators(response);
});

test("does not read or transform JavaScript on a bodyless 304", async () => {
  const upstream = upstreamFixture({ status: 304, contentType: "application/javascript" });
  const response = await call(route.GET, {
    url: "https://legalwellness.co.za/_next/static/chunks/current.js",
    path: ["_next", "static", "chunks", "current.js"],
    upstream,
  });
  assert.equal(response.status, 304);
  assert.equal(response.body, null);
  assert.equal(upstream.textCalls, 0);
  assertValidators(response);
});

test("does not read or transform HTML on a bodyless 204", async () => {
  const upstream = upstreamFixture({ status: 204, contentType: "text/html" });
  const response = await call(route.GET, {
    url: "https://legalwellness.co.za/empty",
    path: ["empty"],
    upstream,
  });
  assert.equal(response.status, 204);
  assert.equal(response.body, null);
  assert.equal(upstream.textCalls, 0);
  assertValidators(response);
});

test("does not read or transform JavaScript on a bodyless 205", async () => {
  const upstream = upstreamFixture({ status: 205, contentType: "application/javascript" });
  const response = await call(route.GET, {
    url: "https://legalwellness.co.za/reset.js",
    path: ["reset.js"],
    upstream,
  });
  assert.equal(response.status, 205);
  assert.equal(response.body, null);
  assert.equal(upstream.textCalls, 0);
  assertValidators(response);
});

test("keeps HEAD bodyless for a normal upstream 200", async () => {
  const upstream = upstreamFixture({ status: 200, contentType: "text/html" });
  const response = await call(route.HEAD, {
    url: "https://legalwellness.co.za/news",
    path: ["news"],
    upstream,
    method: "HEAD",
  });
  assert.equal(response.status, 200);
  assert.equal(response.body, null);
  assert.equal(upstream.textCalls, 0);
});

test("retains the existing JavaScript consent transform for body-bearing 200 responses", async () => {
  const marker = '"Submit Request"})]})]})';
  const upstream = upstreamFixture({
    status: 200,
    contentType: "application/javascript",
    text: `before${marker}after`,
  });
  const response = await call(route.GET, {
    url: "https://legalwellness.co.za/_next/static/chunks/contact.js",
    path: ["_next", "static", "chunks", "contact.js"],
    upstream,
  });
  assert.equal(response.status, 200);
  assert.equal(upstream.textCalls, 1);
  assert.match(await response.text(), /Privacy Notice/);
});

test("retains the existing HTML consent transform for body-bearing 200 responses", async () => {
  const upstream = upstreamFixture({
    status: 200,
    contentType: "text/html; charset=utf-8",
    text: "<html><body><form><button>Submit Request</button></form></body></html>",
  });
  const response = await call(route.GET, {
    url: "https://legalwellness.co.za/contact",
    path: ["contact"],
    upstream,
  });
  assert.equal(response.status, 200);
  assert.equal(upstream.textCalls, 1);
  assert.match(await response.text(), /Privacy Notice/);
  assert.equal(response.headers.has("etag"), false);
  assert.equal(response.headers.has("last-modified"), false);
});
