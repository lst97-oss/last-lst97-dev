# From a measured job to a paid invoice, and why one invoice can be settled in instalments

- **Category:** Quote to Cash
- **Source ID:** best-maker-quote-to-cash
- **URL:** https://www.lst97.dev/projects/best-maker-pty-ltd
- **Visibility:** Public

A fabrication business does not sell a product from a shelf. It measures a job, prices it, agrees a scope, and then spends weeks or months building it. The financial pipeline has to survive that duration without the numbers drifting, and it has to produce a PDF at each step that is presentable enough to send to a client.

The pipeline is: quotation with line items and automatic totals, revisions while the scope is still moving, acceptance by the client, conversion of the accepted quotation into an invoice, a deposit request, and the balance collected across the life of the job.

## Quotations and line items

A quotation is a document with line items, not a total with a description. Each line carries its own description, quantity and rate, and the document total is derived from the lines rather than typed in. This is the first place where the "one data model per real-world entity" decision pays off: a quotation and an invoice share the same line-item shape, because they are the same commercial document in two states.

Totals are automatic, which sounds trivial until it is not. A quotation that is revised three times as the scope settles is a quotation whose arithmetic must still be right on the third revision. Deriving the total from the lines means there is no arithmetic to get wrong — the number shown is the number the lines produce, and the PDF, the dashboard and the emailed document all read the same derived value.

Revisions are tracked as a property of the quotation rather than as separate documents. A revised quotation keeps its history, so a client and the team can both see what was first quoted and what was finally agreed. That matters in fabrication, where scope changes are normal and disputes about what was quoted are expensive.

Status tracking carries the quotation from draft through review, through being sent, to acceptance. The status is the single fact that decides what happens next: a draft quotation is editable, a sent one is not, and an accepted one converts.

## Acceptance converts rather than copies

When a client accepts, the quotation becomes an invoice. The important detail is that it converts rather than being copied into a new document by hand. The line items, the customer, the company profile and the address all carry across because they are references to the same records, not fields copied into the quotation.

That distinction is what stops the classic business-software bug, where a quotation and its resulting invoice drift apart because someone edited the invoice's total or its address without touching the source. Here there is one source of truth per entity and the document types reference it.

The invoice carries its own document numbering, which is a sequence rather than a value anyone chooses. Document numbers have to be unique and ordered, and they have to be assigned at issue time rather than at draft time — a draft may never be issued at all.

## Split payments

The feature that matters most in this domain is split payments. A bespoke fabrication job is not paid in one go. There is typically a deposit to cover materials, a milestone or two during construction, and a balance on completion. A single-invoice model forces the business to either invoice twice — which duplicates the commercial document and splits the history — or to ask for the whole amount up front, which loses the job.

So an invoice can be settled across several instalments. Each instalment is a separate amount against the same invoice with its own status. The invoice knows its total; the instalments know what has been requested and what has arrived; the balance is what remains. A deposit is just the first instalment, which is why the quotation-to-invoice conversion can request one without special-casing it.

## Why deposits come from the quotation

The conversion step requests a deposit, and it does so because the quotation can express that requirement. A quotation that specifies a deposit percentage produces an invoice whose first instalment is that percentage of the accepted total, with the remainder as the balance. The percentage is a commercial decision recorded once, in the document the client agreed to, rather than a number retyped into an invoice.

## Where the money is captured

Invoices and quotations are the documents side of the pipeline. The money side is separate and equally deliberate: expenses and materials are captured against the job and approved, income is recorded, and bank transactions are imported and reconciled against what the team recorded by hand. The link that makes reconciliation possible is that the instalment structure is a first-class record rather than a note on the invoice — a bank transaction can be matched to a specific instalment, and an unmatched difference is a real signal rather than rounding noise.

After the job closes, the final invoice is issued, documents are delivered, and the job's numbers flow into the monthly statistics and the spreadsheet bridge. Nothing in that hand-off is a manual export step.