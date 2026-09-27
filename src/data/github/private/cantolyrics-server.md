# cantolyrics-server

## Retrieval summary

- Relationship: Owned repository.
- Repository: lst97/cantolyrics-server.
- Purpose: Source implementation indicates these responsibilities: reads runtime environment variables; validates structured input or configuration; calls external http services; persists or queries application data; implements ai or language-model features.
- Observed capabilities: Reads runtime environment variables; Validates structured input or configuration; Calls external HTTP services
- Technology: TypeScript

## Repository metadata
- **Repository:** lst97/cantolyrics-server
- **Visibility:** private
- **URL:** https://github.com/lst97/cantolyrics-server
- **Default branch:** main
- **Last updated:** 2026-04-26T14:40:34Z
- **Primary language:** TypeScript
- **Stars / forks:** 0 / 1
- **Topics:** No GitHub topics are set.

### GitHub language breakdown
- TypeScript (188,029 bytes)
- Dockerfile (291 bytes)

## Project purpose (source-derived)
Source implementation indicates these responsibilities: reads runtime environment variables; validates structured input or configuration; calls external http services; persists or queries application data; implements ai or language-model features.
Evidence: `src/env.ts`, `src/services/jyutping/loader.ts`, `src/routers/songs.ts`, `src/services/admin/service.ts`, `src/services/ai/factory.ts`, `src/services/ai/types.ts`, `src/main.ts`, `src/lib/app-error.ts` (**inferred**)

## Problem addressed
Unknown: source code does not explicitly state the problem addressed.
Evidence: none

## Features observed in source and tests
- Reads runtime environment variables — Evidence: `src/env.ts` (**inferred**)
- Validates structured input or configuration — Evidence: `src/env.ts` (**inferred**)
- Calls external HTTP services — Evidence: `src/services/jyutping/loader.ts` (**inferred**)
- Persists or queries application data — Evidence: `src/routers/songs.ts`, `src/services/admin/service.ts` (**inferred**)
- Implements AI or language-model features — Evidence: `src/env.ts`, `src/services/ai/factory.ts`, `src/services/ai/types.ts` (**inferred**)
- Defines HTTP request handlers — Evidence: `src/main.ts` (**inferred**)
- Validates and types runtime environment configuration — Evidence: `src/env.ts` (**inferred**)
- Defines the App Error type or service — Evidence: `src/lib/app-error.ts` (**inferred**)
- Defines the Credit Feature type or service — Evidence: `src/lib/credits.ts` (**inferred**)
- Defines the Credit Row type or service — Evidence: `src/lib/credits.ts` (**inferred**)
- Gets user message — Evidence: `src/lib/errors.ts` (**inferred**)
- Defines the Validation Error type or service — Evidence: `src/lib/errors.ts` (**inferred**)
- Defines the Auth Error type or service — Evidence: `src/lib/errors.ts` (**inferred**)
- Defines the Forbidden Error type or service — Evidence: `src/lib/errors.ts` (**inferred**)
- Defines the Rate Limit Error type or service — Evidence: `src/lib/errors.ts` (**inferred**)
- Gets log context — Evidence: `src/lib/logger.ts` (**inferred**)
- Formats json — Evidence: `src/lib/logger.ts` (**inferred**)
- Formats pretty — Evidence: `src/lib/logger.ts` (**inferred**)
- Creates logger — Evidence: `src/lib/logger.ts` (**inferred**)
- Defines the Log Level type or service — Evidence: `src/lib/logger.ts` (**inferred**)
- Defines the Log Context type or service — Evidence: `src/lib/logger.ts` (**inferred**)
- Defines the Logger type or service — Evidence: `src/lib/logger.ts` (**inferred**)
- Defines the Gemini Json Schema type or service — Evidence: `src/lib/response-schemas.ts` (**inferred**)
- Defines the Lyric Line type or service — Evidence: `src/lib/response-schemas.ts` (**inferred**)

## Tracked files
- **150 tracked files** in total
- Source: 50; tests: 14; documentation: 73; configuration: 8; assets/other: 5

