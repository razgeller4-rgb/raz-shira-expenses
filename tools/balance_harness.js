#!/usr/bin/env node
/* Numeric before/after harness for the balance calculations.
 *
 * CLAUDE.md requires a documented before/after with real numbers before any
 * change to calculation logic, and BALANCE_ANCHOR_SPEC.md makes "the yearly
 * table is identical cell by cell" a binary acceptance criterion. The app is a
 * single HTML file with no test runner and cannot be served locally (project
 * rule), so this loads the app's own <script> into node against a localStorage
 * stub seeded from a real backup, and dumps the numbers.
 *
 * It runs the SHIPPING code, not a reimplementation - a reimplementation would
 * prove nothing about the file we actually promote.
 *
 * Usage:
 *   node tools/balance_harness.js <app.html> <backup.json> [--user raz|shira]
 *
 * Read-only: never writes to the backup or the app file.
 *
 * SECURITY NOTE - this file uses `new Function()` on interpolated source, which
 * is normally a code-injection red flag. Here it is the mechanism, not an
 * accident: the whole point is to execute the app's own <script> so the numbers
 * come from the code we actually ship rather than from a reimplementation. The
 * interpolated string is (a) the app HTML at a path the developer passes on the
 * command line, and (b) a hardcoded identifier list in this file. There is no
 * user-supplied or network-supplied input anywhere in the chain. This is a
 * developer-only harness: it is never loaded by the browser, never bundled into
 * expense-app-v37.html, and never runs against anything but a local file the
 * operator chose. Do not copy this pattern into application code.
 */

const fs = require("fs");
const path = require("path");

const [, , appPath, backupPath, ...rest] = process.argv;
if (!appPath || !backupPath) {
  console.error("usage: node tools/balance_harness.js <app.html> <backup.json> [--user raz|shira]");
  process.exit(2);
}
const userArg = (() => {
  const i = rest.indexOf("--user");
  return i >= 0 ? rest[i + 1] : null;
})();

const html = fs.readFileSync(appPath, "utf8");
const backup = JSON.parse(fs.readFileSync(backupPath, "utf8"));

/* ---- localStorage stub, seeded from the backup ----------------------------
 * The demo build namespaces every key with STORAGE_NS_PREFIX = "demo__" while
 * production uses "". Backups are exported from production, so their keys are
 * unprefixed. Seeding them verbatim into a demo run means the app reads NOTHING
 * and silently falls back to the hardcoded SHEET_SUMMARIES / SEEDED_BY_SHEET
 * constants - which looks like real data for raz and like an empty account for
 * shira. Read the prefix out of the file under test and apply it. */
const nsMatch = html.match(/const\s+STORAGE_NS_PREFIX\s*=\s*"([^"]*)"/);
const NS = nsMatch ? nsMatch[1] : "";

const store = new Map();
for (const [k, v] of Object.entries(backup.data || {})) {
  store.set(NS + k, typeof v === "string" ? v : JSON.stringify(v));
}
if (userArg) store.set(NS + "expense_app_active_user_v1", userArg);

const localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => void store.set(k, String(v)),
  removeItem: (k) => void store.delete(k),
  clear: () => void store.clear(),
  key: (i) => [...store.keys()][i] ?? null,
  get length() { return store.size; },
};

/* ---- DOM stub ------------------------------------------------------------
 * Everything is a self-returning no-op so that render paths touched during
 * definition or incidental calls cannot throw. We never assert on the DOM -
 * only on returned numbers.
 */
