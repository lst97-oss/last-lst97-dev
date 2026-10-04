# The gates that stop an API contract break, a schema mismatch or a guessed alignment from shipping

- **Category:** Quality Gates
- **Source ID:** canton101-quality-gates
- **URL:** https://www.lst97.dev/projects/canton-101
- **Visibility:** Private

Canto101 has several places where a silent wrong answer is worse than an error: an alignment that is plausible but off, a lexicon that seeds with a missing column, a client that calls a field the server stopped returning. None of these throws. Each one degrades into something that looks fine.

The quality gates are organised around that observation. They run in CI where they can fail a merge, at startup where they can fail a boot, and at content-build time where they can fail the pipeline.

## Deterministic API generation and drift checks

The OpenAPI specification and the typed clients are generated, and a drift check fails CI if the committed output no longer matches what the current code would produce.

Committing the generated output is what makes the check meaningful — if the client were regenerated during each build, a contract change would simply produce a different client and nothing would fail. Because the committed artefact is the one compared, changing a route or a response shape without regenerating produces a diff, and that diff fails the merge.

The specification itself is generated from the schemas the routes declare, so the document cannot drift from the implementation. The published contract and the served contract are the same artefact.

## Contract gates for micro-services

The micro-services are gated separately from the public API, because they have a different risk: a service client generated against a contract that the service no longer honours produces a call that succeeds at the network level and fails at the meaning.

So the micro-service clients are generated from committed contract snapshots and drift-checked too. A change to a micro-service's request or response shape cannot merge unless the committed client is regenerated alongside it. This catches the case where one side of an internal call moves and the other does not — precisely the failure a signed request does not protect against, because the signature verifies the caller, not the shape.

## Schema readiness at startup

Schema readiness is verified at startup rather than discovered at query time. The API server checks that the schema it expects is present before it begins serving, instead of letting the first lexicon query fail with a missing column.

This is a deployment gate with a different trigger. CI gates protect the code; schema readiness protects the deployment. A snapshot that was applied to one environment and not another, or a migration that ran before the seed, produces a server that boots and then fails on whichever query happens to be first — which is usually not the one that would identify the cause. Checking at startup turns that into an immediate, attributable boot failure.

## Seeding is repeatable and idempotent

The corpus output is a versioned seed snapshot rather than a pile of ad-hoc imports. Seeding is repeatable, reruns are idempotent, and a snapshot can be published and consumed by every environment from one place.

Idempotence is the property that makes it safe to re-seed a live environment after a corpus fix. Without it, a rerun either duplicates rows or fails on a unique constraint, and the practical response is to avoid re-seeding at all — which means a data correction requires a manual database edit that no test covers and no review sees.

## Provenance and quality evidence on content

The gates above protect code and schema. Content gets the equivalent treatment. Alignment results carry the quality evidence and the provenance of the computation that produced them, and the original values are kept auditable rather than being repaired into looking correct.

This is the difference between a system that is confident and one that is honest. An alignment shifted by half a second passes every structural check — the timings are ordered, in range, and cover the song. Only a quality score and a reviewable provenance record distinguish it from a correct one, so both are stored with the result. Anything uncertain is surfaced for review instead of silently smoothed over.

## Tests and the everyday gates

Alongside these, the ordinary gates run on every change: tests co-located next to the code they cover, plus type, lint and format checks. The domain layer is pure TypeScript and framework-free, so business rules are testable without a database or an HTTP request — which is what lets the parts that compute money-like or timing-like values be tested deterministically.

Promoting a change is gated end to end: type-check, lint, format, client-drift and contract gates, and tests must all pass before an image is built and rolled out. The deployment stage then applies its own check — the edge proxy owns all public routing, the API server runs with scoped permissions and no general egress, the database sits behind a connection pooler and is not exposed, and micro-services are internal-only, never published, and each requiring a signed request from the API server.

The pattern is the same in every case: verify the invariant where a violation can be caught, rather than assume it holds. A drift check in CI, a readiness check at boot, an idempotence property in the seeder, a quality score on the content.