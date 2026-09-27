# TPWFC

## Retrieval summary

- Relationship: Owned repository.
- Repository: lst97/TPWFC.
- Purpose: Source implementation indicates these responsibilities: reads runtime environment variables; persists or queries application data; integrates a headless cms; renders a react user interface; defines http request handlers.
- Observed capabilities: Reads runtime environment variables; Persists or queries application data; Integrates a headless CMS
- Technology: TypeScript, React, Next.js, PostgreSQL, Tailwind CSS, JavaScript

## Repository metadata
- **Repository:** lst97/TPWFC
- **Visibility:** private
- **URL:** https://github.com/lst97/TPWFC
- **Default branch:** main
- **Last updated:** 2025-12-11T17:53:51Z
- **Primary language:** TypeScript
- **License:** MIT License
- **Stars / forks:** 0 / 0
- **Topics:** No GitHub topics are set.

### GitHub language breakdown
- TypeScript (614,990 bytes)
- Shell (34,894 bytes)
- CSS (13,615 bytes)
- Dockerfile (2,444 bytes)
- JavaScript (1,700 bytes)
- SCSS (1 bytes)

## Project purpose (source-derived)
Source implementation indicates these responsibilities: reads runtime environment variables; persists or queries application data; integrates a headless cms; renders a react user interface; defines http request handlers.
Evidence: `playwright.config.ts`, `src/app/(frontend)/components/features/event-graph/EventGraph.tsx`, `src/app/(frontend)/components/features/fire-incident/TimelineSpacer.tsx`, `src/app/(frontend)/components/features/i18n/LanguageSwitcher.tsx`, `src/app/(frontend)/components/features/source-editor/SourceEditor.tsx`, `next.config.mjs`, `src/app/(frontend)/[locale]/timelines/fire-detail/page.tsx`, `src/app/(frontend)/[locale]/timelines/fire/page.tsx`, `src/app/(frontend)/[locale]/timelines/page.tsx`, `src/app/(frontend)/api/fire-events/route.ts`, `src/app/(frontend)/[locale]/layout.tsx`, `src/app/(frontend)/components/features/detail-timeline/CategoryBarChart.tsx`, `src/app/(frontend)/components/features/detail-timeline/CategoryMetricsDisplay.tsx`, `src/app/(frontend)/components/features/detail-timeline/DetailedStatistics.tsx`, `src/app/(frontend)/components/features/detail-timeline/PhasePieChart.tsx`, `src/app/(frontend)/api/fire-incidents/route.ts`, `src/app/(frontend)/[locale]/community-exchange/emotional-support/page.tsx`, `src/app/(frontend)/[locale]/page.tsx` (**inferred**)

## Problem addressed
Unknown: source code does not explicitly state the problem addressed.
Evidence: none

