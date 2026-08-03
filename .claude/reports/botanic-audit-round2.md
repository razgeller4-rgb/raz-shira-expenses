# Botanic Audit — Round 2 (Read-Only)

**File audited:** `expense-app-v37-demo.html` (~6800 lines, CSS block lines 17–1366)
**Scope:** color/token leftovers + "app-like" structural critique, with deep dive on משותף / הוצאות / שנתי.
**Status:** READ-ONLY. No edits made. All line numbers refer to current demo file.

---

## 1) Remaining non-botanic hardcoded colors

The botanic token system (tokens doc + layout doc) was applied to the `:root`/dark block and many components, but a second layer of **hardcoded gradients/rgba from the old "Gradient Glass" (indigo/violet/blue/rose/red) theme was never migrated**. These sit *after* the token block and override it visually wherever they appear as literal hex/rgba instead of `var(--c-*)`.

| Line(s) | Selector | Current (old palette) | Should become |
|---|---|---|---|
| 158 | `.pill-btn[data-tab="dashboard"].active` | `box-shadow:...rgba(99,102,241,.4)` (indigo) | `rgba(94,122,80,.4)` or `0 2px 10px var(--shadow-accent)`-style, sage |
| 159 | `.pill-btn[data-tab="budget"].active` | `rgba(16,185,129,.4)` (emerald-teal, not olive) | use `--c-budget` derived rgba |
| 160 | `.pill-btn[data-tab="income"].active` | `rgba(34,197,94,.4)` (bright green, not fern) | `--c-income` derived rgba |
| 161 | `.pill-btn[data-tab="cards"].active` | `rgba(139,92,246,.4)` (violet) | `--c-cards` (eucalyptus) derived rgba |
| 162 | `.pill-btn[data-tab="expenses"].active` | `rgba(249,115,22,.4)` (bright orange) | `--c-expenses` (clay) derived rgba |
| 163 | `.pill-btn[data-tab="shared"].active` | `rgba(244,63,94,.4)` (hot rose/red) | `--c-shared` (dusty rose) derived rgba |
| 164 | `.pill-btn[data-tab="debts"].active` | `rgba(239,68,68,.4)` (pure red) | `--c-debts` (terracotta) derived rgba |
| 165 | `.pill-btn[data-tab="yearly"].active` | `rgba(59,130,246,.4)` (bright blue) | `--c-yearly` (moss) derived rgba |
| 166 | `.pill-btn[data-tab="backup"].active` | `rgba(100,116,139,.4)` (cold slate) | `--c-backup` (walnut wood) derived rgba |
| 1168–1174 | `[data-panel="*"] .section` border-right | `rgba(16,185,129,.3)`, `rgba(34,197,94,.3)`, `rgba(139,92,246,.3)`, `rgba(249,115,22,.3)`, `rgba(244,63,94,.3)`, `rgba(239,68,68,.3)`, `rgba(59,130,246,.3)` — **same old indigo/violet/blue/red set, duplicated** | replace each with the matching `--c-*` botanic token |
| 199–207 | `[data-panel="*"] .panel-hero` | Botanic already (good) — these were migrated | — no action |
| 264–271 | `[data-panel="*"] .kpi` tints | Botanic already (good) | — no action |
| 721–722 | `.sync-card` | `linear-gradient(135deg,#eff6ff,#dbeafe)` + `rgba(59,130,246,.2)` border — cold blue, Backup tab | swap to wood/sage wash, e.g. `linear-gradient(135deg, var(--wood-light), transparent)` border `var(--wood)` |
| 938 | `.summary-row.editing` | `rgba(99,102,241,.04)` / `rgba(99,102,241,.3)` indigo | `var(--accent-light)` / `var(--accent-ring)` |
| 967 | `.compact-badge` | `rgba(99,102,241,.1)` bg, `color:var(--accent)` (mixed — bg hardcoded, text tokenized) | bg → `var(--accent-light)` |
| 981 | `.recovery-item-meta .tag` | `rgba(99,102,241,.1)` indigo | `var(--accent-light)` |
| 985 | **`.sec-header`** (shared expense card header — Budget/Shared) | `linear-gradient(135deg,#881337,#f43f5e,#fb7185)` — raw magenta/rose, completely outside botanic palette | `linear-gradient(135deg, var(--c-shared)/dark-stop, var(--c-shared), var(--c-shared)/light-stop)` — match the dusty-rose `--c-shared` family used elsewhere (e.g. line 1000's `rgba(244,63,94,...)`, also stale) |
| 1000–1001 | `.sec-footer-chip`, `.payer` | `rgba(244,63,94,.09)` / `rgba(244,63,94,.16)` — old hot-rose, not `--c-shared` (#C77B8B-family) | convert to `color-mix`/rgba derived from `--c-shared` |
| 1019 | `.card-method-edit` | `rgba(99,102,241,.04)` bg / border `rgba(99,102,241,.2)` indigo | `var(--accent-light)` |
| 1020–1021 | `.bank-debt-row`, `.editing` | `rgba(239,68,68,.03)`/`.15` (red) and `rgba(99,102,241,.04)` (indigo) | `var(--expense-light)`-derived / `var(--accent-light)` |
| 1029 | `.info-box` | `rgba(99,102,241,.06)` bg / `rgba(99,102,241,.15)` border — indigo, used on **every tab** (Shared's "כאן מרוכזות..." box included) | `var(--info-light)` / `var(--info)` border, or sage-tinted |
| 1040–1041 | `.income-topbar` | `linear-gradient(135deg,rgba(34,197,94,.07),rgba(34,197,94,.02))` + border `rgba(34,197,94,.18)` — bright green, not `--income` (#4E7A4A) | rebuild from `var(--income)` rgba |
| 1046 | `.income-source-chip` | `rgba(34,197,94,.12)` bright green bg | `var(--income-light)` |
| 1047 | `.income-recurring-chip` | `rgba(99,102,241,.12)` bg, `color:var(--c-primary,#6366f1)` — **hardcoded indigo fallback color**, `--c-primary` isn't even a defined token | define properly as `var(--accent-light)` / `var(--accent-strong)` |
| 1144 | `.filter-search-input:focus` | `box-shadow:0 0 0 3px rgba(249,115,22,.08)` — old bright orange focus ring, inconsistent with the rest of the app's sage focus ring (`--accent-ring`) | `var(--accent-ring)` (or `--c-expenses`-derived if tab-specific focus is desired, but keep low-sat) |
| 1305 | `.more-backdrop` | `rgba(46,42,34,.45)` — close to walnut but not tokenized; fine as-is but flag for consistency (compare `.modal-backdrop` line 736 below) | optional: `rgba(46,42,34,.45)` is actually on-brand walnut, lower priority |
| 455 | `.demo-banner` | `linear-gradient(90deg,#d97706,#f97316)` amber/orange — acceptable as a deliberate "demo" alert color, but doesn't match `--warn` (#D9A441 mustard) | low priority — intentional alert banner, but could align to `--warn`/`--warn-light` for consistency |
| 459–460 | `.backup-banner` | `linear-gradient(90deg,#1e40af,#3b82f6)` — cold blue, totally outside botanic palette | swap to `var(--info)`/`var(--wood)` gradient |
| 588 | `.card-visual` (Cards tab credit-card mockup) | `linear-gradient(135deg,#5b21b6,#8b5cf6,#a78bfa)` — violet/purple, completely off-palette | rebuild from `var(--c-cards)` (eucalyptus) gradient family |
| 597 | `.card-visual.immediate` | `linear-gradient(135deg,#4c1d95,#7c3aed,#a78bfa)` — same violet family | eucalyptus/clay variant per `--warn` or `--c-cards` darker stop |
| 602 | `.card-visual-chip` | `linear-gradient(135deg,#fde68a,#fbbf24)` — gold/amber chip graphic (acceptable, reads as literal "gold card chip" — low priority, could map to `--gold`/`--c-sand`) | optional: `var(--c-sand)`/`var(--gold)` |
| 639 | **`.shared-balance-card`** (משותף hero) | `linear-gradient(135deg,#9f1239,#f43f5e)` — raw hot rose/crimson, clashes hard with the rest of the cream/sage app | `linear-gradient(135deg, var(--c-shared) dark-stop, var(--c-shared), lighter)` — same family fix as `.sec-header` |
| 647 | `.shared-stat-card` | `linear-gradient(135deg,rgba(244,63,94,.1),rgba(244,63,94,.03))` + border `rgba(244,63,94,.18)` | rebuild from `--c-shared` rgba |
| 654–655 | `[data-panel="shared"] .filter-search-input:focus` / select:focus | `rgba(244,63,94,.08)` hot-rose ring | `var(--c-shared)`-derived ring, softened |
| 670 | **`.debt-highlight-bank`** | `linear-gradient(135deg,#991b1b,#ef4444,#f87171)` raw red | `--c-debts` (terracotta) gradient |
| 671 | **`.debt-highlight-father`** | `linear-gradient(135deg,#1e40af,#3b82f6,#60a5fa)` raw blue | `--info` or `--wood` gradient — currently the only fully "off-system" blue card color in the whole app |
| 510–514 | `.tag-blue/green/orange/red/violet` | `rgba(99,102,241,.1)`, `rgba(16,185,129,.1)`, `rgba(249,115,22,.1)`, `rgba(239,68,68,.1)`, `rgba(139,92,246,.1)` — all five old-palette, only the `color:` half points at tab tokens | rebuild all five backgrounds from the matching `--c-*-light`-style derived rgba |
| 535–536 | `.budget-overview-hero` | `rgba(20,184,166,.07)/.02` teal + border `rgba(20,184,166,.22)` — teal isn't in the botanic per-tab list at all (`--c-budget` is olive) | rebuild from `var(--c-budget)` |
| 559–561 | `.budget-overview-stat.bad/good/warn` | uses `var(--bad-light)`/`var(--good-light)`/`var(--warn-light)` — **these are fine**, already tokenized | no action |
| 1563 | inline style, Cards-tab `.income-topbar` override | `border-color:rgba(139,92,246,.2);background:linear-gradient(135deg,rgba(139,92,246,.07),rgba(139,92,246,.02))` — **inline HTML style attribute**, violet, same family as `.card-visual` | move to a class, rebuild from `--c-cards` |

**Tally:** ~28 distinct hardcoded-color sites outside the token system, concentrated in: pill-nav active shadows, per-tab `.section` accent borders, Shared tab (sec-header/footer chip, balance card, stat card, focus rings), Cards tab (card-visual, inline violet topbar), Debts tab (bank/father highlight cards), generic indigo accents (`.info-box`, `.card-method-edit`, `.bank-debt-row.editing`, `.summary-row.editing`, `.compact-badge`, `.recovery-item-meta .tag`, `.income-recurring-chip`), Backup tab (`.sync-card`, `.backup-banner`), and the `.tag-*` utility classes used app-wide.

**Why this matters for the complaint:** the user's "doesn't feel cohesive" instinct is partly *literally* this — every time they land on Shared (hot rose-crimson hero) or Cards (violet card mockup) or Debts (red/blue highlight pair), the screen jumps out of the cream/sage/walnut world into a totally different, more saturated "tech dashboard" palette. These four spots are probably the single biggest visual-inconsistency driver in the app.

---

## 2) "App-like" structural critique

### `.section` (collapsible containers) — lines 296–305, 1356, 1167–1174
- Structure: flat cream card, `1px solid var(--border)`, `r-xl` (20px) radius, `shadow-sm`, header row with `border-inline-start:3px solid var(--accent)` (leaf-stem edge, line 1356) **but also** a separate, older, per-tab colored `border-right:3px solid rgba(...)` rule at 1168–1174 that **conflicts/duplicates** the newer accent-edge treatment — two different systems drawing the same visual element with different colors and specificity order. Net effect: the left edge accent color is inconsistent tab to tab (old hardcoded vs new sage), and on RTL pages where `border-inline-start` ≠ `border-right` physically, these two rules can literally draw two different colored bars on two different sides depending on cascade order. This is a real bug-adjacent issue, not just aesthetics.
- The `.header` row (line 298–301) is just `padding + cursor:pointer + hover bg` — no chevron/disclosure icon markup found anywhere (no `▾`/`+`/svg caret in the header HTML, e.g. lines 1492, 1517, 1536, 1559, 1581, 1606, 1700, 1718, 1827). A collapsible panel with no visible disclosure indicator reads as **a plain list item you can click for no apparent reason**, not a native accordion — this is the single biggest "feels like a website" tell. iOS/Material accordions always show a chevron that rotates on open/close.
- `.section.content` border-top (line 302) plus the card's own outer border means **double-bordering** at the header/content seam — visually a card with an internal hairline, which is fine, but combined with no shadow elevation *between* header and body, it reads flat/paper rather than "lifted."

### `.kpi` / `.bento-card` — lines 250–286, 1199–1233
- Two parallel KPI systems coexist: the older `.kpi` (line 255, tint background, shadow-md, hover lift) and the newer `.bento-card` (line 1208, `r-lg` not `r-xl`, shadow-sm not shadow-md, left-edge `::before` bar instead of tinted background). **Both are used simultaneously** — `.dashboard-mini-grid bento` wraps `#excelKpis` (line 1483) which the JS likely still emits `.kpi` elements into (skeleton placeholders at 1484–1487 are `class="kpi skeleton skeleton-card"`, not `.bento-card`). So the actual rendered dashboard tiles are probably still `.kpi` styling, NOT the newer botanic `.bento-card` accent-edge treatment described in the layout doc — the bento upgrade may be CSS-only without matching JS render-function changes. **This needs a runtime screenshot to confirm**, but structurally it's the likely explanation for "doesn't feel like the redesign actually landed" on the dashboard tiles.
- Radius mismatch: `.kpi` = `--r-xl` (20px), `.bento-card` = `--r-lg` (18px in layout doc's override, but in-file `--r-lg` is 16px at line 63). Two sibling tile types in the same grid with different corner roundness is a classic "patched together" tell.

### `.shared-expense-card` / `.sec-header` / `.sec-body` — lines 657–659, 984–1002
- `.shared-expense-card` outer shell (657) is properly botanic: cream surface, `r-xl`, `shadow-sm`→`shadow-md` on hover.
- But `.sec-header` (984) — the colored strip inside each card showing merchant + amount — is a **leftover hot-rose/magenta gradient header band** completely unrelated to the cream card around it. Visually each shared-expense card looks like a cream box with a hot-pink ribbon glued to the top — that's the "patched-together pieces" feeling in concrete form.
- `.sec-split-row` (992) is a 2-column grid of small bordered boxes (`var(--bg)` fill, 1px border, `r-md`=12px) inside a card that itself uses `r-xl`=20px and `var(--surface)` — three different surface tones nested (surface card → bg-tinted split boxes → mine-variant rose tint at line 994) in one component. That's a lot of competing fills for one card; native apps (Splitwise, Settle Up) usually use a single flat amount row with avatar + name + signed amount, not a 2-up boxed grid.
- `.sec-footer` (998) mixes a top border divider, inline-flex chips, and an italic notes string truncated to 50% width with `margin-inline-start:auto` — functional but visually busy for a card footer; no consistent "metadata row" pattern shared with `.feed-meta` elsewhere.

### `.year-table` (שנתי) — lines 698–716, 1797–1822
- **Confirmed: this is a literal raw `<table>` element** (line 1816 `<table><thead><tr id="yearlyTableHead"></tr></thead><tbody id="yearlyTable"></tbody></table>`), styled with `.year-table th/td` (700–710): 9px uppercase muted headers, 12px tabular-num cells, 1px bottom-border rows, `tr:hover td` highlight. This is the most "spreadsheet/website" surface in the entire app — exactly the opposite of "app-like." On mobile it can only be handled with horizontal scroll (`.year-table { overflow-x:auto }`, line 702), which on a year-by-month or category-by-month table means sideways finger-scrolling through a dense grid — a known bad mobile pattern.
- **Recommendation:** replace with a card-per-row pattern (one card per month or per category, depending on what the table currently encodes — needs a quick look at `getYearlyRowsData`/`renderYearlyTable` to confirm orientation), each row/card showing label + 2–3 key stats with tabular-nums right-aligned, same visual language as `.feed-row`. If full grid-style comparison across months is genuinely needed (likely, since it's a "yearly summary"), an alternative is a horizontally-scrollable **set of column-cards** (one card per month, sticky first column) rather than a raw `<table>`, or collapse to a stat-by-stat accordion (tap a metric to see its 12-month sparkline). Either is more "app," zero is "more table."
- Also note: `.year-table` and the generic `.table-shell` (lines 433–441, used for CC import etc.) are near-duplicate table stylesheets with slightly different padding/font-size values (`.year-table td` 7px/12px vs `.table-shell td` 10px/13px) — another small inconsistency, two systems doing the same job.

### `.card-method` (Cards / אשראיים tab) — lines 581–633
- Structurally fine (`r-xl`, shadow-sm→md hover, lift on hover) **except** the `.card-visual` header band (587–605) is a fully separate violet/purple gradient "credit-card mockup" — same pattern as the shared-card problem: cream card body + jarringly different-palette header strip. This is consistent enough across the app (Shared, Cards both do "colored gradient strip glued onto cream card") that it's clearly a leftover *pattern* from the pre-botanic theme, not a one-off bug — worth fixing as a pattern, not per-instance.

### Tab panels generally
- Corner radii in active use: `--r-sm`(8) `--r-md`(12) `--r-lg`(16) `--r-xl`(20) `--r-2xl`(26) — five sizes is reasonable for a token system, but the *application* is inconsistent: `.section`/`.kpi`/`.modal-card` mostly `r-xl`, `.bento-card` `r-lg`, `.card-stat`/`.debt-item`/`.modal-stat` `r-md`, `.feed-row` `r-md`, `.filter-chip`/buttons `r-pill`. No obvious problem in isolation, but combined with the header-accent-edge duplication (§2 `.section`) and the two-KPI-system issue, the overall impression is "assembled from several design passes," which directly matches the user's complaint.
- No section in the file uses a stronger elevation (e.g. `shadow-lg`) to visually promote "important" cards (hero balance excepted) — everything sits at `shadow-sm`/`shadow-md`, so there's no depth hierarchy beyond the hero. A native app usually has 2–3 elevation tiers (resting card / hovered-or-primary card / floating sheet); here it's mostly one tier (`shadow-sm`) with occasional `shadow-md` on hover, which reads flat overall.

---

## 3) Tab-specific deep dive

### משותף (Shared)
Beyond avatars (already shipped):
- **`.shared-balance-card` hero** (line 638–644) uses the raw `#9f1239,#f43f5e` crimson gradient — totally off-brand, by far the loudest non-botanic surface in the tab. This is the *first thing* the user sees entering Shared.
- **`.shared-stat-card`** (646–653) duplicates the same hot-rose tint as a "soft" KPI card right below the loud hero — so the whole top of the Shared tab is rose/red while every other tab opens in sage/clay/walnut. This single-handedly explains a lot of "color inconsistency."
- **`.sec-header`** ribbon (984) repeats the same crimson family inside every list card below — triple repetition of the off-brand color in one tab.
- **`.sec-split-row`** balance display (992–997) — boxed 2-up grid feels like a form, not a balance readout; a native pattern would be a single horizontal row: avatar + "שירה שילמה" + amount, with the "your share" sub-line below in muted text, no boxed grid.
- **Settlement list styling**: `.settlement-section`/`.settlement-row` (1048–1057) use `var(--c-border)`, `var(--c-surface-2,...)`, `var(--c-text-sub)` — **these are different token names than the rest of the app** (`--c-border` / `--c-surface-2` / `--c-text-sub` are not defined anywhere in the `:root` token block at lines 26–85 — only `--c-text-sub` is aliased once, at line 32, to `var(--muted)`; `--c-border` and `--c-surface-2` appear to be **undefined custom properties** that silently fall back to `initial`/inherit). This is worth flagging as a probable bug, not just a style miss — settlement rows may be rendering with no border/no background because the var never resolves.
- **Topbar/hero in this tab**: `.shared-topbar` (636) is a 2-col grid (hero card + stat-grid) — structurally fine, just colored wrong (see above).

### הוצאות (Expenses)
- `.feed-row`/`.feed-day` (376–417) is already close to a modern transaction list: day-grouped headers with uppercase label + day total (383–393), each row = colored category dot + merchant (bold) + meta line + right-aligned amount (394–405). This is the **best-structured list in the app** and reasonably close to Copilot/Monarch already.
- What's missing vs. those references:
  - No icon circle — just a small 9px flat dot (`.feed-dot`, line 399). Copilot/Monarch use a filled circular icon badge (category icon on tinted background) which reads more substantial/tappable than a tiny dot.
  - No leading/trailing tap affordance — `.feed-edit-btn` (406–411) is a small text-label button that appears inline next to the amount, competing for the same horizontal space as the amount itself, rather than the row itself being tappable (with edit reachable via swipe or a chevron). This makes the row feel like a table row with an "edit" cell, not a tappable transaction.
  - `.feed-row` has no border/shadow/card treatment at all (only `border-radius` + hover bg, line 394–398) — rows float directly on the section's cream background with just a 16px-ish hover state; for a "card-like" feel they'd benefit from a subtle 1px bottom hairline (already true via `.feed-day-header`'s border) or being individually-carded — current approach is acceptable for a dense list (Monarch does this too) so this is more "fine, just slightly flat" than wrong.
  - `.table-summary-bar` (413–417) uses `rgba(249,115,22,.06)`/`rgba(249,115,22,.15)` — old bright-orange leftover, not `--c-expenses` (clay `#C16A4F`).
  - `.filter-search-input:focus` (1144) old orange focus ring (`rgba(249,115,22,.08)`) inconsistent with the app-wide sage `--accent-ring` used elsewhere (1352–1353).

### שנתי (Yearly)
Covered in depth in §2 above — it's a raw `<table>`. Summary: replace with month-cards or category-cards; if literal grid comparison is required, consider a sticky-first-column horizontally scrollable card-table hybrid rather than a plain HTML table with 7–9px micro-typography.

---

## 4) Cross-cutting consistency check

| Aspect | Found values | Consistent? |
|---|---|---|
| Card corner radius | `.section`/`.kpi`/`.modal-card`/`.card-method`/`.shared-expense-card`/`.debt-card`/`.year-card` = `r-xl`(20px); `.bento-card` = `r-lg`(16px); `.card-stat`/`.debt-item`/`.modal-stat`/`.feed-row`/`.sec-split-item` = `r-md`(12px) | **Mostly consistent at the "outer card" tier**, but the bento tiles break from the otherwise-universal `r-xl` outer-card radius — likely unintentional since `.kpi` (same visual role) uses `r-xl`. |
| Shadows | `shadow-sm` default on nearly all cards; `shadow-md` on `.kpi`/`.edit-card`/`.income-edit-card`/hover states; `shadow-accent` only on hero + primary-cta | Consistent system, but **no elevation differentiation** between "this card matters" and "this card is routine" outside the hero — flat hierarchy. |
| Spacing | `.section .content` padding 14/18px desktop, 12/14px mobile; `.kpi` padding 18/20px; `.bento-card` padding `--sp-4`(16px); `.card-body` 14/16px | Close enough (14–20px band) — no major outlier. |
| Color — per-tab accent application | Hero gradients + KPI tints = fully botanic (good). Pill-nav active shadows, section accent borders, Shared/Cards/Debts hero cards, Backup sync card, several `.tag-*`/`.info-box`/`.*-editing` states = **still old indigo/violet/rose/red/blue/teal** | **Inconsistent** — this is the core of finding §1, and it's the most visible/highest-impact inconsistency in the whole audit. |
| Undefined CSS vars | `.settlement-*` rules (1048–1057) use `--c-border`, `--c-surface-2` which are **not defined in :root** | Bug-risk, not just style — flag for QA. |

---

## 5) Prioritized fix list

### Quick wins (CSS-only, low risk)

1. **Shared tab hero/stat-card/footer-chip recolor** — `.shared-balance-card` (638), `.shared-stat-card` (647), `.sec-header` (985), `.sec-footer-chip`/`.payer` (1000–1001), focus rings (654–655). Replace raw `#9f1239/#f43f5e`/`rgba(244,63,94,*)` with `--c-shared`-derived values. **Impact: HIGH** — single biggest visible inconsistency, isolated to one tab, zero markup risk.
2. **Cards tab `.card-visual` recolor** — lines 588, 597, inline violet topbar at 1563. Replace violet/purple with `--c-cards` (eucalyptus) family. **Impact: HIGH**, same reasoning as #1.
3. **Debts tab highlight cards recolor** — `.debt-highlight-bank` (670) red→`--c-debts`, `.debt-highlight-father` (671) blue→`--info`/`--wood`. **Impact: HIGH** — currently the only literal red/blue pairing in the app.
4. **Pill-nav active-shadow + section accent-border cleanup** — lines 158–166 and 1168–1174. Replace all 9 hardcoded rgba sets with rgba derived from the matching `--c-*` token; **delete the now-redundant 1168–1174 block** since 1356 (`.section > .header{ border-inline-start:3px solid var(--accent) }`) already supersedes it — having both is actively contradictory. **Impact: MED-HIGH**, touches every tab at once.
5. **Generic indigo leftovers** — `.info-box` (1029), `.summary-row.editing` (938), `.card-method-edit` (1019), `.bank-debt-row.editing` (1021), `.compact-badge` (967), `.recovery-item-meta .tag` (981), `.income-recurring-chip` (1047), `.tag-blue/green/orange/red/violet` backgrounds (510–514). Swap to `var(--accent-light)`/`var(--info-light)` family. **Impact: MED** — lower visual prominence than #1–3 but appears across many tabs (editing states, badges).
6. **Backup tab cold-blue cleanup** — `.sync-card` (721–722) and `.backup-banner` (459–460). **Impact: LOW-MED**, Backup is a low-traffic tab but still visibly off-brand.
7. **Income/Expenses old-green/old-orange leftovers** — `.income-topbar` (1040–1041), `.income-source-chip` (1046), `.table-summary-bar` (413–417), expenses search focus ring (1144). **Impact: MED**.
8. **Fix undefined `--c-border`/`--c-surface-2` vars in `.settlement-*` rules** (1048–1057) — confirm rendering is broken/transparent and rewire to existing `--border`/`--surface-2` tokens. **Impact: MED, but flag as correctness bug, not just style.**

### Bigger restructure (markup changes needed)

9. **`.year-table` → card/row redesign** (lines 698–716, 1797–1822). Needs to inspect the actual data orientation (rows = months? categories?) before designing the card layout, then a JS render-function change (`renderYearlyTable`/equivalent) plus new CSS class(es) matching `.feed-row` visual language. **Impact: HIGH** — directly named by the user as one of the three problem tabs; this is the most "table-not-app" surface in the product.
10. **Resolve dual KPI systems (`.kpi` vs `.bento-card`)** — confirm via screenshot/grep of the JS render function (`renderExcelKpis`/`getDashboardWidgetCatalog`) whether dashboard tiles still emit `.kpi` markup instead of the newer `.bento-card` accent-edge pattern; if so, migrate the render function to emit `.bento-card` so radius/shadow/accent-edge actually match what the CSS describes. **Impact: HIGH** — likely root cause of "redesign doesn't feel applied" on the dashboard itself.
11. **Add disclosure chevron to `.section .header`** — every collapsible section (Budget categories, Income list, Cards list, Expenses filters, Shared filters, Backup) needs a rotating chevron/caret icon so collapse/expand reads as a native accordion, not a clickable label. Markup change (one small inline SVG per header) + a `.section.open .header svg{ transform:rotate(180deg) }` rule. **Impact: MED-HIGH**, cheap markup change, fixes a core "feels like a website" complaint across every tab simultaneously.
12. **Simplify `.shared-expense-card` `.sec-split-row`** from boxed 2-up grid to a single flat balance row (avatar + payer name + amount, sub-line for "your share") — markup change inside the shared-expense render function. **Impact: MED**, more native "ledger row" feel, reduces nested-surface visual noise.
13. **Unify `.year-table`/`.table-shell` into one table styling system** (or eliminate `.table-shell` if #9 removes the only other consumer) — **Impact: LOW** if #9 ships, otherwise MED.

---

## Summary for orchestrator (flat, prioritized)

See top-level chat response.
