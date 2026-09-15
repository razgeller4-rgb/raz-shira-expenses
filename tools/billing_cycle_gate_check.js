#!/usr/bin/env node
/* D-08's explicit gate: "don't implement [the cycleDay rule change] before
 * domain-risk-reviewer and before opening a real closed month in a backup to
 * see how it was actually recorded." (DECISION_REGISTER.md D-08)
 *
 * This runs that check across EVERY sheet for one user, not one month picked
 * by hand: for every expense row on a cycle-based (non-immediate) payment
 * method, it compares the sheet the row is ACTUALLY filed under against what
 * today's live getBillingSheetForExpense computes for that row's own
 * date_raw. A mismatch means the row was NOT placed by the current
 * calculation - either entered by hand, or (if importMeta is set) imported
 * under a different rule than exists today.
 *
 * Runs the app's own shipping code, unmodified - a reimplementation would
 * prove nothing about the function we actually ship. Read-only: never writes
 * to the backup or the app file.
 *
 * Sheet comparison is by (year, month) semantics via getSheetMonthYear, not
 * by string equality - CARRY-16 means "אוקטובר 2025" and "אוקטובר 25" are the
 * same month spelled two ways, and a naive string compare would report that
 * formatting quirk as a cycle-rule mismatch and drown the real signal.
 *
 * Usage:
 *   node tools/billing_cycle_gate_check.js <app.html> <backup.json> [user]
 *
 * Result as of 2026-09-14 (see DECISION_REGISTER.md D-08 for the full
 * writeup): the finding is MIXED, not a clean confirmation either way.
 *   - day < cycleDay: real historical rows stay in their own transaction
 *     month. The CURRENT rule (shift back one month) contradicts this with
 *     zero clean counterexamples across 14+ rows. D-08's proposed new rule
 *     (same month) matches.
 *   - day >= cycleDay: the overwhelming majority ALSO stay in their own
 *     transaction month - which happens to match the current rule's output,
 *     but is equally consistent with "filed by calendar month with no regard
 *     to cycle logic at all." This is NOT clean evidence for the proposed
 *     rule's forward-shift on this side.
 *   Net: real filing habits do not cleanly confirm the proposed rule change
 *   in both directions, but they do refute the CURRENT rule's day<cycleDay
 *   behavior outright. Recommended action was narrower than flipping the
 *   rule: capture the statement's own stated billing date on import (see
 *   parseCCStatement's Max branch - it reads r[9]/billingDate but never
 *   keeps it), which sidesteps needing the calculated fallback to be right
 *   for cycle-based cards in the first place.
 *
 * SECURITY NOTE: uses new Function() on the app's own <script> content, same
 * scoped, reviewed pattern as tools/balance_harness.js - see that file's
 * header for the full rationale. Do not copy into application code.
 */
const fs = require("fs");

const [, , appPath, backupPath, userArg = "raz"] = process.argv;
if (!appPath || !backupPath) {
  console.error("usage: node tools/billing_cycle_gate_check.js <app.html> <backup.json> [user]");
  process.exit(2);
}

const html = fs.readFileSync(appPath, "utf8");
const backup = JSON.parse(fs.readFileSync(backupPath, "utf8"));

const nsMatch = html.match(/const\s+STORAGE_NS_PREFIX\s*=\s*"([^"]*)"/);
const NS = nsMatch ? nsMatch[1] : "";
const store = new Map();
for (const [k, v] of Object.entries(backup.data || {})) {
  store.set(NS + k, typeof v === "string" ? v : JSON.stringify(v));
}
store.set(NS + "expense_app_active_user_v1", userArg);

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
    if (prop === "querySelectorAll" || prop === "getElementsByClassName" || prop === "getElementsByTagName") return () => [];
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
  localStorage, getComputedStyle: () => ({ getPropertyValue: () => "" }), devicePixelRatio: 1,
};
class ChartStub { constructor() { this.data = { datasets: [] }; this.options = {}; } update() {} destroy() {} resize() {} static register() {} }
const XLSXStub = {
  utils: { book_new: () => ({}), json_to_sheet: () => ({}), book_append_sheet: noop, sheet_to_json: () => [] },
  writeFile: noop, read: () => ({ SheetNames: [], Sheets: {} }),
};
process.on("unhandledRejection", () => {});

