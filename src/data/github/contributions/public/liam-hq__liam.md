# liam

## Retrieval summary

- Relationship: Third-party contribution by Nelson.
- Repository: liam-hq/liam.
- Observed capabilities: Tested behavior: should return true for GitHub folder URLs; Tested behavior: should return false for non-GitHub folder URLs; Tested behavior: should parse valid GitHub folder URLs
- Technology: TypeScript, PostgreSQL, JavaScript, Ruby

## Repository metadata
- **Repository:** liam-hq/liam
- **Visibility:** public
- **URL:** https://github.com/liam-hq/liam
- **Topics:** No GitHub topics are set.

### GitHub language breakdown
- GitHub language breakdown is unavailable.

## Project purpose (source-derived)
Unknown: the inspected source does not expose enough named behavior to identify the project purpose.
Evidence: none

## Problem addressed
Unknown: source code does not explicitly state the problem addressed.
Evidence: none

## Features observed in source and tests
- Tested behavior: should return true for GitHub folder URLs — Evidence: `frontend/apps/app/app/erd/p/[...slug]/utils/githubUrlHandler.test.ts` (**inferred**)
- Tested behavior: should return false for non-GitHub folder URLs — Evidence: `frontend/apps/app/app/erd/p/[...slug]/utils/githubUrlHandler.test.ts` (**inferred**)
- Tested behavior: should parse valid GitHub folder URLs — Evidence: `frontend/apps/app/app/erd/p/[...slug]/utils/githubUrlHandler.test.ts` (**inferred**)
- Tested behavior: should handle URLs with query parameters — Evidence: `frontend/apps/app/app/erd/p/[...slug]/utils/githubUrlHandler.test.ts` (**inferred**)
- Tested behavior: should handle URLs with query parameters and paths — Evidence: `frontend/apps/app/app/erd/p/[...slug]/utils/githubUrlHandler.test.ts` (**inferred**)
- Tested behavior: should return error for invalid URLs — Evidence: `frontend/apps/app/app/erd/p/[...slug]/utils/githubUrlHandler.test.ts` (**inferred**)
- Tested behavior: should handle branch names with slashes — Evidence: `frontend/apps/app/app/erd/p/[...slug]/utils/githubUrlHandler.test.ts` (**inferred**)
- Tested behavior: should handle branch names with multiple slashes — Evidence: `frontend/apps/app/app/erd/p/[...slug]/utils/githubUrlHandler.test.ts` (**inferred**)
- Tested behavior: should return error when no valid branch/path combination is found — Evidence: `frontend/apps/app/app/erd/p/[...slug]/utils/githubUrlHandler.test.ts` (**inferred**)
- Tested behavior: should fetch and combine schema files from GitHub folder — Evidence: `frontend/apps/app/app/erd/p/[...slug]/utils/githubUrlHandler.test.ts` (**inferred**)
- Tested behavior: should return error for invalid URL — Evidence: `frontend/apps/app/app/erd/p/[...slug]/utils/githubUrlHandler.test.ts` (**inferred**)
- Tested behavior: should handle GitHub API errors — Evidence: `frontend/apps/app/app/erd/p/[...slug]/utils/githubUrlHandler.test.ts` (**inferred**)
- Tested behavior: should return error when no schema files found — Evidence: `frontend/apps/app/app/erd/p/[...slug]/utils/githubUrlHandler.test.ts` (**inferred**)
- Tested behavior: should skip excluded files like index.ts — Evidence: `frontend/apps/app/app/erd/p/[...slug]/utils/githubUrlHandler.test.ts` (**inferred**)
- Tested behavior: should detect format from multiple file types — Evidence: `frontend/apps/app/app/erd/p/[...slug]/utils/githubUrlHandler.test.ts` (**inferred**)
- Tested behavior: should recursively process subdirectories — Evidence: `frontend/apps/app/app/erd/p/[...slug]/utils/githubUrlHandler.test.ts` (**inferred**)

## Tracked files
- **2175 tracked files** in total
- Source: 1529; tests: 158; documentation: 125; configuration: 169; assets/other: 194

## Repository structure
- Inspected 2 source files from the cloned repository (bounded for safety).
- `.changeset/` (3 tracked files)
- `.claude/` (31 tracked files)
- `.github/` (24 tracked files)
- `.vscode/` (2 tracked files)
- `assets/` (4 tracked files)
- `config/` (2 tracked files)
- `docs/` (14 tracked files)
- `frontend/` (2067 tracked files)
- `scripts/` (3 tracked files)
- `frontend/apps/app/next.config.ts`
- `frontend/apps/app/vitest.config.ts`
- `frontend/apps/docs/next.config.mjs`
- `frontend/internal-packages/agent/vitest.config.ts`
- `frontend/internal-packages/db/vitest.config.ts`
- `frontend/internal-packages/e2e/playwright.config.ts`
- `frontend/internal-packages/github/vitest.config.ts`
- `frontend/internal-packages/pglite-server/vitest.config.ts`
- `frontend/internal-packages/schema-bench/vitest.config.ts`
- `frontend/packages/cli/vite.config.ts`
- `frontend/packages/erd-core/vitest.config.ts`
- `frontend/packages/schema/vitest.config.ts`
- `frontend/packages/ui/vitest.config.ts`
- `vitest.config.ts`
- `vitest.config.ts`
- `.changeset/changelog.cjs`
- `frontend/apps/app/app/api/chat/replay/route.ts`
- `frontend/apps/app/app/api/chat/stream/route.ts`
- `frontend/apps/app/app/api/logout/route.ts`
- `frontend/apps/app/app/api/projects/[projectId]/route.ts`

