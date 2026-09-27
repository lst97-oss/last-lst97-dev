# yoons-cabinetry-store-front

## Retrieval summary

- Relationship: Owned repository.
- Repository: lst97/yoons-cabinetry-store-front.
- Purpose: Source implementation indicates these responsibilities: reads runtime environment variables; validates structured input or configuration; calls external http services; persists or queries application data; integrates a headless cms.
- Observed capabilities: Reads runtime environment variables; Validates structured input or configuration; Calls external HTTP services
- Technology: TypeScript, React, Next.js, PostgreSQL, Tailwind CSS, JavaScript
- Software kinds: web_app
- Curated topics: e-commerce, cabinetry

## Repository metadata
- **Repository:** lst97/yoons-cabinetry-store-front
- **Visibility:** private
- **URL:** https://github.com/lst97/yoons-cabinetry-store-front
- **Default branch:** dev
- **Created:** 2025-03-02T05:25:42Z
- **Last updated:** 2025-05-27T18:55:40Z
- **Primary language:** TypeScript
- **License:** Other
- **Stars / forks:** 0 / 0
- **Topics:** No GitHub topics are set.
- **Software kinds:** `web_app`
- **Curated topics:** `e-commerce`, `cabinetry`

### GitHub language breakdown
- TypeScript (1,338,823 bytes)
- HTML (1,134,551 bytes)
- CSS (45,884 bytes)
- JavaScript (16,166 bytes)
- Dockerfile (5,738 bytes)

## Project purpose (source-derived)
Source implementation indicates these responsibilities: reads runtime environment variables; validates structured input or configuration; calls external http services; persists or queries application data; integrates a headless cms.
Evidence: `next.config.ts`, `src/app/(frontend)/components/management/invoice/single-view/InvoiceMetaSection.tsx`, `src/app/(frontend)/components/management/invoice/InvoiceFormPage.tsx`, `src/app/(frontend)/components/management/invoice/single-view/LineItemsSection.tsx`, `src/app/(frontend)/components/cart/CartItem.tsx`, `src/app/(frontend)/components/management/invoice/list-view/InvoiceFilters.tsx`, `src/app/(frontend)/components/management/invoice/single-view/TotalsAndNotesSection.tsx`, `src/app/(frontend)/components/NavigationBar.tsx`, `src/app/(frontend)/auth/login/page.tsx`, `src/app/(frontend)/auth/register/page.tsx`, `src/app/(frontend)/auth/verify/email/page.tsx`, `src/app/(frontend)/components/animations/AnimatedNumber.tsx`, `src/app/(frontend)/components/auth/AuthLayout.tsx` (**inferred**)

## Problem addressed
Unknown: source code does not explicitly state the problem addressed.
Evidence: none

