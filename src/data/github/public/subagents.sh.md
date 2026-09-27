# subagents.sh

## Retrieval summary

- Relationship: Owned repository.
- Repository: lst97/subagents.sh.
- Purpose: Source implementation indicates these responsibilities: reads runtime environment variables; calls external http services; persists or queries application data; implements authentication; implements ai or language-model features.
- Observed capabilities: Reads runtime environment variables; Calls external HTTP services; Persists or queries application data
- Technology: TypeScript, React, Next.js, PostgreSQL, Tailwind CSS, JavaScript
- Software kinds: web_app, automation_devtool
- Curated topics: ai-agents, developer-tools

## Repository metadata
- **Repository:** lst97/subagents.sh
- **Visibility:** public
- **URL:** https://github.com/lst97/subagents.sh
- **Default branch:** main
- **Created:** 2025-08-02T17:20:52Z
- **Last updated:** 2025-08-14T16:18:56Z
- **Primary language:** TypeScript
- **Homepage:** https://subagents.sh/
- **Stars / forks:** 1 / 7
- **Topics:** No GitHub topics are set.
- **Software kinds:** `web_app`, `automation_devtool`
- **Curated topics:** `ai-agents`, `developer-tools`

### GitHub language breakdown
- TypeScript (1,627,078 bytes)
- PLpgSQL (84,412 bytes)
- JavaScript (8,976 bytes)
- Shell (6,378 bytes)
- CSS (5,169 bytes)

## Project purpose (source-derived)
Source implementation indicates these responsibilities: reads runtime environment variables; calls external http services; persists or queries application data; implements authentication; implements ai or language-model features.
Evidence: `next.config.js`, `playwright.config.ts`, `src/app/admin/page.tsx`, `src/app/api/admin/deployments/route.ts`, `src/app/api/collections/[id]/agents/route.ts`, `src/app/api/cron/health-check/route.ts`, `src/app/collections/[id]/edit/page.tsx`, `src/app/collections/[id]/page.tsx`, `src/app/collections/new/page.tsx`, `src/app/api/collections/[id]/route.ts`, `src/app/api/metrics/route.ts`, `src/app/bookmarks/page.tsx`, `src/app/page.tsx`, `src/app/auth/callback/route.ts`, `src/app/robots.ts`, `src/app/submit/page.tsx`, `src/app/admin/search-analytics/page.tsx`, `src/app/agents/[id]/edit/page.tsx`, `src/app/agents/[id]/page.tsx`, `src/app/agents/page.tsx`, `src/app/api/account/delete/route.ts`, `src/app/api/agents/featured/route.ts`, `src/app/api/collections/route.ts`, `src/app/api/cron/cleanup/route.ts`, `src/app/api/github/import/route.ts`, `src/app/api/github/import/search/route.ts`, `src/app/api/github/import/user/route.ts`, `src/app/api/github/repositories/route.ts`, `src/app/api/github/sync/route.ts` (**inferred**)

## Problem addressed
Unknown: source code does not explicitly state the problem addressed.
Evidence: none

