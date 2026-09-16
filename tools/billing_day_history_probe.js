#!/usr/bin/env node
/* Verifies the D-13 billing-day-history model against the app's OWN shipped
 * code, same pattern as balance_harness.js / grocery_probe.js.
 *
 * The critical property under test is BACKWARD COMPATIBILITY: a payment method
 * with no recorded history must route every row exactly as it did before the
 * change. That is what makes this slice safe to ship on its own - it adds a
 * capability without moving a single existing number.
 *
 * Usage: node tools/billing_day_history_probe.js <app.html> [backup.json] [baseline.html]
 *
 * With a backup AND a baseline copy of the app, it routes every real expense
 * row through BOTH versions' getBillingSheetForExpense and asserts the outputs
 * are byte-identical.
 *
 * NOTE on what this gate must NOT assert: an earlier version compared the
 * function's output against the sheet each row physically sits in, and "failed"
 * on 40 rows. That was a bad test, not a bug - rows legitimately sit elsewhere
 * when placed manually or imported with a stated billing date (D-08), which
 * bypasses the calculation entirely. The only meaningful invariant is
 * before-vs-after of the function itself.
 *
 * SECURITY NOTE - same as tools/balance_harness.js: `new Function()` on
 * interpolated source is the mechanism, not an accident. It runs the app's OWN
 * <script> so the behaviour verified is the code that ships. The interpolated
 * string is (a) the app HTML at a developer-supplied path and (b) a hardcoded
 * identifier list in this file - no user- or network-supplied input anywhere.
 * Developer-only harness: never loaded by the browser, never bundled into
 * expense-app-v37.html. Do not copy into application code.
 */

const fs = require("fs");

const [, , appPath, backupPath, baselinePath] = process.argv;
if (!appPath) {
  console.error("usage: node tools/billing_day_history_probe.js <app.html> [backup.json] [baseline.html]");
  process.exit(2);
}

const html = fs.readFileSync(appPath, "utf8");

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
function makeEl() {
  return new Proxy(function () {}, {
    get(_t, prop) {
      if (prop === "style") return new Proxy({}, { get: () => "", set: () => true });
      if (prop === "classList") return { add: noop, remove: noop, toggle: noop, contains: () => false };
      if (prop === "dataset") return {};
      if (prop === "children" || prop === "childNodes") return [];
      if (prop === "value" || prop === "textContent" || prop === "innerHTML") return "";
      if (prop === "length") return 0;
      if (prop === Symbol.iterator) return function* () {};
      if (prop === "then") return undefined;
      return makeEl();
    },
    set: () => true,
    apply: () => makeEl(),
  });
}
const document = new Proxy({}, {
  get(_t, prop) {
    if (prop === "querySelectorAll" || prop === "getElementsByClassName" || prop === "getElementsByTagName") return () => [];
    if (prop === "documentElement" || prop === "body" || prop === "head") return makeEl();
    if (prop === "readyState") return "complete";
    if (prop === "addEventListener" || prop === "removeEventListener") return noop;
    if (prop === "createElement" || prop === "createElementNS") return () => makeEl();
    if (prop === "getElementById" || prop === "querySelector") return () => makeEl();
    return makeEl();
  },
});
const windowStub = {
  addEventListener: noop, removeEventListener: noop,
  matchMedia: () => ({ matches: false, addEventListener: noop, addListener: noop }),
  requestAnimationFrame: noop, cancelAnimationFrame: noop,
  setTimeout: () => 0, clearTimeout: noop, setInterval: () => 0, clearInterval: noop,
  location: { href: "", protocol: "https:", search: "", hash: "" },
  navigator: { onLine: true, userAgent: "node", clipboard: { writeText: async () => {} } },
  localStorage,
  getComputedStyle: () => ({ getPropertyValue: () => "" }),
  devicePixelRatio: 1,
};
class ChartStub { constructor(){ this.data={datasets:[]}; this.options={}; } update(){} destroy(){} resize(){} static register(){} }
const XLSXStub = {
  utils: { book_new: () => ({}), json_to_sheet: () => ({}), book_append_sheet: noop, sheet_to_json: () => [] },
  writeFile: noop, read: () => ({ SheetNames: [], Sheets: {} }),
};
process.on("unhandledRejection", () => {});