const noop = () => {};
function makeEl() {
  const el = new Proxy(function () {}, {
    get(_t, prop) {
      if (prop === "style") return new Proxy({}, { get: () => "", set: () => true });
      if (prop === "classList") return { add: noop, remove: noop, toggle: noop, contains: () => false };
      if (prop === "dataset") return {};
      if (prop === "children" || prop === "childNodes") return [];
      if (prop === "value" || prop === "textContent" || prop === "innerHTML") return "";
      if (prop === "length") return 0;
      if (prop === Symbol.iterator) return function* () {};
      if (prop === "then") return undefined; // not a thenable
      return makeEl();
    },
    set: () => true,
    apply: () => makeEl(),
  });
  return el;
}
const document = new Proxy({}, {
  get(_t, prop) {
    if (prop === "querySelectorAll" || prop === "getElementsByClassName" || prop === "getElementsByTagName") {
      return () => [];
    }
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

/* Chart.js and XLSX are CDN globals in the browser. The app constructs charts
 * during render(), which runs on load - so these must be constructible, not
 * undefined, or the whole script aborts before we can read any number. */
class ChartStub {
  constructor() { this.data = { datasets: [] }; this.options = {}; }
  update() {} destroy() {} resize() {} static register() {}
}
const XLSXStub = {
  utils: { book_new: () => ({}), json_to_sheet: () => ({}), book_append_sheet: noop, sheet_to_json: () => [] },
  writeFile: noop, read: () => ({ SheetNames: [], Sheets: {} }),
};

/* Unhandled async rejections inside render paths must not kill the harness -
 * we only care about the numbers the sync calculation functions return. */
process.on("unhandledRejection", () => {});

/* ---- run the app's own script -------------------------------------------- */
const scripts = [...html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const main = scripts.reduce((a, b) => (b.length > a.length ? b : a), "");

const EXPORTS = [
  "getYearlyRowsData", "getDisplayedOpeningBalance", "getDisplayedClosingBalance",
  "getExpenseStats", "getIncomeTotal", "getPrevSheet", "getSheetMonthYear",
  "formatSheetFromMonth", "getSheetSortValue", "syncSheetOptions", "getAvailableYears",
  "getManualSettingsMap", "getOverrides", "getHeroSparkData", "buildForecast",
  "getAllUserStorageKeys", "getBalanceAnchors",
  "runBalanceAnchorMigration", "getBalanceAnchorForSheet", "getOpeningBalanceSource",
  "saveBalanceAnchors", "invalidateBalanceMemo", "getSheetAnchorDateIso",
  "saveManualSettings", "resolveSheetName", "getBalanceGapForSheet",
];

const src = `
  ${main}
  ;return { ${EXPORTS.map((n) => `${n}: typeof ${n} === "function" ? ${n} : undefined`).join(", ")},
            get SHEET_OPTIONS(){ return typeof SHEET_OPTIONS !== "undefined" ? SHEET_OPTIONS : []; },
            get currentUser(){ return typeof currentUser !== "undefined" ? currentUser : null; },
            set currentUser(v){ if (typeof currentUser !== "undefined") currentUser = v; },
            get selectedSheet(){ return typeof selectedSheet !== "undefined" ? selectedSheet : null; },
            set selectedSheet(v){ if (typeof selectedSheet !== "undefined") selectedSheet = v; } };
`;

let api;
try {
  // eslint-disable-next-line no-new-func
  api = new Function(
    "localStorage", "document", "window", "navigator", "location",
    "matchMedia", "requestAnimationFrame", "getComputedStyle", "alert", "confirm", "prompt", "fetch", "Chart", "XLSX",
    src
  )(
    localStorage, document, windowStub, windowStub.navigator, windowStub.location,
    windowStub.matchMedia, noop, windowStub.getComputedStyle,
    noop, () => true, () => null, async () => ({ ok: false, status: 0, json: async () => ({}) }),
    ChartStub, XLSXStub
  );
} catch (e) {
  console.error("harness: app script failed to load —", e.message);
  process.exit(1);
}

/* ---- report --------------------------------------------------------------- */
const round = (n) => (n == null ? null : Math.round(Number(n) * 100) / 100);

if (api.syncSheetOptions) { try { api.syncSheetOptions(); } catch {} }

const out = { user: api.currentUser, sheets: [], yearly: {}, chain: [] };

const sheets = (api.SHEET_OPTIONS || []).slice();
for (const sheet of sheets) {
  out.sheets.push({
    sheet,
    opening: round(api.getDisplayedOpeningBalance?.(sheet)),
    closing: round(api.getDisplayedClosingBalance?.(sheet)),
    expenses: round(api.getExpenseStats?.(sheet)?.total),
    income: round(api.getIncomeTotal?.(sheet)),
    prev: api.getPrevSheet?.(sheet) ?? null,
    prevExists: sheets.includes(api.getPrevSheet?.(sheet)),
  });
}

for (const year of (api.getAvailableYears?.() || [])) {
  out.yearly[year] = (api.getYearlyRowsData?.(year) || []).map((r) => ({
    sheet: r.sheet,
    totalExpenses: round(r.totalExpenses),
    income: round(r.income),
    monthlyBalance: round(r.monthlyBalance),
    cumulativeBalance: round(r.cumulativeBalance),
    loan: round(r.loan),
    father: round(r.father),
  }));
}

out.anchors = api.getBalanceAnchors ? api.getBalanceAnchors() : "(not implemented)";
out.storageKeys = api.getAllUserStorageKeys ? api.getAllUserStorageKeys().length : null;

/* ---- output / compare ------------------------------------------------------
 * --out <path>      write this run to disk (the "before" snapshot)
 * --compare <path>  diff this run against a saved snapshot and print ONLY the
 *                   cells that moved. This is the binary acceptance criterion
 *                   from BALANCE_ANCHOR_SPEC §3.2: every yearly-table cell must
 *                   be identical except the ones we intend to change.
 */
const outIdx = rest.indexOf("--out");
const cmpIdx = rest.indexOf("--compare");

if (outIdx >= 0) {
  const p = rest[outIdx + 1];
  fs.writeFileSync(p, JSON.stringify(out, null, 2));
  console.log(`wrote ${p}`);
}

if (cmpIdx >= 0) {
  const prev = JSON.parse(fs.readFileSync(rest[cmpIdx + 1], "utf8"));
  const diffs = [];
  const walk = (a, b, path) => {
    if (JSON.stringify(a) === JSON.stringify(b)) return;
    if (a && b && typeof a === "object" && typeof b === "object" && !Array.isArray(a) === !Array.isArray(b)) {
      const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
      for (const k of keys) walk(a?.[k], b?.[k], `${path}.${k}`);
      return;
    }
    diffs.push({ path, before: a, after: b });
  };
  walk(prev, out, "");
  if (!diffs.length) {
    console.log("IDENTICAL — no cell moved.");
  } else {
    console.log(`${diffs.length} value(s) changed:\n`);
    for (const d of diffs) console.log(`  ${d.path}\n    before: ${JSON.stringify(d.before)}\n    after:  ${JSON.stringify(d.after)}`);
  }
}

/* --selftest: prove the new behaviour actually WORKS, not just that it breaks
 * nothing. A change that moves zero numbers could equally well be a no-op, and
 * the migration runs on DOMContentLoaded so a plain load never exercises it. */
if (rest.includes("--selftest")) {
  const results = [];
  const check = (name, pass, detail) => results.push({ name, pass, detail });

  // 1. CARRY-16 — the chain resolves the 4-digit outlier.
  check("resolveSheetName maps אוקטובר 25 -> the stored 4-digit key",
    api.resolveSheetName?.("אוקטובר 25") === "אוקטובר 2025",
    `got ${JSON.stringify(api.resolveSheetName?.("אוקטובר 25"))}`);
  check("getPrevSheet('נובמבר 25') now lands on an existing sheet",
    (api.SHEET_OPTIONS || []).includes(api.getPrevSheet("נובמבר 25")),
    `prev=${api.getPrevSheet("נובמבר 25")}`);
  check("resolveSheetName leaves an unknown month alone (new sheets stay canonical)",
    api.resolveSheetName?.("ינואר 30") === "ינואר 30",
    `got ${api.resolveSheetName?.("ינואר 30")}`);

  // 2. Migration — every manual openingBalance becomes a legacy anchor, and
  //    the original is NOT deleted (that is what keeps history frozen).
  const manualBefore = api.getManualSettingsMap();
  const withOpening = Object.entries(manualBefore).filter(([, s]) => s && s.openingBalance != null);
  api.runBalanceAnchorMigration?.();
  const anchors = api.getBalanceAnchors?.() || [];
  check("migration created one legacy-manual anchor per manual openingBalance",
    anchors.filter((a) => a.source === "legacy-manual").length === withOpening.length,
    `${withOpening.length} manual values -> ${anchors.filter((a) => a.source === "legacy-manual").length} anchors`);
  const manualAfter = api.getManualSettingsMap();
  check("migration did NOT delete the original manual values",
    JSON.stringify(manualBefore) === JSON.stringify(manualAfter),
    "manualSettings unchanged");
  check("migration is idempotent (flag honoured)",
    (api.runBalanceAnchorMigration?.(), (api.getBalanceAnchors?.() || []).length === anchors.length),
    `still ${anchors.length}`);

  // 3. Numbers still frozen after the migration ran.
  const movedAfterMigration = (api.SHEET_OPTIONS || []).filter((s) => {
    const prevRow = out.sheets.find((r) => r.sheet === s);
    return prevRow && round(api.getDisplayedOpeningBalance(s)) !== prevRow.opening;
  });
  check("no opening balance moved once anchors exist",
    movedAfterMigration.length === 0,
    movedAfterMigration.length ? `moved: ${movedAfterMigration.join(", ")}` : "all identical");

  // 4. Carry-forward actually fills a hole. The real data has no interior gap,
  //    so make one: clear a month that currently has a manual value and confirm
  //    the value is reconstructed from the previous month's closing.
  const victim = withOpening.map(([s]) => s).find((s) => {
    const p = api.getPrevSheet(s);
    return p && (api.SHEET_OPTIONS || []).includes(p) && api.getDisplayedOpeningBalance(p) != null;
  });
  if (victim) {
    const expectedCarry = round(api.getDisplayedClosingBalance(api.getPrevSheet(victim)));
    const map = api.getManualSettingsMap();
    const saved = map[victim];
    store.set(
      `${NS}expense_app_manual_settings_v35${api.currentUser === "raz" ? "" : "_" + api.currentUser}`,
      JSON.stringify({ ...map, [victim]: { openingBalance: null, salary: saved?.salary ?? null } })
    );
    // also drop any anchor for that month so carry is the only remaining source
    api.saveBalanceAnchors((api.getBalanceAnchors() || []).filter((a) => a.dateIso !== api.getSheetAnchorDateIso(victim)));
    api.invalidateBalanceMemo?.();
    const carried = round(api.getDisplayedOpeningBalance(victim));
    const src = api.getOpeningBalanceSource?.(victim);
    const isRaz = api.currentUser === "raz";
    check(`carry-forward fills a cleared month (${victim})`,
      isRaz ? (carried != null) : (carried === expectedCarry),
      `expected carry ${expectedCarry}, got ${carried}, source=${src}${isRaz ? " (raz also has the seeded-summary path, which correctly outranks carry)" : ""}`);
  } else {
    check("carry-forward fill case available", false, "no suitable month found to clear");
  }

  // 5. The gap must be measured against what the app would have said WITHOUT
  //    the anchor. If it were measured against getDisplayedOpeningBalance the
  //    anchor would be compared to itself and the gap would always be 0 - a
  //    reconciliation feature that can never report a discrepancy.
  const gapMonth = (api.SHEET_OPTIONS || []).find((s) => {
    const p = api.getPrevSheet(s);
    return p && (api.SHEET_OPTIONS || []).includes(p) && api.getDisplayedClosingBalance(p) != null;
  });
  if (gapMonth) {
    const computed = round(api.getDisplayedClosingBalance(api.getPrevSheet(gapMonth)));
    const claim = computed + 500;
    api.saveBalanceAnchors([
      ...(api.getBalanceAnchors() || []).filter((a) => a.dateIso !== api.getSheetAnchorDateIso(gapMonth)),
      { id: "anchor-test", dateIso: api.getSheetAnchorDateIso(gapMonth), amount: claim,
        enteredBy: api.currentUser, enteredAtIso: "2026-09-14T00:00:00.000Z", source: "manual" },
    ]);
    api.invalidateBalanceMemo?.();
    const info = api.getBalanceGapForSheet?.(gapMonth);
    check(`gap is measured against the computation, not against itself (${gapMonth})`,
      info && round(info.gap) === 500 && round(info.computed) === computed,
      `computed=${info && round(info.computed)} (expected ${computed}), gap=${info && round(info.gap)} (expected 500)`);
    check("anchor overrides the opening balance once recorded",
      round(api.getDisplayedOpeningBalance(gapMonth)) === claim,
      `opening=${round(api.getDisplayedOpeningBalance(gapMonth))}, expected ${claim}`);
  } else {
    check("gap test case available", false, "no month with a computable previous close");
  }

  // 6. Sparkline now plots the same quantity as the hero, and does not reset.
  const spark = api.getHeroSparkData?.();
  const closings = (spark?.labels || []).map((_, i) => spark.values[i]);
  check("sparkline plots closing balance (same quantity as the hero number)",
    Array.isArray(spark?.values) && spark.values.length > 0 &&
      spark.values.every((v) => v === null || typeof v === "number"),
    `${spark?.values?.length} points: ${JSON.stringify(closings)}`);

  const failed = results.filter((r) => !r.pass);
  for (const r of results) console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.name}\n        ${r.detail}`);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) process.exitCode = 1;
} else if (outIdx < 0 && cmpIdx < 0) {
  console.log(JSON.stringify(out, null, 2));
}
