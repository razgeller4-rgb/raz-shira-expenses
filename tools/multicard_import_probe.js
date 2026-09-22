#!/usr/bin/env node
/* F-20 verification against a REAL multi-card statement.
 *
 * Before the fix, parseCCStatement's max branch set the file-level `last4`
 * from the first row only and then assigned that same value to every row, so a
 * file mixing cards 0294 and 8948 attributed all 17 transactions to one card.
 * This probe reads the raw spreadsheet independently, then requires the app's
 * own parser to reproduce the same per-card split exactly - so it fails if the
 * bug returns, and it cannot pass by agreeing with itself.
 *
 * Also covers the mapping layer: assigning a card to a group must move every
 * row of that group and no other, and must teach the app the four digits
 * without ever overwriting a number the user already configured.
 *
 * READ-ONLY on disk. Usage:
 *   node tools/multicard_import_probe.js [app.html] [backup.json] [user] [xlsx-lib]
 */
const fs = require("fs");
const path = require("path");
const appPath = process.argv[2] || "expense-app-v37-demo.html";
const backupPath = process.argv[3] || "backups/raz-expenses-backup-2026-09-20_12-20.json";
const user = process.argv[4] || "raz";
const XLSX = require(process.argv[5] || "/tmp/xlsx.full.min.js");
const html = fs.readFileSync(appPath, "utf8");
const data = JSON.parse(fs.readFileSync(backupPath, "utf8")).data || {};
const raw = (k) => { const v = data[k]; return v == null ? null : (typeof v === "string" ? v : JSON.stringify(v)); };

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
const elements = new Map();
const getEl = (id) => {
  if (!elements.has(id)) elements.set(id, { id, value: "", innerHTML: "", style: {}, onchange: null,
    textContent: "", appendChild: noop, addEventListener: noop, removeEventListener: noop,
    querySelectorAll: () => [], focus: noop });
  return elements.get(id);
};
const document = new Proxy({}, { get(_t, p) {
  if (p === "querySelectorAll" || p === "getElementsByClassName" || p === "getElementsByTagName") return () => [];
  if (p === "documentElement" || p === "body" || p === "head") return mk();
  if (p === "readyState") return "complete";
  if (p === "addEventListener" || p === "removeEventListener") return noop;
  if (p === "createElement" || p === "createElementNS") return () => mk();
  if (p === "getElementById") return (id) => getEl(id);
  if (p === "querySelector") return () => mk();
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
                    "expense_app_ui_prefs_v1","expense_app_categories_v1","expense_app_merchant_memory_v1"]) {
  const v = raw(base); if (v != null) localStorage.setItem(`${NS}${base}`, v);
}

const scripts = [...html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const main = scripts.reduce((a, b) => (b.length > a.length ? b : a), "");
const EXPORTS = ["parseCCStatement","syncSheetOptions","getCCImportCardGroups","getCCImportCardMapping",
                 "setCCImportCardMapping","getPaymentMethods","savePaymentMethods","extractLast4",
                 "refreshCCImportDuplicateState","buildCCImportTable","getImportPaymentOptions"];
let api;
try {
  api = new Function(
    "localStorage","document","window","navigator","location","matchMedia",
    "requestAnimationFrame","getComputedStyle","alert","confirm","prompt","fetch","Chart","XLSX","render",
    `${main}\n;return { setRows: (r) => { ccImportRows = r; }, getRows: () => ccImportRows, ` +
    `${EXPORTS.map(n=>`${n}: typeof ${n} === "undefined" ? undefined : ${n}`).join(", ")} };`
  )(localStorage, document, w, w.navigator, w.location, w.matchMedia, noop, w.getComputedStyle,
    noop, () => true, () => null, async () => ({ok:false,status:0,json:async()=>({})}), C, XLSX, noop);
} catch (e) { console.error("probe: app script failed to load —", e.message); process.exit(1); }
api.syncSheetOptions();

let issues = 0;
const flag = (m) => { issues++; console.log(`  FAIL  ${m}`); };
const pass = (m) => console.log(`  ok    ${m}`);

/* Independent read of the raw file - the ground truth this probe scores against. */
function truthFor(file) {
  const wb = XLSX.read(fs.readFileSync(file), { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
  const hi = rows.findIndex(r => (r||[]).some(c => /תאריך עסקה/.test(String(c||""))));
  const hdr = rows[hi].map(c => String(c||"").trim());
  const li = hdr.findIndex(x => /4 ספרות/.test(x));
  const ai = hdr.findIndex(x => /סכום חיוב/.test(x));
  const counts = new Map();
  for (let i = hi+1; i < rows.length; i++) {
    const r = rows[i] || [];
    const l4 = String(r[li] ?? "").trim();
    const amt = parseFloat(r[ai]);
    if (!l4 || !isFinite(amt) || amt <= 0) continue;
    counts.set(l4, (counts.get(l4) || 0) + 1);
  }
  return { counts, rows, wb };
}

const MULTI = "data/transaction-details_export_1789750163903.xlsx";
if (!fs.existsSync(MULTI)) { console.error(`missing ${MULTI}`); process.exit(2); }

const truth = truthFor(MULTI);
console.log(`file: ${path.basename(MULTI)}`);
console.log(`raw spreadsheet says: ${[...truth.counts].map(([c,n]) => `${c}=${n}`).join(", ")}\n`);

console.log("A. The parser must reproduce the raw per-card split");
const ws = truth.wb.Sheets[truth.wb.SheetNames[0]];
const rowArr = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
const result = api.parseCCStatement(rowArr, path.basename(MULTI));
if (result.format !== "max") flag(`expected format "max", got "${result.format}"`);
const parsedCounts = new Map();
for (const t of result.txns) {
  const l4 = api.extractLast4(t.sourceCardLast4);
  parsedCounts.set(l4 || "(none)", (parsedCounts.get(l4 || "(none)") || 0) + 1);
}
console.log(`   parser says: ${[...parsedCounts].map(([c,n]) => `${c}=${n}`).join(", ")}`);
if (parsedCounts.size < 2) {
  flag(`all ${result.txns.length} rows carry the same card - this is exactly the F-20 bug`);
} else {
  let ok = true;
  for (const [card, n] of truth.counts) {
    if (parsedCounts.get(card) !== n) { flag(`card ${card}: raw file has ${n} rows, parser produced ${parsedCounts.get(card) || 0}`); ok = false; }
  }
  if (ok) pass(`per-card split matches the raw file exactly (${[...truth.counts].map(([c,n])=>`${c}:${n}`).join(", ")})`);
}

console.log("\nB. Grouping surfaces every card in the file");
/* Run this probe against a build that predates F-20 (e.g. production before the
   promotion) and these functions simply do not exist. Report that as a failure
   rather than crashing with a TypeError - a stack trace reads like a broken
   probe, which is exactly how a real regression gets dismissed. */
if (typeof api.getCCImportCardGroups !== "function") {
  flag("getCCImportCardGroups is not defined in this build - the F-20 mapping layer is absent");
  console.log(`\n${issues} failure(s)`);
  process.exit(1);
}
api.setRows(result.txns.map(t => Object.assign({}, t)));
const groups = api.getCCImportCardGroups();
if (groups.length !== truth.counts.size) flag(`expected ${truth.counts.size} groups, got ${groups.length}`);
else pass(`${groups.length} card groups: ${groups.map(g => `${g.last4} (${g.count} × ${Math.round(g.sum)}₪)`).join(", ")}`);
const groupTotal = groups.reduce((s,g) => s + g.count, 0);
if (groupTotal !== result.txns.filter(t => api.extractLast4(t.sourceCardLast4)).length)
  flag(`groups cover ${groupTotal} rows but the file has ${result.txns.length}`);
else pass(`groups account for every row - none silently dropped`);

console.log("\nC. Assigning a group moves only that group's rows");
const [gA, gB] = groups;
const methods = api.getPaymentMethods();
const cardA = methods[0] && methods[0].name;
const cardB = methods[1] && methods[1].name;
api.setCCImportCardMapping(gA.last4, cardA);
const afterA = api.getRows();
const movedA = afterA.filter(r => r.payment === cardA).length;
const wrongMove = afterA.filter(r => api.extractLast4(r.sourceCardLast4) !== gA.last4 && r.payment === cardA).length;
if (movedA !== gA.count) flag(`assigned ${cardA} to ${gA.last4}: expected ${gA.count} rows to change, ${movedA} did`);
else pass(`${gA.count} rows of ${gA.last4} assigned to "${cardA}"`);
if (wrongMove) flag(`${wrongMove} row(s) from another card were also changed`);
else pass(`no row from card ${gB.last4} was touched`);

api.setCCImportCardMapping(gB.last4, cardB);
if (api.getCCImportCardMapping(gA.last4) !== cardA) flag(`assigning ${gB.last4} disturbed ${gA.last4}'s mapping`);
else pass(`both groups hold independent mappings (${gA.last4}→${cardA}, ${gB.last4}→${cardB})`);

console.log("\nD. The mapping teaches the app the four digits - but never overwrites");
const afterMethods = api.getPaymentMethods();
const learned = afterMethods.find(m => m.name === cardA);
if (api.extractLast4(learned.last4) !== gA.last4)
  flag(`"${cardA}" should have learned last4 ${gA.last4}, has "${learned.last4}"`);
else pass(`"${cardA}" learned last4 ${gA.last4} - next import resolves without asking`);

// Now the critical negative: a card that ALREADY has a different number must
// keep it. Silently repointing a correctly-configured card is the worse bug.
const guarded = api.getPaymentMethods();
const gi = guarded.findIndex(m => m.name === cardB);
guarded[gi].last4 = "1234";
api.savePaymentMethods(guarded);
api.setCCImportCardMapping(gB.last4, cardB);
const stillGuarded = api.getPaymentMethods().find(m => m.name === cardB);
if (api.extractLast4(stillGuarded.last4) !== "1234")
  flag(`"${cardB}" had last4 1234 configured and it was overwritten with ${stillGuarded.last4}`);
else pass(`"${cardB}" kept its pre-configured 1234 - no silent overwrite`);

console.log("\nE. A single-card file must not show the mapping question");
const singleFile = "data/transaction-details_export_1782411421305.xlsx";
if (fs.existsSync(singleFile)) {
  const sWb = XLSX.read(fs.readFileSync(singleFile), { type: "buffer" });
  const sRows = XLSX.utils.sheet_to_json(sWb.Sheets[sWb.SheetNames[0]], { header: 1, defval: null });
  const sRes = api.parseCCStatement(sRows, path.basename(singleFile));
  api.setRows(sRes.txns.map(t => Object.assign({}, t)));
  const sGroups = api.getCCImportCardGroups();
  if (sGroups.length > 1) flag(`single-card file produced ${sGroups.length} groups: ${sGroups.map(g=>g.last4).join(",")}`);
  else pass(`single-card file yields ${sGroups.length} group - mapping block stays hidden`);
} else {
  console.log("   (no single-card file available - skipped)");
}

console.log(`\n${issues ? `${issues} failure(s)` : "F-20 verified against a real two-card statement"}`);
process.exit(issues ? 1 : 0);
