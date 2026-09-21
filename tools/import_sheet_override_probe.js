#!/usr/bin/env node
/* F-22 verification: does the credit-card import actually obey a manually
 * chosen target sheet?
 *
 * The bug it guards: ויזה מזרחי is configured cycleDay=10, so a purchase on
 * 09/09 routes to אוגוסט - but the issuer put that same purchase on the bill
 * of 11/10, i.e. ספטמבר. Raz asked for manual control rather than a guessed
 * new cycle day. This probe proves the three override levels resolve in the
 * right order, and - just as important - that the automatic level is still
 * byte-identical to resolveImportTargetSheet, so F-22 did not quietly become
 * a second routing formula.
 *
 * READ-ONLY. Loads the app's real shipped functions.
 * Usage: node tools/import_sheet_override_probe.js [app.html] [backup.json] [user]
 */
const fs = require("fs");
const appPath = process.argv[2] || "expense-app-v37-demo.html";
const backupPath = process.argv[3] || "backups/raz-expenses-backup-2026-09-20_12-20.json";
const user = process.argv[4] || "raz";
const html = fs.readFileSync(appPath, "utf8");
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

// The whole point of this probe is that getElementById("ccImportSheet").value
// is READ by the code under test, so a blanket proxy that always returns ""
// would silently exercise only the automatic path. Real elements, real values.
const elements = new Map();
function fakeElement(id) {
  return { id, value: "", innerHTML: "", style: {}, onchange: null,
           textContent: "", appendChild: noop, addEventListener: noop,
           removeEventListener: noop, querySelectorAll: () => [], focus: noop };
}
const getEl = (id) => {
  if (!elements.has(id)) elements.set(id, fakeElement(id));
  return elements.get(id);
};
const document = new Proxy({}, {
  get(_t, p) {
    if (p === "querySelectorAll" || p === "getElementsByClassName" || p === "getElementsByTagName") return () => [];
    if (p === "documentElement" || p === "body" || p === "head") return mk();
    if (p === "readyState") return "complete";
    if (p === "addEventListener" || p === "removeEventListener") return noop;
    if (p === "createElement" || p === "createElementNS") return () => mk();
    if (p === "getElementById") return (id) => getEl(id);
    if (p === "querySelector") return () => mk();
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
const EXPORTS = ["syncSheetOptions","resolveImportTargetSheet","resolveImportRowSheet",
                 "getCCImportForcedSheet","getCCImportSheetChoices","getBillingSheetForExpense",
                 "getPaymentMethodByName","isPaymentMethodImmediate","toIsoDate"];
let api;
try {
  api = new Function(
    "localStorage","document","window","navigator","location","matchMedia",
    "requestAnimationFrame","getComputedStyle","alert","confirm","prompt","fetch","Chart","XLSX","render",
    `${main}\n;return { sheetOptions: () => SHEET_OPTIONS, AUTO: CC_IMPORT_SHEET_AUTO, ` +
    `setSelectedSheet: (s) => { selectedSheet = s; }, getSelectedSheet: () => selectedSheet, ` +
    `${EXPORTS.map(n=>`${n}: typeof ${n} === "undefined" ? undefined : ${n}`).join(", ")} };`
  )(
    localStorage, document, w, w.navigator, w.location, w.matchMedia, noop, w.getComputedStyle,
    noop, () => true, () => null, async () => ({ok:false,status:0,json:async()=>({})}), C, X, noop
  );
} catch (e) {
  console.error("probe: app script failed to load —", e.message);
  process.exit(1);
}

api.syncSheetOptions();
api.setSelectedSheet("ספטמבר 26");

let issues = 0;
const flag = (msg) => { issues++; console.log(`  FAIL  ${msg}`); };
const pass = (msg) => console.log(`  ok    ${msg}`);
const setDropdown = (v) => { getEl("ccImportSheet").value = v; };

const CARD = "ויזה מזרחי";
const method = api.getPaymentMethodByName(CARD);
const isImm = Boolean(method && method.isImmediate);
// The real 15-row Mizrahi batch spanned 09/09..16/09, all on the 11/10 bill.
const ROWS = ["09/09/2026", "10/09/2026", "16/09/2026"].map(d => ({date_raw: d}));

console.log(`app=${appPath}  card=${CARD}  cycleDay=${method && method.cycleDay}  sheets=${api.sheetOptions().length}\n`);

console.log("A. Automatic level is unchanged (must equal resolveImportTargetSheet exactly)");
setDropdown(api.AUTO);
for (const row of ROWS) {
  const legacy = api.resolveImportTargetSheet(row, CARD, isImm, 0, "FALLBACK");
  const now = api.resolveImportRowSheet(row, CARD, isImm, 0, "FALLBACK");
  if (now.sheet !== legacy) flag(`${row.date_raw}: auto -> ${now.sheet}, resolveImportTargetSheet -> ${legacy}`);
  else if (now.origin !== "auto") flag(`${row.date_raw}: origin should be "auto", got "${now.origin}"`);
  else pass(`${row.date_raw} -> ${now.sheet} (auto, matches the shared rule)`);
}
// The bug that started this: 09/09 auto-routes to August, the issuer says September.
const sept9 = api.resolveImportRowSheet({date_raw:"09/09/2026"}, CARD, isImm, 0, "FALLBACK").sheet;
console.log(`\n   (documenting the mismatch F-22 exists for: 09/09 auto-routes to "${sept9}",`);
console.log(`    while the issuer billed it on 11/10 = ספטמבר 26. Manual override is the fix.)\n`);

console.log("B. Global override: dropdown set to a sheet must force EVERY row there");
setDropdown("ספטמבר 26");
for (const row of ROWS) {
  const r = api.resolveImportRowSheet(row, CARD, isImm, 0, "FALLBACK");
  if (r.sheet !== "ספטמבר 26") flag(`${row.date_raw}: global override ignored, went to ${r.sheet}`);
  else if (r.origin !== "global") flag(`${row.date_raw}: origin should be "global", got "${r.origin}"`);
  else pass(`${row.date_raw} -> ספטמבר 26 (global override)`);
}

console.log("\nC. Per-row override beats the global one");
setDropdown("ספטמבר 26");
const pinned = api.resolveImportRowSheet({date_raw:"16/09/2026", _sheetOverride:"אוקטובר 26"}, CARD, isImm, 0, "FALLBACK");
if (pinned.sheet !== "אוקטובר 26") flag(`per-row override ignored, went to ${pinned.sheet}`);
else if (pinned.origin !== "row") flag(`origin should be "row", got "${pinned.origin}"`);
else pass(`16/09 pinned to אוקטובר 26 while the file is forced to ספטמבר 26`);

console.log("\nD. A row left on AUTO follows the global override, it does not re-derive");
const followsGlobal = api.resolveImportRowSheet({date_raw:"09/09/2026", _sheetOverride:api.AUTO}, CARD, isImm, 0, "FALLBACK");
if (followsGlobal.sheet !== "ספטמבר 26") flag(`row on AUTO should follow the global override, went to ${followsGlobal.sheet}`);
else pass(`09/09 on AUTO -> ספטמבר 26 (inherits the file-level choice)`);

console.log("\nE. Clearing the dropdown back to AUTO restores automatic routing");
setDropdown(api.AUTO);
const restored = api.resolveImportRowSheet({date_raw:"09/09/2026"}, CARD, isImm, 0, "FALLBACK");
if (restored.sheet !== sept9) flag(`after clearing, expected ${sept9}, got ${restored.sheet}`);
else if (restored.origin !== "auto") flag(`origin should be back to "auto", got "${restored.origin}"`);
else pass(`09/09 -> ${restored.sheet} (automatic again, no sticky state)`);

console.log("\nF. The sheet list offered is the app's real sheets, not six months from today");
const choices = api.getCCImportSheetChoices();
if (choices[0] !== api.AUTO) flag(`first choice should be AUTO, got "${choices[0]}"`);
const real = api.sheetOptions();
const missing = real.filter(s => !choices.includes(s));
if (missing.length) flag(`these real sheets are not offered: ${missing.join(", ")}`);
else pass(`all ${real.length} real sheets offered, AUTO first`);

console.log(`\n${issues ? `${issues} failure(s)` : "F-22 verified: manual sheet control works at all three levels"}`);
process.exit(issues ? 1 : 0);
