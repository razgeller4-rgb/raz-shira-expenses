#!/usr/bin/env node
/* After U-1 every month opens on a measured bank balance, which finally makes
 * it possible to ask the real question: can the app PREDICT the next month's
 * bank balance from its own data?
 *
 * Compares three candidate chains against the bank's actual month-start
 * balances, to find which basis the app should use when it claims to project a
 * balance forward:
 *
 *   A. current  : opening + income(sheet total) - expenses(purchase month)
 *   B. cash     : opening + income DATED in the month - expenses CHARGED in the month
 *   C. mixed    : opening + income(sheet total)     - expenses CHARGED in the month
 *
 * Usage: node tools/cash_basis_chain_check.js <app.html> <backup.json> <bank.xls> [user]
 */
const fs = require("fs");
const appPath = process.argv[2], backupPath = process.argv[3], bankPath = process.argv[4];
const user = process.argv[5] || "raz";
const html = fs.readFileSync(appPath, "utf8");
const data = JSON.parse(fs.readFileSync(backupPath, "utf8")).data || {};
const raw = (k) => { const v = data[k]; return v == null ? null : (typeof v === "string" ? v : JSON.stringify(v)); };
const store = new Map();
const localStorage = { getItem:(k)=>store.has(k)?store.get(k):null, setItem:(k,v)=>void store.set(k,String(v)),
  removeItem:(k)=>void store.delete(k), clear:()=>void store.clear(), key:(i)=>[...store.keys()][i]??null, get length(){return store.size;} };
const noop = () => {};
const mk = () => new Proxy(function(){}, { get(_t,p){
  if(p==="style") return new Proxy({},{get:()=>"",set:()=>true});
  if(p==="classList") return {add:noop,remove:noop,toggle:noop,contains:()=>false};
  if(p==="dataset") return {}; if(p==="children"||p==="childNodes") return [];
  if(p==="value"||p==="textContent"||p==="innerHTML") return ""; if(p==="length") return 0;
  if(p===Symbol.iterator) return function*(){}; if(p==="then") return undefined; return mk();
}, set:()=>true, apply:()=>mk() });
const document = new Proxy({}, { get(_t,p){
  if(p==="querySelectorAll"||p==="getElementsByClassName"||p==="getElementsByTagName") return ()=>[];
  if(p==="documentElement"||p==="body"||p==="head") return mk(); if(p==="readyState") return "complete";
  if(p==="addEventListener"||p==="removeEventListener") return noop;
  if(p==="createElement"||p==="createElementNS") return ()=>mk();
  if(p==="getElementById"||p==="querySelector") return ()=>mk(); return mk();
} });
const w = { addEventListener:noop, removeEventListener:noop, matchMedia:()=>({matches:false,addEventListener:noop,addListener:noop}),
  requestAnimationFrame:noop, cancelAnimationFrame:noop, setTimeout:()=>0, clearTimeout:noop, setInterval:()=>0, clearInterval:noop,
  location:{href:"",protocol:"https:",search:"",hash:""}, navigator:{onLine:true,userAgent:"node",clipboard:{writeText:async()=>{}}},
  localStorage, getComputedStyle:()=>({getPropertyValue:()=>""}), devicePixelRatio:1 };
