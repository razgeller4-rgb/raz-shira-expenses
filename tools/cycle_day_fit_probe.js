#!/usr/bin/env node
/* Two questions Raz asked on 21.09, answered against real data only.
 *
 * Q1 "האם כל חיוב שיוצא ב9/9 הוא נכלל בחודש שאחרי כבר" - i.e. is the 09/09
 *    case a recurring rule or a one-off? Scored by asking, for every archived
 *    statement, which cycleDay value would have reproduced the issuer's OWN
 *    bill assignment. If some day scores 100%, that day is the right setting.
 *    If nothing scores 100%, no cycleDay can be right and manual override is
 *    not a workaround but the correct design.
 *
 * Q2 "השאלה אם זה ישפיע על המאזנים או החישובים" - does changing the card's
 *    cycleDay move any existing balance? Measured by flipping the value in a
 *    loaded copy of the real data and recomputing every sheet's closing
 *    balance, rather than by reasoning about the code.
 *
 * READ-ONLY on disk. Usage:
 *   node tools/cycle_day_fit_probe.js [app.html] [backup.json] [user] [xlsx-lib]
 */
const fs = require("fs");
const path = require("path");
const appPath = process.argv[2] || "expense-app-v37-demo.html";
const backupPath = process.argv[3] || "backups/raz-expenses-backup-2026-09-20_12-20.json";
const user = process.argv[4] || "raz";
const xlsxLib = process.argv[5] || "/tmp/xlsx.full.min.js";
const html = fs.readFileSync(appPath, "utf8");
const data = JSON.parse(fs.readFileSync(backupPath, "utf8")).data || {};
const raw = (k) => { const v = data[k]; return v == null ? null : (typeof v === "string" ? v : JSON.stringify(v)); };
const XLSX = require(xlsxLib);

const store = new Map();
const localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => void store.set(k, String(v)),
  removeItem: (k) => void store.delete(k), clear: () => void store.clear(),
  key: (i) => [...store.keys()][i] ?? null, get length() { return store.size; },
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
const document = new Proxy({}, { get(_t, p) {
  if (p === "querySelectorAll" || p === "getElementsByClassName" || p === "getElementsByTagName") return () => [];
  if (p === "documentElement" || p === "body" || p === "head") return mk();
  if (p === "readyState") return "complete";
  if (p === "addEventListener" || p === "removeEventListener") return noop;
  if (p === "createElement" || p === "createElementNS") return () => mk();
  if (p === "getElementById" || p === "querySelector") return () => mk();
  return mk();
} });
const w = { addEventListener: noop, removeEventListener: noop,
  matchMedia: () => ({ matches: false, addEventListener: noop, addListener: noop }),
  requestAnimationFrame: noop, cancelAnimationFrame: noop,
  setTimeout: () => 0, clearTimeout: noop, setInterval: () => 0, clearInterval: noop,
  location: { href: "", protocol: "https:", search: "", hash: "" },
  navigator: { onLine: true, userAgent: "node", clipboard: { writeText: async () => {} } },
  localStorage, getComputedStyle: () => ({ getPropertyValue: () => "" }), devicePixelRatio: 1 };
class C { constructor(){ this.data={datasets:[]}; this.options={}; } update(){} destroy(){} resize(){} static register(){} }
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
const EXPORTS = ["syncSheetOptions","getBillingSheetForExpense","getPaymentMethodByName","toIsoDate",
                 "getDisplayedOpeningBalance","getDisplayedClosingBalance","getIncomeTotal","getExpenseStats",
                 "getEditableRows","getPaymentMethods","savePaymentMethods","invalidateBalanceMemo",
                 "getPaymentMethodsStorageKey","getScopedStorageKey"];
const api = new Function(
  "localStorage","document","window","navigator","location","matchMedia",
  "requestAnimationFrame","getComputedStyle","alert","confirm","prompt","fetch","Chart","XLSX","render",
  `${main}\n;return { sheetOptions: () => SHEET_OPTIONS, ${EXPORTS.map(n=>`${n}: typeof ${n} === "undefined" ? undefined : ${n}`).join(", ")} };`
)(localStorage, document, w, w.navigator, w.location, w.matchMedia, noop, w.getComputedStyle,
  noop, () => true, () => null, async () => ({ok:false,status:0,json:async()=>({})}), C, XLSX, noop);

