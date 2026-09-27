# github-readme-stats

## Retrieval summary

- Relationship: Owned repository.
- Repository: lst97/github-readme-stats.
- Purpose: Source implementation indicates these responsibilities: reads runtime environment variables; calls external http services; defines http request handlers.
- Observed capabilities: Reads runtime environment variables; Calls external HTTP services; Defines HTTP request handlers
- Technology: TypeScript, JavaScript, Python
- Software kinds: api_backend, web_app
- Curated topics: github, statistics, developer-tools

## Repository metadata
- **Repository:** lst97/github-readme-stats
- **Visibility:** public
- **URL:** https://github.com/lst97/github-readme-stats
- **Default branch:** master
- **Created:** 2025-05-09T12:01:19Z
- **Last updated:** 2026-08-10T04:07:31Z
- **Primary language:** JavaScript
- **License:** MIT License
- **Homepage:** https://github-readme-stats.vercel.app
- **Stars / forks:** 1 / 0
- **Topics:** No GitHub topics are set.
- **Software kinds:** `api_backend`, `web_app`
- **Curated topics:** `github`, `statistics`, `developer-tools`

### GitHub language breakdown
- JavaScript (429,394 bytes)
- Shell (573 bytes)

## Project purpose (source-derived)
Source implementation indicates these responsibilities: reads runtime environment variables; calls external http services; defines http request handlers.
Evidence: `src/cards/stats.js`, `src/common/cache.js`, `src/common/Card.js`, `src/common/envs.js`, `src/common/log.js`, `src/fetchers/wakatime.js`, `express.js`, `src/cards/types.d.ts` (**inferred**)

## Problem addressed
Unknown: source code does not explicitly state the problem addressed.
Evidence: none

## Features observed in source and tests
- Reads runtime environment variables — Evidence: `src/cards/stats.js`, `src/common/cache.js`, `src/common/Card.js`, `src/common/envs.js`, `src/common/log.js` (**inferred**)
- Calls external HTTP services — Evidence: `src/fetchers/wakatime.js` (**inferred**)
- Defines HTTP request handlers — Evidence: `express.js` (**inferred**)
- Defines the Common Options type or service — Evidence: `src/cards/types.d.ts` (**inferred**)
- Defines the Stat Card Options type or service — Evidence: `src/cards/types.d.ts` (**inferred**)
- Defines the Repo Card Options type or service — Evidence: `src/cards/types.d.ts` (**inferred**)
- Defines the Top Lang Options type or service — Evidence: `src/cards/types.d.ts` (**inferred**)
- Defines the Waka Time Options type or service — Evidence: `src/cards/types.d.ts` (**inferred**)
- Defines the Gist Card Options type or service — Evidence: `src/cards/types.d.ts` (**inferred**)
- Provides the Card UI component — Evidence: `src/common/Card.js` (**inferred**)
- Defines the Custom Error type or service — Evidence: `src/common/error.js` (**inferred**)
- Defines the Missing Param Error type or service — Evidence: `src/common/error.js` (**inferred**)
- Defines the I18n type or service — Evidence: `src/common/I18n.js` (**inferred**)
- Defines the Gist Data type or service — Evidence: `src/fetchers/types.d.ts` (**inferred**)
- Defines the Repository Data type or service — Evidence: `src/fetchers/types.d.ts` (**inferred**)
- Defines the Stats Data type or service — Evidence: `src/fetchers/types.d.ts` (**inferred**)
- Defines the Lang type or service — Evidence: `src/fetchers/types.d.ts` (**inferred**)
- Defines the Top Lang Data type or service — Evidence: `src/fetchers/types.d.ts` (**inferred**)
- Defines the Waka Time Data type or service — Evidence: `src/fetchers/types.d.ts` (**inferred**)
- Defines the Waka Time Lang type or service — Evidence: `src/fetchers/types.d.ts` (**inferred**)
- Tested behavior: should test the request — Evidence: `tests/api.test.js` (**inferred**)
- Tested behavior: should render error card on error — Evidence: `tests/api.test.js` (**inferred**)
- Tested behavior: should render error card in same theme as requested card — Evidence: `tests/api.test.js` (**inferred**)
- Tested behavior: should get the query options — Evidence: `tests/api.test.js` (**inferred**)

## Tracked files
- **132 tracked files** in total
- Source: 48; tests: 34; documentation: 5; configuration: 35; assets/other: 10

