# Design & UX Research — High-End Expense App

**Date:** 2026-06-25
**For:** Expense App (רז ושירה) — single-file vanilla-JS HTML, Chart.js + XLSX + Supabase, Hebrew RTL, mobile-first (iPhone), couple's family finances.
**Goal:** Raise perceived quality to a "modern, cutting-edge, premium" tier on par with Copilot Money / Monarch / Revolut.

---

## 1) Installable Claude Code Subagents (verified)

Three primary, real repos were verified. Each agent below was confirmed to exist in its repo's file tree.

### Source A — contains-studio/agents (recommended #1 for this project)
Repo: https://github.com/contains-studio/agents
Install (single agent): copy the file into `~/.claude/agents/<name>.md` OR project-local `.claude/agents/<name>.md`.
Bulk install: `git clone https://github.com/contains-studio/agents.git && cp -r agents/* ~/.claude/agents/`

| Agent | What it does | Source path |
|------|---------------|-------------|
| **ui-designer** | Visual design — interfaces developers can actually implement | `design/ui-designer.md` |
| **whimsy-injector** | Adds delight: micro-interactions, springy CSS animations, celebration moments, easter eggs, human copy. Performance + a11y aware. | `design/whimsy-injector.md` |
| **visual-storyteller** | Visuals optimized for clarity/shareability | `design/visual-storyteller.md` |
| **ux-researcher** | Turns user insight into product improvements | `design/ux-researcher.md` |
| **brand-guardian** | Visual-identity consistency (color/type/spacing tokens) | `design/brand-guardian.md` |
| **frontend-developer** | Builds fast, responsive, accessible UIs | `engineering/frontend-developer.md` |
| **mobile-app-builder** | Native-feeling iOS/Android (useful for iPhone-first feel) | `engineering/mobile-app-builder.md` |
| **rapid-prototyper** | Fast MVP/feature prototypes for validation | `engineering/rapid-prototyper.md` |

Install path for THIS project: `.claude/agents/<name>.md` (project-local so it ships with the repo).

### Source B — VoltAgent/awesome-claude-code-subagents
Repo: https://github.com/VoltAgent/awesome-claude-code-subagents
Agents live under `categories/<NN>-<area>/<name>.md`. Verified files:

| Agent | What it does | Source path |
|------|---------------|-------------|
| **ui-designer** | "Master of visual design — beautiful, intuitive, accessible UIs" | `categories/01-core-development/ui-designer.md` |
| **frontend-developer** | UI/UX specialist; responsive, accessible, performant | `categories/01-core-development/frontend-developer.md` |
| **mobile-developer** | Native + cross-platform mobile | `categories/01-core-development/mobile-developer.md` |
| **accessibility-tester** | A11y / WCAG / ARIA compliance | (testing category) |
| **design-bridge** | Translates design intent into agent-buildable specs | `categories/01-core-development/design-bridge.md` |

Install: copy the chosen `.md` into `.claude/agents/`. (Note: VoltAgent files are richer/longer; contains-studio files are tighter and more "personality"-driven — better for a delight-focused app.)

### Source C — wshobson/agents
Repo: https://github.com/wshobson/agents
Organized as **plugins**; agents live in `plugins/<plugin>/agents/<name>.md`. Verified relevant agents:

| Agent | Plugin folder |
|------|----------------|
| **ui-designer** | `plugins/ui-design/agents/` |
| **ui-ux-designer** | `plugins/multi-platform-apps/agents/` |
| **accessibility-expert** | `plugins/ui-design/agents/` |
| **design-system-architect** | `plugins/ui-design/agents/` (color/type/spacing tokens) |
| **ui-visual-validator** | `plugins/accessibility-compliance/agents/` |
| **frontend-developer** | `plugins/multi-platform-apps/agents/` |
| **mobile-developer** / **ios-developer** | `plugins/multi-platform-apps/agents/` |

Install: `/plugin install ui-design` (plugin-level), or copy a single agent `.md` into `.claude/agents/`.

