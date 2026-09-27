# lst97-dev

## Retrieval summary

- Relationship: Owned repository.
- Repository: lst97/lst97-dev.
- Purpose: Source implementation indicates these responsibilities: reads runtime environment variables; calls external http services; integrates a headless cms; renders a react user interface; defines http request handlers.
- Observed capabilities: Reads runtime environment variables; Calls external HTTP services; Integrates a headless CMS
- Technology: TypeScript, React, Next.js, PostgreSQL, Tailwind CSS, JavaScript
- GitHub topics: nextjs, personal-website, pixel-art, react, vercel-deployment

## Repository metadata
- **Repository:** lst97/lst97-dev
- **Visibility:** public
- **URL:** https://github.com/lst97/lst97-dev
- **Default branch:** dev
- **Created:** 2025-05-03T12:31:59Z
- **Last updated:** 2025-12-12T17:23:12Z
- **Primary language:** TypeScript
- **Homepage:** https://www.lst97.dev
- **Stars / forks:** 0 / 0
- **Topics:** `nextjs`, `personal-website`, `pixel-art`, `react`, `vercel-deployment`

### GitHub language breakdown
- TypeScript (1,828,744 bytes)
- HTML (1,433,493 bytes)
- JavaScript (57,552 bytes)
- CSS (32,133 bytes)
- Dockerfile (2,444 bytes)

## Project purpose (source-derived)
Source implementation indicates these responsibilities: reads runtime environment variables; calls external http services; integrates a headless cms; renders a react user interface; defines http request handlers.
Evidence: `next.config.mjs`, `src/app/(frontend)/api/github/route.ts`, `src/app/(frontend)/api/og/route.tsx`, `src/app/(frontend)/api/query-functions/guest-book/guest-book.ts`, `src/app/(frontend)/api/query-functions/uber/uber-comments.ts`, `src/app/(frontend)/api/wakatime/utils.ts`, `next.config.js`, `src/app/(frontend)/components/about/AnimatedScrollSections.tsx`, `src/app/(frontend)/components/about/connect/Connect.tsx`, `src/app/(frontend)/components/about/cv/CV.tsx`, `src/app/(frontend)/components/about/cv/CVHeader.tsx`, `src/app/(frontend)/components/about/cv/CVLeftSection.tsx`, `src/app/(frontend)/api/client-info/route.ts`, `src/app/(frontend)/api/contact/route.ts`, `src/app/(frontend)/api/wakatime/code-activity/route.ts`, `src/app/(frontend)/api/wakatime/editors/route.ts`, `src/app/(frontend)/api/wakatime/languages/route.ts`, `src/app/(frontend)/api/wakatime/operating-systems/route.ts`, `src/app/(frontend)/api/ai-chat/schemas.ts` (**inferred**)

## Problem addressed
Unknown: source code does not explicitly state the problem addressed.
Evidence: none

