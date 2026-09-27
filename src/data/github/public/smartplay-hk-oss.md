# smartplay-hk-oss

## Retrieval summary

- Relationship: Owned repository.
- Repository: lst97/smartplay-hk-oss.
- Project demo: https://sphkoss.lst97.dev/
- Purpose: Source implementation indicates these responsibilities: reads runtime environment variables; calls external http services; persists or queries application data; renders a react user interface; validates and types runtime environment configuration.
- Observed capabilities: Reads runtime environment variables; Calls external HTTP services; Persists or queries application data
- Technology: TypeScript, React, TanStack Router, TanStack Start, Vite, PostgreSQL, Tailwind CSS
- Software kinds: web_app
- GitHub topics: hongkong, react, smartplay, tanstack, lcsd
- Curated topics: hong-kong, sports-facilities, open-data

## Repository metadata
- **Repository:** lst97/smartplay-hk-oss
- **Visibility:** public
- **URL:** https://github.com/lst97/smartplay-hk-oss
- **Default branch:** main
- **Created:** 2026-01-17T15:08:19Z
- **Last updated:** 2026-08-20T07:07:45Z
- **Primary language:** TypeScript
- **License:** Other
- **Homepage:** https://sphkoss.lst97.dev
- **Stars / forks:** 2 / 0
- **Topics:** `hongkong`, `react`, `smartplay`, `tanstack`, `lcsd`
- **Software kinds:** `web_app`
- **Curated topics:** `hong-kong`, `sports-facilities`, `open-data`

### GitHub language breakdown
- TypeScript (882,271 bytes)
- Shell (6,476 bytes)
- CSS (5,524 bytes)
- Dockerfile (1,749 bytes)

## Project purpose (source-derived)
Source implementation indicates these responsibilities: reads runtime environment variables; calls external http services; persists or queries application data; renders a react user interface; validates and types runtime environment configuration.
Evidence: `vite.config.ts`, `src/lib/crawler/session-cleanup.ts`, `src/lib/env.ts`, `src/lib/crawler/http-client.ts`, `src/lib/crawler/metadata-crawler.ts`, `src/components/booking/FilterBar.tsx`, `src/components/LanguageSwitcher.tsx`, `src/components/ui/index.ts`, `src/components/ui/Select.tsx`, `src/lib/crawler/checkpoint.ts`, `src/components/BackgroundSlideshow.tsx`, `src/components/booking/BookingModal.tsx`, `src/components/booking/BookingPending.tsx`, `src/components/booking/DateSelector.tsx`, `src/components/booking/BookingHeader.tsx` (**inferred**)

## Problem addressed
Unknown: source code does not explicitly state the problem addressed.
Evidence: none

