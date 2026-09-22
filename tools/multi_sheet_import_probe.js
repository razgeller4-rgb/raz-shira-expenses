#!/usr/bin/env node
/* F-21 verification: does the import now read every sheet in the workbook,
 * not just wb.SheetNames[0]?
 *
 * Raz reported this directly: "הייבוא אשראי... לא קורא עסקאות שלא במועד
 * החיוב... ולא קורא עסקאות שאושרו וטרם נקלטו." Measured against a real
 * archived Mizrahi export that has all three sheets populated
 * (transaction-details_export_1789489770159.xlsx): 11 settled + 4
 * approved-pending + 3 foreign-currency = 18 total, vs 11 with the old
 * sheet[0]-only read.
 *
 * READ-ONLY. Usage: node tools/multi_sheet_import_probe.js [app.html] [xlsx-lib]
 */
const fs = require("fs");
const appPath = process.argv[2] || "expense-app-v37-demo.html";
const xlsxLib = process.argv[3] || "/tmp/xlsx.full.min.js";
const html = fs.readFileSync(appPath, "utf8");
const XLSX = require(xlsxLib);

const noop = () => {};
const mk = () => new Proxy(function () {}, {
  get(_t, p) {
    if (p === "style") return new Proxy({}, { get: () => "", set: () => true });
    if (p === "classList") return { add: noop, remove: noop, toggle: noop, contains: () => false };
    if (p === "children" || p === "childNodes") return [];
    if (p === "value" || p === "textContent" || p === "innerHTML") return "";
    if (p === "length") return 0;
    if (p === Symbol.iterator) return function* () {};
    if (p === "then") return undefined;
    return mk();
  }, set: () => true, apply: () => mk(),
});
const document = new Proxy({}, { get(_t, p) {
  if (p === "querySelectorAll" || p === "getElementsByTagName") return () => [];
  if (p === "addEventListener" || p === "removeEventListener") return noop;
  if (p === "createElement") return () => mk();
  if (p === "getElementById" || p === "querySelector") return () => mk();
  return mk();
} });
const w = { addEventListener: noop, removeEventListener: noop,
  matchMedia: () => ({ matches: false, addEventListener: noop, addListener: noop }),
  requestAnimationFrame: noop, setTimeout: () => 0, clearTimeout: noop,
  setInterval: () => 0, clearInterval: noop,
  location: { href: "", protocol: "https:", search: "", hash: "" },
  navigator: { onLine: true, userAgent: "node" }, localStorage: { getItem:()=>null,setItem:noop,removeItem:noop,clear:noop,key:()=>null,length:0 },
  getComputedStyle: () => ({ getPropertyValue: () => "" }) };
class C { constructor(){ this.data={datasets:[]}; } update(){} destroy(){} static register(){} }
process.on("unhandledRejection", () => {});

const scripts = [...html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const main = scripts.reduce((a, b) => (b.length > a.length ? b : a), "");
const api = new Function(
  "localStorage","document","window","navigator","location","matchMedia",
  "requestAnimationFrame","getComputedStyle","alert","confirm","prompt","fetch","Chart","XLSX","render",
  `${main}\n;return { parseCCStatement, parseCCWorkbook };`
)(w.localStorage, document, w, w.navigator, w.location, w.matchMedia, noop, w.getComputedStyle,
  noop, () => true, () => null, async () => ({ok:false}), C, XLSX, noop);

let issues = 0;
const flag = (msg) => { issues++; console.log(`  FAIL  ${msg}`); };
const pass = (msg) => console.log(`  ok    ${msg}`);

const FILE = "data/transaction-details_export_1789489770159.xlsx";
console.log(`file: ${FILE}\n`);

const wb = XLSX.read(fs.readFileSync(FILE), { type: "buffer" });
console.log(`A. Sheets in the workbook: ${wb.SheetNames.join(" | ")}\n`);

console.log("B. Old behaviour (sheet[0] only) vs new (parseCCWorkbook)");
const oldRaw = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: null });
const oldResult = api.parseCCStatement(oldRaw, FILE);
const newResult = api.parseCCWorkbook(wb, FILE);
console.log(`   old (sheet[0] only): ${oldResult.txns.length} transactions`);
console.log(`   new (all sheets):    ${newResult.txns.length} transactions`);
if (newResult.txns.length <= oldResult.txns.length) flag(`new count should exceed old count - the whole point of F-21`);
else pass(`new count (${newResult.txns.length}) exceeds old (${oldResult.txns.length}) - the dropped sheets are now included`);

const pending = newResult.txns.filter(t => t._pendingCapture);
const foreign = newResult.txns.filter(t => t._foreignSheet);
const settled = newResult.txns.filter(t => !t._pendingCapture && !t._foreignSheet);
console.log(`\n   breakdown: ${settled.length} settled, ${pending.length} pending-capture, ${foreign.length} foreign-sheet`);
if (pending.length === 0) flag(`expected pending-capture rows from "עסקאות שאושרו וטרם נקלטו" - got 0`);
else pass(`${pending.length} pending-capture row(s) now included, previously silently dropped`);
if (foreign.length === 0) flag(`expected rows from the foreign-currency sheet - got 0`);
else pass(`${foreign.length} foreign-sheet row(s) now included, previously silently dropped`);

console.log("\nC. No cross-sheet duplication");
const keys = newResult.txns.map(t => `${t.date_raw}|${Number(t.amount).toFixed(2)}|${t.merchant}`);
const dupCount = keys.length - new Set(keys).size;
if (dupCount > 0) flag(`${dupCount} duplicate key(s) across merged sheets`);
else pass(`no duplicate (date, amount, merchant) triples across the merged sheets`);

console.log("\nD. Merged result keeps a usable format/cardName (from the first sheet)");
if (!newResult.format) flag(`merged result has no format`);
else pass(`format="${newResult.format}" cardName="${newResult.cardName}" last4="${newResult.last4}"`);

console.log(`\n${issues ? `${issues} failure(s)` : "F-21 verified: all three sheets are now read and merged"}`);
process.exit(issues ? 1 : 0);
