#!/usr/bin/env node
/* D-13: investigate the reconciliation "gap" Raz reported on 2026-09-16 live in
 * the app. Loads the REAL backup + REAL bank statement export (never committed,
 * read-only, local paths only) through the app's own shipped functions, so
 * what's measured is exactly what the UI would show - no guessing.
 *
 * Usage: node tools/recon_gap_probe.js <app.html> <backup.json> <bank-export.html> [user]
 * READ-ONLY on disk. Same new-Function harness pattern as the other tools/*.
 */
const fs = require("fs");
const [, , appPath, backupPath, bankPath, userArg] = process.argv;
if (!appPath || !backupPath || !bankPath) {
  console.error("usage: node tools/recon_gap_probe.js <app.html> <backup.json> <bank-export.html> [user]");
  process.exit(2);
}
const user = userArg || "raz";
const suffix = user === "raz" ? "" : `_${user}`;
const html = fs.readFileSync(appPath, "utf8");
const bankHtml = fs.readFileSync(bankPath, "utf8");
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
const EXPORTS = ["parseBankStatementHtml", "getBankCardLabelCandidates", "discoverBillingDayHistory",
                 "getPaymentMethods", "getOurCycleTotalForCard", "syncSheetOptions", "getEditableRows"];
const api = new Function(
  "localStorage","document","window","navigator","location","matchMedia",
  "requestAnimationFrame","getComputedStyle","alert","confirm","prompt","fetch","Chart","XLSX",
  `${main}\n;return { ${EXPORTS.map(n=>`${n}: typeof ${n} === "function" ? ${n} : undefined`).join(", ")} };`
)(
  localStorage, document, w, w.navigator, w.location, w.matchMedia, noop, w.getComputedStyle,
  noop, () => true, () => null, async () => ({ok:false,status:0,json:async()=>({})}), C, X
);

const parsed = api.parseBankStatementHtml(bankHtml);
console.log(`bank export: ${parsed.transactions.length} transactions, header balance ${parsed.headerBalance} @ ${parsed.headerDateIso}\n`);

const candidates = api.getBankCardLabelCandidates(parsed);
console.log("candidate bank labels found in this export (label / count / max single debit):");
for (const c of candidates) console.log(`  ${c.label.padEnd(30)} x${c.count}   max=${c.maxDebit.toFixed(2)}`);
console.log("");

const methods = api.getPaymentMethods();
console.log("our payment methods:", methods.map(m => m.name).join(", "), "\n");

for (const method of methods) {
  // Pick whichever candidate label's row count is closest to plausible for this
  // card - same idea as the UI's own suggestion list, just automated here.
  for (const cand of candidates) {
    const discovery = api.discoverBillingDayHistory(method.name, cand.label, parsed);
    const usableMonths = discovery.months.filter(m => m.bankAmount != null);
    if (!usableMonths.length) continue;
    const confidentCount = discovery.confidentMonths;
    if (confidentCount === 0) continue; // this label doesn't explain this card at all
    console.log(`── ${method.name}  ×  bank label "${cand.label}"  (${confidentCount}/${discovery.totalMonths} confident)`);
    for (const m of discovery.months) {
      if (m.bankAmount == null) continue;
      const gapStr = m.gap == null ? "—" : m.gap.toFixed(2);
      console.log(`   ${m.year}-${String(m.month).padStart(2,"0")}  day=${String(m.day).padStart(2)}  conf=${m.confidence.padEnd(14)} bank=${m.bankAmount.toFixed(2).padStart(9)} ours=${(m.ourAmount??0).toFixed(2).padStart(9)} gap=${gapStr.padStart(9)}`);
    }
    console.log("");
  }
}