## Features observed in source and tests
- Reads runtime environment variables — Evidence: `playwright.config.ts` (**inferred**)
- Persists or queries application data — Evidence: `src/app/(frontend)/components/features/event-graph/EventGraph.tsx`, `src/app/(frontend)/components/features/fire-incident/TimelineSpacer.tsx`, `src/app/(frontend)/components/features/i18n/LanguageSwitcher.tsx`, `src/app/(frontend)/components/features/source-editor/SourceEditor.tsx` (**inferred**)
- Integrates a headless CMS — Evidence: `next.config.mjs`, `src/app/(frontend)/[locale]/timelines/fire-detail/page.tsx`, `src/app/(frontend)/[locale]/timelines/fire/page.tsx`, `src/app/(frontend)/[locale]/timelines/page.tsx`, `src/app/(frontend)/api/fire-events/route.ts` (**inferred**)
- Renders a React user interface — Evidence: `src/app/(frontend)/[locale]/layout.tsx`, `src/app/(frontend)/components/features/detail-timeline/CategoryBarChart.tsx`, `src/app/(frontend)/components/features/detail-timeline/CategoryMetricsDisplay.tsx`, `src/app/(frontend)/components/features/detail-timeline/DetailedStatistics.tsx`, `src/app/(frontend)/components/features/detail-timeline/PhasePieChart.tsx` (**inferred**)
- Defines HTTP request handlers — Evidence: `src/app/(frontend)/api/fire-events/route.ts`, `src/app/(frontend)/api/fire-incidents/route.ts` (**inferred**)
- Provides the Page UI component — Evidence: `src/app/(frontend)/[locale]/community-exchange/emotional-support/page.tsx` (**inferred**)
- Provides the Locale Layout UI component — Evidence: `src/app/(frontend)/[locale]/layout.tsx` (**inferred**)
- Provides the Home Page UI component — Evidence: `src/app/(frontend)/[locale]/page.tsx` (**inferred**)
- Provides the Resources Page UI component — Evidence: `src/app/(frontend)/[locale]/resources/page.tsx` (**inferred**)
- Provides the Source Editor Page UI component — Evidence: `src/app/(frontend)/[locale]/source-editor/page.tsx` (**inferred**)
- Provides the Template UI component — Evidence: `src/app/(frontend)/[locale]/template.tsx` (**inferred**)
- Provides the Fire Detail Timeline Page UI component — Evidence: `src/app/(frontend)/[locale]/timelines/fire-detail/page.tsx` (**inferred**)
- Provides the Timeline Page UI component — Evidence: `src/app/(frontend)/[locale]/timelines/fire/page.tsx` (**inferred**)
- Provides the Owners Timeline Page UI component — Evidence: `src/app/(frontend)/[locale]/timelines/owners/page.tsx` (**inferred**)
- Provides the Timelines Index Page UI component — Evidence: `src/app/(frontend)/[locale]/timelines/page.tsx` (**inferred**)
- Provides the Back To Top UI component — Evidence: `src/app/(frontend)/components/features/buttons/back-to-top.tsx` (**inferred**)
- Provides the Metric Item UI component — Evidence: `src/app/(frontend)/components/features/detail-timeline/CategoryMetricsDisplay.tsx` (**inferred**)
- Gets icon — Evidence: `src/app/(frontend)/components/features/event-graph/icon-map.ts` (**inferred**)
- Calculates graph layout — Evidence: `src/app/(frontend)/components/features/event-graph/layout-utils.ts` (**inferred**)
- Defines the Timeline Event type or service — Evidence: `src/app/(frontend)/components/features/event-graph/types.ts` (**inferred**)
- Defines the Category Config type or service — Evidence: `src/app/(frontend)/components/features/event-graph/types.ts` (**inferred**)
- Defines the Event Graph Props type or service — Evidence: `src/app/(frontend)/components/features/event-graph/types.ts` (**inferred**)
- Defines the Processed Event type or service — Evidence: `src/app/(frontend)/components/features/event-graph/types.ts` (**inferred**)
- Defines the Graph Path type or service — Evidence: `src/app/(frontend)/components/features/event-graph/types.ts` (**inferred**)

## Tracked files
- **193 tracked files** in total
- Source: 150; tests: 1; documentation: 9; configuration: 17; assets/other: 16

## Repository structure
- Inspected 100 source files from the cloned repository (bounded for safety).
- `.serena/` (2 tracked files)
- `public/` (1 tracked files)
- `scripts/` (6 tracked files)
- `src/` (159 tracked files)
- `next.config.mjs`
- `playwright.config.ts`
- `src/app/(frontend)/[locale]/community-exchange/emotional-support/page.tsx`
- `src/app/(frontend)/[locale]/community-exchange/experience-sharing/page.tsx`
- `src/app/(frontend)/[locale]/community-exchange/legal-consultation/page.tsx`
- `src/app/(frontend)/[locale]/donation/material-donation/page.tsx`
- `src/app/(frontend)/[locale]/donation/material-needs/page.tsx`
- `src/app/(frontend)/[locale]/donation/monetary-donation/page.tsx`
- `src/app/(frontend)/[locale]/donation/volunteer-recruitment/page.tsx`
- `src/app/(frontend)/[locale]/emergency-support/emergency-help/page.tsx`
- `src/app/(frontend)/[locale]/emergency-support/missing-person-registration/page.tsx`
- `src/app/(frontend)/[locale]/emergency-support/person-found/page.tsx`
- `src/app/(frontend)/[locale]/government-info/page.tsx`
- `src/app/(frontend)/[locale]/housing-support/rental-info/page.tsx`
- `src/app/(frontend)/[locale]/housing-support/short-term-accommodation/page.tsx`
- `src/app/(frontend)/[locale]/housing-support/temporary-shelter/page.tsx`
- `src/app/(frontend)/[locale]/layout.tsx`
- `src/app/(frontend)/[locale]/long-term-support/compensation-tracking/page.tsx`
- `src/app/(frontend)/[locale]/long-term-support/memorial-zone/page.tsx`
- `src/app/(frontend)/[locale]/long-term-support/reconstruction-progress/page.tsx`