const scripts = [...html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const main = scripts.reduce((a, b) => (b.length > a.length ? b : a), "");

const EXPORTS = [
  "normalizeBillingDayHistory", "getBillingDayForDate", "normalizePaymentMethodItem",
  "getBillingSheetForExpense", "getPaymentMethods", "savePaymentMethods",
  "getScopedStorageKey",
];

/* The app reads `currentUser` from localStorage at script-eval time, and every
 * storage key is namespaced (STORAGE_NS_PREFIX) AND user-suffixed. So seeding
 * has to happen BEFORE evaluation, and a per-user run needs its own evaluation.
 * Getting this wrong silently falls back to the built-in default cards, which
 * looks like an app regression but is a harness bug - it cost one false alarm
 * on the first run of this probe. */
function buildApi(seed, sourceHtml) {
  store.clear();
  if (typeof seed === "function") seed(localStorage);
  const body = sourceHtml === undefined ? main : (() => {
    const s = [...sourceHtml.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    return s.reduce((a, b) => (b.length > a.length ? b : a), "");
  })();
  // eslint-disable-next-line no-new-func
  return new Function(
    "localStorage", "document", "window", "navigator", "location",
    "matchMedia", "requestAnimationFrame", "getComputedStyle", "alert", "confirm", "prompt", "fetch", "Chart", "XLSX",
    `${body}\n;return { ${EXPORTS.map((n) => `${n}: typeof ${n} === "function" ? ${n} : undefined`).join(", ")} };`
  )(
    localStorage, document, windowStub, windowStub.navigator, windowStub.location,
    windowStub.matchMedia, noop, windowStub.getComputedStyle,
    noop, () => true, () => null, async () => ({ ok: false, status: 0, json: async () => ({}) }),
    ChartStub, XLSXStub
  );
}

let api;
try {
  api = buildApi();
} catch (e) {
  console.error("probe: app script failed to load —", e.message);
  process.exit(1);
}

let failed = 0;
const check = (label, cond, detail) => {
  if (cond) console.log(`PASS  ${label}`);
  else { failed++; console.log(`FAIL  ${label}${detail ? `\n      ${detail}` : ""}`); }
};

for (const name of EXPORTS) {
  check(`${name} is defined`, typeof api[name] === "function");
}
if (failed) { console.log(`\n${failed} check(s) failed — stopping.`); process.exit(1); }

// ── 1. No history → flat cycleDay, i.e. exactly the old behaviour.
const flat = { name: "בלי היסטוריה", cycleDay: 10 };
check("no history: returns flat cycleDay", api.getBillingDayForDate(flat, "2026-03-15") === 10);
check("no history: same answer for any date", api.getBillingDayForDate(flat, "2024-01-01") === 10);
check("no history: bad date still returns cycleDay", api.getBillingDayForDate(flat, "garbage") === 10);
check("no cycleDay at all: defaults to 10", api.getBillingDayForDate({ name: "x" }, "2026-03-15") === 10);

// ── 2. Raz's real "חבר" case: day 2 until Aug 2026, then day 10.
const hever = api.normalizePaymentMethodItem({
  name: "חבר", cycleDay: 10,
  billingDayHistory: [
    { fromIso: "2025-09-01", day: 2, source: "statement-derived" },
    { fromIso: "2026-08-01", day: 10, source: "user" },
  ],
});
check("history: day 2 in effect for Dec 2025", api.getBillingDayForDate(hever, "2025-12-15") === 2);
check("history: day 2 still in effect July 2026", api.getBillingDayForDate(hever, "2026-07-31") === 2);
check("history: day 10 from Aug 2026", api.getBillingDayForDate(hever, "2026-08-01") === 10);
check("history: day 10 for Sep 2026", api.getBillingDayForDate(hever, "2026-09-16") === 10);
check("history: before the first period, falls back to flat cycleDay",
  api.getBillingDayForDate(hever, "2025-01-01") === 10);

// ── 3. Normalization hygiene.
const messy = api.normalizeBillingDayHistory([
  { fromIso: "2026-08-01", day: 10 },
  { fromIso: "2025-09-01", day: 2 },
  { fromIso: "bad-date", day: 5 },
  { fromIso: "2026-01-01", day: 99 },
  { fromIso: "2026-02-01", day: null },
], 10);
check("normalize: sorted oldest first", messy[0] && messy[0].fromIso === "2025-09-01", JSON.stringify(messy));
check("normalize: invalid date dropped", !messy.some((e) => e.fromIso === "bad-date"));
check("normalize: day clamped to 31", !messy.some((e) => e.day > 31));
check("normalize: null day dropped", !messy.some((e) => e.day == null));
const dupes = api.normalizeBillingDayHistory([
  { fromIso: "2025-01-01", day: 10 },
  { fromIso: "2025-06-01", day: 10 },
  { fromIso: "2026-01-01", day: 2 },
], 10);
check("normalize: consecutive duplicate periods collapsed", dupes.length === 2, JSON.stringify(dupes));

// ── 4. normalizePaymentMethodItem keeps the new fields and the old ones.
const norm = api.normalizePaymentMethodItem({ name: "כרטיס", cycleDay: 4 });
check("normalize item: cycleDay preserved", norm.cycleDay === 4, JSON.stringify(norm));
check("normalize item: empty history when none given", Array.isArray(norm.billingDayHistory) && norm.billingDayHistory.length === 0);
check("normalize item: bankLabel present and empty", norm.bankLabel === "");
check("normalize item: archivedAtIso present and empty", norm.archivedAtIso === "");
const archived = api.normalizePaymentMethodItem({ name: "ישן", cycleDay: 10, archivedAtIso: "2026-05-01" });
check("normalize item: archivedAtIso kept when valid", archived.archivedAtIso === "2026-05-01");

// ── 5. THE REGRESSION GATE — every real row must route to the same sheet.
if (backupPath) {
  const backup = JSON.parse(fs.readFileSync(backupPath, "utf8"));
  const data = backup.data || {};
  const readVal = (k, f) => {
    const raw = data[k];
    if (raw == null) return f;
    if (typeof raw === "string") { try { return JSON.parse(raw); } catch (e) { return f; } }
    return raw;
  };
  const HE = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];
  const toIso = (row) => {
    const s = String(row.date_raw || row.date || "").trim();
    let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
    if (m) { let y = +m[3]; if (y < 100) y += 2000; return `${y}-${String(+m[2]).padStart(2,"0")}-${String(+m[1]).padStart(2,"0")}`; }
    return "";
  };

  // Route every real row through this build, keyed so the baseline build can be
  // compared row-for-row.
  const routeAll = (sourceHtml) => {
    const result = {};
    for (const user of ["raz", "shira"]) {
      const suffix = user === "raz" ? "" : "_shira";
      const overrides = readVal("expense_app_overrides_v29" + suffix, {});
      const methods = readVal("expense_app_payment_methods_v1" + suffix, []);
      // Seed BEFORE evaluating: currentUser is read at eval time, and the
      // payment-methods key is both namespaced and user-suffixed.
      const userApi = buildApi((ls) => {
        ls.setItem("demo__expense_app_active_user_v1", user);
        ls.setItem(`demo__expense_app_payment_methods_v1${suffix}`, JSON.stringify(methods));
      }, sourceHtml);
      if (sourceHtml === undefined) {
        check(`seed check (${user}): real cards loaded, not defaults`,
          methods.length > 0 && userApi.getPaymentMethods().length === methods.length,
          `expected ${methods.map((m) => m.name).join(", ")} | got ${userApi.getPaymentMethods().map((m) => m.name).join(", ")}`);
      }
      for (const sheet of Object.keys(overrides)) {
        for (const row of overrides[sheet] || []) {
          if (!row || row.deleted) continue;
          const iso = toIso(row);
          if (!iso) continue;
          const key = `${user}|${sheet}|${iso}|${row.merchant || ""}|${row.amount}|${row.payment || ""}`;
          result[key] = userApi.getBillingSheetForExpense(iso, row.payment || "BANK", row.immediate || "", 0);
        }
      }
    }
    return result;
  };

  const current = routeAll(undefined);
  console.log("");
  if (baselinePath) {
    const baseline = routeAll(fs.readFileSync(baselinePath, "utf8"));
    const keys = new Set([...Object.keys(current), ...Object.keys(baseline)]);
    const diffs = [...keys].filter((k) => current[k] !== baseline[k]);
    check(`regression gate: routing identical to baseline across ${keys.size} real rows`,
      diffs.length === 0,
      diffs.slice(0, 6).map((k) => `${k}\n        baseline=${baseline[k]}  current=${current[k]}`).join("\n      "));
  } else {
    console.log(`NOTE  routed ${Object.keys(current).length} real rows, but no baseline passed —`);
    console.log("      pass a pre-change copy as the 3rd argument to assert routing is unchanged:");
    console.log("      git show HEAD:expense-app-v37-demo.html > /tmp/baseline.html");
  }
} else {
  console.log("\nNOTE  no backup passed — the real-data regression gate was SKIPPED.");
}

console.log(failed ? `\n${failed} check(s) FAILED` : "\nALL CHECKS PASSED");
process.exit(failed ? 1 : 0);
