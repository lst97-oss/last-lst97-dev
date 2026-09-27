# medusa

## Retrieval summary

- Relationship: Third-party contribution by Nelson.
- Repository: medusajs/medusa.
- Purpose: Source implementation indicates these responsibilities: reads runtime environment variables; renders a react user interface; defines http request handlers; gets vite config; writes static files.
- Observed capabilities: Reads runtime environment variables; Renders a React user interface; Defines HTTP request handlers
- Technology: TypeScript, React, Vite, Tailwind CSS, JavaScript

## Repository metadata
- **Repository:** medusajs/medusa
- **Visibility:** public
- **URL:** https://github.com/medusajs/medusa
- **Topics:** No GitHub topics are set.

### GitHub language breakdown
- GitHub language breakdown is unavailable.

## Project purpose (source-derived)
Source implementation indicates these responsibilities: reads runtime environment variables; renders a react user interface; defines http request handlers; gets vite config; writes static files.
Evidence: `packages/admin/admin-bundler/src/commands/plugin.ts`, `packages/admin/admin-bundler/src/utils/config.ts`, `packages/admin/admin-bundler/src/utils/write-static-files.ts`, `packages/admin/admin-sdk/src/config/types.ts`, `packages/admin/admin-bundler/src/commands/serve.ts`, `packages/admin/admin-bundler/src/types.ts` (**inferred**)

## Problem addressed
Unknown: source code does not explicitly state the problem addressed.
Evidence: none

## Features observed in source and tests
- Reads runtime environment variables — Evidence: `packages/admin/admin-bundler/src/commands/plugin.ts`, `packages/admin/admin-bundler/src/utils/config.ts` (**inferred**)
- Renders a React user interface — Evidence: `packages/admin/admin-bundler/src/utils/write-static-files.ts`, `packages/admin/admin-sdk/src/config/types.ts` (**inferred**)
- Defines HTTP request handlers — Evidence: `packages/admin/admin-bundler/src/commands/serve.ts` (**inferred**)
- Defines the Bundler Options type or service — Evidence: `packages/admin/admin-bundler/src/types.ts` (**inferred**)
- Gets vite config — Evidence: `packages/admin/admin-bundler/src/utils/config.ts` (**inferred**)
- Writes static files — Evidence: `packages/admin/admin-bundler/src/utils/write-static-files.ts` (**inferred**)
- Defines the Widget Config type or service — Evidence: `packages/admin/admin-sdk/src/config/types.ts` (**inferred**)
- Defines the Layout Config type or service — Evidence: `packages/admin/admin-sdk/src/config/types.ts` (**inferred**)
- Defines the Route Config type or service — Evidence: `packages/admin/admin-sdk/src/config/types.ts` (**inferred**)
- Defines the Custom Form Field type or service — Evidence: `packages/admin/admin-sdk/src/config/types.ts` (**inferred**)
- Defines the Custom Field Config type or service — Evidence: `packages/admin/admin-sdk/src/config/types.ts` (**inferred**)
- Defines the Product Form Zone type or service — Evidence: `packages/admin/admin-shared/src/extensions/custom-fields/product/types.ts` (**inferred**)
- Defines the Product Form Tab type or service — Evidence: `packages/admin/admin-shared/src/extensions/custom-fields/product/types.ts` (**inferred**)
- Defines the Product Display Zone type or service — Evidence: `packages/admin/admin-shared/src/extensions/custom-fields/product/types.ts` (**inferred**)
- Defines the Custom Field Model type or service — Evidence: `packages/admin/admin-shared/src/extensions/custom-fields/types.ts` (**inferred**)
- Defines the Custom Field Form Zone type or service — Evidence: `packages/admin/admin-shared/src/extensions/custom-fields/types.ts` (**inferred**)
- Defines the Custom Field Form Tab type or service — Evidence: `packages/admin/admin-shared/src/extensions/custom-fields/types.ts` (**inferred**)
- Defines the Custom Field Container Zone type or service — Evidence: `packages/admin/admin-shared/src/extensions/custom-fields/types.ts` (**inferred**)
- Defines the Custom Field Zone type or service — Evidence: `packages/admin/admin-shared/src/extensions/custom-fields/types.ts` (**inferred**)
- Defines the Custom Field Import Type type or service — Evidence: `packages/admin/admin-shared/src/extensions/custom-fields/types.ts` (**inferred**)
- Defines the Custom Field Model Form Map type or service — Evidence: `packages/admin/admin-shared/src/extensions/custom-fields/types.ts` (**inferred**)
- Defines the Custom Field Model Container Map type or service — Evidence: `packages/admin/admin-shared/src/extensions/custom-fields/types.ts` (**inferred**)
- Defines the Custom Field Model Form Tabs Map type or service — Evidence: `packages/admin/admin-shared/src/extensions/custom-fields/types.ts` (**inferred**)
- Defines the Custom Field Form Keys type or service — Evidence: `packages/admin/admin-shared/src/extensions/custom-fields/types.ts` (**inferred**)

