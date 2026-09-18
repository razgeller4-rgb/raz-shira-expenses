#!/usr/bin/env node
/* D-13 step 3 (move reporting to calendar/charge month) - READ-ONLY simulation.
 * Before touching getExpenseStats, measure what would actually change: for
 * every real sheet, compare its CURRENT total (getEditableRows(sheet), i.e.
 * whatever sheet the row physically sits in) against a CHARGE-MONTH total
 * (every row across every sheet whose getChargeMonthForRow() matches this
 * sheet's calendar month) using the app's own shipped functions.
 *
 * Usage: node tools/calendar_reporting_sim.js <app.html> <backup.json> [user]
 * READ-ONLY on disk. Same new-Function harness pattern as the other tools/*.
 */
const fs = require("fs");
const [, , appPath, backupPath, userArg] = process.argv;
if (!appPath || !backupPath) {
  console.error("usage: node tools/calendar_reporting_sim.js <app.html> <backup.json> [user]");
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

localStorage.setItem("demo__expense_app_active_user_v1", user);
for (const base of ["expense_app_overrides_v29","expense_app_payment_methods_v1",
                    "expense_app_manual_settings_v35","expense_app_income_entries_v1",
                    "expense_app_debt_entries_v1"]) {
  const v = raw(base + suffix);
  if (v != null) localStorage.setItem(`demo__${base}${suffix}`, v);
}

const scripts = [...html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const main = scripts.reduce((a, b) => (b.length > a.length ? b : a), "");
const EXPORTS = ["getExpenseStats", "getChargeMonthForRow", "getEditableRows", "syncSheetOptions", "getSheetMonthYear"];
const api = new Function(
  "localStorage","document","window","navigator","location","matchMedia",
  "requestAnimationFrame","getComputedStyle","alert","confirm","prompt","fetch","Chart","XLSX",
  `${main}\n;return { ${EXPORTS.map(n=>`${n}: typeof ${n} === "function" ? ${n} : undefined`).join(", ")}, getSheetOptions: () => SHEET_OPTIONS };`
)(
  localStorage, document, w, w.navigator, w.location, w.matchMedia, noop, w.getComputedStyle,
  noop, () => true, () => null, async () => ({ok:false,status:0,json:async()=>({})}), C, X
);

api.syncSheetOptions();
const sheets = api.getSheetOptions();

// Build the charge-month totals ONCE across all sheets (mirrors getCashOutSummary's approach).
const chargeMonthTotals = new Map();
for (const s of sheets) {
  for (const row of api.getEditableRows(s)) {
    const cm = api.getChargeMonthForRow(row);
    if (!cm) continue;
    chargeMonthTotals.set(cm, (chargeMonthTotals.get(cm) || 0) + Number(row.amount || 0));
  }
}

console.log(`${user}: sheet-total (current) vs charge-month-total (proposed)\n`);
console.log("sheet".padEnd(14), "current".padStart(12), "chargeMonth".padStart(12), "diff".padStart(10));
let anyDiff = false;
for (const s of sheets) {
  const current = api.getExpenseStats(s).total;
  const { month, year } = api.getSheetMonthYear(s);
  if (!month || !year) continue;
  const key = `${year}-${String(month).padStart(2,"0")}`;
  const chargeMonth = chargeMonthTotals.get(key) || 0;
  const diff = chargeMonth - current;
  if (Math.abs(diff) > 0.5) anyDiff = true;
  console.log(
    s.padEnd(14),
    current.toFixed(2).padStart(12),
    chargeMonth.toFixed(2).padStart(12),
    diff.toFixed(2).padStart(10)
  );
}
console.log(anyDiff ? "\n(non-zero diffs above — this is the real blast radius)" : "\n(no differences — reporting basis change would be a no-op on this data)");