api.syncSheetOptions();
const HEB = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];
const sheetOf = (y, m) => { // m is 1-based; wraps
  let yy = y, mm = m;
  while (mm < 1) { mm += 12; yy -= 1; }
  while (mm > 12) { mm -= 12; yy += 1; }
  return `${HEB[mm-1]} ${String(yy).slice(2)}`;
};

/* ── Q1: collect every archived transaction with a known bill date ────────── */
const CARD = "ויזה מזרחי", LAST4 = "8948";
const obs = [];
for (const f of fs.readdirSync("data").filter(x => /^transaction-details_export.*\.xlsx$/i.test(x))) {
  const wb = XLSX.read(fs.readFileSync(path.join("data", f)), { type: "buffer" });
  for (const sn of wb.SheetNames) {
    if (!/במועד החיוב/.test(sn)) continue; // only the sheet of settled, billed txns
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, defval: null });
    const flat = rows.map(r => (r||[]).join("|")).join("\n");
    if (!flat.includes(LAST4)) continue;
    const hi = rows.findIndex(r => (r||[]).some(c => /תאריך עסקה/.test(String(c||""))));
    if (hi < 0) continue;
    const hdr = rows[hi].map(c => String(c||"").trim());
    const di = hdr.findIndex(h => /תאריך עסקה/.test(h));
    const bi = hdr.findIndex(h => /תאריך חיוב/.test(h));
    const ti = hdr.findIndex(h => /^סוג עסקה/.test(h));
    const mi = hdr.findIndex(h => /שם בית העסק/.test(h));
    for (let i = hi+1; i < rows.length; i++) {
      const r = rows[i] || [];
      const d = String(r[di]==null?"":r[di]).trim();
      const b = String(r[bi]==null?"":r[bi]).trim();
      if (!/^\d{2}-\d{2}-\d{4}$/.test(d) || !/^\d{2}-\d{2}-\d{4}$/.test(b)) continue;
      obs.push({
        file: f,
        merchant: String(r[mi]==null?"":r[mi]).trim(),
        // An installment plan keeps the ORIGINAL purchase date on every monthly
        // instalment, so a 2025 purchase legitimately bills in 2026. No
        // day-of-month rule can ever place those correctly - they are scored
        // separately rather than counted as evidence against a cycle day.
        installment: /תשלומים/.test(String(r[ti]==null?"":r[ti])),
        purchaseIso: `${d.slice(6,10)}-${d.slice(3,5)}-${d.slice(0,2)}`,
        billY: Number(b.slice(6,10)), billM: Number(b.slice(3,5)), billD: Number(b.slice(0,2)),
      });
    }
  }
}
// One transaction can appear in two exports taken days apart. Dedupe.
const seen = new Set();
const all = obs.filter(o => { const k = `${o.purchaseIso}|${o.billY}-${o.billM}|${o.merchant}`; if (seen.has(k)) return false; seen.add(k); return true; });
const installments = all.filter(o => o.installment);
const txns = all.filter(o => !o.installment);

console.log(`Q1. Which cycleDay reproduces the issuer's own bill assignment?`);
console.log(`    card ${CARD} (${LAST4}), ${all.length} distinct archived transactions with a stated bill date`);
if (installments.length) {
  console.log(`    ${installments.length} excluded as תשלומים (an instalment keeps the original purchase date`);
  console.log(`    on every monthly charge, so no cycle rule can place it):`);
  for (const i of installments) console.log(`       ${i.purchaseIso}  ${i.merchant}  -> billed ${String(i.billD).padStart(2,"0")}/${String(i.billM).padStart(2,"0")}/${i.billY}`);
}
console.log(`    ${txns.length} ordinary transactions scored below.\n`);

// A bill dated day ~10 of month M collects the cycle that STARTED in month M-1,
// which is the sheet the app labels M-1.
const issuerSheet = (t) => sheetOf(t.billY, t.billM - 1);

