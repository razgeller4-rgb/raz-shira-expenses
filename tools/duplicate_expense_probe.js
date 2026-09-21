#!/usr/bin/env node
/* Verifies getPossibleDuplicateRows against the app's OWN shipped code and REAL
 * expense data. This function only surfaces a dashboard review-queue item -
 * it never deletes or edits a row - so what matters is precision: does it
 * flag the real duplicates found by manual inspection on 2026-09-16, and does
 * it stay quiet on the look-alikes that are NOT duplicates (repeat coffee
 * purchases, rows the user already resolved by recategorizing to "לא רלוונטי")?
 *
 * Usage: node tools/duplicate_expense_probe.js <app.html> <backup.json> [user]
 *
 * READ-ONLY on disk.
 *
 * SECURITY NOTE - same pattern as tools/balance_harness.js: `new Function()` on
 * interpolated source runs the app's OWN <script> so what is verified is what
 * ships. Interpolated content is the app HTML at a developer-supplied path plus
 * a hardcoded identifier list - no user- or network-supplied input. Never
 * loaded by the browser; do not copy into application code.
 */

const fs = require("fs");

const [, , appPath, backupPath, userArg] = process.argv;
if (!appPath || !backupPath) {
  console.error("usage: node tools/duplicate_expense_probe.js <app.html> <backup.json> [user]");
  process.exit(2);
}
const user = userArg || "raz";
const suffix = user === "raz" ? "" : `_${user}`;

const html = fs.readFileSync(appPath, "utf8");
const data = JSON.parse(fs.readFileSync(backupPath, "utf8")).data || {};
const raw = (k) => { const v = data[k]; return v == null ? null : (typeof v === "string" ? v : JSON.stringify(v)); };

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
const mk = () => new Proxy(function () {}, {
  get(_t, p) {
    if (p === "style") return new Proxy({}, { get: () => "", set: () => true });
    if (p === "classList") return { add: noop, remove: noop, toggle: noop, contains: () => false };
    if (p === "dataset") return {};
    if (p === "children" || p === "childNodes") return [];
    if (p === "value" || p === "textContent" || p === "innerHTML") return "";
    if (p === "length") return 0;
    if (p === Symbol.iterator) return function* () {};
    if (p === "then") return undefined;
    return mk();
  }, set: () => true, apply: () => mk(),
});
const document = new Proxy({}, {
  get(_t, p) {
    if (p === "querySelectorAll" || p === "getElementsByClassName" || p === "getElementsByTagName") return () => [];
    if (p === "documentElement" || p === "body" || p === "head") return mk();
    if (p === "readyState") return "complete";
    if (p === "addEventListener" || p === "removeEventListener") return noop;
    if (p === "createElement" || p === "createElementNS") return () => mk();
    if (p === "getElementById" || p === "querySelector") return () => mk();
    return mk();
  },
});
const w = {
  addEventListener: noop, removeEventListener: noop,
  matchMedia: () => ({ matches: false, addEventListener: noop, addListener: noop }),
  requestAnimationFrame: noop, cancelAnimationFrame: noop,
  setTimeout: () => 0, clearTimeout: noop, setInterval: () => 0, clearInterval: noop,
  location: { href: "", protocol: "https:", search: "", hash: "" },
  navigator: { onLine: true, userAgent: "node", clipboard: { writeText: async () => {} } },
  localStorage, getComputedStyle: () => ({ getPropertyValue: () => "" }), devicePixelRatio: 1,
};
class C { constructor(){ this.data={datasets:[]}; this.options={}; } update(){} destroy(){} resize(){} static register(){} }
const X = { utils:{book_new:()=>({}),json_to_sheet:()=>({}),book_append_sheet:noop,sheet_to_json:()=>[]}, writeFile:noop, read:()=>({SheetNames:[],Sheets:{}}) };
process.on("unhandledRejection", () => {});

/* The demo namespaces every key with "demo__" and production does not, so the
   seed prefix has to follow the file under test. This used to hardcode
   "demo__": run against expense-app-v37.html it seeded keys production never
   reads, so the app loaded an EMPTY dataset, fell back to the 6 base sheets,
   and the three "should flag this known duplicate" assertions failed - looking
   exactly like a production regression while production was in fact fine.
   Fixed 21.09; same sniff consistency_audit_probe.js already used. */
const NS = /const STORAGE_NS_PREFIX\s*=\s*"demo__"/.test(html) ? "demo__" : "";
localStorage.setItem(`${NS}expense_app_active_user_v1`, user);
for (const base of ["expense_app_overrides_v29","expense_app_payment_methods_v1",
                    "expense_app_manual_settings_v35","expense_app_income_entries_v1",
                    "expense_app_debt_entries_v1"]) {
  const v = raw(base + suffix);
  if (v != null) localStorage.setItem(`${NS}${base}${suffix}`, v);
}

