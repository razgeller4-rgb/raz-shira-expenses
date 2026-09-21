#!/usr/bin/env node
/* Runs the app's own shipping parseCCStatement + resolveImportTargetSheet
 * against a real statement file, using the REAL xlsx library (not
 * tools/balance_harness.js's XLSXStub, which returns empty results and would
 * prove nothing about parsing). This is what verified on 2026-09-14 that the
 * existing "Max" branch already parses Mizrahi's export correctly (17/17 real
 * transactions), and on 2026-09-15 that a naive fix would have silently
 * fallen back to the old (wrong) routing rule while looking like it worked -
 * see DECISION_REGISTER.md D-08 and D08_NARROW_FIX_REVIEW_2026-09-15.md.
 *
 * REQUIRES a local copy of the exact xlsx build the app loads from CDN
 * (xlsx@0.18.5, see the <script src> in expense-app-v37-demo.html's <head>).
 * This script does NOT fetch it — that is a deliberate choice, not an
 * oversight: downloading and executing third-party code is something the
 * operator must decide to do each time, not something a checked-in script
 * does on its own initiative. To get it:
 *   curl -sL "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js" -o /tmp/xlsx.full.min.js
 *
 * Usage:
 *   node tools/cc_import_probe.js <app.html> <statement.xlsx> [/path/to/xlsx.full.min.js]
 *
 * Exits non-zero on any assertion failure, so this can gate a promotion, not
 * just "looks right in a manual read". Read-only: never writes to the
 * statement file, the app file, or app state.
 *
 * SECURITY NOTE: uses new Function() on the app's own <script> content, same
 * scoped, reviewed pattern as tools/balance_harness.js - see that file's
 * header for the full rationale. Do not copy into application code.
 */
const fs = require("fs");
const path = require("path");

const [, , appPath, filePath, xlsxLibPath = "/tmp/xlsx.full.min.js"] = process.argv;
if (!appPath || !filePath) {
  console.error("usage: node tools/cc_import_probe.js <app.html> <statement.xlsx> [/path/to/xlsx.full.min.js]");
  process.exit(2);
}
if (!fs.existsSync(xlsxLibPath)) {
  console.error(`xlsx library not found at ${xlsxLibPath}.`);
  console.error(`Fetch the exact version the app uses first:`);
  console.error(`  curl -sL "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js" -o ${xlsxLibPath}`);
  process.exit(2);
}
const XLSX = require(xlsxLibPath);

const html = fs.readFileSync(appPath, "utf8");
const scripts = [...html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const main = scripts.reduce((a, b) => (b.length > a.length ? b : a), "");

const EXPORTS = [
  "parseCCStatement", "normalizeStatementCell", "guessPaymentMethodForImport",
  "getCategoryDefinitions", "lookupMerchantMapping", "resolveImportTargetSheet",
  "getBillingSheetForExpense", "toIsoDate", "syncSheetOptions",
];
const src = `${main}\n;return { ${EXPORTS.map((n) => `${n}: typeof ${n} === "function" ? ${n} : undefined`).join(", ")} };`;

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
    if (prop === "querySelectorAll" || prop === "getElementsByClassName" || prop === "getElementsByTagName") return () => [];
    if (prop === "documentElement" || prop === "body" || prop === "head") return makeEl();
    if (prop === "readyState") return "complete";
    if (prop === "addEventListener" || prop === "removeEventListener") return noop;
    if (prop === "createElement" || prop === "createElementNS") return () => makeEl();
    if (prop === "getElementById" || prop === "querySelector") return () => makeEl();
    return makeEl();
  },
});
const localStorage = { getItem: () => null, setItem: noop, removeItem: noop, clear: noop, key: () => null, length: 0 };
const windowStub = {
  addEventListener: noop, removeEventListener: noop,
  matchMedia: () => ({ matches: false, addEventListener: noop, addListener: noop }),
  requestAnimationFrame: noop, cancelAnimationFrame: noop,
  setTimeout: () => 0, clearTimeout: noop, setInterval: () => 0, clearInterval: noop,
  location: { href: "", protocol: "https:", search: "", hash: "" },
  navigator: { onLine: true, userAgent: "node", clipboard: { writeText: async () => {} } },
  localStorage, getComputedStyle: () => ({ getPropertyValue: () => "" }), devicePixelRatio: 1,
};
class ChartStub { constructor() { this.data = { datasets: [] }; this.options = {}; } update() {} destroy() {} resize() {} static register() {} }
process.on("unhandledRejection", () => {});

