# wwnz

## Retrieval summary

- Relationship: Owned repository.
- Repository: lst97/wwnz.
- Purpose: Source implementation indicates these responsibilities: reads runtime environment variables; validates structured input or configuration; persists or queries application data; renders a react user interface; parses amount.
- Observed capabilities: Reads runtime environment variables; Validates structured input or configuration; Persists or queries application data
- Technology: TypeScript, React, TanStack Router, TanStack Start, Vite, Tailwind CSS
- Software kinds: web_app
- Curated topics: finance, expense-management

## Repository metadata
- **Repository:** lst97/wwnz
- **Visibility:** private
- **URL:** https://github.com/lst97/wwnz
- **Default branch:** main
- **Created:** 2026-02-28T11:51:35Z
- **Last updated:** 2026-03-04T05:52:43Z
- **Primary language:** TypeScript
- **Stars / forks:** 0 / 0
- **Topics:** No GitHub topics are set.
- **Software kinds:** `web_app`
- **Curated topics:** `finance`, `expense-management`

### GitHub language breakdown
- TypeScript (1,088,139 bytes)
- CSS (6,423 bytes)
- Dockerfile (2,194 bytes)

## Project purpose (source-derived)
Source implementation indicates these responsibilities: reads runtime environment variables; validates structured input or configuration; persists or queries application data; renders a react user interface; parses amount.
Evidence: `vite.config.ts`, `src/components/features/transactions/transaction-create-form.test.ts`, `src/components/features/dashboard/record-summary-viewer/RecordSummaryFilters.tsx`, `src/components/features/settlements/create-settlement-dialog.tsx`, `src/components/features/settlements/edit-settlement-dialog.tsx`, `src/components/features/settlements/settlement-header.tsx`, `src/components/features/transactions/TransactionCreateDialog.tsx`, `src/components/features/dashboard/charts/charts-section.tsx`, `src/components/features/dashboard/members-section.tsx`, `src/components/features/dashboard/record-summary-viewer/RecordSummaryViewer.tsx`, `src/components/features/settlements/coverage-records-list.test.ts`, `src/components/features/dashboard/charts/category-breakdown-chart.tsx`, `src/components/features/dashboard/charts/chart-data.ts` (**inferred**)

## Problem addressed
Unknown: source code does not explicitly state the problem addressed.
Evidence: none

