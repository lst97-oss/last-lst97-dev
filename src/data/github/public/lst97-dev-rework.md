# lst97-dev-rework

## Retrieval summary

- Relationship: Owned repository.
- Repository: lst97/lst97-dev-rework.
- Purpose: Source implementation indicates these responsibilities: reads runtime environment variables; calls external http services; persists or queries application data; integrates a headless cms; renders a react user interface.
- Observed capabilities: Reads runtime environment variables; Calls external HTTP services; Persists or queries application data
- Technology: TypeScript, React, TanStack Router, TanStack Start, Vite, PostgreSQL, Tailwind CSS

## Repository metadata
- **Repository:** lst97/lst97-dev-rework
- **Visibility:** public
- **URL:** https://github.com/lst97/lst97-dev-rework
- **Default branch:** main
- **Created:** 2026-01-29T10:59:42Z
- **Last updated:** 2026-01-29T10:59:48Z
- **Primary language:** TypeScript
- **Stars / forks:** 0 / 0
- **Topics:** No GitHub topics are set.

### GitHub language breakdown
- TypeScript (111,037 bytes)
- CSS (7,417 bytes)
- Dockerfile (588 bytes)

## Project purpose (source-derived)
Source implementation indicates these responsibilities: reads runtime environment variables; calls external http services; persists or queries application data; integrates a headless cms; renders a react user interface.
Evidence: `src/db/index.ts`, `src/env.ts`, `src/integrations/tanstack-query/root-provider.tsx`, `drizzle.config.ts`, `src/routes/demo/start.api-request.tsx`, `src/routes/demo/tanstack-query.tsx`, `src/server.ts`, `src/components/ui/forms/select.tsx`, `src/integrations/strapi/client.ts`, `src/routes/demo/strapi_.$articleId.tsx`, `src/routes/demo/strapi.tsx`, `src/routeTree.gen.ts`, `src/components/ui/animations/transition.tsx`, `src/components/ui/customs/card.tsx`, `src/routes/demo/start.server-funcs.tsx`, `src/routes/demo/start.ssr.spa-mode.tsx`, `src/components/Header.tsx`, `src/components/LocaleSwitcher.tsx` (**inferred**)

## Problem addressed
Unknown: source code does not explicitly state the problem addressed.
Evidence: none

## Features observed in source and tests
- Reads runtime environment variables — Evidence: `src/db/index.ts`, `src/env.ts`, `src/integrations/tanstack-query/root-provider.tsx`, `drizzle.config.ts` (**inferred**)
- Calls external HTTP services — Evidence: `src/routes/demo/start.api-request.tsx`, `src/routes/demo/tanstack-query.tsx`, `src/server.ts` (**inferred**)
- Persists or queries application data — Evidence: `src/components/ui/forms/select.tsx` (**inferred**)
- Integrates a headless CMS — Evidence: `src/integrations/strapi/client.ts`, `src/routes/demo/strapi_.$articleId.tsx`, `src/routes/demo/strapi.tsx`, `src/routeTree.gen.ts` (**inferred**)
- Renders a React user interface — Evidence: `src/components/ui/animations/transition.tsx`, `src/components/ui/customs/card.tsx`, `src/routes/demo/start.server-funcs.tsx`, `src/routes/demo/start.ssr.spa-mode.tsx`, `src/routes/demo/tanstack-query.tsx` (**inferred**)
- Validates and types runtime environment configuration — Evidence: `src/env.ts` (**inferred**)
- Full route: /api/trpc/$ — Evidence: `src/routeTree.gen.ts` (**inferred**)
- Provides the Header UI component — Evidence: `src/components/Header.tsx` (**inferred**)
- Provides the Paraglide Locale Switcher UI component — Evidence: `src/components/LocaleSwitcher.tsx` (**inferred**)
- Provides the Theme Toggle UI component — Evidence: `src/components/ThemeToggle.tsx` (**inferred**)
- Provides the Accordion Item UI component — Evidence: `src/components/ui/accordion.tsx` (**inferred**)
- Provides the Accordion Trigger UI component — Evidence: `src/components/ui/accordion.tsx` (**inferred**)
- Provides the Accordion Content UI component — Evidence: `src/components/ui/accordion.tsx` (**inferred**)
- Provides the Accordion Item Props UI component — Evidence: `src/components/ui/accordion.tsx` (**inferred**)
- Provides the Accordion Trigger Props UI component — Evidence: `src/components/ui/accordion.tsx` (**inferred**)
- Provides the Accordion Content Props UI component — Evidence: `src/components/ui/accordion.tsx` (**inferred**)
- Provides the Transition UI component — Evidence: `src/components/ui/animations/transition.tsx` (**inferred**)
- Provides the Transition Props UI component — Evidence: `src/components/ui/animations/transition.tsx` (**inferred**)
- Provides the Retro Card Props UI component — Evidence: `src/components/ui/customs/card.tsx` (**inferred**)
- Provides the Retro Card Header Props UI component — Evidence: `src/components/ui/customs/card.tsx` (**inferred**)
- Provides the Card Frame Props UI component — Evidence: `src/components/ui/customs/card.tsx` (**inferred**)
- Provides the Dialog UI component — Evidence: `src/components/ui/dialog.tsx` (**inferred**)
- Provides the Dialog Panel UI component — Evidence: `src/components/ui/dialog.tsx` (**inferred**)
- Provides the Dialog Title UI component — Evidence: `src/components/ui/dialog.tsx` (**inferred**)