## Features observed in source and tests
- Reads runtime environment variables — Evidence: `next.config.js`, `playwright.config.ts`, `src/app/admin/page.tsx`, `src/app/api/admin/deployments/route.ts`, `src/app/api/collections/[id]/agents/route.ts` (**inferred**)
- Calls external HTTP services — Evidence: `src/app/admin/page.tsx`, `src/app/api/cron/health-check/route.ts`, `src/app/collections/[id]/edit/page.tsx`, `src/app/collections/[id]/page.tsx`, `src/app/collections/new/page.tsx` (**inferred**)
- Persists or queries application data — Evidence: `src/app/api/collections/[id]/agents/route.ts`, `src/app/api/collections/[id]/route.ts`, `src/app/api/metrics/route.ts`, `src/app/bookmarks/page.tsx`, `src/app/page.tsx` (**inferred**)
- Implements authentication — Evidence: `src/app/auth/callback/route.ts` (**inferred**)
- Implements AI or language-model features — Evidence: `src/app/robots.ts`, `src/app/submit/page.tsx` (**inferred**)
- Renders a React user interface — Evidence: `src/app/admin/page.tsx`, `src/app/admin/search-analytics/page.tsx`, `src/app/agents/[id]/edit/page.tsx`, `src/app/agents/[id]/page.tsx`, `src/app/agents/page.tsx` (**inferred**)
- Defines HTTP request handlers — Evidence: `src/app/api/account/delete/route.ts`, `src/app/api/admin/deployments/route.ts`, `src/app/api/agents/featured/route.ts`, `src/app/api/collections/[id]/agents/route.ts`, `src/app/api/collections/[id]/route.ts`, `src/app/api/collections/route.ts`, `src/app/api/cron/cleanup/route.ts`, `src/app/api/cron/health-check/route.ts` (**inferred**)
- Validates structured data with schema definitions — Evidence: `src/app/api/github/import/route.ts`, `src/app/api/github/import/search/route.ts`, `src/app/api/github/import/user/route.ts`, `src/app/api/github/repositories/route.ts`, `src/app/api/github/sync/route.ts` (**inferred**)
- Provides the Admin Dashboard UI component — Evidence: `src/app/admin/page.tsx` (**inferred**)
- Searches analytics page — Evidence: `src/app/admin/search-analytics/page.tsx` (**inferred**)
- Provides the Edit Agent Page UI component — Evidence: `src/app/agents/[id]/edit/page.tsx` (**inferred**)
- Provides the Agent Detail Page UI component — Evidence: `src/app/agents/[id]/page.tsx` (**inferred**)
- Provides the Agents Page UI component — Evidence: `src/app/agents/page.tsx` (**inferred**)
- Provides the Sign In Page UI component — Evidence: `src/app/auth/signin/page.tsx` (**inferred**)
- Provides the Bookmarks Page UI component — Evidence: `src/app/bookmarks/page.tsx` (**inferred**)
- Provides the Categories Page UI component — Evidence: `src/app/categories/page.tsx` (**inferred**)
- Provides the Edit Collection Page UI component — Evidence: `src/app/collections/[id]/edit/page.tsx` (**inferred**)
- Provides the Collection Page UI component — Evidence: `src/app/collections/[id]/page.tsx` (**inferred**)
- Provides the New Collection Page UI component — Evidence: `src/app/collections/new/page.tsx` (**inferred**)
- Provides the Collections Page UI component — Evidence: `src/app/collections/page.tsx` (**inferred**)
- Provides the Root Layout UI component — Evidence: `src/app/layout.tsx` (**inferred**)
- Provides the Home UI component — Evidence: `src/app/page.tsx` (**inferred**)
- Provides the Profile Page UI component — Evidence: `src/app/profile/page.tsx` (**inferred**)
- Searches page — Evidence: `src/app/search/page.tsx` (**inferred**)

## Tracked files
- **236 tracked files** in total
- Source: 154; tests: 21; documentation: 10; configuration: 16; assets/other: 35

## Repository structure
- Inspected 65 source files from the cloned repository (bounded for safety).
- `.github/` (5 tracked files)
- `.vscode/` (2 tracked files)
- `docs/` (3 tracked files)
- `e2e/` (6 tracked files)
- `public/` (11 tracked files)
- `scripts/` (5 tracked files)
- `src/` (169 tracked files)
- `supabase/` (15 tracked files)
- `next.config.js`
- `playwright.config.ts`
- `src/app/admin/page.tsx`
- `src/app/admin/search-analytics/page.tsx`
- `src/app/agents/[id]/edit/page.tsx`
- `src/app/agents/[id]/page.tsx`
- `src/app/agents/page.tsx`
- `src/app/api/account/delete/route.ts`
- `src/app/api/admin/deployments/route.ts`
- `src/app/api/agents/featured/route.ts`
- `src/app/api/collections/[id]/agents/route.ts`
- `src/app/api/collections/[id]/route.ts`
- `src/app/api/collections/route.ts`
- `src/app/api/cron/cleanup/route.ts`
- `src/app/api/cron/health-check/route.ts`
- `src/app/api/github/import/route.ts`
- `src/app/api/github/import/search/route.ts`
- `src/app/api/github/import/user/route.ts`
- `src/app/api/github/rate-limit/route.ts`
- `src/app/api/github/repositories/route.ts`