## Repository structure
- Inspected 32 source files from the cloned repository (bounded for safety).
- `.devcontainer/` (1 tracked files)
- `.github/` (23 tracked files)
- `.husky/` (2 tracked files)
- `.vscode/` (2 tracked files)
- `api/` (7 tracked files)
- `scripts/` (6 tracked files)
- `src/` (34 tracked files)
- `tests/` (34 tracked files)
- `themes/` (2 tracked files)
- `src/calculateRank.js`
- `src/cards/gist.js`
- `src/cards/index.js`
- `src/cards/repo.js`
- `src/cards/stats.js`
- `src/cards/top-languages.js`
- `src/cards/types.d.ts`
- `src/cards/wakatime.js`
- `src/common/access.js`
- `src/common/blacklist.js`
- `src/common/cache.js`
- `src/common/Card.js`
- `src/common/color.js`
- `src/common/envs.js`
- `src/common/error.js`
- `src/common/fmt.js`
- `src/common/html.js`
- `src/common/http.js`
- `src/common/I18n.js`
- `src/common/icons.js`

## Implementation and test evidence
- Reads runtime environment variables — Evidence: `src/cards/stats.js`, `src/common/cache.js`, `src/common/Card.js`, `src/common/envs.js`, `src/common/log.js` (**inferred**)
- Calls external HTTP services — Evidence: `src/fetchers/wakatime.js` (**inferred**)
- Defines HTTP request handlers — Evidence: `express.js` (**inferred**)
- Defines the Common Options type or service — Evidence: `src/cards/types.d.ts` (**inferred**)
- Defines the Stat Card Options type or service — Evidence: `src/cards/types.d.ts` (**inferred**)
- Defines the Repo Card Options type or service — Evidence: `src/cards/types.d.ts` (**inferred**)
- Defines the Top Lang Options type or service — Evidence: `src/cards/types.d.ts` (**inferred**)
- Defines the Waka Time Options type or service — Evidence: `src/cards/types.d.ts` (**inferred**)
- Defines the Gist Card Options type or service — Evidence: `src/cards/types.d.ts` (**inferred**)
- Provides the Card UI component — Evidence: `src/common/Card.js` (**inferred**)
- Defines the Custom Error type or service — Evidence: `src/common/error.js` (**inferred**)
- Defines the Missing Param Error type or service — Evidence: `src/common/error.js` (**inferred**)
- Defines the I18n type or service — Evidence: `src/common/I18n.js` (**inferred**)
- Defines the Gist Data type or service — Evidence: `src/fetchers/types.d.ts` (**inferred**)
- Defines the Repository Data type or service — Evidence: `src/fetchers/types.d.ts` (**inferred**)
- Defines the Stats Data type or service — Evidence: `src/fetchers/types.d.ts` (**inferred**)
- Defines the Lang type or service — Evidence: `src/fetchers/types.d.ts` (**inferred**)
- Defines the Top Lang Data type or service — Evidence: `src/fetchers/types.d.ts` (**inferred**)
- Defines the Waka Time Data type or service — Evidence: `src/fetchers/types.d.ts` (**inferred**)
- Defines the Waka Time Lang type or service — Evidence: `src/fetchers/types.d.ts` (**inferred**)
- Tested behavior: should test the request — Evidence: `tests/api.test.js` (**inferred**)
- Tested behavior: should render error card on error — Evidence: `tests/api.test.js` (**inferred**)
- Tested behavior: should render error card in same theme as requested card — Evidence: `tests/api.test.js` (**inferred**)
- Tested behavior: should get the query options — Evidence: `tests/api.test.js` (**inferred**)

## Frameworks and technology stack
- TypeScript — Evidence: `src/cards/types.d.ts`, `src/fetchers/types.d.ts`
- JavaScript — Evidence: `api/gist.js`, `api/index.js`, `api/pin.js`, `api/status/pat-info.js`, `api/status/up.js`, `api/top-langs.js`, `api/wakatime.js`, `eslint.config.mjs`
- Python — Evidence: `.github/workflows/deploy-prep.py`

## Design and architecture patterns
- test-driven development evidence (**inferred**) — Evidence: `tests/__snapshots__/renderWakatimeCard.test.js.snap`, `tests/api.test.js`, `tests/bench/api.bench.js`

## Evidence and limitations
- Reports are based on a fresh shallow clone. Safe, bounded documentation, manifests, source, and test files are inspected locally; raw source code is never copied into this report.
- README text and the GitHub description are excluded from project-purpose and feature claims because they may be stale.
- README is unavailable; source-based findings do not depend on it.