## Features observed in source and tests
- Reads runtime environment variables — Evidence: `next.config.mjs` (**inferred**)
- Calls external HTTP services — Evidence: `src/app/(frontend)/api/github/route.ts`, `src/app/(frontend)/api/og/route.tsx`, `src/app/(frontend)/api/query-functions/guest-book/guest-book.ts`, `src/app/(frontend)/api/query-functions/uber/uber-comments.ts`, `src/app/(frontend)/api/wakatime/utils.ts` (**inferred**)
- Integrates a headless CMS — Evidence: `next.config.js`, `src/app/(frontend)/api/query-functions/guest-book/guest-book.ts`, `src/app/(frontend)/api/query-functions/uber/uber-comments.ts` (**inferred**)
- Renders a React user interface — Evidence: `src/app/(frontend)/components/about/AnimatedScrollSections.tsx`, `src/app/(frontend)/components/about/connect/Connect.tsx`, `src/app/(frontend)/components/about/cv/CV.tsx`, `src/app/(frontend)/components/about/cv/CVHeader.tsx`, `src/app/(frontend)/components/about/cv/CVLeftSection.tsx` (**inferred**)
- Defines HTTP request handlers — Evidence: `src/app/(frontend)/api/client-info/route.ts`, `src/app/(frontend)/api/contact/route.ts`, `src/app/(frontend)/api/github/route.ts`, `src/app/(frontend)/api/og/route.tsx`, `src/app/(frontend)/api/wakatime/code-activity/route.ts`, `src/app/(frontend)/api/wakatime/editors/route.ts`, `src/app/(frontend)/api/wakatime/languages/route.ts`, `src/app/(frontend)/api/wakatime/operating-systems/route.ts` (**inferred**)
- Chats with request — Evidence: `src/app/(frontend)/api/ai-chat/schemas.ts` (**inferred**)
- Defines the N8n Payload type or service — Evidence: `src/app/(frontend)/api/ai-chat/schemas.ts` (**inferred**)
- Defines the N8n Response type or service — Evidence: `src/app/(frontend)/api/ai-chat/schemas.ts` (**inferred**)
- Defines the N8n Array Response type or service — Evidence: `src/app/(frontend)/api/ai-chat/schemas.ts` (**inferred**)
- Defines the N8n Alternative Response type or service — Evidence: `src/app/(frontend)/api/ai-chat/schemas.ts` (**inferred**)
- Creates success response — Evidence: `src/app/(frontend)/api/index.ts` (**inferred**)
- Creates error response — Evidence: `src/app/(frontend)/api/index.ts` (**inferred**)
- Handles api error — Evidence: `src/app/(frontend)/api/index.ts` (**inferred**)
- Defines the Api Response type or service — Evidence: `src/app/(frontend)/api/index.ts` (**inferred**)
- Defines the Http Status type or service — Evidence: `src/app/(frontend)/api/index.ts` (**inferred**)
- Defines the Guest Book Comment type or service — Evidence: `src/app/(frontend)/api/query-functions/guest-book/types.ts` (**inferred**)
- Defines the Guest Book Comment Form Data type or service — Evidence: `src/app/(frontend)/api/query-functions/guest-book/types.ts` (**inferred**)
- Creates guest book comment response — Evidence: `src/app/(frontend)/api/query-functions/guest-book/types.ts` (**inferred**)
- Gets guest book comments response — Evidence: `src/app/(frontend)/api/query-functions/guest-book/types.ts` (**inferred**)
- Creates uber comment response — Evidence: `src/app/(frontend)/api/query-functions/uber/types.ts` (**inferred**)
- Defines the Uber Comment Form Data type or service — Evidence: `src/app/(frontend)/api/query-functions/uber/types.ts` (**inferred**)
- Defines the Uber Comments Response type or service — Evidence: `src/app/(frontend)/api/query-functions/uber/types.ts` (**inferred**)
- Fetches waka time data — Evidence: `src/app/(frontend)/api/wakatime/utils.ts` (**inferred**)
- Provides the Testimonial Props UI component — Evidence: `src/app/(frontend)/components/about/recognition/Testimonial.tsx` (**inferred**)

## Tracked files
- **592 tracked files** in total
- Source: 448; tests: 0; documentation: 23; configuration: 26; assets/other: 95

## Repository structure
- Inspected 100 source files from the cloned repository (bounded for safety).
- `.claude/` (1 tracked files)
- `.kiro/` (4 tracked files)
- `.vscode/` (4 tracked files)
- `docs/` (9 tracked files)
- `public/` (95 tracked files)
- `src/` (461 tracked files)
- `next.config.js`
- `next.config.mjs`
- `src/app/(frontend)/api/ai-chat/schemas.ts`
- `src/app/(frontend)/api/client-info/route.ts`
- `src/app/(frontend)/api/contact/route.ts`
- `src/app/(frontend)/api/github/route.ts`
- `src/app/(frontend)/api/index.ts`
- `src/app/(frontend)/api/og/route.tsx`
- `src/app/(frontend)/api/query-functions/guest-book/guest-book.ts`
- `src/app/(frontend)/api/query-functions/guest-book/types.ts`
- `src/app/(frontend)/api/query-functions/uber/types.ts`
- `src/app/(frontend)/api/query-functions/uber/uber-comments.ts`
- `src/app/(frontend)/api/wakatime/code-activity/route.ts`
- `src/app/(frontend)/api/wakatime/editors/route.ts`
- `src/app/(frontend)/api/wakatime/languages/route.ts`
- `src/app/(frontend)/api/wakatime/operating-systems/route.ts`
- `src/app/(frontend)/api/wakatime/utils.ts`
- `src/app/(frontend)/api/weather/route.ts`
- `src/app/(frontend)/components/about/AnimatedScrollSections.tsx`
- `src/app/(frontend)/components/about/connect/Connect.tsx`

