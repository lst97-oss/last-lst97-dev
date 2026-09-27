# split-tab-client

## Retrieval summary

- Relationship: Owned repository.
- Repository: lst97/split-tab-client.
- Purpose: Source implementation indicates these responsibilities: persists or queries application data; renders a react user interface; creates expense category dto; updates expense category dto; updates expense form.
- Observed capabilities: Persists or queries application data; Renders a React user interface; Provides the Expense Management Page UI component
- Technology: TypeScript, Next.js, Tailwind CSS, JavaScript

## Repository metadata
- **Repository:** lst97/split-tab-client
- **Visibility:** private
- **URL:** https://github.com/lst97/split-tab-client
- **Default branch:** main
- **Last updated:** 2025-01-10T06:09:58Z
- **Primary language:** TypeScript
- **Stars / forks:** 0 / 0
- **Topics:** No GitHub topics are set.

### GitHub language breakdown
- TypeScript (731,645 bytes)
- CSS (1,835 bytes)
- JavaScript (131 bytes)

## Project purpose (source-derived)
Source implementation indicates these responsibilities: persists or queries application data; renders a react user interface; creates expense category dto; updates expense category dto; updates expense form.
Evidence: `src/components/bill-calculator.tsx`, `src/components/common/month-selector.tsx`, `src/components/expense-management.tsx`, `src/components/expense/forms/expense-form-category.tsx`, `src/components/expense/forms/expense-form-paid-by.tsx`, `src/app/dashboard/expense-management/page.tsx`, `src/app/dashboard/home/page.tsx`, `src/app/dashboard/household-management/page.tsx`, `src/app/dashboard/page.tsx`, `src/app/dashboard/settlement/page.tsx`, `src/app/layout.tsx` (**inferred**)

## Problem addressed
Unknown: source code does not explicitly state the problem addressed.
Evidence: none

## Features observed in source and tests
- Persists or queries application data — Evidence: `src/components/bill-calculator.tsx`, `src/components/common/month-selector.tsx`, `src/components/expense-management.tsx`, `src/components/expense/forms/expense-form-category.tsx`, `src/components/expense/forms/expense-form-paid-by.tsx` (**inferred**)
- Renders a React user interface — Evidence: `src/app/dashboard/expense-management/page.tsx`, `src/app/dashboard/home/page.tsx`, `src/app/dashboard/household-management/page.tsx`, `src/app/dashboard/page.tsx`, `src/app/dashboard/settlement/page.tsx` (**inferred**)
- Provides the Expense Management Page UI component — Evidence: `src/app/dashboard/expense-management/page.tsx` (**inferred**)
- Provides the Home Page UI component — Evidence: `src/app/dashboard/home/page.tsx` (**inferred**)
- Provides the Household Management Page UI component — Evidence: `src/app/dashboard/household-management/page.tsx` (**inferred**)
- Provides the Dashboard Page UI component — Evidence: `src/app/dashboard/page.tsx` (**inferred**)
- Provides the Settlement Page UI component — Evidence: `src/app/dashboard/settlement/page.tsx` (**inferred**)
- Provides the Root Layout UI component — Evidence: `src/app/layout.tsx` (**inferred**)
- Defines the Expense Category DTO type or service — Evidence: `src/app/models/expense/dtos/expense-category-dto.ts` (**inferred**)
- Creates expense category dto — Evidence: `src/app/models/expense/dtos/expense-category-dto.ts` (**inferred**)
- Updates expense category dto — Evidence: `src/app/models/expense/dtos/expense-category-dto.ts` (**inferred**)
- Defines the File With Progress type or service — Evidence: `src/app/models/expense/dtos/expense-dto.ts` (**inferred**)
- Defines the Base Expense type or service — Evidence: `src/app/models/expense/dtos/expense-dto.ts` (**inferred**)
- Defines the Expense Split type or service — Evidence: `src/app/models/expense/dtos/expense-dto.ts` (**inferred**)
- Defines the Expense Percentage Split type or service — Evidence: `src/app/models/expense/dtos/expense-dto.ts` (**inferred**)
- Defines the One Time Expense type or service — Evidence: `src/app/models/expense/dtos/expense-dto.ts` (**inferred**)
- Defines the Recurring Expense type or service — Evidence: `src/app/models/expense/dtos/expense-dto.ts` (**inferred**)
- Defines the Hourly Expense type or service — Evidence: `src/app/models/expense/dtos/expense-dto.ts` (**inferred**)
- Defines the Expense DTO type or service — Evidence: `src/app/models/expense/dtos/expense-dto.ts` (**inferred**)
- Defines the Expense Query Params type or service — Evidence: `src/app/models/expense/dtos/expense-dto.ts` (**inferred**)
- Defines the Split Type Enum type or service — Evidence: `src/app/models/expense/types.ts` (**inferred**)
- Defines the Expense Type Enum type or service — Evidence: `src/app/models/expense/types.ts` (**inferred**)
- Defines the Expense Type type or service — Evidence: `src/app/models/expense/types.ts` (**inferred**)
- Defines the Expense Filter Params type or service — Evidence: `src/app/models/expense/types.ts` (**inferred**)

## Tracked files
- **225 tracked files** in total
- Source: 206; tests: 2; documentation: 1; configuration: 12; assets/other: 4