## Implementation and test evidence
- Tested behavior: should return true for GitHub folder URLs — Evidence: `frontend/apps/app/app/erd/p/[...slug]/utils/githubUrlHandler.test.ts` (**inferred**)
- Tested behavior: should return false for non-GitHub folder URLs — Evidence: `frontend/apps/app/app/erd/p/[...slug]/utils/githubUrlHandler.test.ts` (**inferred**)
- Tested behavior: should parse valid GitHub folder URLs — Evidence: `frontend/apps/app/app/erd/p/[...slug]/utils/githubUrlHandler.test.ts` (**inferred**)
- Tested behavior: should handle URLs with query parameters — Evidence: `frontend/apps/app/app/erd/p/[...slug]/utils/githubUrlHandler.test.ts` (**inferred**)
- Tested behavior: should handle URLs with query parameters and paths — Evidence: `frontend/apps/app/app/erd/p/[...slug]/utils/githubUrlHandler.test.ts` (**inferred**)
- Tested behavior: should return error for invalid URLs — Evidence: `frontend/apps/app/app/erd/p/[...slug]/utils/githubUrlHandler.test.ts` (**inferred**)
- Tested behavior: should handle branch names with slashes — Evidence: `frontend/apps/app/app/erd/p/[...slug]/utils/githubUrlHandler.test.ts` (**inferred**)
- Tested behavior: should handle branch names with multiple slashes — Evidence: `frontend/apps/app/app/erd/p/[...slug]/utils/githubUrlHandler.test.ts` (**inferred**)
- Tested behavior: should return error when no valid branch/path combination is found — Evidence: `frontend/apps/app/app/erd/p/[...slug]/utils/githubUrlHandler.test.ts` (**inferred**)
- Tested behavior: should fetch and combine schema files from GitHub folder — Evidence: `frontend/apps/app/app/erd/p/[...slug]/utils/githubUrlHandler.test.ts` (**inferred**)
- Tested behavior: should return error for invalid URL — Evidence: `frontend/apps/app/app/erd/p/[...slug]/utils/githubUrlHandler.test.ts` (**inferred**)
- Tested behavior: should handle GitHub API errors — Evidence: `frontend/apps/app/app/erd/p/[...slug]/utils/githubUrlHandler.test.ts` (**inferred**)
- Tested behavior: should return error when no schema files found — Evidence: `frontend/apps/app/app/erd/p/[...slug]/utils/githubUrlHandler.test.ts` (**inferred**)
- Tested behavior: should skip excluded files like index.ts — Evidence: `frontend/apps/app/app/erd/p/[...slug]/utils/githubUrlHandler.test.ts` (**inferred**)
- Tested behavior: should detect format from multiple file types — Evidence: `frontend/apps/app/app/erd/p/[...slug]/utils/githubUrlHandler.test.ts` (**inferred**)
- Tested behavior: should recursively process subdirectories — Evidence: `frontend/apps/app/app/erd/p/[...slug]/utils/githubUrlHandler.test.ts` (**inferred**)

## Frameworks and technology stack
- TypeScript — Evidence: `package.json`
- PostgreSQL — Evidence: `docs/migrationOpsContext.md`, `docs/schemaPatterns.md`, `frontend/apps/app/app/erd/p/[...slug]/utils/githubUrlHandler.test.ts`, `frontend/apps/app/components/BranchDetailPage/actions/saveSchemaFilePath.ts`, `frontend/apps/app/components/BranchDetailPage/components/SchemaFilePathForm/SchemaFilePathForm.stories.tsx`, `frontend/apps/app/components/BranchDetailPage/components/SchemaFilePathForm/SchemaFilePathForm.tsx`
- JavaScript — Evidence: `.changeset/changelog.cjs`, `frontend/apps/app/eslint.config.mjs`, `frontend/apps/app/scripts/install-prisma-internals.mjs`, `frontend/apps/assets/eslint.config.mjs`, `frontend/apps/assets/scripts/build.js`, `frontend/apps/docs/eslint.config.mjs`, `frontend/apps/docs/next.config.mjs`, `frontend/apps/docs/postcss.config.js`
- Ruby — Evidence: `frontend/apps/erd-sample/schema.rb`, `frontend/packages/cli/fixtures/input.schema.rb`, `frontend/packages/schema/src/parser/schemarb/input/schema1.in.rb`

## Design and architecture patterns
- test-driven development evidence (**inferred**) — Evidence: `frontend/internal-packages/db/supabase/tests/database/01-invite_organization_member.test.sql`, `frontend/internal-packages/db/supabase/tests/database/02-prevent_delete_last_organization_member.test.sql`, `frontend/internal-packages/db/supabase/tests/database/03-organization_members_rls.test.sql`, `frontend/apps/app/components/SessionDetailPage/components/Output/components/Artifact/utils/__tests__/extractTocItems.test.ts`, `frontend/apps/app/components/SessionDetailPage/components/Output/components/Artifact/utils/__tests__/formatArtifactToMarkdown.test.ts`, `frontend/apps/app/components/SessionDetailPage/components/Output/components/Artifact/utils/__tests__/generateHeadingId.test.ts`

## Evidence and limitations
- Reports are based on a fresh shallow clone. Safe, bounded documentation, manifests, source, and test files are inspected locally; raw source code is never copied into this report.
- README text and the GitHub description are excluded from project-purpose and feature claims because they may be stale.
- No additional inspection limitations were recorded.

## Nelson's contribution evidence
- 0 commits, 0 pull requests, 1 issues, 0 reviews
### Pull requests
No pull-request titles are available from the contribution API.
### Issues
- Prisma 7 not supported due to Missing url in schema (CLOSED) — https://github.com/liam-hq/liam/issues/4021
- Commit contributions are reported as aggregate counts; commit messages and diffs are not copied into this report.
- **Coverage limitation:** GitHub capped at least one contribution list; some contribution details may be omitted and commit totals may be partial.
