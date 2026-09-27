# gnaf-autocomplete

## Retrieval summary

- Relationship: Owned repository.
- Repository: lst97/gnaf-autocomplete.
- Project demo: https://gnaf.lst97.dev/
- Purpose: Source implementation indicates these responsibilities: reads runtime environment variables; calls external http services; persists or queries application data; implements authentication; uses a distributed or explicit cache.
- Observed capabilities: Reads runtime environment variables; Calls external HTTP services; Persists or queries application data
- Technology: TypeScript, PostgreSQL, JavaScript
- Software kinds: web_app
- GitHub topics: address-autocomplete, addresses, api, australia, australian-addresses, autocomplete, bun, docker
- Curated topics: geospatial, address-search, australia

## Repository metadata
- **Repository:** lst97/gnaf-autocomplete
- **Visibility:** public
- **URL:** https://github.com/lst97/gnaf-autocomplete
- **Default branch:** main
- **Created:** 2026-06-16T15:29:47Z
- **Last updated:** 2026-06-18T15:30:18Z
- **Primary language:** HTML
- **License:** GNU Affero General Public License v3.0
- **Homepage:** https://gnaf.lst97.dev
- **Stars / forks:** 0 / 0
- **Topics:** `address-autocomplete`, `addresses`, `api`, `australia`, `australian-addresses`, `autocomplete`, `bun`, `docker`, `elysia`, `g-naf`, `geocoding`, `open-data`, `postgresql`, `self-hosted`, `typescript`
- **Software kinds:** `web_app`
- **Curated topics:** `geospatial`, `address-search`, `australia`

### GitHub language breakdown
- HTML (763,117 bytes)
- TypeScript (463,587 bytes)
- JavaScript (61,108 bytes)
- CSS (29,157 bytes)
- PLpgSQL (1,855 bytes)
- Dockerfile (1,692 bytes)
- Shell (727 bytes)

## Project purpose (source-derived)
Source implementation indicates these responsibilities: reads runtime environment variables; calls external http services; persists or queries application data; implements authentication; uses a distributed or explicit cache.
Evidence: `src/db/client.ts`, `src/db/queries.ts`, `src/env.ts`, `pages/analytics.html`, `pages/system-tab.html`, `src/lib/version-check.ts`, `pages/loader-tab.html`, `src/db/router.ts`, `src/lib/key-hash.ts`, `src/api/suggest.ts`, `src/lib/constants.ts`, `src/search/corrector.ts`, `src/api/keys.ts` (**inferred**)

## Problem addressed
Unknown: source code does not explicitly state the problem addressed.
Evidence: none

## Features observed in source and tests
- Reads runtime environment variables — Evidence: `src/db/client.ts`, `src/db/queries.ts`, `src/env.ts` (**inferred**)
- Calls external HTTP services — Evidence: `pages/analytics.html`, `pages/system-tab.html`, `src/lib/version-check.ts` (**inferred**)
- Persists or queries application data — Evidence: `pages/loader-tab.html`, `pages/system-tab.html`, `src/db/queries.ts`, `src/db/router.ts`, `src/lib/version-check.ts` (**inferred**)
- Implements authentication — Evidence: `src/lib/key-hash.ts` (**inferred**)
- Uses a distributed or explicit cache — Evidence: `src/api/suggest.ts` (**inferred**)
- Implements AI or language-model features — Evidence: `pages/system-tab.html`, `src/api/suggest.ts`, `src/db/router.ts`, `src/lib/constants.ts`, `src/search/corrector.ts` (**inferred**)
- Validates and types runtime environment configuration — Evidence: `src/env.ts` (**inferred**)
- Generates token — Evidence: `src/api/keys.ts` (**inferred**)
- Validates domain — Evidence: `src/api/keys.ts` (**inferred**)
- Gets sql — Evidence: `src/db/client.ts` (**inferred**)
- Gets read write sql — Evidence: `src/db/client.ts` (**inferred**)
- Closes db — Evidence: `src/db/client.ts` (**inferred**)
- Defines the Router Result type or service — Evidence: `src/db/router.ts` (**inferred**)
- Defines the App type or service — Evidence: `src/index.ts` (**inferred**)
- Builds suggest key — Evidence: `src/lib/cache.ts` (**inferred**)
- Gets suggest cache — Evidence: `src/lib/cache.ts` (**inferred**)
- Defines the Lru Cache type or service — Evidence: `src/lib/cache.ts` (**inferred**)
- Defines the Cached Suggest Response type or service — Evidence: `src/lib/cache.ts` (**inferred**)
- Gets real ip — Evidence: `src/lib/client-ip.ts` (**inferred**)
- Defines the Error Code type or service — Evidence: `src/lib/errors.ts` (**inferred**)
- Defines the App Error type or service — Evidence: `src/lib/errors.ts` (**inferred**)
- Defines the Validation Error type or service — Evidence: `src/lib/errors.ts` (**inferred**)
- Verifies key — Evidence: `src/lib/key-hash.ts` (**inferred**)
- Gets or generate request id — Evidence: `src/lib/request.ts` (**inferred**)