class C { constructor(){this.data={datasets:[]};this.options={};} update(){} destroy(){} resize(){} static register(){} }
const X = { utils:{book_new:()=>({}),json_to_sheet:()=>({}),book_append_sheet:noop,sheet_to_json:()=>[]}, writeFile:noop, read:()=>({SheetNames:[],Sheets:{}}) };
process.on("unhandledRejection", () => {});
const NS = /const STORAGE_NS_PREFIX\s*=\s*"demo__"/.test(html) ? "demo__" : "";
localStorage.setItem(`${NS}expense_app_active_user_v1`, user);
for (const base of ["expense_app_overrides_v29","expense_app_payment_methods_v1","expense_app_manual_settings_v35",
                    "expense_app_income_entries_v1","expense_app_debt_entries_v1","expense_app_balance_anchors_v1"]) {
  const v = raw(base); if (v != null) localStorage.setItem(`${NS}${base}`, v);
}
const scripts = [...html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const main = scripts.reduce((a,b)=>b.length>a.length?b:a,"");
const EXPORTS = ["syncSheetOptions","parseBankStatementHtml","verifyBankStatementBalance","deriveMonthStartBalances",
                 "saveMonthStartAnchorsFromBankStatement","invalidateBalanceMemo","getDisplayedOpeningBalance",
                 "getDisplayedClosingBalance","getSheetMonthYear","getIncomeRows","getIncomeTotal","getExpenseStats",
                 "getEditableRows","getChargeMonthForRow","toIsoDate","isDebtTrackingEnabled","getLoanScheduleEntryForSheet",
                 "findSheetForAnchorDate"];
const api = new Function("localStorage","document","window","navigator","location","matchMedia","requestAnimationFrame",
  "getComputedStyle","alert","confirm","prompt","fetch","Chart","XLSX","render","showToast",
  `${main}\n;return { setBankSyncState:(s)=>{bankSyncState=s;}, sheetOptions:()=>SHEET_OPTIONS, ${EXPORTS.map(n=>`${n}: typeof ${n}==="undefined"?undefined:${n}`).join(", ")} };`
)(localStorage,document,w,w.navigator,w.location,w.matchMedia,noop,w.getComputedStyle,noop,()=>true,()=>null,
  async()=>({ok:false,status:0,json:async()=>({})}),C,X,noop,noop);

api.syncSheetOptions();
const parsed = api.parseBankStatementHtml(fs.readFileSync(bankPath, "utf8"));
const verdict = api.verifyBankStatementBalance(parsed);
api.setBankSyncState({ parsed, verdict, labels: [], fileName: bankPath });
api.saveMonthStartAnchorsFromBankStatement();
api.invalidateBalanceMemo();

const sheets = api.sheetOptions() || [];
const n = (v) => (v == null ? null : Math.round(Number(v)));
const p = (v, w = 9) => (v == null ? "—".padStart(w) : String(n(v)).padStart(w));
const key = (sheet) => { const {month, year} = api.getSheetMonthYear(sheet); return month && year ? `${year}-${String(month).padStart(2,"0")}` : null; };

// Income DATED inside a calendar month, wherever it is filed. This is the one
// that matches the bank: a salary filed under אוגוסט but dated 10/09 is cash
// that reached the account in September, and the bank knows nothing about which
// sheet it lives on.
// An UNDATED row is not evidence that the money moved in some other month - it
// is just a row nobody dated. Dropping those made the first run of this test
// look like the cash basis was hopeless (mean error 6,559 vs 2,437), when in
// fact it was being charged for missing data rather than a wrong model. Falling
// back to the sheet's own month is the neutral assumption.
function incomeDatedIn(monthKey){
  let sum = 0, undated = 0;
  for(const s of sheets){
    const sk = key(s);
    for(const row of api.getIncomeRows(s)){
      const iso = row.date_raw ? api.toIsoDate(row.date_raw) : null;
      const bucket = iso ? iso.slice(0,7) : sk;
      if(!iso) undated++;
      if(bucket === monthKey) sum += Number(row.amount || 0);
    }
  }
  incomeDatedIn.undated = undated;
  return sum;
}
function chargedIn(monthKey){
  let sum = 0;
  for(const s of sheets) for(const row of api.getEditableRows(s)){
    if(api.getChargeMonthForRow(row) === monthKey) sum += Number(row.amount || 0);
  }
  return sum;
}
// C-8 (18.09): bank refunds the loan interest the same day - .principal is
// the real cash impact, matching the app's corrected sites.
const debtOf = (sheet) => api.isDebtTrackingEnabled() ? Number(api.getLoanScheduleEntryForSheet(sheet)?.principal || 0) : 0;

const derived = api.deriveMonthStartBalances(parsed);
const bankOpen = {};
derived.forEach(d => { bankOpen[d.dateIso.slice(0,7)] = d.amount; });

// How much money the bank saw leave / arrive in a month, straight from the
// statement. A month where the app's totals are far from these simply has rows
// that were never entered, and scoring a MODEL on such a month scores the data
// hole instead. "cover" below is how much of the bank's movement the app
// accounts for; only months near 100% can judge a model.
const bankMoves = {};
for(const t of (parsed.transactions || [])){
  const k = String(t.dateIso || "").slice(0,7);
  if(!k) continue;
  if(!bankMoves[k]) bankMoves[k] = { in: 0, out: 0 };
  bankMoves[k].in += t.credit || 0;
  bankMoves[k].out += t.debit || 0;
}

console.log("Each row: predict NEXT month's bank opening from THIS month's data.");
console.log("err = prediction - what the bank actually opened on.");
console.log("cover = app's charge-month expenses as % of what the bank actually paid out.\n");
console.log("month     open_bank  cover | A_current   errA | B_cash      errB | C_mixed    errC");
const errs = { A: [], B: [], C: [] };
const errsComplete = { A: [], B: [], C: [] };
for(let i = 0; i < sheets.length - 1; i++){
  const sheet = sheets[i], next = sheets[i+1];
  const k = key(sheet), kNext = key(next);
  if(!k || !kNext) continue;
  const open = bankOpen[k];
  const actualNext = bankOpen[kNext];
  if(open == null || actualNext == null) continue;   // outside the anchored range

  const debt = debtOf(sheet);
  const A = open + api.getIncomeTotal(sheet) - api.getExpenseStats(sheet).total - debt;
  const B = open + incomeDatedIn(k) - chargedIn(k) - debt;
  const C = open + api.getIncomeTotal(sheet) - chargedIn(k) - debt;
  const eA = A - actualNext, eB = B - actualNext, eC = C - actualNext;
  errs.A.push(eA); errs.B.push(eB); errs.C.push(eC);
  const out = bankMoves[k] ? bankMoves[k].out : 0;
  const cover = out > 0 ? chargedIn(k) / out : null;
  const complete = cover != null && cover >= 0.9 && cover <= 1.1;
  if(complete){ errsComplete.A.push(eA); errsComplete.B.push(eB); errsComplete.C.push(eC); }
  const coverTxt = cover == null ? "   —" : `${String(Math.round(cover * 100)).padStart(3)}%${complete ? "*" : " "}`;
  console.log(`${k}  ${p(open)}  ${coverTxt} | ${p(A)} ${p(eA,6)} | ${p(B)} ${p(eB,6)} | ${p(C)} ${p(eC,6)}`);
}
const stat = (arr) => {
  if(!arr.length) return "n/a";
  const abs = arr.map(Math.abs);
  const mean = abs.reduce((a,b)=>a+b,0) / abs.length;
  return `mean |err| ${String(Math.round(mean)).padStart(6)}   max |err| ${String(Math.round(Math.max(...abs))).padStart(6)}`;
};
console.log(`\nALL months (${errs.A.length}) — includes months with known data holes:`);
console.log(`  A (current, sheet income - purchase-month expenses):  ${stat(errs.A)}`);
console.log(`  B (cash, dated income - charge-month expenses):       ${stat(errs.B)}`);
console.log(`  C (sheet income - charge-month expenses):             ${stat(errs.C)}`);
console.log(`\nOnly months marked * (${errsComplete.A.length}) — app accounts for 90-110% of real bank outflow:`);
console.log(`  A: ${stat(errsComplete.A)}`);
console.log(`  B: ${stat(errsComplete.B)}`);
console.log(`  C: ${stat(errsComplete.C)}`);
console.log(`\n(undated income rows seen: ${incomeDatedIn.undated || 0})`);
