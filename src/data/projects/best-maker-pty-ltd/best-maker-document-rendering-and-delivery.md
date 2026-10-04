# How a quotation becomes a PDF, and why it is rendered once and cached by content

- **Category:** Document Delivery
- **Source ID:** best-maker-document-rendering-and-delivery
- **URL:** https://www.lst97.dev/projects/best-maker-pty-ltd
- **Visibility:** Public

A quotation is only useful to a client if it arrives as something they can read, print and forward. Both quotations and invoices are therefore rendered to PDF, and the interesting engineering is not in the rendering — it is in deciding when to render, and in delivering the result without an account.

## Rendering on demand

PDFs are rendered on demand rather than eagerly on every save. Eager rendering would mean every keystroke in the line-item editor potentially triggered a document render, which is expensive and produces documents nobody asks for. On-demand rendering means the render happens when someone actually wants the document: when it is sent to a client, when a share link is created, or when the client opens the link.

The cost of that choice is that rendering is slow — a document with a dozen line items takes tens of seconds in a headless browser — and it must not happen in the request that is waiting for it. So rendering is not performed inline. It is enqueued as an outbox intent, a background worker drains the outbox, and the rendered document is stored in object storage.

This is the same split as the rest of the internal services: the dashboard request returns immediately, the render happens behind it, and a headless browser that leaks or dies takes down a worker rather than the dashboard.

## Caching by content

The second decision is what to do when the same document is requested repeatedly. A client who opens a share link reloads the page. Someone forwards the PDF and the recipient asks for it again. The team re-downloads an invoice at the end of the month. Each of those is a request for a document whose content has not changed.

So the rendered artefact is cached by content. A fingerprint of the document's inputs — its line items, totals, numbering, company details, address profile, payment profile and document settings — determines whether the stored PDF is still valid. If the fingerprint matches what is already stored, the existing object is reused. The document is not re-rendered, and it is not re-uploaded to storage.

Re-uploading matters as much as re-rendering. Storage writes are the other expensive operation in this path, and re-uploading an identical artefact on every page load would make the cache pointless while still appearing to work. The content fingerprint covers both, so an unchanged document costs a fingerprint computation and a storage read.

When the document genuinely changes — a revised quotation, an issued invoice with new numbering, an amended address profile — the fingerprint changes, the render runs again, and the new object replaces the old one. The link stays the same, so a client who bookmarked it sees the current version rather than a broken URL.

## Letterhead and bank details come from profiles

A PDF is not a generic template. Its letterhead, its address and its bank details come from the company profile, address profile, payment profile and document settings that the business maintains on file. This is why the content fingerprint includes them: changing the company's registered address changes every document issued afterwards, even though no line item changed.

Because those details are referenced rather than pasted into each document, the "issue a quotation" path needs no address input at all. The document is assembled from the records, which is what removes the most common retyping in this kind of business.

## Two delivery channels

Delivery is by email and by public share link, and they solve different problems.

Email delivery puts the document in the client's inbox, where it will be found by whoever handles accounts. The PDF is attached, and the send is queued rather than performed inline so a mail relay outage becomes a retryable item.

The share link is the more interesting one. It lets a client open the same document in the browser — the same PDF that was emailed, not a different rendering — without creating an account. The alternative, giving a client login credentials so they can see one invoice, is both bad security and bad experience.

## Token-scoped public links

The share link is token-scoped. The link grants access to one document, not to an account and not to a view. A client with a link to a quotation can open that quotation and nothing else: not their other invoices, not other quotations, not the customer list, not the dashboard. The token resolves to a document, and the document is the entire scope of what that token authorises.

This is the property that makes public links safe enough to email. There is no session to steal and no privilege to escalate, because there is no privilege — there is a document identifier that is already scoped. If the link is forwarded, the recipient sees the same single document the client was entitled to see; if the link is leaked, the damage is bounded by one document.

The same principle extends to the public enquiry flow and the token-gated document access in general: access is granted narrowly, per resource, rather than through a general session.