### Source D — HermeticOrmus/LibreUIUX-Claude-Code (large, optional)
Repo: https://github.com/HermeticOrmus/LibreUIUX-Claude-Code
152 agents / 70 plugins focused specifically on fixing "Bootstrap-era" default output. Verified design-mastery agents: `design-master.md`, `brand-architect.md`, `visual-historian.md`.
Targeted install: `cp plugins/design-mastery/agents/* .claude/agents/`
Worth it only if you want a deep design-system overhaul; otherwise overkill for a single-file app.

> Note: agent counts cited by repos ("194", "152") are self-reported and not individually verified here. The specific filenames listed above WERE verified to exist in the repo trees.

---

## 2) Design / UX References for Modern Finance Apps (2024–2025)

### Copilot Money — the minimalist benchmark
- Cleanest interface in the category; award-winning iOS design. State shared across iPhone/iPad/Mac (not stretched layouts).
- "Spending line" as the hero: open the app to a single quick-glance spending number + trend.
- Monthly summaries with AI-categorized transactions. Restraint is the aesthetic — lots of whitespace, one accent color, heavy type for the number that matters.
- Source: https://www.copilot.money/

### Monarch — the dashboard benchmark
- Color-coded account dashboard; customizable charts for spending / income / net-worth over time.
- **Forward projection**: projects month-end balance from known upcoming expenses + historical spend ("where you'll be before you get there"). Directly maps to your "חיזוי סוף חודש" priority.
- Source: https://www.monarch.com/

### Revolut — the premium-fintech design language
- Display type: **Aeonik Pro** weight 500, sizes 20–136px, tight line-height + negative letter-spacing. Body: **Inter** 400 with positive tracking on UI labels.
- Accent: saturated cobalt violet `#494fdf`; secondary palette of deep teal, light-blue, deep-pink, light-green, warning orange, yellow used in feature illustrations.
- Sleek dark UI, gradient cards, "fintech precision." Strong, large numerals = perceived premium.
- Sources: https://www.revolut.com/blog/post/our-top-5-design-principles-at-revolut/ , https://mobbin.com/colors/brand/revolut

### Cleo — personality / conversational
- Humor + casual tone reduces money stress. Expressive-but-legible custom type that stretches from playful in-app moments to long-form. For a couple's private app, a warm, human voice (Hebrew copy with personality) is a cheap, high-impact differentiator.
- Source: https://web.meetcleo.com/blog/what-does-the-future-look-like

### YNAB / general fintech patterns
- Visually appealing charts/graphs make data legible; category-driven mental model. Pattern catalog: https://phenomenonstudio.com/article/fintech-design-breakdown-the-most-common-design-patterns/

### 2025 UI trends relevant here
- **Bento grids**: irregular-sized tiles → strong hierarchy, modern feel. Ideal for a dashboard of balance / shared-settlement / category-breakdown / forecast cards.
- **Adaptive dark mode**: not just inverted colors — tuned contrast, possibly time-of-day aware. Finance reads great in dark.
- **Richer micro-interactions**: per-action feedback — checkmark animation on save, gentle shake on missing field, count-up animation on balance numbers, haptic-style spring on tap.
- **Bold expressive typography + restrained color**: one strong accent + saturated data colors, big confident numerals.
- Sources: https://www.appnova.com/ui-design-trends/ , https://www.linkedin.com/pulse/2025-mobile-ui-trends-from-bento-grids-modern-skeuomorphism-leetio-aexsf

### Mobile-first RTL Hebrew specifics (concrete rules)
- **Mirror the layout** (leading/trailing, not left/right) — use CSS logical properties (`margin-inline-start`, `padding-inline-end`, `text-align: start`) so RTL flips automatically.
- **Do NOT reverse numbers.** Keep Western digits in natural order; right-align them. `%` sign goes to the **left** of the number in RTL.
- **Numeric fields** (amounts, dates, codes) stay LTR-aligned even inside an RTL form.
- **Charts**: you may keep time-axis LTR (left→right = past→future) even in an RTL UI — viewers are comfortable with it and it preserves the "forward in time" metaphor for your forecast chart. Decide once, stay consistent.
- Hebrew expands less than Arabic but still budget flex room so buttons/labels don't truncate.
- Sources: https://m2.material.io/design/usability/bidirectionality.html , https://www.translatedright.com/blog/designing-for-rtl-languages-in-mobile-apps-a-complete-guide-to-right-to-left-development/

