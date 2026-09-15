#!/usr/bin/env node
/* Runs the app's own shipping parseCCStatement against a real statement file,
 * using the REAL xlsx library (not tools/balance_harness.js's XLSXStub, which
 * returns empty results and would prove nothing about parsing). This is what
 * verified on 2026-09-14 that the existing "Max" branch already parses
 * Mizrahi's export correctly (17/17 real transactions) - and separately, that
 * it reads the statement's own billing-date column (r[9]) but never keeps it
 * anywhere in the returned txn object. See DECISION_REGISTER.md D-08.
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
 * Read-only: never writes to the statement file, the app file, or app state.
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

const EXPORTS = ["parseCCStatement", "normalizeStatementCell", "guessPaymentMethodForImport", "getCategoryDefinitions", "lookupMerchantMapping"];
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

const buf = fs.readFileSync(filePath);
const wb = XLSX.read(buf, { type: "buffer" });
console.log("sheet names:", wb.SheetNames);
const ws = wb.Sheets[wb.SheetNames[0]];
const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

const result = api.parseCCStatement(raw, path.basename(filePath));
console.log("\n--- parseCCStatement result ---");
console.log("format:", result.format);
console.log("cardName:", result.cardName);
console.log("chargeDate (top-level, only isracard/cal set this):", JSON.stringify(result.chargeDate));
console.log("last4:", result.last4);
console.log("txns.length:", result.txns.length);
console.log("first 3 txns:", JSON.stringify(result.txns.slice(0, 3), null, 1));
