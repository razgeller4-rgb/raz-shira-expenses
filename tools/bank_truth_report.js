#!/usr/bin/env node
/* Ground-truth month-by-month reconciliation: the BANK export vs what the app
 * shows. The bank statement carries a running-balance column, so it - not the
 * app - is the authority on what the checking account actually did.
 *
 * Answers, per month: what really came IN (income), what really went OUT split
 * into card charges vs everything else, and where the app's numbers diverge.
 *
 * READ-ONLY. Uses the app's own parseBankStatementHtml so the parsing can't
 * drift from what the app does at import time.
 *
 * Usage: node tools/bank_truth_report.js <app.html> <backup.json> <bank.xls> [user]
 */
const fs = require("fs");
const appPath = process.argv[2] || "expense-app-v37-demo.html";
const backupPath = process.argv[3];
const bankPath = process.argv[4];
const user = process.argv[5] || "raz";
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

const NS = /const STORAGE_NS_PREFIX\s*=\s*"demo__"/.test(html) ? "demo__" : "";
localStorage.setItem(`${NS}expense_app_active_user_v1`, user);
for (const base of ["expense_app_overrides_v29","expense_app_payment_methods_v1","expense_app_manual_settings_v35",
                    "expense_app_income_entries_v1","expense_app_debt_entries_v1","expense_app_balance_anchors_v1",
                    "expense_app_ui_prefs_v1","expense_app_categories_v1"]) {
  const v = raw(base); if (v != null) localStorage.setItem(`${NS}${base}`, v);
}

