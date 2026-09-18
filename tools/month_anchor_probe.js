#!/usr/bin/env node
/* Verifies U-1: deriveMonthStartBalances + saveMonthStartAnchorsFromBankStatement.
 * Runs the app's real functions against the real bank export and the real
 * backup, then checks that writing the anchors actually moves every affected
 * month's opening balance onto the bank's number.
 *
 * Usage: node tools/month_anchor_probe.js <app.html> <backup.json> <bank.xls> [user]
 */
const fs = require("fs");
const appPath = process.argv[2] || "expense-app-v37-demo.html";
const backupPath = process.argv[3];
const bankPath = process.argv[4];
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
                 "saveMonthStartAnchorsFromBankStatement","getDisplayedOpeningBalance","getOpeningBalanceSource",
                 "getBalanceAnchors","findSheetForAnchorDate","invalidateBalanceMemo","getSheetAnchorDateIso",
                 "BANK_ANCHOR_BACKFILL_FROM_ISO","OPENING_SOURCE_LABELS"];
let api;
try {
  api = new Function("localStorage","document","window","navigator","location","matchMedia","requestAnimationFrame",
    "getComputedStyle","alert","confirm","prompt","fetch","Chart","XLSX","render","showToast",
    `${main}\n;return { setBankSyncState: (s) => { bankSyncState = s; }, sheetOptions: () => SHEET_OPTIONS, ${EXPORTS.map(n=>`${n}: typeof ${n}==="undefined"?undefined:${n}`).join(", ")} };`
  )(localStorage,document,w,w.navigator,w.location,w.matchMedia,noop,w.getComputedStyle,noop,()=>true,()=>null,
    async()=>({ok:false,status:0,json:async()=>({})}),C,X,noop,noop);
} catch (e) { console.error("probe: app script failed to load —", e.message); process.exit(1); }

let failed = 0;
const check = (label, cond, detail) => {
  if (cond) console.log(`PASS  ${label}`);
  else { failed++; console.log(`FAIL  ${label}${detail ? `\n      ${detail}` : ""}`); }
};
const n = (v) => (v == null ? null : Math.round(Number(v)));

api.syncSheetOptions();
const parsed = api.parseBankStatementHtml(fs.readFileSync(bankPath, "utf8"));
const verdict = api.verifyBankStatementBalance(parsed);
check("bank file is internally consistent", verdict.consistent, `checked=${verdict.checked} mismatches=${verdict.mismatches}`);

const derived = api.deriveMonthStartBalances(parsed);
console.log(`\nderived ${derived.length} month-start balances (cutoff ${api.BANK_ANCHOR_BACKFILL_FROM_ISO}):`);
derived.forEach(d => console.log(`   ${d.dateIso}  ${String(n(d.amount)).padStart(8)}   (from ${d.basedOn})`));

check("every derived date is the 1st of a month", derived.every(d => /^\d{4}-\d{2}-01$/.test(d.dateIso)));
check("nothing derived before the agreed cutoff",
  derived.every(d => d.dateIso >= api.BANK_ANCHOR_BACKFILL_FROM_ISO));
check("derived dates are strictly increasing and unique",
  derived.every((d, i) => i === 0 || d.dateIso > derived[i-1].dateIso));

// Independent re-derivation: for each month, the balance must equal the running
// balance of the last transaction strictly before the 1st. Computed here from
// the raw transactions rather than by calling the app function again.
const withBal = (parsed.transactions || []).filter(t => t.balance != null);
let reDeriveOk = true, firstBad = "";
for (const d of derived) {
  const prior = withBal.filter(t => t.dateIso < d.dateIso).pop();
  if (!prior || Math.abs(prior.balance - d.amount) > 0.02) {
    reDeriveOk = false; firstBad = `${d.dateIso}: app ${d.amount}, independent ${prior ? prior.balance : "none"}`; break;
  }
}
check("each amount matches an independent re-derivation", reDeriveOk, firstBad);

// Known ground truth from the 18.09 audit: September 2026 opened on 2,031.
const sep = derived.find(d => d.dateIso === "2026-09-01");
check("ספטמבר 26 derives to the bank's 1/9 balance (2,031), not the mid-month 10,779",
  sep && Math.abs(sep.amount - 2031) < 2, sep ? `got ${n(sep.amount)}` : "not derived");

console.log("\nbefore vs after writing the anchors:");
const before = {};
for (const d of derived) {
  const sheet = api.findSheetForAnchorDate(d.dateIso);
  if (!sheet) continue;
  before[sheet] = { open: api.getDisplayedOpeningBalance(sheet), src: api.getOpeningBalanceSource(sheet) };
}
const anchorsBefore = api.getBalanceAnchors().length;
api.setBankSyncState({ parsed, verdict, labels: [], fileName: "probe.xls" });
api.saveMonthStartAnchorsFromBankStatement();
api.invalidateBalanceMemo();

const anchorsAfter = api.getBalanceAnchors().length;
check("anchors were appended, not replaced", anchorsAfter > anchorsBefore, `${anchorsBefore} -> ${anchorsAfter}`);

let allMoved = true, badMove = "";
for (const d of derived) {
  const sheet = api.findSheetForAnchorDate(d.dateIso);
  if (!sheet || !before[sheet]) continue;
  const after = api.getDisplayedOpeningBalance(sheet);
  const src = api.getOpeningBalanceSource(sheet);
  console.log(`   ${sheet.padEnd(14)} ${String(n(before[sheet].open)).padStart(8)} (${before[sheet].src}) -> ${String(n(after)).padStart(8)} (${src})`);
  if (Math.abs(after - d.amount) > 0.02) { allMoved = false; badMove = `${sheet}: opening ${n(after)} != bank ${n(d.amount)}`; }
  if (src !== "anchored") { allMoved = false; badMove = `${sheet}: source is "${src}", expected "anchored"`; }
}
check("every anchored month now opens on the bank's number, source=anchored", allMoved, badMove);

// Idempotence: importing the same file twice must not grow the anchor list.
const countAfterFirst = api.getBalanceAnchors().length;
api.saveMonthStartAnchorsFromBankStatement();
check("re-importing the same file adds nothing", api.getBalanceAnchors().length === countAfterFirst,
  `${countAfterFirst} -> ${api.getBalanceAnchors().length}`);

// Refusal path: an inconsistent verdict must write nothing.
const countBeforeBad = api.getBalanceAnchors().length;
api.setBankSyncState({ parsed, verdict: {...verdict, consistent: false}, labels: [], fileName: "bad.xls" });
api.saveMonthStartAnchorsFromBankStatement();
check("an inconsistent file is refused, writes nothing", api.getBalanceAnchors().length === countBeforeBad);

console.log(failed ? `\n${failed} check(s) FAILED` : "\nALL CHECKS PASSED");
process.exit(failed ? 1 : 0);
