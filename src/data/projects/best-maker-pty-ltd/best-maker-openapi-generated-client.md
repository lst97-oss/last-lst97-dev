# How a breaking API change fails the build instead of the browser

- **Category:** API Contracts
- **Source ID:** best-maker-openapi-generated-client
- **URL:** https://www.lst97.dev/projects/best-maker-pty-ltd
- **Visibility:** Public

Most web applications hand-write their API calls. Someone opens a file, types a fetch, spells the route and the field names from memory, and moves on. This works until the day the server renames a field: the response silently becomes undefined somewhere deep in a component, and the failure appears as a blank panel in production rather than as a compile error.

Best Maker removes that whole class of bug by never hand-writing an API call in the web application. The API server publishes an OpenAPI contract. The typed client the frontend uses is generated from that contract at build time. A committed generated client plus a CI drift check means a breaking change fails the build.

## The contract comes first

The API server defines its routes with schemas rather than with ad-hoc validation. Each route declares its request shape and its response shape, and the framework derives an OpenAPI document from those declarations. That document is the published contract — it is not a separate artifact maintained by hand and therefore not a separate artifact that can drift from the implementation.

Because the contract is derived from the code that serves the requests, there is no window where the documented API and the real API disagree. If a route changes its response, the contract changes in the same commit.

## Generating the client

The web application reads that document at build time and produces a typed client. Every route in the contract becomes a function; every field in a response becomes a property with a declared type. The generated client is committed to the repository rather than regenerated on every developer machine or every CI run.

Committing the generated output is the decision that makes the drift check meaningful. If the client were generated fresh during each build, a contract change would simply produce a different client and nothing would fail — the build would succeed and ship the breakage. Because the committed output is the one that gets compared, changing the contract without regenerating the client produces a diff, and that diff fails CI. Regenerating and committing is a deliberate act with a reviewable change attached to it.

## What the drift check actually catches

The check answers one question: does the committed client still match the current contract? It catches at least three things.

A removed route is caught because the client still contains a function that no longer corresponds to anything, or because the generated output no longer includes it. A renamed field is caught because the property is gone from the regenerated output while still present in the committed file. A changed request type is caught for the same reason — the committed signature and the regenerated signature disagree.

What it does not catch is an additive change. Adding a route or an optional field produces a client diff but a compatible one, and the reviewer reads that diff like any other. The gate is about involuntary breakage; it is not a substitute for reading the change.

## Why this matters more than usual here

The reason to care about this particular boundary is the shape of the data being served. Best Maker's API returns invoices with line items, split-payment instalments, customer and company profile data, quotation revisions, expenses, income records, bank transactions, and commerce orders carrying invoice metadata. These are exactly the structures where a silently undefined nested field is worst: the page still renders, the total is missing, and nobody notices until a client asks why the invoice has no balance.

Generated types make that specific failure loud. If the server stops returning a field the client expects, the type at the call site changes, and the compile fails at the place that reads it.

There is a second-order benefit. Because the client is generated from a contract rather than written by hand, the frontend cannot invent an endpoint that the server does not serve. A hallucinated route does not typecheck. In an application where the same API serves the public site, the dashboard and the CMS, that consistency across three surfaces is the whole value.

## The same idea applied to internal services

The internal services — document rendering, email relay, background workers, scheduled jobs, backups — follow the same discipline. Their clients are generated from committed contract snapshots and drift-checked, so a service contract change cannot slip through unnoticed either. The browser never sees any of this: every internal call is server-to-server, signed, and time-stamped.