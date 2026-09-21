#!/usr/bin/env node
/* Empirical question, empirical answer: what is the REAL billing cycle boundary
 * of each card?
 *
 * Raz, 21.09: "אני לא סגור אם זה יוצא כל חודש ככה, צריך לבחון את הנושא, האם כל
 * חיוב שיוצא ב9/9 הוא נכלל בחודש שאחרי כבר."
 *
 * A card's cycle day is not something to infer from one statement. But there
 * are 9 archived statements in data/, each of which is a primary source: it
 * names its own billing date and lists exactly which purchases that bill
 * collected. Group them by billing month and the boundary falls out of the data
 * - the cutoff sits between the newest purchase on bill N and the oldest
 * purchase on bill N+1.
 *
 * READ-ONLY. Uses the app's own parseCCStatement so what is measured is what
 * the app actually reads, not a second parser that could disagree.
 * Usage: node tools/cycle_boundary_forensics.js [app.html] [xlsx-lib-path]
 */
const fs = require("fs");
const path = require("path");
const appPath = process.argv[2] || "expense-app-v37-demo.html";
const html = fs.readFileSync(appPath, "utf8");

let XLSX;
for (const p of [process.argv[3], "xlsx", path.join(process.env.HOME || "", "node_modules/xlsx")].filter(Boolean)) {
  try { XLSX = require(p); break; } catch (e) {}
}
if (!XLSX) { console.error("need the xlsx lib: npm i -g xlsx, or pass its path as arg 2"); process.exit(1); }

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
    if (p === "value" || p === "textContent" || p === "innerHTML") return "";
    if (p === "children" || p === "childNodes") return [];
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
  navigator: { onLine: true, userAgent: "node" }, localStorage,
  getComputedStyle: () => ({ getPropertyValue: () => "" }) };
class C { constructor(){ this.data={datasets:[]}; } update(){} destroy(){} static register(){} }
process.on("unhandledRejection", () => {});

const scripts = [...html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const main = scripts.reduce((a, b) => (b.length > a.length ? b : a), "");
const api = new Function(
  "localStorage","document","window","navigator","location","matchMedia",
  "requestAnimationFrame","getComputedStyle","alert","confirm","prompt","fetch","Chart","XLSX","render",
  `${main}\n;return { parseCCStatement, toIsoDate };`
)(localStorage, document, w, w.navigator, w.location, w.matchMedia, noop, w.getComputedStyle,
  noop, () => true, () => null, async () => ({ok:false}), C, XLSX, noop);

const files = fs.readdirSync("data")
  .filter(f => /^transaction-details_export.*\.xlsx$/i.test(f))
  .map(f => path.join("data", f));

const HEB = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];
const monthLabel = (iso) => `${HEB[Number(iso.slice(5,7))-1]} ${iso.slice(2,4)}`;

console.log(`scanning ${files.length} archived statements with the app's own parser\n`);

const bills = [];
for (const file of files) {
  let result;
  try {
    const wb = XLSX.read(fs.readFileSync(file), { type: "buffer" });
    // parseCCStatement takes a 2D row array, not a workbook - and reads only
    // the first sheet, which for a Max export is "עסקאות במועד החיוב": exactly
    // the transactions this bill actually collected. That is the right sheet
    // for a cycle-boundary question. (The other sheets being ignored entirely
    // is F-21, a separate open bug.)
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
    result = api.parseCCStatement(rows, path.basename(file));
  } catch (e) { console.log(`  (skipped ${path.basename(file)}: ${e.message})`); continue; }
  if (!result || !result.txns || !result.txns.length) { console.log(`  (skipped ${path.basename(file)}: no transactions)`); continue; }

  const purchases = result.txns.map(t => api.toIsoDate(t.date_raw)).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
  const billIsos = [...new Set(result.txns.map(t => api.toIsoDate(t.billingDateRaw)).filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)))];
  bills.push({
    file: path.basename(file),
    card: result.cardName || "?", last4: result.last4 || "",
    billIso: billIsos.length === 1 ? billIsos[0] : (billIsos.sort()[0] || ""),
    billIsoCount: billIsos.length,
    n: result.txns.length,
    sum: result.txns.reduce((s,t)=>s+Number(t.amount||0),0),
    first: purchases[0], last: purchases[purchases.length-1],
  });
}

