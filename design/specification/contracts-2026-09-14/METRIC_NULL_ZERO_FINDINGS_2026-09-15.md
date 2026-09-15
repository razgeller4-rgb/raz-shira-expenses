# Null-vs-Zero display findings — 39 dashboard/yearly metrics

**Date:** 2026-09-15
**Source file inspected:** `expense-app-v37-demo.html` (current: 10,720 lines, sha256 `fb7d4fc1790b609c2b7010d5e1cd7f76c589f16408f192604f64467e5df04096`)
**CSV updated:** `METRIC_DISPLAY_CONTRACT.csv` — `null_zero_rule` and `line` columns rewritten per row; `source_sha256` left stale as instructed.

> The CSV's original `line`/`source_sha256` referred to a smaller, older file and did not match. All findings below were located by function NAME (grep), not by the CSV's line numbers, then confirmed by reading the current bodies.

---

## Headline

**All 39 metrics are free of the silent null→0 coercion bug that CARRY-14 fixed on the hero balance.** Every one reaches the DOM through a null-safe formatter:

- **Dashboard widgets** (15 rows) and **yearly widgets** (14 rows) render via `formatMetricValue(item.value, item.format)` — line 6663 (dashboard) and line 9274 (yearly). `formatMetricValue` (line 3980) guards on line 3981: `if(value == null || value === "") return "—";`. Identical semantics to `fmtOrDash`.
- **Yearly table columns** (10 rows) render via `fmtOrDash(row[column.id])` — line 9288. `fmtOrDash` (line 5610) returns "—" for `null`/`""`.

The dangerous formatter is `fmt(n)` (line 5609: `Number(n || 0)` → coerces null to ₪0). **None of the 39 metrics call `fmt` directly at their render site.** `fmt` is only used behind the two guards above and in a few modal/detail spots that are outside this contract's scope (e.g. the debt-details modal at 6366-6388, which pre-guards with ternaries).

So: **39 of 39 have no coercion bug at render time.**

## But "safe formatter" is not the whole story — a real zero-vs-empty gap in 5 yearly averages

A metric can still mislead if its *computation* returns `0` for the "no data" case instead of `null`. Then the safe formatter faithfully prints ₪0 — correct code, but the user can't tell an empty year from a genuine zero. Five yearly summary metrics do exactly this:

| metric | computed as | empty-year output |
|---|---|---|
| `avg_expense` (yearly) | `rows.length ? totalExpense/rows.length : 0` (line 6208) | ₪0 |
| `avg_income` (yearly) | `rows.length ? totalIncome/rows.length : 0` (line 6209) | ₪0 |
| `avg_balance` (yearly) | `rows.length ? totalMonthlyBalance/rows.length : 0` (line 6210) | ₪0 |
| `year_to_date_savings` | `rows.length ? rows[last].cumulativeBalance : 0` (line 6211) | ₪0 |
| `rolling_three_balance` | `rows.slice(-3).reduce(...,0)` (line 6212) | ₪0 (empty reduce) |

These are flagged **PARTIALLY SAFE** in the CSV. There is no coercion bug, but they are inconsistent with the dashboard's own `avg_expense` (line 6161), which uses `... : null` for the same empty case and correctly shows "—". If the redesign wants an empty/uncomputed year to read as "—", these five need their computation changed from `: 0` to `: null` (a computation change, out of scope for this doc).

## Ranked by real-world likelihood of hitting the gap

Only the 5 partially-safe metrics carry any user-visible risk; ranked by how often the empty case actually occurs:

1. **Yearly `avg_expense` / `avg_income` / `avg_balance` — moderate/real.** Any freshly-selected year with no documented sheets yet shows ₪0 across all three average cards. This happens every January (or whenever the user flips to a year they haven't populated). The yearly view does show an empty-table message, but the KPI cards above it still read "₪0 ממוצע", which is misleading rather than blank.
2. **`year_to_date_savings` — moderate.** Same trigger (empty year). Reads "חיסכון ₪0" for a year with no data, indistinguishable from a year that genuinely broke even. `tone` also renders neutral for 0, so the visual cue doesn't disambiguate either.
3. **`rolling_three_balance` — low/moderate.** Same empty-year trigger; slightly less prominent as a concept.

For contrast, the metrics that *correctly* use "—" for the empty case and thus have no gap: dashboard `avg_expense` (empty month → "—"), dashboard `largest_expense` (empty month → "—"), `opening_balance` / `closing_balance` (unknown/uncomputable balance → "—", the CARRY-14 path itself), yearly `best_balance_month` / `worst_balance_month` (empty year → "—"), all debt widgets (0 → "—" via `|| null`), and the yearly `loan` column (no schedule entry → "—").

## True-zero metrics (₪0 is correct, not a gap)

The stats-derived metrics (`fixed`, `variable`, `income`, `immediate`, `transfers`, `monthly_balance`, `expense_count`, all annual totals, and the yearly table columns `totalExpenses/fixed/variable/income/monthlyBalance/cumulativeBalance/immediate/transfers/father`) are always finite numbers (reduce seeded at 0). A ₪0 here means a real zero (no expenses of that type, no income recorded), which is the correct reading — there is no "unknown" state to confuse it with.

## Two label/design divergences noted while verifying (not null-related)

- `cumulativeBalance` (yearly column): the CSV label is `מאזן מצטבר`, but the **current code label is `נצבר מתחילת השנה`** (line 6269, a D-10 wave-3 rename). The value/formula are unchanged. The CSV `label` column still shows the old text — someone should reconcile that column separately.
- `father` vs `loan` (yearly columns): `loan` uses `|| null` (empty → "—", line 6188) but `father` uses `getFatherRepaymentTotal` with no `|| null` (empty → ₪0, line 6189). Minor internal inconsistency; not a bug, but the two "debt" columns behave differently for their empty case.
- `father_monthly_payment` and `total_monthly_debt` (dashboard) use `|| null`, so a genuine ₪0 (no repayment this month) renders as "—", identical to "no data". Design should confirm that's intended — for these, "0 owed this month" and "no info" are shown the same way.

## Unverifiable / caveats

- **Destinations are computed and rendered, all confirmed** — nothing in the 39 was found to be computed-but-never-rendered. Both catalog→render paths were read end to end.
- **`total_debt_remaining` (yearly), `bank_remaining`, `father_remaining`** are inserted into the widget array via `widgets.splice(7, 0, ...)` (lines 6250-6253), not a static array slot. Their `line` in the CSV now points at the splice-inserted object literal (6251/6252/6253), which is the accurate computation site. Their array *position* differs from the CSV's original ordering, but that does not affect the null rule.
- **NaN** was considered: no metric divides without a `rows.length` guard, and all sums seed at 0, so NaN does not arise on any of these 39 paths. `formatMetricValue`/`fmtOrDash` would render NaN as "NaN ₪" if it ever occurred, but it does not on these inputs.
- `source_sha256` left stale in the CSV per instructions — regenerate separately. The correct current hash is recorded at the top of this doc for convenience.
