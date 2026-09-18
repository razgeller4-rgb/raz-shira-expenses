#!/usr/bin/env node
/* Cross-screen consistency audit for income/expense figures.
 *
 * Question it answers: does every screen in the app that shows "income",
 * "expenses" or a balance derive them from the same basis, so that the numbers
 * a user reads on the dashboard, the income tab, the cards tab and the yearly
 * view actually add up to each other?
 *
 * Rewritten 18.09.2026 ("חושבין מחדש"): the app used to carry two competing
 * bases (sheet vs derived charge-month/cash-basis) - Raz asked for exactly
 * one, so the checks that specifically compared those two bases (D/E/G in the
 * old version) are gone along with the code they tested. What is left checks
 * that the ONE remaining basis - opening + this month's income - this month's
 * expenses - debt, all by sheet - actually holds everywhere it is shown, and
 * that the single billing-day rule (getBillingSheetForExpense) is what both
 * manual entry and import actually use.
 *
 * READ-ONLY. Loads the app's own shipped functions against a real backup.
 * Usage: node tools/consistency_audit_probe.js [app.html] [backup.json] [user]
 */
const fs = require("fs");
const appPath = process.argv[2] || "expense-app-v37-demo.html";
const backupPath = process.argv[3];
const user = process.argv[4] || "raz";
const html = fs.readFileSync(appPath, "utf8");
const data = backupPath ? (JSON.parse(fs.readFileSync(backupPath, "utf8")).data || {}) : {};
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

// The demo namespaces every key with "demo__" and production does not, so the
// seed prefix has to follow the file under test - seeding demo__ keys into the
// production build silently yields an almost-empty dataset that still "runs".
const NS = /const STORAGE_NS_PREFIX\s*=\s*"demo__"/.test(html) ? "demo__" : "";
localStorage.setItem(`${NS}expense_app_active_user_v1`, user);
for (const base of ["expense_app_overrides_v29","expense_app_payment_methods_v1","expense_app_manual_settings_v35",
                    "expense_app_income_entries_v1","expense_app_debt_entries_v1","expense_app_balance_anchors_v1",
                    "expense_app_ui_prefs_v1","expense_app_categories_v1"]) {
  const v = raw(base); if (v != null) localStorage.setItem(`${NS}${base}`, v);
}

