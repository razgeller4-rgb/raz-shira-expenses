#!/usr/bin/env node
/* Verifies the GROC-02 grocery-list CRUD functions run correctly against the
 * app's OWN shipped code (not a reimplementation), same pattern as
 * balance_harness.js: load the real <script> into node with a stubbed
 * localStorage/DOM, then call the real functions and assert on real output.
 *
 * Usage: node tools/grocery_probe.js <app.html>
 *
 * Read-only against the app file. Writes only to the in-memory localStorage
 * stub, never to disk.
 *
 * SECURITY NOTE - same pattern as tools/balance_harness.js: `new Function()`
 * on interpolated source is the mechanism, not an accident. It runs the app's
 * OWN <script> so the CRUD behaviour verified here is the code that actually
 * ships, not a reimplementation. The interpolated string is (a) the app HTML
 * at a path the developer passes on the command line, and (b) a hardcoded
 * identifier list in this file — no user-supplied or network-supplied input
 * anywhere in the chain. Developer-only harness: never loaded by the browser,
 * never bundled into expense-app-v37.html. Do not copy into application code.
 */

const fs = require("fs");

const [, , appPath] = process.argv;
if (!appPath) {
  console.error("usage: node tools/grocery_probe.js <app.html>");
  process.exit(2);
}

const html = fs.readFileSync(appPath, "utf8");

const store = new Map();
const localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => void store.set(k, String(v)),
  removeItem: (k) => void store.delete(k),
  clear: () => void store.clear(),
  key: (i) => [...store.keys()][i] ?? null,
  get length() { return store.size; },
};

const noop = () => {};
function makeEl() {
  const el = new Proxy(function () {}, {
    get(_t, prop) {
      if (prop === "style") return new Proxy({}, { get: () => "", set: () => true });
      if (prop === "classList") return { add: noop, remove: noop, toggle: noop, contains: () => false };
      if (prop === "dataset") return {};
      if (prop === "children" || prop === "childNodes") return [];
      if (prop === "value" || prop === "textContent" || prop === "innerHTML") return "";
      if (prop === "length") return 0;
      if (prop === Symbol.iterator) return function* () {};
      if (prop === "then") return undefined;
      return makeEl();
    },
    set: () => true,
    apply: () => makeEl(),
  });
  return el;
}
const document = new Proxy({}, {
  get(_t, prop) {
    if (prop === "querySelectorAll" || prop === "getElementsByClassName" || prop === "getElementsByTagName") {
      return () => [];
    }
    if (prop === "documentElement" || prop === "body" || prop === "head") return makeEl();
    if (prop === "readyState") return "complete";
    if (prop === "addEventListener" || prop === "removeEventListener") return noop;
    if (prop === "createElement" || prop === "createElementNS") return () => makeEl();
    if (prop === "getElementById" || prop === "querySelector") return () => makeEl();
    return makeEl();
  },
});
const windowStub = {
  addEventListener: noop, removeEventListener: noop,
  matchMedia: () => ({ matches: false, addEventListener: noop, addListener: noop }),
  requestAnimationFrame: noop, cancelAnimationFrame: noop,
  setTimeout: () => 0, clearTimeout: noop, setInterval: () => 0, clearInterval: noop,
  location: { href: "", protocol: "https:", search: "", hash: "" },
  navigator: { onLine: true, userAgent: "node", clipboard: { writeText: async () => {} } },
  localStorage,
  getComputedStyle: () => ({ getPropertyValue: () => "" }),
  devicePixelRatio: 1,
};
class ChartStub {
  constructor() { this.data = { datasets: [] }; this.options = {}; }
  update() {} destroy() {} resize() {} static register() {}
}
const XLSXStub = {
  utils: { book_new: () => ({}), json_to_sheet: () => ({}), book_append_sheet: noop, sheet_to_json: () => [] },
  writeFile: noop, read: () => ({ SheetNames: [], Sheets: {} }),
};
process.on("unhandledRejection", () => {});