bills.sort((a,b) => (a.card+a.last4).localeCompare(b.card+b.last4) || String(a.billIso).localeCompare(String(b.billIso)));

console.log("A. Every archived bill: what it collected");
console.log("   card / last4        bill date    purchases covered        n     sum");
for (const b of bills) {
  console.log(`   ${(b.card+" "+b.last4).padEnd(20).slice(0,20)} ${(b.billIso||"—").padEnd(12)} ${(b.first||"?")} → ${(b.last||"?")}  ${String(b.n).padStart(4)} ${b.sum.toFixed(2).padStart(9)}${b.billIsoCount>1?"  (!! mixed bill dates)":""}`);
}

console.log("\nB. Where does the cutoff actually fall?");
console.log("   For consecutive bills on the same card, the boundary sits between the");
console.log("   LAST purchase on bill N and the FIRST purchase on bill N+1.\n");

const byCard = {};
for (const b of bills) {
  if (!b.billIso || !b.first) continue;
  const key = `${b.card}|${b.last4}`;
  (byCard[key] = byCard[key] || []).push(b);
}

let verdicts = [];
for (const [key, list] of Object.entries(byCard)) {
  const [card, last4] = key.split("|");
  console.log(`   ── ${card}${last4 ? " ("+last4+")" : ""} ──`);
  // One row per bill: the window it covers, in days-of-month.
  for (const b of list) {
    console.log(`      bill ${b.billIso} (${monthLabel(b.billIso)}) covers ${b.first} → ${b.last}`);
  }
  const firstDays = list.map(b => Number(b.first.slice(8,10)));
  const lastDays  = list.map(b => Number(b.last.slice(8,10)));
  const minFirst = Math.min(...firstDays), maxFirst = Math.max(...firstDays);
  console.log(`      earliest purchase day seen on any bill: ${minFirst}   (latest first-day: ${maxFirst})`);

  if (list.length < 2) {
    console.log(`      ⚠ only ${list.length} bill for this card - NOT enough to establish a recurring boundary.\n`);
    verdicts.push({card, last4, verdict: "insufficient", bills: list.length, minFirst, lastDays});
    continue;
  }
  // Does any bill contain a purchase from the PREVIOUS calendar month? If bills
  // only ever contain same-calendar-month purchases, the cycle is effectively
  // calendar-aligned and a cycleDay near 1 fits.
  const crossesMonth = list.filter(b => b.first.slice(0,7) !== b.last.slice(0,7));
  console.log(`      bills spanning two calendar months: ${crossesMonth.length}/${list.length}`);
  verdicts.push({card, last4, verdict: "measured", bills: list.length, minFirst, maxFirst, crossesMonth: crossesMonth.length, list});
  console.log("");
}

console.log("C. Verdict per card");
for (const v of verdicts) {
  const name = `${v.card}${v.last4 ? " ("+v.last4+")" : ""}`;
  if (v.verdict === "insufficient") {
    console.log(`   ${name}: ${v.bills} bill only - cannot conclude. Need ≥2 consecutive bills.`);
    continue;
  }
  console.log(`   ${name}: ${v.bills} bills. Earliest purchase day on any bill = ${v.minFirst}.`);
  if (v.crossesMonth === 0) {
    console.log(`      No bill spans two calendar months -> the cycle looks CALENDAR-ALIGNED.`);
    console.log(`      A cycleDay of 10 is then wrong: it pushes days 1-9 back a month.`);
  } else {
    console.log(`      ${v.crossesMonth} bill(s) span two calendar months -> a genuine mid-month cutoff exists.`);
  }
}
console.log("\n(These are the only statements archived in data/. Anything not archived is not measured.)");