## Features observed in source and tests
- Reads runtime environment variables — Evidence: `vite.config.ts`, `src/lib/crawler/session-cleanup.ts`, `src/lib/env.ts` (**inferred**)
- Calls external HTTP services — Evidence: `src/lib/crawler/http-client.ts`, `src/lib/crawler/metadata-crawler.ts` (**inferred**)
- Persists or queries application data — Evidence: `src/components/booking/FilterBar.tsx`, `src/components/LanguageSwitcher.tsx`, `src/components/ui/index.ts`, `src/components/ui/Select.tsx`, `src/lib/crawler/checkpoint.ts` (**inferred**)
- Renders a React user interface — Evidence: `src/components/BackgroundSlideshow.tsx`, `src/components/booking/BookingModal.tsx`, `src/components/booking/BookingPending.tsx`, `src/components/booking/DateSelector.tsx`, `src/components/booking/FilterBar.tsx` (**inferred**)
- Validates and types runtime environment configuration — Evidence: `src/lib/env.ts` (**inferred**)
- Provides the Background Slideshow UI component — Evidence: `src/components/BackgroundSlideshow.tsx` (**inferred**)
- Provides the Booking Header UI component — Evidence: `src/components/booking/BookingHeader.tsx` (**inferred**)
- Provides the Booking Modal UI component — Evidence: `src/components/booking/BookingModal.tsx` (**inferred**)
- Provides the Booking Pagination UI component — Evidence: `src/components/booking/BookingPagination.tsx` (**inferred**)
- Provides the Booking Pending UI component — Evidence: `src/components/booking/BookingPending.tsx` (**inferred**)
- Provides the Booking Results Info UI component — Evidence: `src/components/booking/BookingResultsInfo.tsx` (**inferred**)
- Provides the Booking Tab Switcher UI component — Evidence: `src/components/booking/BookingTabSwitcher.tsx` (**inferred**)
- Filters bar — Evidence: `src/components/booking/FilterBar.tsx` (**inferred**)
- Provides the Venue List UI component — Evidence: `src/components/booking/VenueList.tsx` (**inferred**)
- Provides the Venue List Skeleton UI component — Evidence: `src/components/booking/VenueListSkeleton.tsx` (**inferred**)
- Provides the Watcher Hits Modal UI component — Evidence: `src/components/booking/WatcherHitsModal.tsx` (**inferred**)
- Provides the Cookie Consent Provider Props UI component — Evidence: `src/components/cookie-notice/CookieConsentProvider.tsx` (**inferred**)
- Defines the Cookie Category type or service — Evidence: `src/components/cookie-notice/types.ts` (**inferred**)
- Defines the Accepted Categories type or service — Evidence: `src/components/cookie-notice/types.ts` (**inferred**)
- Defines the Cookie Consent Storage type or service — Evidence: `src/components/cookie-notice/types.ts` (**inferred**)
- Defines the Cookie Notice Props type or service — Evidence: `src/components/cookie-notice/types.ts` (**inferred**)
- Defines the Cookie Consent Context Value type or service — Evidence: `src/components/cookie-notice/types.ts` (**inferred**)
- Provides the Footer UI component — Evidence: `src/components/Footer.tsx` (**inferred**)
- Provides the Header UI component — Evidence: `src/components/Header.tsx` (**inferred**)

## Tracked files
- **273 tracked files** in total
- Source: 168; tests: 15; documentation: 22; configuration: 46; assets/other: 22

## Repository structure
- Inspected 98 source files from the cloned repository (bounded for safety).
- `.agent/` (22 tracked files)
- `.github/` (3 tracked files)
- `prisma/` (3 tracked files)
- `public/` (14 tracked files)
- `scripts/` (13 tracked files)
- `src/` (197 tracked files)
- `vite.config.ts`
- `src/client.tsx`
- `src/components/BackgroundSlideshow.tsx`
- `src/components/booking/BookingHeader.tsx`
- `src/components/booking/BookingModal.tsx`
- `src/components/booking/BookingPagination.tsx`
- `src/components/booking/BookingPending.tsx`
- `src/components/booking/BookingResultsInfo.tsx`
- `src/components/booking/BookingTabSwitcher.tsx`
- `src/components/booking/DateSelector.tsx`
- `src/components/booking/FilterBar.tsx`
- `src/components/booking/index.ts`
- `src/components/booking/VenueCard.tsx`
- `src/components/booking/VenueList.tsx`
- `src/components/booking/VenueListSkeleton.tsx`
- `src/components/booking/VenueThumbnail.tsx`
- `src/components/booking/WatcherHitsModal.tsx`
- `src/components/cookie-notice/CookieConsentProvider.tsx`
- `src/components/cookie-notice/CookieNotice.tsx`
- `src/components/cookie-notice/hooks.ts`

