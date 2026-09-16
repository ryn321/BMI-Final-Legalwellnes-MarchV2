import assert from "node:assert/strict";
import test from "node:test";

process.env.RESEND_API_KEY = "re_test_not_used";
const { config, default: contact } = await import("../netlify/functions/contact.ts");

test("contact function publishes a bounded per-IP/domain route", () => {
  assert.equal(config.path, "/api/contact");
  assert.deepEqual(config.rateLimit, {
    windowLimit: 5,
    windowSize: 60,
    aggregateBy: ["ip", "domain"],
  });
});

test("rejects methods other than POST", async () => {
  const response = await contact(new Request("http://localhost/api/contact"), {});
  assert.equal(response.status, 405);
});

test("requires JSON and bounds the body", async () => {
  const wrongType = await contact(new Request("http://localhost/api/contact", {
    method: "POST",
    body: "hello",
    headers: { "content-type": "text/plain" },
  }), {});
  assert.equal(wrongType.status, 415);

  const tooLarge = await contact(new Request("http://localhost/api/contact", {
    method: "POST",
    body: JSON.stringify({ message: "x".repeat(17_000) }),
    headers: { "content-type": "application/json" },
  }), {});
  assert.equal(tooLarge.status, 413);
});

test("rejects invalid JSON shapes and consultation requests without a valid ID", async () => {
  const invalidShape = await contact(new Request("http://localhost/api/contact", {
    method: "POST",
    body: "[]",
    headers: { "content-type": "application/json" },
  }), {});
  assert.equal(invalidShape.status, 400);

  const invalidId = await contact(new Request("http://localhost/api/contact", {
    method: "POST",
    body: JSON.stringify({
      name: "Launch Test",
      email: "launch-test@example.com",
      phone: "0000000000",
      message: "Consultation Type: telephone\nID Number: 123\n\nSummary of Issue:\nSynthetic validation only",
    }),
    headers: { "content-type": "application/json" },
  }), {});
  assert.equal(invalidId.status, 400);
  assert.deepEqual(await invalidId.json(), {
    error: "A valid 13-digit South African ID number is required",
  });
});