## Implementation and test evidence
- Reads runtime environment variables — Evidence: `next.config.mjs` (**inferred**)
- Calls external HTTP services — Evidence: `src/app/(frontend)/api/github/route.ts`, `src/app/(frontend)/api/og/route.tsx`, `src/app/(frontend)/api/query-functions/guest-book/guest-book.ts`, `src/app/(frontend)/api/query-functions/uber/uber-comments.ts`, `src/app/(frontend)/api/wakatime/utils.ts` (**inferred**)
- Integrates a headless CMS — Evidence: `next.config.js`, `src/app/(frontend)/api/query-functions/guest-book/guest-book.ts`, `src/app/(frontend)/api/query-functions/uber/uber-comments.ts` (**inferred**)
- Renders a React user interface — Evidence: `src/app/(frontend)/components/about/AnimatedScrollSections.tsx`, `src/app/(frontend)/components/about/connect/Connect.tsx`, `src/app/(frontend)/components/about/cv/CV.tsx`, `src/app/(frontend)/components/about/cv/CVHeader.tsx`, `src/app/(frontend)/components/about/cv/CVLeftSection.tsx` (**inferred**)
- Defines HTTP request handlers — Evidence: `src/app/(frontend)/api/client-info/route.ts`, `src/app/(frontend)/api/contact/route.ts`, `src/app/(frontend)/api/github/route.ts`, `src/app/(frontend)/api/og/route.tsx`, `src/app/(frontend)/api/wakatime/code-activity/route.ts`, `src/app/(frontend)/api/wakatime/editors/route.ts`, `src/app/(frontend)/api/wakatime/languages/route.ts`, `src/app/(frontend)/api/wakatime/operating-systems/route.ts` (**inferred**)
- Chats with request — Evidence: `src/app/(frontend)/api/ai-chat/schemas.ts` (**inferred**)
- Defines the N8n Payload type or service — Evidence: `src/app/(frontend)/api/ai-chat/schemas.ts` (**inferred**)
- Defines the N8n Response type or service — Evidence: `src/app/(frontend)/api/ai-chat/schemas.ts` (**inferred**)
- Defines the N8n Array Response type or service — Evidence: `src/app/(frontend)/api/ai-chat/schemas.ts` (**inferred**)
- Defines the N8n Alternative Response type or service — Evidence: `src/app/(frontend)/api/ai-chat/schemas.ts` (**inferred**)
- Creates success response — Evidence: `src/app/(frontend)/api/index.ts` (**inferred**)
- Creates error response — Evidence: `src/app/(frontend)/api/index.ts` (**inferred**)
- Handles api error — Evidence: `src/app/(frontend)/api/index.ts` (**inferred**)
- Defines the Api Response type or service — Evidence: `src/app/(frontend)/api/index.ts` (**inferred**)
- Defines the Http Status type or service — Evidence: `src/app/(frontend)/api/index.ts` (**inferred**)
- Defines the Guest Book Comment type or service — Evidence: `src/app/(frontend)/api/query-functions/guest-book/types.ts` (**inferred**)
- Defines the Guest Book Comment Form Data type or service — Evidence: `src/app/(frontend)/api/query-functions/guest-book/types.ts` (**inferred**)
- Creates guest book comment response — Evidence: `src/app/(frontend)/api/query-functions/guest-book/types.ts` (**inferred**)
- Gets guest book comments response — Evidence: `src/app/(frontend)/api/query-functions/guest-book/types.ts` (**inferred**)
- Creates uber comment response — Evidence: `src/app/(frontend)/api/query-functions/uber/types.ts` (**inferred**)
- Defines the Uber Comment Form Data type or service — Evidence: `src/app/(frontend)/api/query-functions/uber/types.ts` (**inferred**)
- Defines the Uber Comments Response type or service — Evidence: `src/app/(frontend)/api/query-functions/uber/types.ts` (**inferred**)
- Fetches waka time data — Evidence: `src/app/(frontend)/api/wakatime/utils.ts` (**inferred**)
- Provides the Testimonial Props UI component — Evidence: `src/app/(frontend)/components/about/recognition/Testimonial.tsx` (**inferred**)

## Frameworks and technology stack
- TypeScript — Evidence: `package.json`
- React — Evidence: `package.json`
- Next.js — Evidence: `package.json`
- PostgreSQL — Evidence: `docker-compose.yml`, `package.json`
- Tailwind CSS — Evidence: `package.json`
- JavaScript — Evidence: `.dependency-cruiser.cjs`, `eslint.config.mjs`, `next.config.js`, `next.config.mjs`, `postcss.config.mjs`, `public/workers/gif.worker.js`, `src/app/(frontend)/components/tools/bg-remover/components/engine/postprocessing_worker.js`, `src/app/(frontend)/components/tools/bg-remover/components/engine/preprocessing_worker.js`

## Design and architecture patterns
- Unknown: no supported design-pattern evidence was found.

## Evidence and limitations
- Reports are based on a fresh shallow clone. Safe, bounded documentation, manifests, source, and test files are inspected locally; raw source code is never copied into this report.
- README text and the GitHub description are excluded from project-purpose and feature claims because they may be stale.
- No supported architecture-pattern evidence was found; no pattern is asserted.