## Features observed in source and tests
- Reads runtime environment variables — Evidence: `vite.config.ts` (**inferred**)
- Validates structured input or configuration — Evidence: `src/components/features/transactions/transaction-create-form.test.ts` (**inferred**)
- Persists or queries application data — Evidence: `src/components/features/dashboard/record-summary-viewer/RecordSummaryFilters.tsx`, `src/components/features/settlements/create-settlement-dialog.tsx`, `src/components/features/settlements/edit-settlement-dialog.tsx`, `src/components/features/settlements/settlement-header.tsx`, `src/components/features/transactions/TransactionCreateDialog.tsx` (**inferred**)
- Renders a React user interface — Evidence: `src/components/features/dashboard/charts/charts-section.tsx`, `src/components/features/dashboard/members-section.tsx`, `src/components/features/dashboard/record-summary-viewer/RecordSummaryFilters.tsx`, `src/components/features/dashboard/record-summary-viewer/RecordSummaryViewer.tsx`, `src/components/features/settlements/coverage-records-list.test.ts` (**inferred**)
- Provides the Category Breakdown Chart UI component — Evidence: `src/components/features/dashboard/charts/category-breakdown-chart.tsx` (**inferred**)
- Parses amount — Evidence: `src/components/features/dashboard/charts/chart-data.ts` (**inferred**)
- Parses date — Evidence: `src/components/features/dashboard/charts/chart-data.ts` (**inferred**)
- Formats date — Evidence: `src/components/features/dashboard/charts/chart-data.ts` (**inferred**)
- Gets category color — Evidence: `src/components/features/dashboard/charts/chart-data.ts` (**inferred**)
- Gets member color — Evidence: `src/components/features/dashboard/charts/chart-data.ts` (**inferred**)
- Processes category data — Evidence: `src/components/features/dashboard/charts/chart-data.ts` (**inferred**)
- Processes member share data — Evidence: `src/components/features/dashboard/charts/chart-data.ts` (**inferred**)
- Processes daily spending data — Evidence: `src/components/features/dashboard/charts/chart-data.ts` (**inferred**)
- Processes payer balance data — Evidence: `src/components/features/dashboard/charts/chart-data.ts` (**inferred**)
- Defines the Expense Record type or service — Evidence: `src/components/features/dashboard/charts/chart-data.ts` (**inferred**)
- Defines the Category Data type or service — Evidence: `src/components/features/dashboard/charts/chart-data.ts` (**inferred**)
- Defines the Member Share Data type or service — Evidence: `src/components/features/dashboard/charts/chart-data.ts` (**inferred**)
- Defines the Daily Spending Data type or service — Evidence: `src/components/features/dashboard/charts/chart-data.ts` (**inferred**)
- Defines the Payer Balance Data type or service — Evidence: `src/components/features/dashboard/charts/chart-data.ts` (**inferred**)
- Defines the Member Balance Record type or service — Evidence: `src/components/features/dashboard/charts/chart-data.ts` (**inferred**)
- Provides the Charts Section UI component — Evidence: `src/components/features/dashboard/charts/charts-section.tsx` (**inferred**)
- Provides the Daily Spending Chart UI component — Evidence: `src/components/features/dashboard/charts/daily-spending-chart.tsx` (**inferred**)
- Provides the Member Share Chart UI component — Evidence: `src/components/features/dashboard/charts/member-share-chart.tsx` (**inferred**)
- Provides the Payer Balance Chart UI component — Evidence: `src/components/features/dashboard/charts/payer-balance-chart.tsx` (**inferred**)

## Tracked files
- **265 tracked files** in total
- Source: 181; tests: 43; documentation: 8; configuration: 18; assets/other: 15

## Repository structure
- Inspected 100 source files from the cloned repository (bounded for safety).
- `.claude/` (1 tracked files)
- `.github/` (2 tracked files)
- `drizzle/` (8 tracked files)
- `public/` (8 tracked files)
- `src/` (229 tracked files)
- `vite.config.ts`
- `vitest.config.ts`
- `src/components/features/dashboard/charts/category-breakdown-chart.tsx`
- `src/components/features/dashboard/charts/chart-data.test.ts`
- `src/components/features/dashboard/charts/chart-data.ts`
- `src/components/features/dashboard/charts/charts-section.tsx`
- `src/components/features/dashboard/charts/daily-spending-chart.tsx`
- `src/components/features/dashboard/charts/index.ts`
- `src/components/features/dashboard/charts/member-share-chart.tsx`
- `src/components/features/dashboard/charts/payer-balance-chart.tsx`
- `src/components/features/dashboard/hero-header.tsx`
- `src/components/features/dashboard/index.ts`
- `src/components/features/dashboard/member-colors.ts`
- `src/components/features/dashboard/members-section.tsx`
- `src/components/features/dashboard/record-summary-viewer/index.ts`
- `src/components/features/dashboard/record-summary-viewer/RecordSummaryFilters.tsx`
- `src/components/features/dashboard/record-summary-viewer/RecordSummaryPagination.tsx`
- `src/components/features/dashboard/record-summary-viewer/RecordSummaryTable.tsx`
- `src/components/features/dashboard/record-summary-viewer/RecordSummaryViewer.tsx`
- `src/components/features/dashboard/record-summary-viewer/types.ts`

