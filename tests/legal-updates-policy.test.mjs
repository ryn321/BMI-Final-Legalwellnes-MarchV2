import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";

const policy = await import("../lib/legal-updates-policy.mjs");

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

test("exports the exact reviewed article policy", () => {
  assert.deepEqual([...policy.HIDDEN_ARTICLE_PATHS], hidden);
  assert.deepEqual([...policy.RETAINED_ARTICLE_PATHS], retained);
  for (const path of hidden) assert.equal(policy.isHiddenArticlePath(path), true);
  for (const path of retained) assert.equal(policy.isHiddenArticlePath(path), false);
  assert.equal(policy.isHiddenArticlePath("/news"), false);
  assert.equal(policy.isHiddenArticlePath("/news/raf-amendment-2025/extra"), false);
});

test("generates a narrowly scoped pre-paint style and post-load bootstrap", () => {
  assert.match(policy.LEGAL_UPDATES_STYLE, /body:has\(img\[alt="Legal Updates"\]\)/);
  assert.match(policy.LEGAL_UPDATES_STYLE, /mailto:client@legalwellness\.co\.za/);
  assert.match(policy.LEGAL_UPDATES_STYLE, /div\.group\.relative\.bg-foreground\\\/5\.border\.border-border\.rounded-2xl/);
  for (const path of hidden) assert.match(policy.LEGAL_UPDATES_STYLE, new RegExp(path.replaceAll("/", "\\/")));
  for (const path of retained) assert.doesNotMatch(policy.LEGAL_UPDATES_STYLE, new RegExp(path.replaceAll("/", "\\/")));
  assert.match(policy.LEGAL_UPDATES_BOOTSTRAP, /addEventListener\("load"/);
  assert.equal((policy.LEGAL_UPDATES_BOOTSTRAP.match(/requestAnimationFrame/g) ?? []).length >= 2, true);
  assert.match(policy.LEGAL_UPDATES_BOOTSTRAP, /CSS\.supports\("selector\(:has\(\*\)\)"\)/);
  assert.doesNotMatch(policy.LEGAL_UPDATES_BOOTSTRAP, /Submit Request|consultation-idNumber/);
});

test("injects once and fails closed when either HTML anchor is unsafe", () => {
  const original = "<!doctype html><html><head><title>x</title></head><body><main>ok</main></body></html>";
  const first = policy.injectLegalUpdatesPolicy(original);
  assert.equal(first.modified, true);
  assert.equal((first.html.match(/id="lw-legal-updates-policy"/g) ?? []).length, 1);
  assert.equal((first.html.match(/id="lw-legal-updates-bootstrap"/g) ?? []).length, 1);
  assert.ok(first.html.indexOf("lw-legal-updates-policy") < first.html.toLowerCase().indexOf("</head>"));
  assert.ok(first.html.indexOf("lw-legal-updates-bootstrap") < first.html.toLowerCase().indexOf("</body>"));

  const second = policy.injectLegalUpdatesPolicy(first.html);
  assert.equal(second.modified, false);
  assert.equal(second.reason, "already-injected");
  assert.equal(second.html, first.html);

  for (const invalid of [
    "<html><body>x</body></html>",
    "<html><head></head><head></head><body>x</body></html>",
    "<html><head></head><body>x</html>",
    "<html><head></head><body>x</body></body></html>",
  ]) {
    const result = policy.injectLegalUpdatesPolicy(invalid);
    assert.equal(result.modified, false);
    assert.equal(result.html, invalid);
    assert.match(result.reason, /anchor/);
  }

  const mixedCase = "<HTML><HEAD></HEAD><BODY>x</BODY></HTML>";
  assert.equal(policy.injectLegalUpdatesPolicy(mixedCase).modified, true);
});

function makeBootstrapContext({ supportsHas, document: documentOverride }) {
  const listeners = new Map();
  const rafQueue = [];
  const mutationObservers = [];
  const appended = [];
  const styleNode = { id: "lw-legal-updates-policy", textContent: "", setAttribute() {} };

  const defaultDocument = {
    readyState: "loading",
    documentElement: {},
    head: { appendChild(node) { appended.push(node); } },
    getElementById(id) { return id === styleNode.id ? styleNode : null; },
    createElement(tag) { return { tag, id: "", textContent: "", setAttribute() {} }; },
    querySelectorAll() { return []; },
  };
  const document = documentOverride ?? defaultDocument;

  class MutationObserver {
    constructor(callback) { this.callback = callback; mutationObservers.push(this); }
    observe() { this.observing = true; }
  }

  const context = {
    CSS: { supports(query) { assert.equal(query, "selector(:has(*))"); return supportsHas; } },
    MutationObserver,
    document,
    location: { pathname: "/news" },
    requestAnimationFrame(callback) { rafQueue.push(callback); },
    addEventListener(name, callback) { listeners.set(name, callback); },
    queueMicrotask(callback) { callback(); },
    setTimeout(callback) { callback(); },
  };
  context.window = context;
  context.globalThis = context;
  return { context, listeners, rafQueue, mutationObservers, appended };
}

test("bootstrap waits for load and two frames without modern DOM mutation", () => {
  const fixture = makeBootstrapContext({ supportsHas: true });
  vm.runInNewContext(policy.LEGAL_UPDATES_BOOTSTRAP, fixture.context);
  assert.equal(fixture.listeners.has("load"), true);
  assert.equal(fixture.rafQueue.length, 0);
  fixture.listeners.get("load")();
  assert.equal(fixture.rafQueue.length, 1);
  fixture.rafQueue.shift()();
  assert.equal(fixture.rafQueue.length, 1);
  fixture.rafQueue.shift()();
  assert.equal(fixture.mutationObservers.length, 0);
  assert.equal(fixture.appended.length, 0);
});

test("legacy bootstrap installs a batched mutation fallback after hydration", () => {
  const fixture = makeBootstrapContext({ supportsHas: false });
  vm.runInNewContext(policy.LEGAL_UPDATES_BOOTSTRAP, fixture.context);
  fixture.listeners.get("load")();
  fixture.rafQueue.shift()();
  fixture.rafQueue.shift()();
  assert.equal(fixture.mutationObservers.length, 1);
  assert.equal(fixture.mutationObservers[0].observing, true);
  fixture.mutationObservers[0].callback([]);
  assert.equal(fixture.rafQueue.length, 1);
  fixture.mutationObservers[0].callback([]);
  assert.equal(fixture.rafQueue.length, 1);
});

test("legacy fallback hides only approved structures and reapplies after mutations", () => {
  function hideable(extra = {}) {
    return {
      hidden: false,
      style: {},
      attributes: {},
      setAttribute(name, value) { this.attributes[name] = value; },
      ...extra,
    };
  }

  const newsletter = hideable();
  const guidance = hideable({
    textContent: "Legal Updates give you practical guidance to:",
    matches(selector) { return selector === "section.container.mx-auto.px-6.pt-4.pb-12"; },
  });
  newsletter.nextElementSibling = guidance;
  const mailLink = {
    tagName: "A",
    textContent: "Click here for more information",
    getAttribute(name) { return name === "href" ? "mailto:client@legalwellness.co.za" : null; },
  };
  const heading = {
    textContent: "Click on Newsletter",
    parentElement: newsletter,
    nextElementSibling: mailLink,
    closest(selector) {
      return selector === "section.container.mx-auto.px-6.pt-12.text-center" ? newsletter : null;
    },
  };
  const unrelatedHeading = { textContent: "Other heading" };

  const cards = new Map();
  const anchors = new Map();
  for (const path of hidden) {
    const card = hideable();
    const anchor = { closest() { return card; } };
    cards.set(path, [card]);
    anchors.set(path, [anchor]);
  }
  const unrelatedCard = hideable();

  const styleNode = { id: "lw-legal-updates-policy" };
  const document = {
    readyState: "loading",
    documentElement: {},
    head: { appendChild() { throw new Error("style already exists"); } },
    getElementById(id) { return id === styleNode.id ? styleNode : null; },
    createElement() { throw new Error("style already exists"); },
    querySelectorAll(selector) {
      if (selector === "h3") return [unrelatedHeading, heading];
      const match = selector.match(/^a\[href="(.+)"\]$/);
      return match ? (anchors.get(match[1]) ?? []) : [];
    },
  };

  const fixture = makeBootstrapContext({ supportsHas: false, document });
  vm.runInNewContext(policy.LEGAL_UPDATES_BOOTSTRAP, fixture.context);
  fixture.listeners.get("load")();
  fixture.rafQueue.shift()();
  fixture.rafQueue.shift()();

  assert.equal(newsletter.hidden, true);
  assert.equal(newsletter.attributes["aria-hidden"], "true");
  assert.equal(newsletter.style.display, "none");
  assert.equal(guidance.style.paddingTop, "3rem");
  for (const path of hidden) assert.equal(cards.get(path)[0].hidden, true);
  assert.equal(unrelatedCard.hidden, false);

  const appendedCard = hideable();
  anchors.get(hidden[0]).push({ closest() { return appendedCard; } });
  fixture.mutationObservers[0].callback([]);
  fixture.rafQueue.shift()();
  assert.equal(appendedCard.hidden, true);
  assert.equal(appendedCard.attributes["aria-hidden"], "true");
});
