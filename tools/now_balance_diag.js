#!/usr/bin/env node
/* Why does the dashboard headline say 732 when the bank holds ~10,288?
 * Decomposes getCashOutSummary term by term for the selected month and puts
 * each term next to what the bank statement actually recorded.
 *
 * Usage: node tools/now_balance_diag.js <app.html> <backup.json> <bank.xls> <sheet> [user]
 */
const fs = require("fs");
const [, , appPath, backupPath, bankPath, sheetArg, userArg] = process.argv;
const user = userArg || "raz";
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
const EXPORTS = ["syncSheetOptions","parseBankStatementHtml","verifyBankStatementBalance",
                 "saveMonthStartAnchorsFromBankStatement","invalidateBalanceMemo","getCashOutSummary",
                 "getDisplayedOpeningBalance","getIncomeReceivedToDate","getIncomeTotal","getIncomeRows",
                 "getEditableRows","getChargeMonthForRow","getSheetMonthYear","toIsoDate","getTodayIso",
                 "getPaymentMethodByName","isRowImmediate","isDebtTrackingEnabled","getLoanScheduleEntryForSheet",
                 "getBillingDayForDate","getCashMovementForSheet"];
const api = new Function("localStorage","document","window","navigator","location","matchMedia","requestAnimationFrame",
  "getComputedStyle","alert","confirm","prompt","fetch","Chart","XLSX","render","showToast",
  `${main}\n;return { setBankSyncState:(s)=>{bankSyncState=s;}, sheetOptions:()=>SHEET_OPTIONS, ${EXPORTS.map(n=>`${n}: typeof ${n}==="undefined"?undefined:${n}`).join(", ")} };`
)(localStorage,document,w,w.navigator,w.location,w.matchMedia,noop,w.getComputedStyle,noop,()=>true,()=>null,
  async()=>({ok:false,status:0,json:async()=>({})}),C,X,noop,noop);

api.syncSheetOptions();
const parsed = api.parseBankStatementHtml(fs.readFileSync(bankPath, "utf8"));
api.setBankSyncState({ parsed, verdict: api.verifyBankStatementBalance(parsed), labels: [], fileName: bankPath });
api.saveMonthStartAnchorsFromBankStatement();
api.invalidateBalanceMemo();

const sheet = sheetArg;
const today = api.getTodayIso();
const { month, year } = api.getSheetMonthYear(sheet);
const target = `${year}-${String(month).padStart(2,"0")}`;
const sheets = api.sheetOptions();
const n = (v) => (v == null ? "—" : Math.round(Number(v)).toLocaleString("en-US"));

console.log(`sheet=${sheet}  month=${target}  today=${today}\n`);

const sum = api.getCashOutSummary(sheet);
const opening = api.getDisplayedOpeningBalance(sheet);
const loan = api.isDebtTrackingEnabled() ? Number(api.getLoanScheduleEntryForSheet(sheet)?.total || 0) : 0;
console.log("== what the app computes now ==");
console.log(`  opening                 ${n(opening).padStart(10)}`);
console.log(`+ income received to date ${n(api.getIncomeReceivedToDate(sheet)).padStart(10)}   <- only rows filed in THIS sheet`);
console.log(`- already left            ${n(sum.alreadyLeft).padStart(10)}`);
console.log(`- loan                    ${n(loan).padStart(10)}`);
console.log(`= nowBalance              ${n(sum.nowBalance).padStart(10)}`);
console.log(`  cardDue (not yet out?)  ${n(sum.cardDue).padStart(10)}`);
console.log(`= afterCards              ${n(sum.afterCardsBalance).padStart(10)}`);

console.log("\n== every income row DATED in this month, wherever it is filed ==");
let datedIncome = 0, datedIncomeToToday = 0;
for(const s of sheets){
  for(const row of api.getIncomeRows(s)){
    const iso = row.date_raw ? api.toIsoDate(row.date_raw) : "";
    if(!iso || iso.slice(0,7) !== target) continue;
    datedIncome += Number(row.amount || 0);
    const arrived = iso <= today;
    if(arrived) datedIncomeToToday += Number(row.amount || 0);
    console.log(`  ${iso}  ${n(row.amount).padStart(9)}  ${arrived ? "הגיע " : "עתידי"}  filed under ${s}  — ${row.source || ""}`);
  }
}
console.log(`  total dated in month: ${n(datedIncome)} | already arrived: ${n(datedIncomeToToday)}`);

console.log("\n== expenses charged in this month, split by whether the charge date has passed ==");
let passed = 0, future = 0, undatedCharge = 0;
const perCard = {};
for(const s of sheets){
  for(const row of api.getEditableRows(s)){
    if(api.getChargeMonthForRow(row) !== target) continue;
    const amount = Number(row.amount || 0);
    const method = row.payment ? api.getPaymentMethodByName(row.payment) : null;
    const isCardBill = Boolean(method && !method.isImmediate && !api.isRowImmediate(row));
    if(!isCardBill){ passed += amount; continue; }  // cash/immediate: out when spent
    const iso = row.date_raw ? api.toIsoDate(row.date_raw) : "";
    const day = Number(api.getBillingDayForDate(method, iso)) || 10;
    const chargeIso = `${target}-${String(day).padStart(2,"0")}`;
    const done = chargeIso <= today;
    if(done) passed += amount; else future += amount;
    const k = `${row.payment} (חיוב ב-${day})`;
    if(!perCard[k]) perCard[k] = { done: 0, future: 0 };
    perCard[k][done ? "done" : "future"] += amount;
  }
}
for(const [k, v] of Object.entries(perCard)) console.log(`  ${k.padEnd(34)} כבר חויב ${n(v.done).padStart(9)}   טרם ${n(v.future).padStart(9)}`);
console.log(`  TOTAL already charged by today: ${n(passed)} | still to come: ${n(future)}`);

const proposed = opening == null ? null : opening + datedIncomeToToday - passed - loan;
console.log("\n== proposed 'עו״ש עכשיו' ==");
console.log(`  ${n(opening)} + ${n(datedIncomeToToday)} - ${n(passed)} - ${n(loan)} = ${n(proposed)}`);

const withBal = (parsed.transactions || []).filter(t => t.balance != null);
const last = withBal[withBal.length - 1];
console.log(`\n== bank reality ==`);
console.log(`  last known bank balance: ${n(last.balance)} on ${last.dateRaw}`);
console.log(`  app now (current):  ${n(sum.nowBalance)}   gap vs bank ${n(sum.nowBalance - last.balance)}`);
console.log(`  app now (proposed): ${n(proposed)}   gap vs bank ${n(proposed - last.balance)}`);