## Tracked files
- **24190 tracked files** in total
- Source: 10291; tests: 1463; documentation: 1275; configuration: 10255; assets/other: 906

## Repository structure
- Inspected 92 source files from the cloned repository (bounded for safety).
- `.changeset/` (3 tracked files)
- `.claude/` (48 tracked files)
- `.github/` (65 tracked files)
- `.yarn/` (6 tracked files)
- `integration-tests/` (335 tracked files)
- `memory/` (2 tracked files)
- `packages/` (9014 tracked files)
- `scripts/` (27 tracked files)
- `thoughts/` (2 tracked files)
- `www/` (14663 tracked files)
- `packages/admin/admin-vite-plugin/vitest.config.ts`
- `packages/design-system/icons/vite.config.ts`
- `packages/design-system/ui/vite.config.ts`
- `www/apps/api-reference/next.config.mjs`
- `www/apps/book/next.config.mjs`
- `www/apps/book/vitest.config.ts`
- `www/apps/cloud/next.config.mjs`
- `www/apps/resources/next.config.mjs`
- `www/apps/ui/next.config.mjs`
- `www/apps/user-guide/next.config.mjs`
- `www/utils/packages/typedoc-plugin-medusa-theme/vitest.config.ts`
- `packages/admin/admin-bundler/src/commands/build.ts`
- `packages/admin/admin-bundler/src/commands/develop.ts`
- `packages/admin/admin-bundler/src/commands/plugin.ts`
- `packages/admin/admin-bundler/src/commands/serve.ts`
- `packages/admin/admin-bundler/src/index.ts`
- `packages/admin/admin-bundler/src/plugins/clear-plugin-build.ts`
- `packages/admin/admin-bundler/src/plugins/inject-tailwindcss.ts`
- `packages/admin/admin-bundler/src/plugins/write-static-files.ts`
- `packages/admin/admin-bundler/src/types.ts`