## Tracked files
- **79 tracked files** in total
- Source: 53; tests: 0; documentation: 2; configuration: 15; assets/other: 9

## Repository structure
- Inspected 56 source files from the cloned repository (bounded for safety).
- `.serena/` (2 tracked files)
- `.vscode/` (1 tracked files)
- `messages/` (2 tracked files)
- `project.inlang/` (1 tracked files)
- `public/` (8 tracked files)
- `src/` (54 tracked files)
- `vite.config.ts`
- `src/components/Header.tsx`
- `src/components/LocaleSwitcher.tsx`
- `src/components/ThemeToggle.tsx`
- `src/components/ui/accordion.tsx`
- `src/components/ui/animations/transition.tsx`
- `src/components/ui/customs/card.tsx`
- `src/components/ui/dialog.tsx`
- `src/components/ui/dropdown-menu.tsx`
- `src/components/ui/forms/button.tsx`
- `src/components/ui/forms/checkbox.tsx`
- `src/components/ui/forms/combobox.tsx`
- `src/components/ui/forms/input.tsx`
- `src/components/ui/forms/listbox.tsx`
- `src/components/ui/forms/radio-group.tsx`
- `src/components/ui/forms/select.tsx`
- `src/components/ui/forms/switch.tsx`
- `src/components/ui/forms/textarea.tsx`
- `src/components/ui/popover.tsx`
- `src/components/ui/tabs.tsx`

## Implementation and test evidence
- Reads runtime environment variables — Evidence: `src/db/index.ts`, `src/env.ts`, `src/integrations/tanstack-query/root-provider.tsx`, `drizzle.config.ts` (**inferred**)
- Calls external HTTP services — Evidence: `src/routes/demo/start.api-request.tsx`, `src/routes/demo/tanstack-query.tsx`, `src/server.ts` (**inferred**)
- Persists or queries application data — Evidence: `src/components/ui/forms/select.tsx` (**inferred**)
- Integrates a headless CMS — Evidence: `src/integrations/strapi/client.ts`, `src/routes/demo/strapi_.$articleId.tsx`, `src/routes/demo/strapi.tsx`, `src/routeTree.gen.ts` (**inferred**)
- Renders a React user interface — Evidence: `src/components/ui/animations/transition.tsx`, `src/components/ui/customs/card.tsx`, `src/routes/demo/start.server-funcs.tsx`, `src/routes/demo/start.ssr.spa-mode.tsx`, `src/routes/demo/tanstack-query.tsx` (**inferred**)
- Validates and types runtime environment configuration — Evidence: `src/env.ts` (**inferred**)
- Full route: /api/trpc/$ — Evidence: `src/routeTree.gen.ts` (**inferred**)
- Provides the Header UI component — Evidence: `src/components/Header.tsx` (**inferred**)
- Provides the Paraglide Locale Switcher UI component — Evidence: `src/components/LocaleSwitcher.tsx` (**inferred**)
- Provides the Theme Toggle UI component — Evidence: `src/components/ThemeToggle.tsx` (**inferred**)
- Provides the Accordion Item UI component — Evidence: `src/components/ui/accordion.tsx` (**inferred**)
- Provides the Accordion Trigger UI component — Evidence: `src/components/ui/accordion.tsx` (**inferred**)
- Provides the Accordion Content UI component — Evidence: `src/components/ui/accordion.tsx` (**inferred**)
- Provides the Accordion Item Props UI component — Evidence: `src/components/ui/accordion.tsx` (**inferred**)
- Provides the Accordion Trigger Props UI component — Evidence: `src/components/ui/accordion.tsx` (**inferred**)
- Provides the Accordion Content Props UI component — Evidence: `src/components/ui/accordion.tsx` (**inferred**)
- Provides the Transition UI component — Evidence: `src/components/ui/animations/transition.tsx` (**inferred**)
- Provides the Transition Props UI component — Evidence: `src/components/ui/animations/transition.tsx` (**inferred**)
- Provides the Retro Card Props UI component — Evidence: `src/components/ui/customs/card.tsx` (**inferred**)
- Provides the Retro Card Header Props UI component — Evidence: `src/components/ui/customs/card.tsx` (**inferred**)
- Provides the Card Frame Props UI component — Evidence: `src/components/ui/customs/card.tsx` (**inferred**)
- Provides the Dialog UI component — Evidence: `src/components/ui/dialog.tsx` (**inferred**)
- Provides the Dialog Panel UI component — Evidence: `src/components/ui/dialog.tsx` (**inferred**)
- Provides the Dialog Title UI component — Evidence: `src/components/ui/dialog.tsx` (**inferred**)

## Frameworks and technology stack
- TypeScript — Evidence: `package.json`
- React — Evidence: `package.json`
- TanStack Router — Evidence: `package.json`
- TanStack Start — Evidence: `package.json`
- Vite — Evidence: `package.json`
- PostgreSQL — Evidence: `src/db/index.ts`, `src/routes/demo/drizzle.tsx`, `drizzle.config.ts`
- Tailwind CSS — Evidence: `package.json`

## Design and architecture patterns
- Unknown: no supported design-pattern evidence was found.

## Evidence and limitations
- Reports are based on a fresh shallow clone. Safe, bounded documentation, manifests, source, and test files are inspected locally; raw source code is never copied into this report.
- README text and the GitHub description are excluded from project-purpose and feature claims because they may be stale.
- No supported architecture-pattern evidence was found; no pattern is asserted.
