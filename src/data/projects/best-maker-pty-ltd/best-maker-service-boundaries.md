# Why the business core is one service and everything slow is not

- **Category:** Architecture
- **Source ID:** best-maker-service-boundaries
- **URL:** https://www.lst97.dev/projects/best-maker-pty-ltd
- **Visibility:** Public

The single most interesting architectural decision in Best Maker is not a technology choice. It is a rule for deciding what gets its own process.

The system runs as five independently released repositories, and it would have been easy to read that as "split everything into services". That is not what happened. The business core stayed a monolith on purpose, while PDF rendering, email delivery, background workers, scheduled jobs, backups and workflow automation were each pulled out into a separate internal service. The rule that produced that split is worth stating plainly, because it is reusable: split out work that is slow, bursty, or independently failing. Everything else stays together.

## Why the core is a monolith

Expenses, invoices, quotations and company profiles are not separate features. A quotation becomes an invoice. An invoice carries split-payment instalments that depend on a deposit taken against the quotation. Expenses are approved against a job and then reconciled against bank transactions that reference the invoice they settle. Pulling any two of those into different processes would put a network hop and a failure mode in the middle of a single business fact.

Splitting them would buy nothing, because they do not fail independently and they do not have different scaling profiles. They are read together, written together, and reasoned about together. So they live in one deployable, where a transaction spanning them is an ordinary database transaction rather than a saga.

This is the opposite of the usual service-extraction story. The default question "which service should own this?" was replaced with "does this work have its own failure characteristics?" — and for the finance domain the answer was consistently no.

## Why rendering, email and workers were split out

Everything that was pulled out shares a trait: it takes much longer than a user-facing request should, or it fails in ways the business core should not inherit.

A PDF render of a quotation with a dozen line items can take tens of seconds. If it ran inline in the request that asked for it, the HTTP connection would be held for the whole render, and the dashboard would appear to hang. More importantly, rendering depends on a headless browser, which is memory-hungry and occasionally dies. When that lives in the same process as the dashboard, a leaked browser process takes the dashboard down with it.

Sending email has the same shape but a different failure mode. A mail relay being down is not a reason the invoice database should be unavailable. So delivery moved behind an internal service that the API server calls; a mail outage becomes a retry queue item rather than a failed invoice.

Background workers drain an outbox. The pattern matters: a user-facing request that needs a slow side effect does not perform it. It appends the intent to an outbox and returns. A separate worker process drains that outbox asynchronously. This is what makes rendering a PDF and pushing a spreadsheet update invisible to the latency budget of the request that triggered them, and it means a burst of fifty quotations being issued does not become fifty concurrent browser instances.

Scheduled jobs — retention pruning, orphaned-file cleanup, backup rotation — are the clearest case. None of them is triggered by a user. All of them run on a clock. A cron that takes four minutes should not be able to exhaust the connection pool of a service that is simultaneously serving dashboard requests.

## Internal only, and signed

Every one of these internal services is unpublished. None accepts public traffic, and the reverse proxy inside the network does not route to them at all. They are reachable only from the API server over a private network.

Each call between the API server and an internal service is signed and time-stamped. The signature proves the caller is the API server and not something that merely learned the internal address; the timestamp bounds how long a captured request stays useful, so a leaked one cannot be replayed indefinitely. This is the reason the internal services can be trusted with jobs like backups without being exposed.

## The consequence in practice

The practical effect of the rule is that the failure surface is shaped like the work rather than like the org chart. A dashboard request touches the web application and the API server, both of which are fast and both of which are stateless. A PDF never renders in either of them. A mail server outage does not surface as a dashboard error. A backup failure is a failed backup, visible to whoever runs backups, and does not become a customer-facing incident.

The web application itself follows the same separation. It hosts the public site, the CMS and the internal dashboard as one reader-facing application, but it does not hand-write its API calls — it consumes a generated client from the API server's published contract, which is a boundary of a different kind: not a process boundary, but a compile-time one.