## Implementation and test evidence
- Reads runtime environment variables — Evidence: `packages/admin/admin-bundler/src/commands/plugin.ts`, `packages/admin/admin-bundler/src/utils/config.ts` (**inferred**)
- Renders a React user interface — Evidence: `packages/admin/admin-bundler/src/utils/write-static-files.ts`, `packages/admin/admin-sdk/src/config/types.ts` (**inferred**)
- Defines HTTP request handlers — Evidence: `packages/admin/admin-bundler/src/commands/serve.ts` (**inferred**)
- Defines the Bundler Options type or service — Evidence: `packages/admin/admin-bundler/src/types.ts` (**inferred**)
- Gets vite config — Evidence: `packages/admin/admin-bundler/src/utils/config.ts` (**inferred**)
- Writes static files — Evidence: `packages/admin/admin-bundler/src/utils/write-static-files.ts` (**inferred**)
- Defines the Widget Config type or service — Evidence: `packages/admin/admin-sdk/src/config/types.ts` (**inferred**)
- Defines the Layout Config type or service — Evidence: `packages/admin/admin-sdk/src/config/types.ts` (**inferred**)
- Defines the Route Config type or service — Evidence: `packages/admin/admin-sdk/src/config/types.ts` (**inferred**)
- Defines the Custom Form Field type or service — Evidence: `packages/admin/admin-sdk/src/config/types.ts` (**inferred**)
- Defines the Custom Field Config type or service — Evidence: `packages/admin/admin-sdk/src/config/types.ts` (**inferred**)
- Defines the Product Form Zone type or service — Evidence: `packages/admin/admin-shared/src/extensions/custom-fields/product/types.ts` (**inferred**)
- Defines the Product Form Tab type or service — Evidence: `packages/admin/admin-shared/src/extensions/custom-fields/product/types.ts` (**inferred**)
- Defines the Product Display Zone type or service — Evidence: `packages/admin/admin-shared/src/extensions/custom-fields/product/types.ts` (**inferred**)
- Defines the Custom Field Model type or service — Evidence: `packages/admin/admin-shared/src/extensions/custom-fields/types.ts` (**inferred**)
- Defines the Custom Field Form Zone type or service — Evidence: `packages/admin/admin-shared/src/extensions/custom-fields/types.ts` (**inferred**)
- Defines the Custom Field Form Tab type or service — Evidence: `packages/admin/admin-shared/src/extensions/custom-fields/types.ts` (**inferred**)
- Defines the Custom Field Container Zone type or service — Evidence: `packages/admin/admin-shared/src/extensions/custom-fields/types.ts` (**inferred**)
- Defines the Custom Field Zone type or service — Evidence: `packages/admin/admin-shared/src/extensions/custom-fields/types.ts` (**inferred**)
- Defines the Custom Field Import Type type or service — Evidence: `packages/admin/admin-shared/src/extensions/custom-fields/types.ts` (**inferred**)
- Defines the Custom Field Model Form Map type or service — Evidence: `packages/admin/admin-shared/src/extensions/custom-fields/types.ts` (**inferred**)
- Defines the Custom Field Model Container Map type or service — Evidence: `packages/admin/admin-shared/src/extensions/custom-fields/types.ts` (**inferred**)
- Defines the Custom Field Model Form Tabs Map type or service — Evidence: `packages/admin/admin-shared/src/extensions/custom-fields/types.ts` (**inferred**)
- Defines the Custom Field Form Keys type or service — Evidence: `packages/admin/admin-shared/src/extensions/custom-fields/types.ts` (**inferred**)

## Frameworks and technology stack
- TypeScript — Evidence: `package.json`
- React — Evidence: `package.json`
- Vite — Evidence: `package.json`
- Tailwind CSS — Evidence: `package.json`
- JavaScript — Evidence: `.eslintrc.js`, `.yarn/plugins/@yarnpkg/plugin-interactive-tools.cjs`, `.yarn/plugins/@yarnpkg/plugin-workspace-tools.cjs`, `.yarn/releases/yarn-3.2.1.cjs`, `define_jest_config.js`, `eslint.medusa.cjs`, `integration-tests/environment-helpers/bootstrap-app.js`, `integration-tests/environment-helpers/setup-server.js`

## Design and architecture patterns
- test-driven development evidence (**inferred**) — Evidence: `integration-tests/http/__tests__/api-key/admin/api-key.spec.ts`, `integration-tests/http/__tests__/api-key/admin/publishable-key.spec.ts`, `integration-tests/http/__tests__/auth/admin/auth-asymetric.spec.ts`

## Evidence and limitations
- Reports are based on a fresh shallow clone. Safe, bounded documentation, manifests, source, and test files are inspected locally; raw source code is never copied into this report.
- README text and the GitHub description are excluded from project-purpose and feature claims because they may be stale.
- No additional inspection limitations were recorded.

## Nelson's contribution evidence
- 0 commits, 0 pull requests, 3 issues, 0 reviews
### Pull requests
No pull-request titles are available from the contribution API.
### Issues
- [Bug]: Input Component Text Always Highlighted, Blocking Price Entry (ServiceZone -> Conditional Price Component) (CLOSED) — https://github.com/medusajs/medusa/issues/11470
- Potential error when destructuring from metadata if it's undefined for product-brand example (CLOSED) — https://github.com/medusajs/medusa/issues/11291
- Image for folder structure shows incorrect file extension for product-brand widget (CLOSED) — https://github.com/medusajs/medusa/issues/11290
- Commit contributions are reported as aggregate counts; commit messages and diffs are not copied into this report.
- **Coverage limitation:** GitHub capped at least one contribution list; some contribution details may be omitted and commit totals may be partial.
