# Currency conversion, historical rates, and receipt media lifecycle

- **Category:** Currencies and Storage
- **Source ID:** wwnz-currency-and-media
- **URL:** https://www.lst97.dev/projects/wat-wat-new-zealand
- **Visibility:** Private

Two subsystems keep historical and external state honest in Wat Wat New Zealand: multi-currency conversion that revalues nothing, and media lifecycle management that deletes only what is genuinely unreferenced.

## Multi-currency

The application supports HKD and NZD. Transactions retain their original currency while also carrying a converted HKD base value for group accounting. The exchange-rate service retrieves rates from an external exchange-rate API, fetches a daily rate, and stores it locally in SQLite; both directions are kept, HKD → NZD and NZD → HKD.

## Why historical rates are not optional

Using today's rate for an expense from several weeks ago distorts settlement calculations. Lookup is therefore date-specific against the transaction date: if an exact daily rate exists, use it; otherwise fall back to the most recent earlier rate. Because of that, historical transactions are never re-valued at the current market rate — the application preserves the relationship between the original currency amount and the base HKD amount instead of recalculating old rows every time the market moves.

## Uploads

Transactions and settlements can carry image evidence such as receipts and payment confirmations. Uploads are handled through UploadThing, and the upload endpoint requires an authenticated user session before accepting files. Current transaction-image limits are type image, maximum size 8 MB, maximum 1 file per upload. The flow is authenticated user → upload request → session validation → UploadThing → file URL and file key → transaction or settlement. This prevents anonymous clients from using the application's storage endpoint.

## Media lifecycle

File uploads create a second problem: what happens when a transaction is deleted or its receipt is replaced? Without cleanup, a receipt removed from the ledger stays in object storage forever. The cleanup subsystem compares the active media URLs in Google Sheets against stored files in UploadThing, maintains media snapshots in SQLite to track file references across synchronisation operations, and deletes genuinely orphaned objects.

## Safeguards for destructive work

Background deletion needs stronger safeguards than an ordinary read, so the cleanup process supports dry-run mode, a minimum retention age, a maximum number of deletions per run, single-run locking, batch deletion with individual fallback when a batch fails, authenticated manual triggering, and result statistics. A cleanup result reports rows scanned, active media count, orphaned files found, files deleted, deletion failures, and files skipped due to retention.

The job can run on its own schedule and also integrates with the Google Sheets synchronisation process, which is what prevents storage from growing indefinitely as transactions and receipt images change.