const scripts = [...html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const main = scripts.reduce((a, b) => (b.length > a.length ? b : a), "");
const EXPORTS = ["getPossibleDuplicateRows", "getEditableRows", "syncSheetOptions"];

let api;
try {
  // eslint-disable-next-line no-new-func
  api = new Function(
    "localStorage","document","window","navigator","location","matchMedia",
    "requestAnimationFrame","getComputedStyle","alert","confirm","prompt","fetch","Chart","XLSX",
    `${main}\n;return { ${EXPORTS.map(n=>`${n}: typeof ${n} === "function" ? ${n} : undefined`).join(", ")}, getSheetOptions: () => SHEET_OPTIONS };`
  )(
    localStorage, document, w, w.navigator, w.location, w.matchMedia, noop, w.getComputedStyle,
    noop, () => true, () => null, async () => ({ok:false,status:0,json:async()=>({})}), C, X
  );
} catch (e) {
  console.error("probe: app script failed to load —", e.message);
  process.exit(1);
}

let failed = 0;
const check = (label, cond, detail) => {
  if (cond) console.log(`PASS  ${label}`);
  else { failed++; console.log(`FAIL  ${label}${detail ? `\n      ${detail}` : ""}`); }
};
for (const n of EXPORTS) check(`${n} is defined`, typeof api[n] === "function");
if (failed) { console.log(`\n${failed} missing — stopping.`); process.exit(1); }

api.syncSheetOptions();
const sheets = api.getSheetOptions();

// ── Only meaningful when running as raz against the shared backup: the
// specific sheets/rows below were found by manual inspection of that exact
// data on 2026-09-16 and are hardcoded to that case.
if (user === "raz") {
  const jan = api.getPossibleDuplicateRows("ינואר 26");
  check("flags the AIG ביטוח חובה duplicate in ינואר 26 (unresolved — real bug)",
    jan.some(d => d.merchant.includes("AIG") && d.rows.includes(48) && d.rows.includes(98)),
    JSON.stringify(jan));

  const mar = api.getPossibleDuplicateRows("מרץ 26");
  check("flags the לוסיד same-day duplicate in מרץ 26 (rows 35+36)",
    mar.some(d => d.merchant === "לוסיד" && d.rows.includes(35) && d.rows.includes(36)),
    JSON.stringify(mar));
  check("flags the second לוסיד same-day duplicate in מרץ 26 (rows 67+68)",
    mar.some(d => d.merchant === "לוסיד" && d.rows.includes(67) && d.rows.includes(68)),
    JSON.stringify(mar));

  const apr = api.getPossibleDuplicateRows("אפריל 26");
  check("stays quiet on בלינק פינטק — user already marked one row לא רלוונטי",
    !apr.some(d => d.merchant.includes("בלינק")), JSON.stringify(apr));
  check("stays quiet on הפניקס/איילון — same insurer, two DIFFERENT real policy amounts every month",
    !apr.some(d => d.merchant.includes("הפניקס") || d.merchant.includes("איילון")), JSON.stringify(apr));

  const aug = api.getPossibleDuplicateRows("אוגוסט 26");
  check("stays quiet on רשות התעופה — user already marked all three rows לא רלוונטי",
    !aug.some(d => d.merchant.includes("רשות התעופה")), JSON.stringify(aug));

  const jul = api.getPossibleDuplicateRows("יולי 26");
  check("stays quiet on real different-day coffee purchases (סי קפה, different dates)",
    !jul.some(d => d.merchant.includes("סי קפה")), JSON.stringify(jul));
}

// ── Structural checks that must hold for every sheet, either user.
let sheetsChecked = 0, structurallyValid = 0;
const badSamples = [];
for (const s of sheets) {
  const dups = api.getPossibleDuplicateRows(s);
  sheetsChecked++;
  const ok = dups.every(d =>
    typeof d.merchant === "string" && d.merchant.length > 0 &&
    Number.isFinite(d.amount) &&
    Array.isArray(d.rows) && d.rows.length >= 2 &&
    new Set(d.rows).size === d.rows.length
  );
  if (ok) structurallyValid++;
  else if (badSamples.length < 3) badSamples.push({ sheet: s, dups });
}
check(`every duplicate group is well-formed across all ${sheetsChecked} sheets`,
  structurallyValid === sheetsChecked, JSON.stringify(badSamples));

// ── No group should consist entirely of rows already marked לא רלוונטי -
// that is the exact "already acknowledged" signal this function must respect.
let allClearOk = true;
const violations = [];
for (const s of sheets) {
  const dups = api.getPossibleDuplicateRows(s);
  for (const d of dups) {
    const rows = api.getEditableRows(s).filter(r => d.rows.includes(r.row));
    if (rows.length && rows.every(r => (r.category || "").trim() === "לא רלוונטי")) {
      allClearOk = false;
      violations.push({ sheet: s, merchant: d.merchant });
    }
  }
}
check("never flags a group the user has fully marked לא רלוונטי", allClearOk, JSON.stringify(violations));

console.log("");
console.log(`total duplicate groups found across ${sheetsChecked} sheets (${user}):`,
  sheets.reduce((n, s) => n + api.getPossibleDuplicateRows(s).length, 0));

console.log(failed ? `\n${failed} check(s) FAILED` : "\nALL CHECKS PASSED");
process.exit(failed ? 1 : 0);