const scripts = [...html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const main = scripts.reduce((a, b) => (b.length > a.length ? b : a), "");
const EXPORTS = ["syncSheetOptions","parseBankStatementHtml","getSheetMonthYear","getIncomeTotal",
                 "getIncomeReceivedToDate","getIncomeRows","getExpenseStats","getEditableRows",
                 "getChargeMonthForRow","getDisplayedOpeningBalance","getDisplayedClosingBalance",
                 "getOpeningBalanceSource","getPaymentMethods","toIsoDate"];
let api;
try {
  api = new Function(
    "localStorage","document","window","navigator","location","matchMedia",
    "requestAnimationFrame","getComputedStyle","alert","confirm","prompt","fetch","Chart","XLSX","render",
    `${main}\n;return { sheetOptions: () => SHEET_OPTIONS, ${EXPORTS.map(n=>`${n}: typeof ${n} === "undefined" ? undefined : ${n}`).join(", ")} };`
  )(
    localStorage, document, w, w.navigator, w.location, w.matchMedia, noop, w.getComputedStyle,
    noop, () => true, () => null, async () => ({ok:false,status:0,json:async()=>({})}), C, X, noop
  );
} catch (e) {
  console.error("probe: app script failed to load —", e.message);
  process.exit(1);
}

api.syncSheetOptions();
const sheets = api.sheetOptions() || [];
const parsed = api.parseBankStatementHtml(fs.readFileSync(bankPath, "utf8"));
const txns = parsed.transactions || [];
if (!txns.length) { console.error("no transactions parsed from", bankPath); process.exit(1); }

const n = (v) => (v == null ? null : Math.round(Number(v)));
const f = (v, w = 9) => (v == null ? "—".padStart(w) : String(n(v)).padStart(w));
const ym = (iso) => iso.slice(0, 7);

// A debit is a card bill when the bank describes it as a standing order /
// credit-card collection. Anything else is cash the account lost directly.
const CARD_RE = /ויזה|ישראכרט|מקס|לאומי קארד|כאל|אמריקן|הרשאה/;
// Salary and other real inflows vs internal transfers that only move money
// between our own accounts - the latter are not income.
const TRANSFER_RE = /העברה עצמית|העברה בין חשבונות/;

const months = new Map();
for (const t of txns) {
  const k = ym(t.dateIso);
  if (!months.has(k)) months.set(k, { credits: 0, cardDebits: 0, otherDebits: 0, first: t, last: t, cards: {}, creditRows: [] });
  const m = months.get(k);
  if (t.credit) { m.credits += t.credit; m.creditRows.push(t); }
  if (t.debit) {
    if (CARD_RE.test(t.description)) { m.cardDebits += t.debit; m.cards[t.description] = (m.cards[t.description] || 0) + t.debit; }
    else m.otherDebits += t.debit;
  }
  if (t.dateIso < m.first.dateIso) m.first = t;
  if (t.dateIso >= m.last.dateIso) m.last = t;
}

// Bank opening for a month = running balance immediately BEFORE its first txn.
const byDate = txns.filter(t => t.balance != null);
const bankOpening = (key) => {
  const before = byDate.filter(t => ym(t.dateIso) < key);
  return before.length ? before[before.length - 1].balance : null;
};
const bankClosing = (key) => {
  const inMonth = byDate.filter(t => ym(t.dateIso) === key);
  return inMonth.length ? inMonth[inMonth.length - 1].balance : null;
};

const sheetForMonth = {};
for (const s of sheets) {
  const { month, year } = api.getSheetMonthYear(s);
  if (month && year) sheetForMonth[`${year}-${String(month).padStart(2,"0")}`] = s;
}

const keys = [...months.keys()].sort();
console.log(`bank=${bankPath}`);
console.log(`bank header balance ${n(parsed.headerBalance)} as of ${parsed.headerDateIso}`);
console.log(`transactions ${txns.length}, months ${keys[0]} .. ${keys[keys.length-1]}, user=${user}\n`);

console.log("== 1. What the BANK actually did (ground truth) ==");
console.log("month     open_bank  credits  cardOut  otherOut close_bank   check");
for (const k of keys) {
  const m = months.get(k);
  const o = bankOpening(k), c = bankClosing(k);
  const expect = o == null ? null : o + m.credits - m.cardDebits - m.otherDebits;
  const ok = (expect == null || c == null) ? "  n/a" : (Math.abs(expect - c) < 1 ? "   ok" : ` ${n(expect - c)}`);
  console.log(`${k}  ${f(o)} ${f(m.credits)} ${f(m.cardDebits)} ${f(m.otherDebits)} ${f(c)} ${ok}`);
}

console.log("\n== 2. BANK vs APP, side by side ==");
console.log("month     sheet           | open_bank  open_app  d_open | inc_bank  inc_app  d_inc | out_bank  exp_app  d_out | src");
for (const k of keys) {
  const sheet = sheetForMonth[k];
  const m = months.get(k);
  const ob = bankOpening(k);
  const oa = sheet ? api.getDisplayedOpeningBalance(sheet) : null;
  const ia = sheet ? api.getIncomeTotal(sheet) : null;
  const ea = sheet ? api.getExpenseStats(sheet).total : null;
  const outBank = m.cardDebits + m.otherDebits;
  const src = sheet ? api.getOpeningBalanceSource(sheet) : "-";
  const d = (a, b) => (a == null || b == null ? null : a - b);
  console.log(`${k}  ${String(sheet || "(אין גיליון)").padEnd(14)} | ${f(ob)} ${f(oa)} ${f(d(oa, ob), 7)} | ${f(m.credits)} ${f(ia)} ${f(d(ia, m.credits), 7)} | ${f(outBank)} ${f(ea)} ${f(d(ea, outBank), 7)} | ${src}`);
}

console.log("\n== 3. Card charges the bank collected, per month ==");
for (const k of keys) {
  const m = months.get(k);
  const entries = Object.entries(m.cards).sort((a, b) => b[1] - a[1]);
  if (!entries.length) continue;
  const sheet = sheetForMonth[k];
  let appCharge = 0;
  if (sheet) {
    const { month, year } = api.getSheetMonthYear(sheet);
    const target = `${year}-${String(month).padStart(2,"0")}`;
    for (const s of sheets) for (const row of api.getEditableRows(s)) {
      if (api.getChargeMonthForRow(row) !== target) continue;
      appCharge += Number(row.amount || 0);
    }
  }
  console.log(`${k}  bank ${f(m.cardDebits)}   app charge-month total ${f(appCharge)}   delta ${f(appCharge - m.cardDebits)}`);
  for (const [name, amt] of entries) console.log(`         ${f(amt)}  ${name}`);
}

console.log("\n== 4. Every credit the bank recorded (is the app's income list right?) ==");
for (const k of keys) {
  const m = months.get(k);
  if (!m.creditRows.length) continue;
  const sheet = sheetForMonth[k];
  const appRows = sheet ? api.getIncomeRows(sheet) : [];
  console.log(`${k}  bank credits ${f(m.credits)}  vs app income ${f(sheet ? api.getIncomeTotal(sheet) : null)}`);
  for (const t of m.creditRows) console.log(`   BANK ${t.dateRaw}  ${f(t.credit)}  ${t.description}`);
  for (const r of appRows) console.log(`   APP  ${String(r.date_raw || "—").padEnd(10)}  ${f(r.amount)}  ${r.source || ""}`);
}