const scripts = [...html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const main = scripts.reduce((a, b) => (b.length > a.length ? b : a), "");
const EXPORTS = ["syncSheetOptions","getIncomeTotal","getExpenseStats",
                 "getDisplayedOpeningBalance","getDisplayedClosingBalance",
                 "getDashboardWidgetCatalog","getEditableRows","getSheetMonthYear",
                 "isDebtTrackingEnabled","getLoanScheduleEntryForSheet",
                 "getFatherRepaymentTotal","getIncomeRows","getTodayIso",
                 "getOpeningBalanceSource","getBalanceGapForSheet","getBalanceAnchorForSheet",
                 "parseBankStatementHtml","verifyBankStatementBalance",
                 "saveMonthStartAnchorsFromBankStatement","invalidateBalanceMemo",
                 "getBillingSheetForExpense","getPaymentMethodByName","resolveImportTargetSheet","getPrevSheet"];
let api;
try {
  api = new Function(
    "localStorage","document","window","navigator","location","matchMedia",
    "requestAnimationFrame","getComputedStyle","alert","confirm","prompt","fetch","Chart","XLSX","render",
    // sheetOptions is a live getter on purpose: syncSheetOptions() REASSIGNS the
    // SHEET_OPTIONS variable, so a value snapshot taken at load time would hand
    // back the stale pre-sync array (6 base sheets instead of the real 14).
    `${main}\n;return { sheetOptions: () => SHEET_OPTIONS, setBankSyncState: (s) => { bankSyncState = s; }, ${EXPORTS.map(n=>`${n}: typeof ${n} === "undefined" ? undefined : ${n}`).join(", ")} };`
  )(
    localStorage, document, w, w.navigator, w.location, w.matchMedia, noop, w.getComputedStyle,
    noop, () => true, () => null, async () => ({ok:false,status:0,json:async()=>({})}), C, X, noop
  );
} catch (e) {
  console.error("probe: app script failed to load —", e.message);
  process.exit(1);
}

api.syncSheetOptions();

// Optional 4th arg: a bank export. When given, the month-start anchors are
// written FIRST, so this run reports the state of the app after the U-1 fix
// rather than before it. Lets the same report be used as a before/after.
const bankArg = process.argv[5];
if (bankArg) {
  const parsed = api.parseBankStatementHtml(fs.readFileSync(bankArg, "utf8"));
  const verdict = api.verifyBankStatementBalance(parsed);
  api.setBankSyncState({ parsed, verdict, labels: [], fileName: bankArg });
  api.saveMonthStartAnchorsFromBankStatement();
  api.invalidateBalanceMemo();
  console.log(`[bank anchors applied from ${bankArg}]`);
}

const sheets = api.sheetOptions() || [];
const n = (v) => (v == null ? null : Math.round(Number(v)));
const f = (v) => (v == null ? "   —" : String(n(v)).padStart(8));

let issues = 0;
const flag = (msg) => { issues++; console.log(`  ⚠  ${msg}`); };

console.log(`app=${appPath}  user=${user}  backup=${backupPath || "(none)"}  sheets=${sheets.length}`);
console.log(`today=${api.getTodayIso ? api.getTodayIso() : "?"}\n`);

console.log("A. Per-sheet: the figures a user can read on screen");
console.log("   sheet            opening    income   expense    closing");
for (const sheet of sheets) {
  const opening = api.getDisplayedOpeningBalance(sheet);
  const income = api.getIncomeTotal(sheet);
  const stats = api.getExpenseStats(sheet);
  const closing = api.getDisplayedClosingBalance(sheet);
  console.log(`   ${sheet.padEnd(14)} ${f(opening)} ${f(income)} ${f(stats.total)} ${f(closing)}`);
}

console.log("\nB. Identity checks (what the code claims must hold)");
for (const sheet of sheets) {
  const opening = api.getDisplayedOpeningBalance(sheet);
  if (opening == null) continue;
  const income = api.getIncomeTotal(sheet);
  const stats = api.getExpenseStats(sheet);
  // C-8 (18.09): bank refunds the loan interest the same day it charges it -
  // .principal is the real cash impact, matching the app's corrected sites.
  const debt = api.isDebtTrackingEnabled() ? Number(api.getLoanScheduleEntryForSheet(sheet)?.principal || 0) : 0;
  const closing = api.getDisplayedClosingBalance(sheet);
  const expect = opening + income - stats.total - debt;
  if (Math.abs(expect - closing) > 0.5)
    flag(`${sheet}: closing != opening+income-expense-debt (${n(closing)} vs ${n(expect)})`);

  const cat = api.getDashboardWidgetCatalog(sheet);
  const mb = cat.find(x => x.id === "monthly_balance");
  const inc = cat.find(x => x.id === "income");
  const exp = cat.find(x => x.id === "total" || x.id === "expenses_total");
  if (inc && Math.abs(inc.value - income) > 0.5)
    flag(`${sheet}: dashboard widget "income" != getIncomeTotal`);
  if (mb) {
    const expectMb = income - stats.total - debt;
    if (Math.abs(mb.value - expectMb) > 0.5)
      flag(`${sheet}: widget monthly_balance (${n(mb.value)}) != income-expense-debt (${n(expectMb)})`);
  }
  if (exp && Math.abs(exp.value - stats.total) > 0.5)
    flag(`${sheet}: dashboard expenses widget != getExpenseStats.total`);
}

console.log("\nC. Opening-balance chain: opening(n) should equal closing(n-1)");
for (let i = 1; i < sheets.length; i++) {
  const prev = sheets[i-1], cur = sheets[i];
  const prevClosing = api.getDisplayedClosingBalance(prev);
  const curOpening = api.getDisplayedOpeningBalance(cur);
  if (prevClosing == null || curOpening == null) continue;
  const d = Math.abs(prevClosing - curOpening);
  if (d > 0.5) console.log(`   ${prev} closing ${n(prevClosing)} -> ${cur} opening ${n(curOpening)}  (delta ${n(curOpening - prevClosing)})`);
}

console.log("\nD. Is every broken chain link EXPLAINED to the user?");
console.log("   (a jump from closing(n-1) to opening(n) is fine when an anchor caused it");
console.log("    AND the gap banner fires; a silent jump is the dangerous case)");
for (let i = 1; i < sheets.length; i++) {
  const prev = sheets[i-1], cur = sheets[i];
  const prevClosing = api.getDisplayedClosingBalance(prev);
  const curOpening = api.getDisplayedOpeningBalance(cur);
  if (prevClosing == null || curOpening == null) continue;
  if (Math.abs(prevClosing - curOpening) <= 0.5) continue;
  const src = api.getOpeningBalanceSource ? api.getOpeningBalanceSource(cur) : "?";
  const gap = api.getBalanceGapForSheet ? api.getBalanceGapForSheet(cur) : null;
  const explained = Boolean(gap);
  console.log(`   ${cur.padEnd(14)} delta ${f(curOpening - prevClosing)}  source=${String(src).padEnd(8)} banner=${explained ? "YES" : "NO  <-- silent"}`);
  if (!explained) flag(`${cur}: opening jumps by ${n(curOpening - prevClosing)} with no anchor and no banner`);
}

console.log("\nE. What the gap banner will say (sheet basis only, since 18.09)");
console.log("   sheet          observed  computed      gap  basis");
for (const sheet of sheets) {
  const info = api.getBalanceGapForSheet(sheet);
  if (!info) continue;
  console.log(`   ${sheet.padEnd(14)} ${f(info.observed)} ${f(info.computed)} ${f(info.gap)}  ${info.source}`);
  // The banner's own "computed" side must now be exactly getDisplayedClosingBalance
  // of the previous sheet - if it isn't, something is reading a different basis
  // again without anyone deciding that on purpose.
  const prev = api.getPrevSheet(sheet);
  if (prev) {
    const expected = api.getDisplayedClosingBalance(prev);
    if (expected != null && Math.abs(expected - info.computed) > 0.5)
      flag(`${sheet}: gap banner's "computed" (${n(info.computed)}) != getDisplayedClosingBalance(prev) (${n(expected)})`);
  }
}

console.log("\nF. One billing rule, not two: manual entry and import must route identically");
// A regression guard for the 18.09 "חושבין מחדש": resolveImportTargetSheet used
// to prefer a statement-stated billing date over getBillingSheetForExpense.
// Simulate the same date/card through both entry points and require agreement.
const sampleMethod = (api.getPaymentMethodByName && sheets.length)
  ? (function () {
      for (const s of sheets) for (const row of api.getEditableRows(s)) {
        if (row.payment) return row.payment;
      }
      return null;
    })()
  : null;
if (sampleMethod) {
  const method = api.getPaymentMethodByName(sampleMethod);
  const testDates = ["05/09/2026", "10/09/2026", "16/09/2026"]; // date_raw is DD/MM/YYYY, not ISO
  for (const dateRaw of testDates) {
    const isoDate = `${dateRaw.slice(6,10)}-${dateRaw.slice(3,5)}-${dateRaw.slice(0,2)}`;
    const manual = api.getBillingSheetForExpense(isoDate, sampleMethod, method?.isImmediate ? "כן" : "", 0);
    const imported = api.resolveImportTargetSheet(
      { date_raw: dateRaw, billingDateRaw: "2099-01-15" }, // a bogus stated date - must be ignored
      sampleMethod, Boolean(method?.isImmediate), 0, "FALLBACK_SHOULD_NOT_APPEAR"
    );
    if (manual !== imported)
      flag(`${sampleMethod} ${dateRaw}: manual entry -> ${manual}, import -> ${imported} (should be identical)`);
  }
  console.log(`   checked "${sampleMethod}" (isImmediate=${Boolean(method?.isImmediate)}) on ${testDates.length} dates - a stated billingDateRaw was deliberately wrong and must be ignored`);
} else {
  console.log("   (no payment method found on any row - skipped)");
}

console.log(`\n${issues ? `${issues} consistency problem(s) flagged` : "no consistency problems flagged"}`);
