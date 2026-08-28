# Design QA — Expense App V38 Demo

- source visual truth: `/Users/mac/.codex/generated_images/01a0497b-5da5-7870-ba2a-cdbe972f7740/exec-1624934b-16b9-4927-8a4e-1f7caa8a8be0.png`
- implementation: `expense-app-v37-demo.html`
- implementation screenshot: unavailable until the demo is committed and pushed to GitHub Pages
- intended viewport: 390 × 844 CSS px, deviceScaleFactor 1
- source pixels: 852 × 1875
- implementation pixels: not captured
- states to compare: login gate; dashboard for Raz and Shira; active month; authenticated and synchronized

## Full-view comparison evidence

Blocked. The project rules forbid a local server and local desktop-browser verification, and no push is allowed without owner approval. The pre-change live screenshots exist under `product-design-audit/2026-08-28/`; they do not represent the new implementation.

## Focused-region comparison evidence

Blocked for the same reason. Required regions after push: topbar/status, monthly card, review queue, bottom navigation, expense filters, every edit state, debt schedule and import modal.

## Findings

- [P1] No rendered implementation evidence yet. Code and syntax checks cannot prove visual fidelity.
- [P2] The selected target contains a decorative botanical branch; the implementation reuses the existing app motif instead of adding a new raster asset. This must be judged in the live comparison.
- [P2] Dense real-data screens may require spacing corrections at 390px after the first capture.
- [P1] Household authorization cannot be verified by UI capture alone; server-side RLS testing is required before claiming full partner-data visibility.

## Comparison history

- Pass 0: source visual opened; new implementation cannot be captured before authorized push. No visual fixes can be validated yet.

## Required fidelity surfaces

- Fonts/typography: not observed after implementation.
- Spacing/layout rhythm: not observed after implementation.
- Colors/tokens: implemented in code; not visually observed.
- Image quality/assets: existing motif reused; not visually observed.
- Copy/content: statically reviewed; live wrapping not observed.

## Implementation checklist

1. Commit and push demo after owner approval.
2. Capture 390×844 login, dashboard and all mapped states from the live demo.
3. Compare source and implementation in one combined visual input.
4. Fix every P0/P1/P2 and repeat until passed.
5. Run iPhone review before any production promotion.

final result: blocked