const api = new Function(
  "localStorage", "document", "window", "navigator", "location",
  "matchMedia", "requestAnimationFrame", "getComputedStyle", "alert", "confirm", "prompt", "fetch", "Chart", "XLSX",
  src
)(
  localStorage, document, windowStub, windowStub.navigator, windowStub.location,
  windowStub.matchMedia, noop, windowStub.getComputedStyle,
  noop, () => true, () => null, async () => ({ ok: false, status: 0, json: async () => ({}) }),
  ChartStub, XLSX
);
if (api.syncSheetOptions) { try { api.syncSheetOptions(); } catch (e) {} }

const buf = fs.readFileSync(filePath);
const wb = XLSX.read(buf, { type: "buffer" });
console.log("sheet names:", wb.SheetNames);
const ws = wb.Sheets[wb.SheetNames[0]];
const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

const result = api.parseCCStatement(raw, path.basename(filePath));
console.log("\n--- parseCCStatement result ---");
console.log("format:", result.format);
console.log("cardName:", result.cardName);
console.log("last4:", result.last4);
console.log("txns.length:", result.txns.length);
console.log("first 3 txns:", JSON.stringify(result.txns.slice(0, 3), null, 1));

/* ---- assertions (added 2026-09-15, per domain-risk-reviewer §5) ---------
 * D08_NARROW_FIX_REVIEW_2026-09-15.md is explicit that this is the failure
 * mode that matters most here: a bad normalizer can return "" and silently
 * fall back to the old rule, and *nothing about the output looks wrong* in a
 * casual read. These assertions exist so that failure mode fails loudly. */
const results = [];
const check = (name, pass, detail) => { results.push({ name, pass, detail }); console.log(`${pass ? "PASS" : "FAIL"}  ${name}\n        ${detail}`); };

if (result.format === "max") {
  const withDate = result.txns.filter((t) => t.billingDateRaw);
  check(
    "every max-format txn carries a non-empty billingDateRaw",
    withDate.length === result.txns.length,
    `${withDate.length}/${result.txns.length} have it`
  );

  const isoDates = result.txns.map((t) => api.toIsoDate(t.billingDateRaw));
  check(
    "billingDateRaw normalizes to a valid ISO date, not \"\"",
    isoDates.every((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)),
    JSON.stringify([...new Set(isoDates)])
  );

  if (result.txns.length) {
    const sample = result.txns[0];
    const fallbackSheet = "FALLBACK_SHOULD_NOT_APPEAR";
    const withStated = api.resolveImportTargetSheet(sample, "ויזה מזרחי", false, 0, fallbackSheet);
    const withoutStated = api.resolveImportTargetSheet({ ...sample, billingDateRaw: "" }, "ויזה מזרחי", false, 0, fallbackSheet);
    /* INVERTED 21.09.2026. This assertion was written for D-08, when a stated
       billing date was supposed to WIN over the purchase date. The 18.09
       "חושבין מחדש" deleted that preference on Raz's explicit instruction -
       "החיוב הוא ב10 לאוקטובר... זה הוצאות של ספטמבר" - so the statement's own
       billing date must now be ignored entirely and both paths must agree.
       The old assertion kept failing green-to-red against correct code; left
       as-is it would have trained us to ignore this probe. */
    check(
      "a stated billing date is IGNORED - routing matches the date-only calculation",
      withStated === withoutStated,
      `stated -> ${withStated}, calculated -> ${withoutStated} (they must match; a difference means billingDateRaw is steering routing again)`
    );
    check(
      "with NO billing date, routing still produces something (regression: fallback path not broken)",
      typeof withoutStated === "string" && withoutStated !== fallbackSheet,
      `-> ${withoutStated}`
    );
  }
} else {
  console.log(`\n(format is "${result.format}", not "max" - billingDateRaw assertions only apply to the max branch today, see M-2 in the review)`);
}

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (results.length && failed.length) process.exitCode = 1;
