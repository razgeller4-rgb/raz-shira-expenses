# Two-Device Sync Acceptance — Raz + Shira

**Scope:** live `expense-app-v37.html` after identity and household-read hardening.

## Preconditions

- Both use the canonical HTTPS URL and the same selected month.
- Raz signs in as Raz and Shira signs in as Shira.
- The personal-user selector is locked to the signed-in account.
- Each records a local recovery point before testing.

## Acceptance matrix

| Test | Action | Expected evidence |
|---|---|---|
| Identity | Open Backup on both devices | Correct email and “connected to Supabase”; no partner can be selected as the active identity |
| Raz → Shira | Raz adds one labelled test expense, then pushes; Shira pulls | Shira sees that entry and the same total for the same scope/month |
| Shira → Raz | Shira adds one labelled test expense, then pushes; Raz pulls | Raz sees it with no change to Raz's own entries |
| Focus refresh | Raz edits, Shira backgrounds and returns after 30 seconds | Sync status updates and partner row is refreshed |
| Offline safety | Both edit different entries while offline, then reconnect/pull | Neither entry silently disappears; a recovery point exists before pull |
| Ownership | One user attempts to change the other user's personal row | Request is denied; no remote row is changed |
| Recovery | Create a point, make a test edit, restore | Shared settlements and personal data restore as documented; no silent cross-owner push |

## Completion rule

Mark sync **green** only after both directional edits converge to the same month/scope and the 190 ₪ discrepancy is either resolved or traced to a documented scope difference (personal vs couple view).