## Tracked files
- **170 tracked files** in total
- Source: 64; tests: 41; documentation: 23; configuration: 18; assets/other: 24

## Repository structure
- Inspected 40 source files from the cloned repository (bounded for safety).
- `.github/` (8 tracked files)
- `.husky/` (1 tracked files)
- `benchmark/` (4 tracked files)
- `graphify-out/` (11 tracked files)
- `pages/` (20 tracked files)
- `scripts/` (7 tracked files)
- `sql/` (15 tracked files)
- `src/` (46 tracked files)
- `tests/` (41 tracked files)
- `pages/analytics.html`
- `pages/detail-tab.html`
- `pages/keys-tab.html`
- `pages/loader-tab.html`
- `pages/main.html`
- `pages/style.css`
- `pages/suggest-tab.html`
- `pages/system-tab.html`
- `src/api/address.ts`
- `src/api/check-update.ts`
- `src/api/health.ts`
- `src/api/keys.ts`
- `src/api/stats.ts`
- `src/api/suggest.ts`
- `src/api/warmup.ts`
- `src/db/client.ts`
- `src/db/queries.ts`
- `src/db/router.ts`
- `src/env.ts`
- `src/index.ts`

## Implementation and test evidence
- Reads runtime environment variables — Evidence: `src/db/client.ts`, `src/db/queries.ts`, `src/env.ts` (**inferred**)
- Calls external HTTP services — Evidence: `pages/analytics.html`, `pages/system-tab.html`, `src/lib/version-check.ts` (**inferred**)
- Persists or queries application data — Evidence: `pages/loader-tab.html`, `pages/system-tab.html`, `src/db/queries.ts`, `src/db/router.ts`, `src/lib/version-check.ts` (**inferred**)
- Implements authentication — Evidence: `src/lib/key-hash.ts` (**inferred**)
- Uses a distributed or explicit cache — Evidence: `src/api/suggest.ts` (**inferred**)
- Implements AI or language-model features — Evidence: `pages/system-tab.html`, `src/api/suggest.ts`, `src/db/router.ts`, `src/lib/constants.ts`, `src/search/corrector.ts` (**inferred**)
- Validates and types runtime environment configuration — Evidence: `src/env.ts` (**inferred**)
- Generates token — Evidence: `src/api/keys.ts` (**inferred**)
- Validates domain — Evidence: `src/api/keys.ts` (**inferred**)
- Gets sql — Evidence: `src/db/client.ts` (**inferred**)
- Gets read write sql — Evidence: `src/db/client.ts` (**inferred**)
- Closes db — Evidence: `src/db/client.ts` (**inferred**)
- Defines the Router Result type or service — Evidence: `src/db/router.ts` (**inferred**)
- Defines the App type or service — Evidence: `src/index.ts` (**inferred**)
- Builds suggest key — Evidence: `src/lib/cache.ts` (**inferred**)
- Gets suggest cache — Evidence: `src/lib/cache.ts` (**inferred**)
- Defines the Lru Cache type or service — Evidence: `src/lib/cache.ts` (**inferred**)
- Defines the Cached Suggest Response type or service — Evidence: `src/lib/cache.ts` (**inferred**)
- Gets real ip — Evidence: `src/lib/client-ip.ts` (**inferred**)
- Defines the Error Code type or service — Evidence: `src/lib/errors.ts` (**inferred**)
- Defines the App Error type or service — Evidence: `src/lib/errors.ts` (**inferred**)
- Defines the Validation Error type or service — Evidence: `src/lib/errors.ts` (**inferred**)
- Verifies key — Evidence: `src/lib/key-hash.ts` (**inferred**)
- Gets or generate request id — Evidence: `src/lib/request.ts` (**inferred**)

## Frameworks and technology stack
- TypeScript — Evidence: `package.json`
- PostgreSQL — Evidence: `docker-compose.yml`, `package.json`, `pages/loader-tab.html`, `pages/system-tab.html`, `src/api/warmup.ts`, `src/db/client.ts`, `src/env.ts`, `src/index.ts`, `src/lib/version-check.ts`, `scripts/build-fixture.ts`, `scripts/load-worker.ts`, `tests/unit/config.test.ts`
- JavaScript — Evidence: `pages/assets/common.js`, `pages/assets/detail.js`, `pages/assets/keys.js`, `pages/assets/suggest.js`, `pages/assets/system.js`

## Design and architecture patterns
- test-driven development evidence (**inferred**) — Evidence: `tests/AGENTS.md`, `tests/db/address.test.ts`, `tests/db/auth.test.ts`

## Evidence and limitations
- Reports are based on a fresh shallow clone. Safe, bounded documentation, manifests, source, and test files are inspected locally; raw source code is never copied into this report.
- README text and the GitHub description are excluded from project-purpose and feature claims because they may be stale.
- No additional inspection limitations were recorded.
