# How expenses, income, bank transactions and a spreadsheet stay consistent with the invoices

- **Category:** Financial Logic
- **Source ID:** best-maker-payment-reconciliation
- **URL:** https://www.lst97.dev/projects/best-maker-pty-ltd
- **Visibility:** Public

Money coming in is the easy half. Money going out is where a fabrication business accumulates drift: materials bought at four suppliers, a delivery run, a tool that had to be replaced, a subcontractor invoice, all recorded in whatever way the person on the day found convenient. Then the bank says something different.

The financial side of Best Maker treats expenses, income, bank transactions and the spreadsheet bridge as one reconciliation problem rather than four features, and the design decisions all follow from taking that seriously.

## Expenses are captured and approved

An expense is not just recorded, it is submitted, reviewed, and then approved or rejected. The approval step is what makes the expense data trustworthy enough to reconcile against, and it is also what stops a single person's mis-typing from silently becoming a settled fact.

Category-level reporting is built on the same records. Because every expense carries a category from the moment it is captured — materials, labour, transport, tools, and so on — the monthly statistics do not need a separate classification exercise. The category is part of the data, not a report-time guess.

## Income is tracked across revenue categories

Income is recorded separately from expenses and carries revenue categories, so revenue and spending can be compared on the same axis. Revenue from a bespoke job and revenue from a storefront purchase both land here, because both arrive as invoices with line items — which is why a store sale and a staircase are reconciled the same way.

## Monthly statistics are derived, not maintained

The monthly view is spending and revenue broken down by category and by month. It is derived from the expense and income records rather than accumulated into a separate monthly table. That distinction matters: a derived figure cannot drift from its inputs, because there is no second copy to fall behind.

The consequence is that closing a month is not an operation. There is nothing to roll up and nothing to post. The month is correct the moment the underlying records are, which is what allows a small team to keep the books current without a dedicated finance process.

## Bank sync and reconciliation

The bank is imported from the connected accounting account, and the imported transactions are reconciled against invoices and expenses. This is where the model's rigidity pays off.

A bank transaction has a date, an amount, a description and a counterparty. An invoice has a customer, a total and a schedule of instalments. An expense has a category and an approval state. Matching is done against all three, and the useful property is that an unmatched difference is a real signal. If the bank shows HKD 4,200 and no invoice or approved expense accounts for it, that is either a missing record or a duplicate payment — both worth knowing — rather than a rounding artefact that disappears into a total.

Because instalments are first-class records, a single bank transaction can be matched to a specific instalment rather than to an invoice as a whole. That is what makes partial payment, an overpayment and a deposit distinguishable, instead of all three collapsing into "this customer owes some money".

The reconciliation view exists to make the unmatched set small and reviewable. The goal is not an automated system that guesses; it is a system where every transaction is either matched to a specific document or explicitly written off by a person.

## The spreadsheet bridge

There is also a two-way sync with Google Sheets, so the business can still hand a copy of the books to whoever asks — an accountant, a bookkeeper, a lender.

Two-way is the requirement and the difficulty. Other people edit the spreadsheet outside the application: that is the point of it being a spreadsheet. So the write path has to respect columns the application does not own, and the read path has to reject a save built on data someone else has since changed.

The stable-identity problem is the one that bites first. Spreadsheet row numbers are not identifiers. Rows get inserted, deleted, reordered and sorted, so treating "row 23" as "expense 23" breaks silently. The application maintains its own record identity alongside the visual row position, so identity survives sorting and the row position does not.

The second is formula safety. Not every column belongs to the application — some hold spreadsheet formulas or calculated values that a generic whole-row overwrite would destroy. An explicit column contract maps editable fields to the specific ranges the application owns, and updates are issued against those ranges only. The application stays a good citizen inside a data source it does not exclusively control.

Together these make the spreadsheet bridge safe to leave open: the business keeps its familiar access and transparent raw data, and the application treats keeping the two consistent as a first-class engineering problem rather than a one-time import.

## Retention and cleanup

The scheduled side matters here too. Retention pruning and orphaned-file cleanup run on a schedule, so the expense and document history does not grow without bound and rendered PDFs that belong to deleted records are cleaned up automatically — none of it requiring anyone to remember to do it.