## Features observed in source and tests
- Reads runtime environment variables — Evidence: `next.config.ts`, `src/app/(frontend)/components/management/invoice/single-view/InvoiceMetaSection.tsx` (**inferred**)
- Validates structured input or configuration — Evidence: `src/app/(frontend)/components/management/invoice/InvoiceFormPage.tsx`, `src/app/(frontend)/components/management/invoice/single-view/LineItemsSection.tsx` (**inferred**)
- Calls external HTTP services — Evidence: `src/app/(frontend)/components/management/invoice/InvoiceFormPage.tsx` (**inferred**)
- Persists or queries application data — Evidence: `src/app/(frontend)/components/cart/CartItem.tsx`, `src/app/(frontend)/components/management/invoice/list-view/InvoiceFilters.tsx`, `src/app/(frontend)/components/management/invoice/single-view/InvoiceMetaSection.tsx`, `src/app/(frontend)/components/management/invoice/single-view/TotalsAndNotesSection.tsx`, `src/app/(frontend)/components/NavigationBar.tsx` (**inferred**)
- Integrates a headless CMS — Evidence: `next.config.ts` (**inferred**)
- Renders a React user interface — Evidence: `src/app/(frontend)/auth/login/page.tsx`, `src/app/(frontend)/auth/register/page.tsx`, `src/app/(frontend)/auth/verify/email/page.tsx`, `src/app/(frontend)/components/animations/AnimatedNumber.tsx`, `src/app/(frontend)/components/auth/AuthLayout.tsx` (**inferred**)
- Provides the Trade Login UI component — Evidence: `src/app/(frontend)/auth/login/page.tsx` (**inferred**)
- Provides the Trade Register UI component — Evidence: `src/app/(frontend)/auth/register/page.tsx` (**inferred**)
- Verifies email page — Evidence: `src/app/(frontend)/auth/verify/email/page.tsx` (**inferred**)
- Provides the Animated Number UI component — Evidence: `src/app/(frontend)/components/animations/AnimatedNumber.tsx` (**inferred**)
- Provides the Auth Layout UI component — Evidence: `src/app/(frontend)/components/auth/AuthLayout.tsx` (**inferred**)
- Provides the Auth Protected Page UI component — Evidence: `src/app/(frontend)/components/auth/AuthProtectedPage.tsx` (**inferred**)
- Provides the Error Display UI component — Evidence: `src/app/(frontend)/components/auth/forgot-password/ErrorDisplay.tsx` (**inferred**)
- Provides the Form Content Wrapper UI component — Evidence: `src/app/(frontend)/components/auth/FormContentWrapper.tsx` (**inferred**)
- Provides the Page Header UI component — Evidence: `src/app/(frontend)/components/auth/PageHeader.tsx` (**inferred**)
- Provides the Redirect Authenticated UI component — Evidence: `src/app/(frontend)/components/auth/RedirectAuthenticated.tsx` (**inferred**)
- Provides the Cart Initializer UI component — Evidence: `src/app/(frontend)/components/cart/CartInitializer.tsx` (**inferred**)
- Provides the Cart Loading View UI component — Evidence: `src/app/(frontend)/components/cart/CartLoadingView.tsx` (**inferred**)
- Provides the Cart Summary Container UI component — Evidence: `src/app/(frontend)/components/cart/CartSummaryContainer.tsx` (**inferred**)
- Provides the Cart Totals UI component — Evidence: `src/app/(frontend)/components/cart/CartTotals.tsx` (**inferred**)
- Provides the Empty Cart View UI component — Evidence: `src/app/(frontend)/components/cart/EmptyCartView.tsx` (**inferred**)
- Provides the Order Summary Panel UI component — Evidence: `src/app/(frontend)/components/checkout/payment/OrderSummaryPanel.tsx` (**inferred**)
- Provides the Payment Step UI component — Evidence: `src/app/(frontend)/components/checkout/payment/PaymentStep.tsx` (**inferred**)
- Provides the Payment Success Message UI component — Evidence: `src/app/(frontend)/components/checkout/payment/PaymentSuccessMessage.tsx` (**inferred**)

## Tracked files
- **365 tracked files** in total
- Source: 324; tests: 0; documentation: 4; configuration: 15; assets/other: 22

## Repository structure
- Inspected 92 source files from the cloned repository (bounded for safety).
- `.cursor/` (4 tracked files)
- `.vscode/` (3 tracked files)
- `better-auth_migrations/` (1 tracked files)
- `public/` (12 tracked files)
- `src/` (328 tracked files)
- `next.config.ts`
- `src/app/(frontend)/auth/login/page.tsx`
- `src/app/(frontend)/auth/register/page.tsx`
- `src/app/(frontend)/auth/verify/email/page.tsx`
- `src/app/(frontend)/components/animations/AnimatedNumber.tsx`
- `src/app/(frontend)/components/auth/AuthLayout.tsx`
- `src/app/(frontend)/components/auth/AuthProtectedPage.tsx`
- `src/app/(frontend)/components/auth/forgot-password/ErrorDisplay.tsx`
- `src/app/(frontend)/components/auth/FormContentWrapper.tsx`
- `src/app/(frontend)/components/auth/PageHeader.tsx`
- `src/app/(frontend)/components/auth/RedirectAuthenticated.tsx`
- `src/app/(frontend)/components/card/card.module.css`
- `src/app/(frontend)/components/card/Card.tsx`
- `src/app/(frontend)/components/card/SelectionCard.tsx`
- `src/app/(frontend)/components/cart/CartInitializer.tsx`
- `src/app/(frontend)/components/cart/CartItem.tsx`
- `src/app/(frontend)/components/cart/CartItemsList.tsx`
- `src/app/(frontend)/components/cart/CartLoadingView.tsx`
- `src/app/(frontend)/components/cart/CartSummary.tsx`
- `src/app/(frontend)/components/cart/CartSummaryContainer.tsx`