const scripts = [...html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const main = scripts.reduce((a, b) => (b.length > a.length ? b : a), "");

const EXPORTS = [
  "getGroceryListKey", "getGroceryTombstonesKey", "normalizeGroceryItem",
  "getGroceryItems", "saveGroceryItems", "addGroceryItem",
  "updateGroceryItemStatus", "deleteGroceryItem", "getGroceryTombstones",
  "getGroceryCategoryOrder", "getBackupKeys", "getCloudSyncKeys",
];

const src = `
  ${main}
  ;return { ${EXPORTS.map((n) => `${n}: typeof ${n} === "function" ? ${n} : undefined`).join(", ")} };
`;

let api;
try {
  // eslint-disable-next-line no-new-func
  api = new Function(
    "localStorage", "document", "window", "navigator", "location",
    "matchMedia", "requestAnimationFrame", "getComputedStyle", "alert", "confirm", "prompt", "fetch", "Chart", "XLSX",
    src
  )(
    localStorage, document, windowStub, windowStub.navigator, windowStub.location,
    windowStub.matchMedia, noop, windowStub.getComputedStyle,
    noop, () => true, () => null, async () => ({ ok: false, status: 0, json: async () => ({}) }),
    ChartStub, XLSXStub
  );
} catch (e) {
  console.error("probe: app script failed to load —", e.message);
  process.exit(1);
}

let failed = 0;
function check(label, cond, detail) {
  if (cond) {
    console.log(`PASS  ${label}`);
  } else {
    failed++;
    console.log(`FAIL  ${label}${detail ? `\n      ${detail}` : ""}`);
  }
}

for (const name of EXPORTS) {
  check(`${name} is defined`, typeof api[name] === "function", "not found on script scope — check the function name/placement");
}
if (failed) {
  console.log(`\n${failed} check(s) failed — stopping before behavioural tests.`);
  process.exit(1);
}

// 1. empty list
check("empty list on first read", Array.isArray(api.getGroceryItems()) && api.getGroceryItems().length === 0,
  JSON.stringify(api.getGroceryItems()));

// 2. add a well-formed item
api.addGroceryItem({ name: "חלב", category: "מוצרי חלב", quantity: 2, unit: "ליטר", important: true });
let items = api.getGroceryItems();
check("add: item appears in list", items.length === 1, JSON.stringify(items));
const milk = items[0];
check("add: name preserved", milk && milk.name === "חלב", JSON.stringify(milk));
check("add: quantity coerced to number", milk && milk.quantity === 2, JSON.stringify(milk));
check("add: important flag preserved", milk && milk.important === true, JSON.stringify(milk));
check("add: default status is needed", milk && milk.status === "needed", JSON.stringify(milk));
check("add: id auto-generated", milk && typeof milk.id === "string" && milk.id.length > 0, JSON.stringify(milk));

// 3. reject empty name (should not add, should not throw)
let threw = false;
try { api.addGroceryItem({ name: "   " }); } catch (e) { threw = true; }
check("add: blank name does not throw", !threw);
check("add: blank name is not added", api.getGroceryItems().length === 1, JSON.stringify(api.getGroceryItems()));

// 4. add a second item, mark first as bought
api.addGroceryItem({ name: "לחם", category: "מאפים" });
items = api.getGroceryItems();
check("add: second item appears", items.length === 2, JSON.stringify(items));
api.updateGroceryItemStatus(milk.id, "bought");
items = api.getGroceryItems();
const milkAfter = items.find((i) => i.id === milk.id);
check("status: marked bought", milkAfter && milkAfter.status === "bought", JSON.stringify(milkAfter));
check("status: unrelated item untouched", items.find((i) => i.name === "לחם")?.status === "needed");

// 5. toggle back to needed
api.updateGroceryItemStatus(milk.id, "needed");
check("status: toggled back to needed", api.getGroceryItems().find((i) => i.id === milk.id)?.status === "needed");

// 6. delete and confirm tombstoned (does not reappear on re-read)
api.deleteGroceryItem(milk.id);
items = api.getGroceryItems();
check("delete: item removed from list", !items.find((i) => i.id === milk.id), JSON.stringify(items));
check("delete: one item remains (לחם)", items.length === 1 && items[0].name === "לחם", JSON.stringify(items));
const tombstones = api.getGroceryTombstones();
check("delete: tombstone recorded", !!tombstones[milk.id], JSON.stringify(tombstones));

// 7. registry — grocery keys are present in backup/cloud-sync key lists so a
// future backup/export can't silently miss the list.
const backupKeys = api.getBackupKeys ? api.getBackupKeys() : [];
const cloudKeys = api.getCloudSyncKeys ? api.getCloudSyncKeys() : [];
check("getBackupKeys includes grocery list key", backupKeys.includes(api.getGroceryListKey()), JSON.stringify(backupKeys));
check("getBackupKeys includes grocery tombstones key", backupKeys.includes(api.getGroceryTombstonesKey()));
check("getCloudSyncKeys includes grocery list key", cloudKeys.includes(api.getGroceryListKey()), JSON.stringify(cloudKeys));

// 8. category grouping order follows first-seen order
api.addGroceryItem({ name: "עגבניות", category: "ירקות" });
api.addGroceryItem({ name: "מלפפון", category: "ירקות" });
api.addGroceryItem({ name: "קוטג'", category: "מוצרי חלב" });
const order = api.getGroceryCategoryOrder(api.getGroceryItems());
check("category order: first-seen, no duplicates", JSON.stringify(order) === JSON.stringify(["מאפים", "ירקות", "מוצרי חלב"]),
  JSON.stringify(order));

console.log(failed ? `\n${failed} check(s) FAILED` : "\nALL CHECKS PASSED");
process.exit(failed ? 1 : 0);
