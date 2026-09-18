#!/usr/bin/env node
/* Tests one specific hypothesis: the app files a salary into the sheet of the
 * month it was EARNED, while the bank pays it on the 9th-10th of the NEXT
 * month. If true, every app salary row should match a bank credit in the
 * following calendar month, and the app's monthly income will never equal the
 * bank's monthly credits no matter how correct both are.
 *
 * Usage: node tools/salary_shift_check.js <app.html> <backup.json> <bank.xls> [user]
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
const EXPORTS = ["syncSheetOptions","parseBankStatementHtml","getSheetMonthYear","getIncomeRows","toIsoDate"];
const api = new Function("localStorage","document","window","navigator","location","matchMedia","requestAnimationFrame",
  "getComputedStyle","alert","confirm","prompt","fetch","Chart","XLSX","render",
  `${main}\n;return { sheetOptions: () => SHEET_OPTIONS, ${EXPORTS.map(n=>`${n}: typeof ${n}==="undefined"?undefined:${n}`).join(", ")} };`
)(localStorage,document,w,w.navigator,w.location,w.matchMedia,noop,w.getComputedStyle,noop,()=>true,()=>null,
  async()=>({ok:false,status:0,json:async()=>({})}),C,X,noop);

api.syncSheetOptions();
const sheets = api.sheetOptions() || [];
const parsed = api.parseBankStatementHtml(fs.readFileSync(bankPath, "utf8"));
const credits = (parsed.transactions || []).filter(t => t.credit > 0);
const n = (v) => Math.round(Number(v) || 0);
const pad = (v, w=8) => String(v).padStart(w);

console.log("hypothesis: an app salary row dated D belongs to the bank credit nearest D,");
console.log("which falls in the month AFTER the sheet it is filed under.\n");
console.log("sheet          row date    amount | matched bank credit        diff  monthShift");
let matched = 0, shifted = 0, unmatched = 0;
for (const sheet of sheets) {
  const { month, year } = api.getSheetMonthYear(sheet);
  if (!month || !year) continue;
  for (const row of api.getIncomeRows(sheet)) {
    const amt = Number(row.amount || 0);
    if (amt < 3000) continue;                 // salary-sized rows only
    const iso = row.date_raw ? api.toIsoDate(row.date_raw) : null;
    // Match on amount first (within 1%), then pick the closest date.
    const cands = credits.filter(t => Math.abs(t.credit - amt) <= Math.max(30, amt * 0.01));
    let best = null;
    for (const c of cands) {
      if (!best) { best = c; continue; }
      if (!iso) break;
      if (Math.abs(Date.parse(c.dateIso) - Date.parse(iso)) < Math.abs(Date.parse(best.dateIso) - Date.parse(iso))) best = c;
    }
    if (!best) { unmatched++; console.log(`${sheet.padEnd(13)} ${String(row.date_raw||"—").padEnd(11)} ${pad(n(amt))} | ${"(no bank credit of this size)".padEnd(26)}`); continue; }
    const bm = Number(best.dateIso.slice(5,7)), by = Number(best.dateIso.slice(0,4));
    const shift = (by - year) * 12 + (bm - month);
    matched++;
    if (shift !== 0) shifted++;
    console.log(`${sheet.padEnd(13)} ${String(row.date_raw||"—").padEnd(11)} ${pad(n(amt))} | ${best.dateRaw} ${pad(n(best.credit))} ${best.description.slice(0,12).padEnd(13)} ${pad(n(amt - best.credit),5)}  ${shift >= 0 ? "+" : ""}${shift}`);
  }
}
console.log(`\nsalary-sized app rows matched to a bank credit: ${matched}, of them filed one-or-more months before the bank paid: ${shifted}; unmatched: ${unmatched}`);