## Implementation and test evidence
- Reads runtime environment variables — Evidence: `next.config.ts`, `src/app/(frontend)/components/management/invoice/single-view/InvoiceMetaSection.tsx` (**inferred**)
- Validates structured input or configuration — Evidence: `src/app/(frontend)/components/management/invoice/InvoiceFormPage.tsx`, `src/app/(frontend)/components/management/invoice/single-view/LineItemsSection.tsx` (**inferred**)
- Calls external HTTP services — Evidence: `src/app/(frontend)/components/management/invoice/InvoiceFormPage.tsx` (**inferred**)
- Persists or queries application data — Evidence: `src/app/(frontend)/components/cart/CartItem.tsx`, `src/app/(frontend)/components/management/invoice/list-view/InvoiceFilters.tsx`, `src/app/(frontend)/components/management/invoice/single-view/InvoiceMetaSection.tsx`, `src/app/(frontend)/components/management/invoice/single-view/TotalsAndNotesSection.tsx`, `src/app/(frontend)/components/NavigationBar.tsx` (**inferred**)
- Integrates a headless CMS — Evidence: `next.config.ts` (**inferred**)
- Renders a React user interface — Evidence: `src/app/(frontend)/auth/login/page.tsx`, `src/app/(frontend)/auth/register/page.tsx`, `src/app/(frontend)/auth/verify/email/page.tsx`, `src/app/(frontend)/components/animations/AnimatedNumber.tsx`, `src/app/(frontend)/components/auth/AuthLayout.tsx` (**inferred**)
- Provides the Trade Login UI component — Evidence: `src/app/(frontend)/auth/login/page.tsx` (**inferred**)
- Provides the Trade Register UI component — Evidence: `src/app/(frontend)/auth/register/page.tsx` (**inferred**)
- Verifies email page — Evidence: `src/app/(frontend)/auth/verify/email/page.tsx` (**inferred**)
- Provides the Animated Number UI component — Evidence: `src/app/(frontend)/components/animations/AnimatedNumber.tsx` (**inferred**)
- Provides the Auth Layout UI component — Evidence: `src/app/(frontend)/components/auth/AuthLayout.tsx` (**inferred**)
- Provides the Auth Protected Page UI component — Evidence: `src/app/(frontend)/components/auth/AuthProtectedPage.tsx` (**inferred**)
- Provides the Error Display UI component — Evidence: `src/app/(frontend)/components/auth/forgot-password/ErrorDisplay.tsx` (**inferred**)
- Provides the Form Content Wrapper UI component — Evidence: `src/app/(frontend)/components/auth/FormContentWrapper.tsx` (**inferred**)
- Provides the Page Header UI component — Evidence: `src/app/(frontend)/components/auth/PageHeader.tsx` (**inferred**)
- Provides the Redirect Authenticated UI component — Evidence: `src/app/(frontend)/components/auth/RedirectAuthenticated.tsx` (**inferred**)
- Provides the Cart Initializer UI component — Evidence: `src/app/(frontend)/components/cart/CartInitializer.tsx` (**inferred**)
- Provides the Cart Loading View UI component — Evidence: `src/app/(frontend)/components/cart/CartLoadingView.tsx` (**inferred**)
- Provides the Cart Summary Container UI component — Evidence: `src/app/(frontend)/components/cart/CartSummaryContainer.tsx` (**inferred**)
- Provides the Cart Totals UI component — Evidence: `src/app/(frontend)/components/cart/CartTotals.tsx` (**inferred**)
- Provides the Empty Cart View UI component — Evidence: `src/app/(frontend)/components/cart/EmptyCartView.tsx` (**inferred**)
- Provides the Order Summary Panel UI component — Evidence: `src/app/(frontend)/components/checkout/payment/OrderSummaryPanel.tsx` (**inferred**)
- Provides the Payment Step UI component — Evidence: `src/app/(frontend)/components/checkout/payment/PaymentStep.tsx` (**inferred**)
- Provides the Payment Success Message UI component — Evidence: `src/app/(frontend)/components/checkout/payment/PaymentSuccessMessage.tsx` (**inferred**)

## Frameworks and technology stack
- TypeScript — Evidence: `package.json`
- React — Evidence: `package.json`
- Next.js — Evidence: `package.json`
- PostgreSQL — Evidence: `package.json`
- Tailwind CSS — Evidence: `package.json`
- JavaScript — Evidence: `.dependency-cruiser.cjs`, `eslint.config.mjs`, `postcss.config.mjs`, `src/app/(payload)/admin/importMap.js`

## Design and architecture patterns
- ports and adapters (**inferred**) — Evidence: `src/app/(frontend)/lib/adapters/projectAdapter.ts`

## Evidence and limitations
- Reports are based on a fresh shallow clone. Safe, bounded documentation, manifests, source, and test files are inspected locally; raw source code is never copied into this report.
- README text and the GitHub description are excluded from project-purpose and feature claims because they may be stale.
- No additional inspection limitations were recorded.
