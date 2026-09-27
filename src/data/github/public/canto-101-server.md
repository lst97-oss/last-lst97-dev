# canto-101-server

## Retrieval summary

- Relationship: Owned repository.
- Repository: lst97/canto-101-server.
- Purpose: Source implementation indicates these responsibilities: reads runtime environment variables; integrates a headless cms; renders a react user interface.
- Observed capabilities: Reads runtime environment variables; Integrates a headless CMS; Renders a React user interface
- Technology: TypeScript, React, Next.js, PostgreSQL, JavaScript
- Software kinds: api_backend
- Curated topics: cantonese, language-learning

## Repository metadata
- **Repository:** lst97/canto-101-server
- **Visibility:** public
- **URL:** https://github.com/lst97/canto-101-server
- **Default branch:** dev
- **Created:** 2025-10-10T10:31:31Z
- **Last updated:** 2026-06-13T18:12:16Z
- **Primary language:** TypeScript
- **License:** Apache License 2.0
- **Stars / forks:** 1 / 0
- **Topics:** No GitHub topics are set.
- **Software kinds:** `api_backend`
- **Curated topics:** `cantonese`, `language-learning`

### GitHub language breakdown
- TypeScript (16,240 bytes)
- Dockerfile (2,444 bytes)
- CSS (2,328 bytes)
- JavaScript (469 bytes)

## Project purpose (source-derived)
Source implementation indicates these responsibilities: reads runtime environment variables; integrates a headless cms; renders a react user interface.
Evidence: `playwright.config.ts`, `src/payload.config.ts`, `next.config.mjs`, `src/app/(frontend)/page.tsx`, `src/app/(payload)/admin/[[...segments]]/not-found.tsx`, `src/app/(payload)/admin/[[...segments]]/page.tsx`, `src/app/(payload)/api/[...slug]/route.ts`, `src/app/(frontend)/layout.tsx`, `src/app/(payload)/layout.tsx` (**inferred**)

## Problem addressed
Unknown: source code does not explicitly state the problem addressed.
Evidence: none

## Features observed in source and tests
- Reads runtime environment variables — Evidence: `playwright.config.ts`, `src/payload.config.ts`, `playwright.config.ts` (**inferred**)
- Integrates a headless CMS — Evidence: `next.config.mjs`, `src/app/(frontend)/page.tsx`, `src/app/(payload)/admin/[[...segments]]/not-found.tsx`, `src/app/(payload)/admin/[[...segments]]/page.tsx`, `src/app/(payload)/api/[...slug]/route.ts` (**inferred**)
- Renders a React user interface — Evidence: `src/app/(frontend)/layout.tsx`, `src/app/(payload)/layout.tsx` (**inferred**)
- Provides the Root Layout UI component — Evidence: `src/app/(frontend)/layout.tsx` (**inferred**)
- Provides the Home Page UI component — Evidence: `src/app/(frontend)/page.tsx` (**inferred**)
- Tested behavior: can go on homepage — Evidence: `tests/e2e/frontend.e2e.spec.ts` (**inferred**)
- Tested behavior: fetches users — Evidence: `tests/int/api.int.spec.ts` (**inferred**)

## Tracked files
- **38 tracked files** in total
- Source: 16; tests: 2; documentation: 1; configuration: 13; assets/other: 6

## Repository structure
- Inspected 19 source files from the cloned repository (bounded for safety).
- `.vscode/` (3 tracked files)
- `src/` (16 tracked files)
- `tests/` (2 tracked files)
- `next.config.mjs`
- `playwright.config.ts`
- `src/app/(frontend)/layout.tsx`
- `src/app/(frontend)/page.tsx`
- `src/app/(frontend)/styles.css`
- `src/app/(payload)/admin/[[...segments]]/not-found.tsx`
- `src/app/(payload)/admin/[[...segments]]/page.tsx`
- `src/app/(payload)/admin/importMap.js`
- `src/app/(payload)/api/[...slug]/route.ts`
- `src/app/(payload)/api/graphql-playground/route.ts`
- `src/app/(payload)/api/graphql/route.ts`
- `src/app/(payload)/custom.scss`
- `src/app/(payload)/layout.tsx`
- `src/app/my-route/route.ts`
- `src/collections/Media.ts`
- `src/payload.config.ts`
- `next.config.mjs`
- `playwright.config.ts`
- `vitest.setup.ts`
- `tests/e2e/frontend.e2e.spec.ts`

## Implementation and test evidence
- Reads runtime environment variables — Evidence: `playwright.config.ts`, `src/payload.config.ts`, `playwright.config.ts` (**inferred**)
- Integrates a headless CMS — Evidence: `next.config.mjs`, `src/app/(frontend)/page.tsx`, `src/app/(payload)/admin/[[...segments]]/not-found.tsx`, `src/app/(payload)/admin/[[...segments]]/page.tsx`, `src/app/(payload)/api/[...slug]/route.ts` (**inferred**)
- Renders a React user interface — Evidence: `src/app/(frontend)/layout.tsx`, `src/app/(payload)/layout.tsx` (**inferred**)
- Provides the Root Layout UI component — Evidence: `src/app/(frontend)/layout.tsx` (**inferred**)
- Provides the Home Page UI component — Evidence: `src/app/(frontend)/page.tsx` (**inferred**)
- Tested behavior: can go on homepage — Evidence: `tests/e2e/frontend.e2e.spec.ts` (**inferred**)
- Tested behavior: fetches users — Evidence: `tests/int/api.int.spec.ts` (**inferred**)

## Frameworks and technology stack
- TypeScript — Evidence: `package.json`
- React — Evidence: `package.json`
- Next.js — Evidence: `package.json`
- PostgreSQL — Evidence: `docker-compose.yml`, `package.json`, `src/payload.config.ts`
- JavaScript — Evidence: `next.config.mjs`, `src/app/(payload)/admin/importMap.js`

## Design and architecture patterns
- test-driven development evidence (**inferred**) — Evidence: `tests/e2e/frontend.e2e.spec.ts`, `tests/int/api.int.spec.ts`

## Evidence and limitations
- Reports are based on a fresh shallow clone. Safe, bounded documentation, manifests, source, and test files are inspected locally; raw source code is never copied into this report.
- README text and the GitHub description are excluded from project-purpose and feature claims because they may be stale.
- No additional inspection limitations were recorded.