---

## 3) Recommendation

### Best 4–6 subagents to install for THIS project
Install project-local at `.claude/agents/<name>.md` (so they version with the repo). Prefer **contains-studio** versions — tighter, delight-oriented, ideal for a single-file app.

1. **ui-designer** (contains-studio) — core visual upgrade engine; tokens, layout, hierarchy.
2. **whimsy-injector** (contains-studio) — the single highest "wow per hour" agent: micro-interactions, count-up numbers, save animations, all CSS-only and a11y-safe (fits vanilla-JS / no-build constraint).
3. **frontend-developer** (contains-studio) — implements the above in vanilla JS without introducing a build step.
4. **accessibility-expert** (wshobson `plugins/ui-design/agents/`) OR **accessibility-tester** (VoltAgent) — contrast/touch-target/ARIA for mobile, and RTL correctness.
5. **brand-guardian** (contains-studio) — locks a color + type system so the app feels coherent (one accent, data palette, numeral treatment).
6. *(optional)* **mobile-app-builder** (contains-studio) — iPhone-native feel: tap targets, momentum, safe areas.

Skip for now: LibreUIUX full install (too heavy), VoltAgent framework specialists (React/Vue/Angular) — irrelevant to vanilla single-file.

### Prioritized design upgrades (highest perceived-quality lift first)
1. **Hero number + spending line** (Copilot pattern). One big confident balance numeral on open, with a trend sparkline. Biggest single perception jump. Low risk — UI only.
2. **Bento-grid dashboard.** Replace stacked sections with sized tiles: Balance / Shared settlement / Category breakdown / Month-end forecast. Modern instantly.
3. **Color + type system** via brand-guardian: pick ONE accent (e.g. a confident violet/teal), a saturated data palette for charts, and a bold display font for numbers (Hebrew-compatible — e.g. Heebo/Assistant/Rubik) + clean body. Big numerals = premium.
4. **Adaptive dark mode**, tuned (not inverted). Finance looks expensive in dark; pair with gradient cards.
5. **Micro-interactions** (whimsy-injector): count-up on balances, checkmark on save, shake on invalid input, spring on tap. CSS-only, no deps — respects self-contained constraint.
6. **Month-end forecast visualization** (Monarch pattern) — projected balance line extending past "today" on the chart. Ties directly to your open "חיזוי סוף חודש" priority.
7. **RTL polish pass**: logical CSS properties, LTR numerals, `%` placement, chart-axis direction decision. Cheap correctness that prevents the "translated app" feel.

### Handoff
To proceed: `הפעל agent-design. בסיס על המחקר הזה. אני רוצה לבנות את [שם הסוכן].`
Suggested first build: **ui-designer + whimsy-injector** pair, applied to the demo file only (`expense-app-v37-demo.html`), per project workflow.

---

### Sources
- https://github.com/contains-studio/agents
- https://github.com/VoltAgent/awesome-claude-code-subagents
- https://github.com/wshobson/agents
- https://github.com/HermeticOrmus/LibreUIUX-Claude-Code
- https://www.copilot.money/
- https://www.monarch.com/
- https://www.revolut.com/blog/post/our-top-5-design-principles-at-revolut/
- https://mobbin.com/colors/brand/revolut
- https://web.meetcleo.com/blog/what-does-the-future-look-like
- https://phenomenonstudio.com/article/fintech-design-breakdown-the-most-common-design-patterns/
- https://www.appnova.com/ui-design-trends/
- https://www.linkedin.com/pulse/2025-mobile-ui-trends-from-bento-grids-modern-skeuomorphism-leetio-aexsf
- https://m2.material.io/design/usability/bidirectionality.html
- https://www.translatedright.com/blog/designing-for-rtl-languages-in-mobile-apps-a-complete-guide-to-right-to-left-development/