const scripts = [...html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const main = scripts.reduce((a, b) => (b.length > a.length ? b : a), "");
const EXPORTS = ["getBillingSheetForExpense", "getPaymentMethods", "getPaymentMethodByName", "getEditableRows", "syncSheetOptions", "toIsoDate", "getSheetMonthYear"];
const src = `${main}\n;return { ${EXPORTS.map((n) => `${n}: typeof ${n} === "function" ? ${n} : undefined`).join(", ")},
  get SHEET_OPTIONS(){ return typeof SHEET_OPTIONS !== "undefined" ? SHEET_OPTIONS : []; } };`;

const api = new Function(
  "localStorage", "document", "window", "navigator", "location",
  "matchMedia", "requestAnimationFrame", "getComputedStyle", "alert", "confirm", "prompt", "fetch", "Chart", "XLSX",
  src
)(
  localStorage, document, windowStub, windowStub.navigator, windowStub.location,
  windowStub.matchMedia, noop, windowStub.getComputedStyle,
  noop, () => true, () => null, async () => ({ ok: false, status: 0, json: async () => ({}) }),
  ChartStub, XLSXStub
);

if (api.syncSheetOptions) { try { api.syncSheetOptions(); } catch (e) {} }

console.log("=== user:", userArg, "===");
console.log("payment methods:", JSON.stringify(api.getPaymentMethods().map((m) => ({ name: m.name, cycleDay: m.cycleDay, isImmediate: m.isImmediate }))));

const sheets = api.SHEET_OPTIONS || [];
let checked = 0, mismatches = 0, matches = 0;
const mismatchRows = [];
const monthKey = (s) => { try { const mi = api.getSheetMonthYear(s); return `${mi.year}-${mi.month}`; } catch (e) { return s; } };

for (const sheet of sheets) {
  let rows;
  try { rows = api.getEditableRows(sheet); } catch (e) { continue; }
  for (const row of rows) {
    if (!row.payment) continue;
    const pm = api.getPaymentMethodByName ? api.getPaymentMethodByName(row.payment) : null;
    if (!pm || pm.isImmediate) continue; // only cycle-based cards are relevant to this question
    const iso = api.toIsoDate(row.date_raw);
    if (!iso) continue;
    checked++;
    const computed = api.getBillingSheetForExpense(iso, row.payment, "", 0);
    if (monthKey(computed) !== monthKey(sheet)) {
      mismatches++;
      mismatchRows.push({
        actualSheet: sheet, computedSheet: computed, date: row.date_raw,
        merchant: row.merchant, amount: row.amount, payment: row.payment,
        cycleDay: pm.cycleDay, imported: !!row.importMeta,
        dayOfMonth: Number(iso.split("-")[2]),
      });
    } else {
      matches++;
    }
  }
}

console.log(`\nchecked (cycle-based, non-immediate) rows: ${checked}`);
console.log(`match current rule: ${matches}`);
console.log(`MISMATCH vs current rule: ${mismatches}`);
console.log("\n--- mismatches, sorted by day-of-month (near the cycle boundary matters most) ---");
mismatchRows.sort((a, b) => a.dayOfMonth - b.dayOfMonth);
const SHOW = 60;
mismatchRows.slice(0, SHOW).forEach((r) => {
  console.log(
    `day=${String(r.dayOfMonth).padStart(2, "0")} cycleDay=${r.cycleDay}  actual=[${r.actualSheet}]  currentRuleSays=[${r.computedSheet}]  imported=${r.imported}  ${r.date}  ${r.merchant}  ${r.amount}`
  );
});
if (mismatchRows.length > SHOW) console.log(`... and ${mismatchRows.length - SHOW} more`);