## Implementation and test evidence
- Reads runtime environment variables — Evidence: `vite.config.ts`, `src/lib/crawler/session-cleanup.ts`, `src/lib/env.ts` (**inferred**)
- Calls external HTTP services — Evidence: `src/lib/crawler/http-client.ts`, `src/lib/crawler/metadata-crawler.ts` (**inferred**)
- Persists or queries application data — Evidence: `src/components/booking/FilterBar.tsx`, `src/components/LanguageSwitcher.tsx`, `src/components/ui/index.ts`, `src/components/ui/Select.tsx`, `src/lib/crawler/checkpoint.ts` (**inferred**)
- Renders a React user interface — Evidence: `src/components/BackgroundSlideshow.tsx`, `src/components/booking/BookingModal.tsx`, `src/components/booking/BookingPending.tsx`, `src/components/booking/DateSelector.tsx`, `src/components/booking/FilterBar.tsx` (**inferred**)
- Validates and types runtime environment configuration — Evidence: `src/lib/env.ts` (**inferred**)
- Provides the Background Slideshow UI component — Evidence: `src/components/BackgroundSlideshow.tsx` (**inferred**)
- Provides the Booking Header UI component — Evidence: `src/components/booking/BookingHeader.tsx` (**inferred**)
- Provides the Booking Modal UI component — Evidence: `src/components/booking/BookingModal.tsx` (**inferred**)
- Provides the Booking Pagination UI component — Evidence: `src/components/booking/BookingPagination.tsx` (**inferred**)
- Provides the Booking Pending UI component — Evidence: `src/components/booking/BookingPending.tsx` (**inferred**)
- Provides the Booking Results Info UI component — Evidence: `src/components/booking/BookingResultsInfo.tsx` (**inferred**)
- Provides the Booking Tab Switcher UI component — Evidence: `src/components/booking/BookingTabSwitcher.tsx` (**inferred**)
- Filters bar — Evidence: `src/components/booking/FilterBar.tsx` (**inferred**)
- Provides the Venue List UI component — Evidence: `src/components/booking/VenueList.tsx` (**inferred**)
- Provides the Venue List Skeleton UI component — Evidence: `src/components/booking/VenueListSkeleton.tsx` (**inferred**)
- Provides the Watcher Hits Modal UI component — Evidence: `src/components/booking/WatcherHitsModal.tsx` (**inferred**)
- Provides the Cookie Consent Provider Props UI component — Evidence: `src/components/cookie-notice/CookieConsentProvider.tsx` (**inferred**)
- Defines the Cookie Category type or service — Evidence: `src/components/cookie-notice/types.ts` (**inferred**)
- Defines the Accepted Categories type or service — Evidence: `src/components/cookie-notice/types.ts` (**inferred**)
- Defines the Cookie Consent Storage type or service — Evidence: `src/components/cookie-notice/types.ts` (**inferred**)
- Defines the Cookie Notice Props type or service — Evidence: `src/components/cookie-notice/types.ts` (**inferred**)
- Defines the Cookie Consent Context Value type or service — Evidence: `src/components/cookie-notice/types.ts` (**inferred**)
- Provides the Footer UI component — Evidence: `src/components/Footer.tsx` (**inferred**)
- Provides the Header UI component — Evidence: `src/components/Header.tsx` (**inferred**)

## Frameworks and technology stack
- TypeScript — Evidence: `package.json`
- React — Evidence: `package.json`
- TanStack Router — Evidence: `package.json`
- TanStack Start — Evidence: `package.json`
- Vite — Evidence: `package.json`
- PostgreSQL — Evidence: `Dockerfile`, `docker-compose.yml`, `src/lib/env.ts`, `src/lib/health/connection-pool.ts`
- Tailwind CSS — Evidence: `package.json`

## Design and architecture patterns
- test-driven development evidence (**inferred**) — Evidence: `src/components/cookie-notice/__tests__/CookieNotice.test.tsx`, `src/components/cookie-notice/__tests__/hooks.test.tsx`, `src/components/cookie-notice/__tests__/minimal.test.tsx`

## Evidence and limitations
- Reports are based on a fresh shallow clone. Safe, bounded documentation, manifests, source, and test files are inspected locally; raw source code is never copied into this report.
- README text and the GitHub description are excluded from project-purpose and feature claims because they may be stale.
- No additional inspection limitations were recorded.