## Implementation and test evidence
- Reads runtime environment variables — Evidence: `next.config.js`, `playwright.config.ts`, `src/app/admin/page.tsx`, `src/app/api/admin/deployments/route.ts`, `src/app/api/collections/[id]/agents/route.ts` (**inferred**)
- Calls external HTTP services — Evidence: `src/app/admin/page.tsx`, `src/app/api/cron/health-check/route.ts`, `src/app/collections/[id]/edit/page.tsx`, `src/app/collections/[id]/page.tsx`, `src/app/collections/new/page.tsx` (**inferred**)
- Persists or queries application data — Evidence: `src/app/api/collections/[id]/agents/route.ts`, `src/app/api/collections/[id]/route.ts`, `src/app/api/metrics/route.ts`, `src/app/bookmarks/page.tsx`, `src/app/page.tsx` (**inferred**)
- Implements authentication — Evidence: `src/app/auth/callback/route.ts` (**inferred**)
- Implements AI or language-model features — Evidence: `src/app/robots.ts`, `src/app/submit/page.tsx` (**inferred**)
- Renders a React user interface — Evidence: `src/app/admin/page.tsx`, `src/app/admin/search-analytics/page.tsx`, `src/app/agents/[id]/edit/page.tsx`, `src/app/agents/[id]/page.tsx`, `src/app/agents/page.tsx` (**inferred**)
- Defines HTTP request handlers — Evidence: `src/app/api/account/delete/route.ts`, `src/app/api/admin/deployments/route.ts`, `src/app/api/agents/featured/route.ts`, `src/app/api/collections/[id]/agents/route.ts`, `src/app/api/collections/[id]/route.ts`, `src/app/api/collections/route.ts`, `src/app/api/cron/cleanup/route.ts`, `src/app/api/cron/health-check/route.ts` (**inferred**)
- Validates structured data with schema definitions — Evidence: `src/app/api/github/import/route.ts`, `src/app/api/github/import/search/route.ts`, `src/app/api/github/import/user/route.ts`, `src/app/api/github/repositories/route.ts`, `src/app/api/github/sync/route.ts` (**inferred**)
- Provides the Admin Dashboard UI component — Evidence: `src/app/admin/page.tsx` (**inferred**)
- Searches analytics page — Evidence: `src/app/admin/search-analytics/page.tsx` (**inferred**)
- Provides the Edit Agent Page UI component — Evidence: `src/app/agents/[id]/edit/page.tsx` (**inferred**)
- Provides the Agent Detail Page UI component — Evidence: `src/app/agents/[id]/page.tsx` (**inferred**)
- Provides the Agents Page UI component — Evidence: `src/app/agents/page.tsx` (**inferred**)
- Provides the Sign In Page UI component — Evidence: `src/app/auth/signin/page.tsx` (**inferred**)
- Provides the Bookmarks Page UI component — Evidence: `src/app/bookmarks/page.tsx` (**inferred**)
- Provides the Categories Page UI component — Evidence: `src/app/categories/page.tsx` (**inferred**)
- Provides the Edit Collection Page UI component — Evidence: `src/app/collections/[id]/edit/page.tsx` (**inferred**)
- Provides the Collection Page UI component — Evidence: `src/app/collections/[id]/page.tsx` (**inferred**)
- Provides the New Collection Page UI component — Evidence: `src/app/collections/new/page.tsx` (**inferred**)
- Provides the Collections Page UI component — Evidence: `src/app/collections/page.tsx` (**inferred**)
- Provides the Root Layout UI component — Evidence: `src/app/layout.tsx` (**inferred**)
- Provides the Home UI component — Evidence: `src/app/page.tsx` (**inferred**)
- Provides the Profile Page UI component — Evidence: `src/app/profile/page.tsx` (**inferred**)
- Searches page — Evidence: `src/app/search/page.tsx` (**inferred**)

## Frameworks and technology stack
- TypeScript — Evidence: `package.json`
- React — Evidence: `package.json`
- Next.js — Evidence: `package.json`
- PostgreSQL — Evidence: `docs/database-optimizations.md`
- Tailwind CSS — Evidence: `package.json`
- JavaScript — Evidence: `next.config.js`, `postcss.config.js`, `scripts/seed-test-data.js`, `tailwind.config.js`

## Design and architecture patterns
- test-driven development evidence (**inferred**) — Evidence: `src/__tests__/config/test-database.ts`, `src/__tests__/factories/index.ts`, `src/__tests__/integration/auth.test.ts`

## Evidence and limitations
- Reports are based on a fresh shallow clone. Safe, bounded documentation, manifests, source, and test files are inspected locally; raw source code is never copied into this report.
- README text and the GitHub description are excluded from project-purpose and feature claims because they may be stale.
- No additional inspection limitations were recorded.