## Implementation and test evidence
- Reads runtime environment variables — Evidence: `playwright.config.ts` (**inferred**)
- Persists or queries application data — Evidence: `src/app/(frontend)/components/features/event-graph/EventGraph.tsx`, `src/app/(frontend)/components/features/fire-incident/TimelineSpacer.tsx`, `src/app/(frontend)/components/features/i18n/LanguageSwitcher.tsx`, `src/app/(frontend)/components/features/source-editor/SourceEditor.tsx` (**inferred**)
- Integrates a headless CMS — Evidence: `next.config.mjs`, `src/app/(frontend)/[locale]/timelines/fire-detail/page.tsx`, `src/app/(frontend)/[locale]/timelines/fire/page.tsx`, `src/app/(frontend)/[locale]/timelines/page.tsx`, `src/app/(frontend)/api/fire-events/route.ts` (**inferred**)
- Renders a React user interface — Evidence: `src/app/(frontend)/[locale]/layout.tsx`, `src/app/(frontend)/components/features/detail-timeline/CategoryBarChart.tsx`, `src/app/(frontend)/components/features/detail-timeline/CategoryMetricsDisplay.tsx`, `src/app/(frontend)/components/features/detail-timeline/DetailedStatistics.tsx`, `src/app/(frontend)/components/features/detail-timeline/PhasePieChart.tsx` (**inferred**)
- Defines HTTP request handlers — Evidence: `src/app/(frontend)/api/fire-events/route.ts`, `src/app/(frontend)/api/fire-incidents/route.ts` (**inferred**)
- Provides the Page UI component — Evidence: `src/app/(frontend)/[locale]/community-exchange/emotional-support/page.tsx` (**inferred**)
- Provides the Locale Layout UI component — Evidence: `src/app/(frontend)/[locale]/layout.tsx` (**inferred**)
- Provides the Home Page UI component — Evidence: `src/app/(frontend)/[locale]/page.tsx` (**inferred**)
- Provides the Resources Page UI component — Evidence: `src/app/(frontend)/[locale]/resources/page.tsx` (**inferred**)
- Provides the Source Editor Page UI component — Evidence: `src/app/(frontend)/[locale]/source-editor/page.tsx` (**inferred**)
- Provides the Template UI component — Evidence: `src/app/(frontend)/[locale]/template.tsx` (**inferred**)
- Provides the Fire Detail Timeline Page UI component — Evidence: `src/app/(frontend)/[locale]/timelines/fire-detail/page.tsx` (**inferred**)
- Provides the Timeline Page UI component — Evidence: `src/app/(frontend)/[locale]/timelines/fire/page.tsx` (**inferred**)
- Provides the Owners Timeline Page UI component — Evidence: `src/app/(frontend)/[locale]/timelines/owners/page.tsx` (**inferred**)
- Provides the Timelines Index Page UI component — Evidence: `src/app/(frontend)/[locale]/timelines/page.tsx` (**inferred**)
- Provides the Back To Top UI component — Evidence: `src/app/(frontend)/components/features/buttons/back-to-top.tsx` (**inferred**)
- Provides the Metric Item UI component — Evidence: `src/app/(frontend)/components/features/detail-timeline/CategoryMetricsDisplay.tsx` (**inferred**)
- Gets icon — Evidence: `src/app/(frontend)/components/features/event-graph/icon-map.ts` (**inferred**)
- Calculates graph layout — Evidence: `src/app/(frontend)/components/features/event-graph/layout-utils.ts` (**inferred**)
- Defines the Timeline Event type or service — Evidence: `src/app/(frontend)/components/features/event-graph/types.ts` (**inferred**)
- Defines the Category Config type or service — Evidence: `src/app/(frontend)/components/features/event-graph/types.ts` (**inferred**)
- Defines the Event Graph Props type or service — Evidence: `src/app/(frontend)/components/features/event-graph/types.ts` (**inferred**)
- Defines the Processed Event type or service — Evidence: `src/app/(frontend)/components/features/event-graph/types.ts` (**inferred**)
- Defines the Graph Path type or service — Evidence: `src/app/(frontend)/components/features/event-graph/types.ts` (**inferred**)

## Frameworks and technology stack
- TypeScript — Evidence: `package.json`
- React — Evidence: `package.json`
- Next.js — Evidence: `package.json`
- PostgreSQL — Evidence: `docker-compose.yml`
- Tailwind CSS — Evidence: `package.json`
- JavaScript — Evidence: `eslint.config.mjs`, `next.config.mjs`, `postcss.config.mjs`, `src/app/(payload)/admin/importMap.js`

## Design and architecture patterns
- Unknown: no supported design-pattern evidence was found.

## Evidence and limitations
- Reports are based on a fresh shallow clone. Safe, bounded documentation, manifests, source, and test files are inspected locally; raw source code is never copied into this report.
- README text and the GitHub description are excluded from project-purpose and feature claims because they may be stale.
- No supported architecture-pattern evidence was found; no pattern is asserted.