## Implementation and test evidence
- Reads runtime environment variables — Evidence: `vite.config.ts` (**inferred**)
- Validates structured input or configuration — Evidence: `src/components/features/transactions/transaction-create-form.test.ts` (**inferred**)
- Persists or queries application data — Evidence: `src/components/features/dashboard/record-summary-viewer/RecordSummaryFilters.tsx`, `src/components/features/settlements/create-settlement-dialog.tsx`, `src/components/features/settlements/edit-settlement-dialog.tsx`, `src/components/features/settlements/settlement-header.tsx`, `src/components/features/transactions/TransactionCreateDialog.tsx` (**inferred**)
- Renders a React user interface — Evidence: `src/components/features/dashboard/charts/charts-section.tsx`, `src/components/features/dashboard/members-section.tsx`, `src/components/features/dashboard/record-summary-viewer/RecordSummaryFilters.tsx`, `src/components/features/dashboard/record-summary-viewer/RecordSummaryViewer.tsx`, `src/components/features/settlements/coverage-records-list.test.ts` (**inferred**)
- Provides the Category Breakdown Chart UI component — Evidence: `src/components/features/dashboard/charts/category-breakdown-chart.tsx` (**inferred**)
- Parses amount — Evidence: `src/components/features/dashboard/charts/chart-data.ts` (**inferred**)
- Parses date — Evidence: `src/components/features/dashboard/charts/chart-data.ts` (**inferred**)
- Formats date — Evidence: `src/components/features/dashboard/charts/chart-data.ts` (**inferred**)
- Gets category color — Evidence: `src/components/features/dashboard/charts/chart-data.ts` (**inferred**)
- Gets member color — Evidence: `src/components/features/dashboard/charts/chart-data.ts` (**inferred**)
- Processes category data — Evidence: `src/components/features/dashboard/charts/chart-data.ts` (**inferred**)
- Processes member share data — Evidence: `src/components/features/dashboard/charts/chart-data.ts` (**inferred**)
- Processes daily spending data — Evidence: `src/components/features/dashboard/charts/chart-data.ts` (**inferred**)
- Processes payer balance data — Evidence: `src/components/features/dashboard/charts/chart-data.ts` (**inferred**)
- Defines the Expense Record type or service — Evidence: `src/components/features/dashboard/charts/chart-data.ts` (**inferred**)
- Defines the Category Data type or service — Evidence: `src/components/features/dashboard/charts/chart-data.ts` (**inferred**)
- Defines the Member Share Data type or service — Evidence: `src/components/features/dashboard/charts/chart-data.ts` (**inferred**)
- Defines the Daily Spending Data type or service — Evidence: `src/components/features/dashboard/charts/chart-data.ts` (**inferred**)
- Defines the Payer Balance Data type or service — Evidence: `src/components/features/dashboard/charts/chart-data.ts` (**inferred**)
- Defines the Member Balance Record type or service — Evidence: `src/components/features/dashboard/charts/chart-data.ts` (**inferred**)
- Provides the Charts Section UI component — Evidence: `src/components/features/dashboard/charts/charts-section.tsx` (**inferred**)
- Provides the Daily Spending Chart UI component — Evidence: `src/components/features/dashboard/charts/daily-spending-chart.tsx` (**inferred**)
- Provides the Member Share Chart UI component — Evidence: `src/components/features/dashboard/charts/member-share-chart.tsx` (**inferred**)
- Provides the Payer Balance Chart UI component — Evidence: `src/components/features/dashboard/charts/payer-balance-chart.tsx` (**inferred**)

## Frameworks and technology stack
- TypeScript — Evidence: `package.json`
- React — Evidence: `package.json`
- TanStack Router — Evidence: `package.json`
- TanStack Start — Evidence: `package.json`
- Vite — Evidence: `package.json`
- Tailwind CSS — Evidence: `package.json`

## Design and architecture patterns
- Unknown: no supported design-pattern evidence was found.

## Evidence and limitations
- Reports are based on a fresh shallow clone. Safe, bounded documentation, manifests, source, and test files are inspected locally; raw source code is never copied into this report.
- README text and the GitHub description are excluded from project-purpose and feature claims because they may be stale.
- No supported architecture-pattern evidence was found; no pattern is asserted.
