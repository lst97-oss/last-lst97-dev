# Conflict fingerprints protect spreadsheet edits from silent overwrite

- **Category:** Concurrency Control
- **Source ID:** wwnz-conflict-protection
- **URL:** https://www.lst97.dev/projects/wat-wat-new-zealand
- **Visibility:** Private

Wat Wat New Zealand resolves concurrent spreadsheet edits with a transaction conflict fingerprint: when a transaction loads, a fingerprint is generated from the editable transaction state; at save time, a second fingerprint is regenerated from the current spreadsheet state, and if the two differ the save is rejected and the user is asked to refresh instead of having the newer change overwritten.

## The exact failure it prevents

The race is specific and common in a shared ledger:

1. The application loads a transaction.
2. Someone edits the same row directly in Google Sheets.
3. The first user, still holding the older state, saves.

Without protection, the application overwrites the newer spreadsheet change. The newer edit is not queued, not merged and not flagged — it is simply gone.

## The mechanism

1. Load the transaction.
2. Generate fingerprint A from the editable transaction state.
3. The user edits the form; meanwhile the sheet may change.
4. A save request arrives.
5. Read the current sheet state.
6. Generate fingerprint B.
7. Compare. Equal → update. Not equal → reject the stale update and ask the user to refresh.

This is optimistic concurrency control applied across an external spreadsheet integration: no locks, no long transactions, just an equality check on the state the client believed it was editing.

## Why a fingerprint and not something simpler

A version number would require the sheet to maintain one, which defeats the purpose of supporting columns that hold spreadsheet formulas and calculated values that the application does not own. A row-position check would be worthless, because rows can be inserted, deleted, reordered and sorted — which is why identity rests on the transaction UUID rather than the visual row number, and why the fingerprint is computed from editable state rather than from row position.

## Why it matters

With two editing surfaces, last-write-wins quietly destroys work. Adding this check is what turns an ordinary transaction edit into a synchronisation problem rather than a local form submission: a save has to consider current sheet state, the transaction UUID, the conflict fingerprint, formula-safe columns, currency fields, beneficiaries and receipt media together before anything is written back.