## Repository structure
- Inspected 46 source files from the cloned repository (bounded for safety).
- `.agents/` (35 tracked files)
- `.claude/` (8 tracked files)
- `.github/` (8 tracked files)
- `.sisyphus/` (1 tracked files)
- `data/` (3 tracked files)
- `openspec/` (13 tracked files)
- `specs/` (7 tracked files)
- `src/` (51 tracked files)
- `tests/` (14 tracked files)
- `src/env.ts`
- `src/lib/app-error.ts`
- `src/lib/credits.ts`
- `src/lib/errors.ts`
- `src/lib/logger.ts`
- `src/lib/response-schemas.ts`
- `src/lib/schemas.ts`
- `src/main.ts`
- `src/routers/admin.ts`
- `src/routers/credits.ts`
- `src/routers/feedback.ts`
- `src/routers/health.ts`
- `src/routers/lyrics.ts`
- `src/routers/payments.ts`
- `src/routers/songs.ts`
- `src/routers/tools.ts`
- `src/services/admin/service.ts`
- `src/services/ai/errors.ts`
- `src/services/ai/factory.ts`
- `src/services/ai/gemini/schema-translator.ts`

## Implementation and test evidence
- Reads runtime environment variables — Evidence: `src/env.ts` (**inferred**)
- Validates structured input or configuration — Evidence: `src/env.ts` (**inferred**)
- Calls external HTTP services — Evidence: `src/services/jyutping/loader.ts` (**inferred**)
- Persists or queries application data — Evidence: `src/routers/songs.ts`, `src/services/admin/service.ts` (**inferred**)
- Implements AI or language-model features — Evidence: `src/env.ts`, `src/services/ai/factory.ts`, `src/services/ai/types.ts` (**inferred**)
- Defines HTTP request handlers — Evidence: `src/main.ts` (**inferred**)
- Validates and types runtime environment configuration — Evidence: `src/env.ts` (**inferred**)
- Defines the App Error type or service — Evidence: `src/lib/app-error.ts` (**inferred**)
- Defines the Credit Feature type or service — Evidence: `src/lib/credits.ts` (**inferred**)
- Defines the Credit Row type or service — Evidence: `src/lib/credits.ts` (**inferred**)
- Gets user message — Evidence: `src/lib/errors.ts` (**inferred**)
- Defines the Validation Error type or service — Evidence: `src/lib/errors.ts` (**inferred**)
- Defines the Auth Error type or service — Evidence: `src/lib/errors.ts` (**inferred**)
- Defines the Forbidden Error type or service — Evidence: `src/lib/errors.ts` (**inferred**)
- Defines the Rate Limit Error type or service — Evidence: `src/lib/errors.ts` (**inferred**)
- Gets log context — Evidence: `src/lib/logger.ts` (**inferred**)
- Formats json — Evidence: `src/lib/logger.ts` (**inferred**)
- Formats pretty — Evidence: `src/lib/logger.ts` (**inferred**)
- Creates logger — Evidence: `src/lib/logger.ts` (**inferred**)
- Defines the Log Level type or service — Evidence: `src/lib/logger.ts` (**inferred**)
- Defines the Log Context type or service — Evidence: `src/lib/logger.ts` (**inferred**)
- Defines the Logger type or service — Evidence: `src/lib/logger.ts` (**inferred**)
- Defines the Gemini Json Schema type or service — Evidence: `src/lib/response-schemas.ts` (**inferred**)
- Defines the Lyric Line type or service — Evidence: `src/lib/response-schemas.ts` (**inferred**)

## Frameworks and technology stack
- TypeScript — Evidence: `src/env.ts`, `src/lib/app-error.ts`, `src/lib/credits.ts`, `src/lib/errors.ts`, `src/lib/logger.ts`, `src/lib/response-schemas.ts`, `src/lib/schemas.ts`, `src/main.ts`

## Design and architecture patterns
- test-driven development evidence (**inferred**) — Evidence: `tests/AGENTS.md`, `tests/fixtures/sample-midi.ts`, `tests/integration/cors.test.ts`

## Evidence and limitations
- Reports are based on a fresh shallow clone. Safe, bounded documentation, manifests, source, and test files are inspected locally; raw source code is never copied into this report.
- README text and the GitHub description are excluded from project-purpose and feature claims because they may be stale.
- No additional inspection limitations were recorded.