## Repository structure
- Inspected 98 source files from the cloned repository (bounded for safety).
- `.vscode/` (1 tracked files)
- `src/` (212 tracked files)
- `next.config.ts`
- `src/app/dashboard/expense-management/page.tsx`
- `src/app/dashboard/home/page.tsx`
- `src/app/dashboard/household-management/page.tsx`
- `src/app/dashboard/page.tsx`
- `src/app/dashboard/settlement/page.tsx`
- `src/app/globals.css`
- `src/app/layout.tsx`
- `src/app/models/common/constants.ts`
- `src/app/models/expense/dtos/expense-category-dto.ts`
- `src/app/models/expense/dtos/expense-dto.ts`
- `src/app/models/expense/expense-schemas.ts`
- `src/app/models/expense/types.ts`
- `src/app/models/file-storage/dtos/file-storage-dtos.ts`
- `src/app/models/file-storage/types.ts`
- `src/app/models/forms/expense-form.ts`
- `src/app/models/forms/file_storage_forms.ts`
- `src/app/models/forms/household-forms.ts`
- `src/app/models/forms/settlement-form.ts`
- `src/app/models/household/constants/invite.constants.ts`

## Implementation and test evidence
- Persists or queries application data — Evidence: `src/components/bill-calculator.tsx`, `src/components/common/month-selector.tsx`, `src/components/expense-management.tsx`, `src/components/expense/forms/expense-form-category.tsx`, `src/components/expense/forms/expense-form-paid-by.tsx` (**inferred**)
- Renders a React user interface — Evidence: `src/app/dashboard/expense-management/page.tsx`, `src/app/dashboard/home/page.tsx`, `src/app/dashboard/household-management/page.tsx`, `src/app/dashboard/page.tsx`, `src/app/dashboard/settlement/page.tsx` (**inferred**)
- Provides the Expense Management Page UI component — Evidence: `src/app/dashboard/expense-management/page.tsx` (**inferred**)
- Provides the Home Page UI component — Evidence: `src/app/dashboard/home/page.tsx` (**inferred**)
- Provides the Household Management Page UI component — Evidence: `src/app/dashboard/household-management/page.tsx` (**inferred**)
- Provides the Dashboard Page UI component — Evidence: `src/app/dashboard/page.tsx` (**inferred**)
- Provides the Settlement Page UI component — Evidence: `src/app/dashboard/settlement/page.tsx` (**inferred**)
- Provides the Root Layout UI component — Evidence: `src/app/layout.tsx` (**inferred**)
- Defines the Expense Category DTO type or service — Evidence: `src/app/models/expense/dtos/expense-category-dto.ts` (**inferred**)
- Creates expense category dto — Evidence: `src/app/models/expense/dtos/expense-category-dto.ts` (**inferred**)
- Updates expense category dto — Evidence: `src/app/models/expense/dtos/expense-category-dto.ts` (**inferred**)
- Defines the File With Progress type or service — Evidence: `src/app/models/expense/dtos/expense-dto.ts` (**inferred**)
- Defines the Base Expense type or service — Evidence: `src/app/models/expense/dtos/expense-dto.ts` (**inferred**)
- Defines the Expense Split type or service — Evidence: `src/app/models/expense/dtos/expense-dto.ts` (**inferred**)
- Defines the Expense Percentage Split type or service — Evidence: `src/app/models/expense/dtos/expense-dto.ts` (**inferred**)
- Defines the One Time Expense type or service — Evidence: `src/app/models/expense/dtos/expense-dto.ts` (**inferred**)
- Defines the Recurring Expense type or service — Evidence: `src/app/models/expense/dtos/expense-dto.ts` (**inferred**)
- Defines the Hourly Expense type or service — Evidence: `src/app/models/expense/dtos/expense-dto.ts` (**inferred**)
- Defines the Expense DTO type or service — Evidence: `src/app/models/expense/dtos/expense-dto.ts` (**inferred**)
- Defines the Expense Query Params type or service — Evidence: `src/app/models/expense/dtos/expense-dto.ts` (**inferred**)
- Defines the Split Type Enum type or service — Evidence: `src/app/models/expense/types.ts` (**inferred**)
- Defines the Expense Type Enum type or service — Evidence: `src/app/models/expense/types.ts` (**inferred**)
- Defines the Expense Type type or service — Evidence: `src/app/models/expense/types.ts` (**inferred**)
- Defines the Expense Filter Params type or service — Evidence: `src/app/models/expense/types.ts` (**inferred**)

## Frameworks and technology stack
- TypeScript — Evidence: `package.json`
- Next.js — Evidence: `package.json`
- Tailwind CSS — Evidence: `package.json`
- JavaScript — Evidence: `postcss.config.mjs`

## Design and architecture patterns
- test-driven development evidence (**inferred**) — Evidence: `src/app/test/settlement-form/page.tsx`, `src/app/test/settlement/page.tsx`

## Evidence and limitations
- Reports are based on a fresh shallow clone. Safe, bounded documentation, manifests, source, and test files are inspected locally; raw source code is never copied into this report.
- README text and the GitHub description are excluded from project-purpose and feature claims because they may be stale.
- No additional inspection limitations were recorded.
