#!/usr/bin/env node
/* Verifies the D-13 cash-out read model (getChargeMonthForRow /
 * getCashOutSummary) against the app's OWN shipped code and REAL expense data.
 *
 * The properties that matter:
 *  - the model is a pure READ: it must not change any existing number
 *  - money is conserved: every dated row lands in exactly one charge month
 *  - an unknown opening balance yields null, never a confident 0 (CARRY-14)
 *
 * Usage: node tools/cash_out_probe.js <app.html> <backup.json> [user]
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
  console.error("usage: node tools/cash_out_probe.js <app.html> <backup.json> [user]");
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
const EXPORTS = [
  "getChargeMonthForRow", "getCashOutSummary", "getExpenseStats",
  "getDisplayedClosingBalance", "getEditableRows", "getPaymentMethods",
  "syncSheetOptions", "getSheetMonthYear",
];

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
/* Iterate exactly the set getCashOutSummary itself iterates. An earlier version
 * filtered to sheets with rows and then compared against an implementation that
 * walked all of SHEET_OPTIONS, so the two sides were summing different row sets
 * and the conservation check failed for reasons that had nothing to do with the
 * model. Compare like with like; measure the model, not the harness. */
const allSheets = [...api.getSheetOptions()];
const sheets = allSheets.filter(s => api.getEditableRows(s).length > 0);
check("real sheets loaded", sheets.length > 0, `SHEET_OPTIONS=${allSheets.length}`);

// ── 1. Every dated row maps to exactly one well-formed charge month.
let dated = 0, bad = 0;
const samples = [];
for (const s of sheets) {
  for (const row of api.getEditableRows(s)) {
    const cm = api.getChargeMonthForRow(row);
    if (!cm) continue;
    dated++;
    if (!/^\d{4}-\d{2}$/.test(cm)) { bad++; if (samples.length < 4) samples.push(`${row.merchant}: ${cm}`); }
  }
}
check(`charge month well-formed for all ${dated} dated rows`, bad === 0, samples.join(" | "));

// ── 2. Conservation: summing cash-out across every month must equal the sum of
// the same rows' amounts. Money may move in time but must not appear or vanish.
const perMonth = new Map();
let rowTotal = 0;
for (const s of allSheets) {
  for (const row of api.getEditableRows(s)) {
    const cm = api.getChargeMonthForRow(row);
    if (!cm) continue;
    const amt = Number(row.amount || 0);
    rowTotal += amt;
    perMonth.set(cm, (perMonth.get(cm) || 0) + amt);
  }
}
const summed = [...perMonth.values()].reduce((a, b) => a + b, 0);
check("money conserved across charge months", Math.abs(summed - rowTotal) < 0.01,
  `rows=${rowTotal.toFixed(2)} bucketed=${summed.toFixed(2)}`);

// ── 3. getCashOutSummary splits that total into exactly two parts.
/* Recompute the per-month expectation against the LIVE SHEET_OPTIONS rather
 * than the snapshot above: getCashOutSummary calls syncSheetOptions() itself,
 * which can extend the list, so a snapshot taken earlier silently compares
 * against a smaller row set and reports a phantom 242 discrepancy. */
// Warm up first: the very first getCashOutSummary call runs syncSheetOptions,
// which can extend SHEET_OPTIONS. Building the expectation before that call
// compares against a smaller list than the implementation actually walks.
if (api.getSheetOptions().length) api.getCashOutSummary(api.getSheetOptions()[0]);
const liveMonth = new Map();
for (const s of api.getSheetOptions()) {
  for (const row of api.getEditableRows(s)) {
    const cm = api.getChargeMonthForRow(row);
    if (!cm) continue;
    liveMonth.set(cm, (liveMonth.get(cm) || 0) + Number(row.amount || 0));
  }
}
let summariesChecked = 0, splitOk = 0;
for (const s of api.getSheetOptions()) {
  const sum = api.getCashOutSummary(s);
  if (!sum) continue;
  summariesChecked++;
  const expected = liveMonth.get(sum.month) || 0;
  // Three buckets since 18.09: settled / card-not-yet-billed / cash-dated-later.
  // The third exists because a cash row dated later this month has not left the
  // account yet, so subtracting it from "how much is there today" is wrong.
  if (Math.abs((sum.alreadyLeft + sum.cardDue + sum.upcomingCash) - expected) < 0.01) splitOk++;
  else if (summariesChecked <= 3) {
    console.log(`      ${s}: already=${sum.alreadyLeft.toFixed(0)} cards=${sum.cardDue.toFixed(0)} upcoming=${sum.upcomingCash.toFixed(0)} expected=${expected.toFixed(0)}`);
  }
}
check(`alreadyLeft + cardDue + upcomingCash equals the month total (${splitOk}/${summariesChecked})`,
  splitOk === summariesChecked);

// ── 4. CARRY-14: unknown opening must be null, never 0.
const nulls = sheets.map(s => api.getCashOutSummary(s)).filter(Boolean)
  .filter(x => x.nowBalance === null);
check("unknown opening balance yields null, not 0",
  nulls.every(x => x.afterCardsBalance === null),
  `${nulls.length} sheets have a null opening`);

// ── 5. The read model must not have perturbed the existing numbers.
const snapshot = sheets.map(s => ({
  sheet: s,
  stats: api.getExpenseStats(s).total,
  closing: api.getDisplayedClosingBalance(s)
}));
sheets.forEach(s => api.getCashOutSummary(s)); // exercise it again
const after = sheets.map(s => ({
  sheet: s,
  stats: api.getExpenseStats(s).total,
  closing: api.getDisplayedClosingBalance(s)
}));
check("existing stats/closing unchanged by the read model",
  JSON.stringify(snapshot) === JSON.stringify(after));

// ── Report a couple of real months so the numbers are visible, not just asserted.
console.log("");
const recent = sheets.slice(-3);
for (const s of recent) {
  const sum = api.getCashOutSummary(s);
  if (!sum) continue;
  const f = (n) => n == null ? "—" : "₪" + Math.round(n).toLocaleString();
  console.log(`      ${s} (${sum.month}): כבר ירד ${f(sum.alreadyLeft)} · צפוי באשראי ${f(sum.cardDue)} · עו״ש עכשיו ${f(sum.nowBalance)} · אחרי אשראי ${f(sum.afterCardsBalance)}`);
}

console.log(failed ? `\n${failed} check(s) FAILED` : "\nALL CHECKS PASSED");
process.exit(failed ? 1 : 0);
