# Google Sheets stays a live integration, not a one-time import

- **Category:** Data Synchronisation
- **Source ID:** wwnz-google-sheets-sync
- **URL:** https://www.lst97.dev/projects/wat-wat-new-zealand
- **Visibility:** Private

The central architectural decision in Wat Wat New Zealand is that Google Sheets is not hidden behind a simple one-time import. The spreadsheet stays an active integration inside the application's workflow, which is exactly why synchronisation and conflict management became first-class engineering concerns rather than a migration detail I could finish and forget.

## The read path

A raw sheet record can carry these fields:

- ID
- Title
- Payer
- Pay For
- Description
- Date
- Amount
- Currency
- Category
- Exchange Rate
- Base Currency Amount
- Payment Method
- Individual Share
- Settled
- Media
- Row UUID

The synchronisation layer transforms those raw rows into structured application data through a fixed pipeline:

1. Column mapping
2. Validation
3. Member resolution
4. Currency parsing
5. Transaction normalisation
6. SQLite / application state

Invalid or incomplete rows are skipped, rather than allowing malformed external data to propagate silently through the financial calculations downstream.

## Stable identity instead of row numbers

Spreadsheet row numbers are not reliable identifiers. Rows get inserted, deleted, reordered and sorted, so any assumption of the form "row 23 is transaction 23" is fragile. I therefore maintain stable transaction UUID metadata alongside the visual row number, so a transaction can be identified independently of its current physical position. There is also tooling to backfill missing UUIDs into existing spreadsheet records, which is what makes later synchronisation and conflict checking substantially safer rather than merely convenient.

## Formula-safe writes

Not every column in the sheet belongs to the application. Some columns can hold spreadsheet formulas or calculated values, and a generic "overwrite entire row" update would destroy them.

The project therefore defines an explicit transaction-sheet column contract. Application updates are converted into formula-safe batch update ranges, restricting writes to the specific ranges the application actually owns:

1. Transaction update
2. Editable-field mapping
3. Allowed spreadsheet ranges
4. Google Sheets batch update

Synchronising with an external spreadsheet requires respecting data that is maintained by both the application and the sheet itself.

## The access boundary

The application talks to Sheets using a Google service account and exposes typed server-side operations for read, write, append, clear and list-sheets. Those operations are surfaced through authenticated tRPC procedures rather than exposing Google credentials to the browser: browser → protected tRPC procedure → Google Sheets service → Google Sheets API. Service-account credentials stay exclusively on the server, so the frontend never holds a credential capable of writing to the shared ledger.