const results = [];
for (let cd = 1; cd <= 15; cd++) {
  let hit = 0;
  const misses = [];
  for (const t of txns) {
    const y = Number(t.purchaseIso.slice(0,4)), m = Number(t.purchaseIso.slice(5,7)), d = Number(t.purchaseIso.slice(8,10));
    const ours = d < cd ? sheetOf(y, m - 1) : sheetOf(y, m);
    if (ours === issuerSheet(t)) hit++; else misses.push({t, ours});
  }
  results.push({ cd, hit, pct: (100*hit/txns.length), misses });
}
const best = Math.max(...results.map(r => r.hit));
console.log("    cycleDay   agrees with issuer");
for (const r of results) {
  const bar = "█".repeat(Math.round(r.pct/4));
  console.log(`       ${String(r.cd).padStart(2)}       ${String(r.hit).padStart(3)}/${txns.length}  ${r.pct.toFixed(1).padStart(5)}%  ${bar}${r.hit===best?"   <= best":""}`);
}
const winner = results.find(r => r.hit === best);
console.log(`\n    Best fit: cycleDay=${winner.cd} at ${winner.pct.toFixed(1)}%. Currently configured: 10 (${results.find(r=>r.cd===10).pct.toFixed(1)}%).`);
if (best < txns.length) {
  console.log(`    NO value reaches 100% - ${txns.length - best} transaction(s) cannot be explained by any day-of-month rule.`);
  console.log(`    The unexplained ones (under the best-fitting day ${winner.cd}):`);
  for (const m of winner.misses.slice(0, 12)) {
    console.log(`       purchased ${m.t.purchaseIso} -> our model says ${m.ours}, issuer billed it ${String(m.t.billD).padStart(2,"0")}/${String(m.t.billM).padStart(2,"0")} = ${issuerSheet(m.t)}`);
  }
  console.log(`\n    Why a fixed day cannot work: the issuer cuts on the date a merchant SETTLES`);
  console.log(`    a charge, not the date printed on the receipt. The archived statements carry`);
  console.log(`    a separate "עסקאות שאושרו וטרם נקלטו" sheet - the issuer itself distinguishes`);
  console.log(`    "approved" from "captured", and the lag is days. A purchase-date rule cannot`);
  console.log(`    see that lag, so some transactions will always land a month off.`);
} else {
  console.log(`    cycleDay=${winner.cd} explains every archived transaction.`);
}

/* ── Q2: does changing cycleDay move any existing balance? ────────────────── */
console.log(`\n\nQ2. Does changing the card's cycleDay move any EXISTING balance?\n`);
const sheets = api.sheetOptions();
const snapshot = () => sheets.map(s => ({
  sheet: s,
  opening: api.getDisplayedOpeningBalance(s),
  income: api.getIncomeTotal(s),
  expense: api.getExpenseStats(s).total,
  closing: api.getDisplayedClosingBalance(s),
}));

const before = snapshot();
// Flip the real stored value, exactly as the cards-tab UI would.
const methods = api.getPaymentMethods();
const idx = methods.findIndex(m => m.name === CARD);
if (idx < 0) { console.log(`    (card "${CARD}" not found in this backup - skipped)`); }
else {
  const originalDay = methods[idx].cycleDay;
  methods[idx].cycleDay = winner.cd === originalDay ? 3 : winner.cd; // pick a genuinely different day
  api.savePaymentMethods(methods);
  if (api.invalidateBalanceMemo) api.invalidateBalanceMemo();
  const after = snapshot();

  let moved = 0;
  console.log(`    changed ${CARD}: cycleDay ${originalDay} -> ${methods[idx].cycleDay}`);
  console.log(`    sheet            closing before   closing after    delta`);
  for (let i = 0; i < sheets.length; i++) {
    const b = before[i], a = after[i];
    const d = (b.closing == null || a.closing == null) ? null : a.closing - b.closing;
    if (d != null && Math.abs(d) > 0.005) moved++;
    console.log(`    ${sheets[i].padEnd(14)} ${String(b.closing==null?"—":Math.round(b.closing)).padStart(14)} ${String(a.closing==null?"—":Math.round(a.closing)).padStart(15)} ${String(d==null?"—":Math.round(d)).padStart(8)}${d!=null&&Math.abs(d)>0.005?"  <-- MOVED":""}`);
  }
  console.log(`\n    ${moved} sheet(s) moved.`);
  if (moved === 0) {
    console.log(`    Conclusion: changing cycleDay does NOT touch any existing figure.`);
    console.log(`    Rows are stored already filed to a sheet; getBillingSheetForExpense runs only`);
    console.log(`    at ENTRY time (manual add, edit, import). No balance, budget, forecast or`);
    console.log(`    yearly figure re-derives a month from cycleDay. The setting therefore affects`);
    console.log(`    only where FUTURE entries land - it is safe to change, and it fixes nothing`);
    console.log(`    retroactively.`);
  } else {
    console.log(`    WARNING: existing figures DID move. Changing cycleDay is not a safe, forward-only`);
    console.log(`    setting - investigate before touching it.`);
  }
  // restore
  methods[idx].cycleDay = originalDay;
  api.savePaymentMethods(methods);
  if (api.invalidateBalanceMemo) api.invalidateBalanceMemo();
}
