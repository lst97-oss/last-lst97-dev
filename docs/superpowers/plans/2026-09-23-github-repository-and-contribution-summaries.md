# GitHub Repository and Contribution Summaries Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate evidence-backed Markdown summaries from local clones of every owned repository and every discoverable third-party contribution repository, while preventing secrets/private content from leaking into generated reports or public RAG retrieval.

**Architecture:** Extend the current `knowledge:github:sync` orchestration with typed GitHub contribution discovery, an isolated local repository inspector, a fail-closed sensitive-content gate, and deterministic Markdown rendering. Keep source-code analysis local, preserve last-known-good reports/index rows for incomplete repositories, and continue indexing private sources only with `is_public=false`.

**Tech Stack:** Bun, TypeScript, GitHub CLI (`gh`), Git, Zod, existing pgvector knowledge repository, Bun tests.

**Spec:** `docs/superpowers/specs/2026-09-23-github-repository-and-contribution-summaries-design.md`

## Global Constraints

- Do not stage, commit, push, or publish any files.
- Do not send private repository content or contribution metadata to hosted LLMs or third-party summarization APIs.
- Do not expand GitHub CLI OAuth scopes automatically; incomplete contribution visibility must be reported safely.
- Do not log private repository names, contribution content, secret matches, or raw GitHub errors.
- Public retrieval must continue to use the strict `is_public = true` filter.
- Repository evidence must be allowlisted, factual, and labeled as inferred when it is not explicitly documented.
- On partial inventory, clone, or analysis failure, preserve last-known-good Markdown and indexed chunks; only perform stale-source cleanup after a complete inventory.

## Review Focus

- GitHub contribution history exceeds one year or a per-category result cap — query each reported contribution year and mark a capped inventory incomplete rather than omitting repositories silently.
- Private/internal contribution scope is unavailable — exclude undisclosed facts, mark coverage incomplete, and preserve prior records.
- Repositories contain committed `.env`, credential, private-key, dump, or log files — never read those paths into summaries and fail closed on detected secret values.
- GitHub CLI metadata includes null, empty, or renamed fields — normalize at the API boundary and retain repository validation.
- A third-party clone fails while other repositories succeed — preserve its previous report/chunks and prevent run-wide stale deletion.

---

### Task 1: Typed GitHub contribution inventory

**Files:**
- Create: `src/server/knowledge/github-contributions.ts`
- Test: `tests/server/github-contributions.test.ts`
- Modify: `scripts/sync-github-knowledge.ts`

**Interfaces:**
- Consumes GitHub CLI GraphQL results for contribution years and each year's commit, pull-request, issue, and pull-request-review repository groups.
- Produces `GithubContributionRepository` records with `fullName`, `owner`, `url`, `isPrivate`, counts by contribution kind, PR/issue title-status-URL references when available, and `complete` / `incompleteReasons` coverage fields.
- Provides `aggregateGithubContributions(yearResponses)` as a pure normalizer that unions repository records by canonical `owner/name`, sums counts across years, preserves unique contribution references, and identifies incomplete responses.

- [ ] **Step 1: Write the failing aggregate and normalization tests**

Test that two years of commit/PR/issue/review evidence for the same repository merge into one record, repositories owned by `lst97` are excluded from the third-party result, duplicate PR references are deduplicated by canonical URL, and a permission/API error marks the inventory incomplete without discarding successful evidence.

```ts
expect(aggregateGithubContributions([year2025, year2026])).toEqual({
  repositories: [expect.objectContaining({
    fullName: 'community/tool',
    counts: { commits: 4, pullRequests: 1, issues: 0, reviews: 1 },
  })],
  complete: true,
  incompleteReasons: [],
})
```

- [ ] **Step 2: Run the focused test and confirm the intended RED result**

Run: `bun test tests/server/github-contributions.test.ts`

Expected: FAIL because the contribution aggregate module/export does not exist yet.

- [ ] **Step 3: Implement typed GraphQL response parsing and pure aggregation**

Use Zod schemas at the GitHub boundary. Construct one GraphQL query per contribution year, request the four repository-grouped contribution categories, parse repository visibility and safe contribution references, and normalize API failures to an incomplete result without serializing raw errors. Keep query execution behind an injected `GithubContributionsGateway` so unit tests do not call GitHub.

```ts
export interface GithubContributionsGateway {
  getContributionYears(): Promise<number[]>
  getContributionsForYear(year: number): Promise<unknown>
}

export function aggregateGithubContributions(
  yearResponses: readonly GithubContributionYearResult[],
): GithubContributionInventory
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `bun test tests/server/github-contributions.test.ts`

Expected: all aggregate, deduplication, owner-filtering, and incomplete-coverage cases pass.

- [ ] **Step 5: Run typecheck for the new domain boundary**

Run: `bun run typecheck`

Expected: TypeScript exits successfully with no diagnostics.

### Task 2: Local repository inspection and evidence extraction

**Files:**
- Create: `src/server/knowledge/github-repository-inspector.ts`
- Create: `src/server/knowledge/github-repository-analysis.ts`
- Test: `tests/server/github-repository-inspector.test.ts`
- Test: `tests/server/github-repository-analysis.test.ts`

**Interfaces:**
- Consumes normalized owned-repository or contribution-repository metadata and an injected command runner.
- Produces `GithubRepositorySnapshot` containing tracked paths and allowlisted text-file contents only; it must not contain excluded secret/config paths, binary contents, dependency trees, or `.git` data.
- Produces `GithubRepositoryAnalysis` with documented purpose/problem/features, tracked-file totals and groups, language/framework/stack evidence, design-pattern evidence, and explicit unknown/inferred markers.
- Exposes `inspectGithubRepository(repository, tempParent, commandRunner)` and pure `analyzeGithubRepository(snapshot, repositoryMetadata)` functions.

- [ ] **Step 1: Write failing tests for path allowlisting, safe clone arguments, and cleanup**

Test that the clone command uses `gh repo clone` with an explicit unique temporary destination and shallow/blob-filtered/no-checkout flags; `.env`, key/certificate, secret-store, dump, log, generated dependency, binary, and `.git` paths are excluded; temporary storage cleanup runs after both successful inspection and a thrown read error; and private names are not added to logs.

- [ ] **Step 2: Run inspector tests and confirm RED**

Run: `bun test tests/server/github-repository-inspector.test.ts`

Expected: FAIL because the inspector contract and path policy do not exist yet.

- [ ] **Step 3: Implement safe temporary clone and allowlisted reads**

Use `Bun.spawn` for `gh`, `git`, and narrowly scoped filesystem utilities; never interpolate repository-supplied file paths into a shell command. Clone each repository into a unique temporary directory with `--depth 1 --filter=blob:none --no-checkout`, obtain tracked paths from `git ls-tree`, and fetch only bounded text files from the allowlist using argument-array subprocess calls. Ensure cleanup in `finally`, cap file sizes and total inspection bytes, and convert failures into sanitized per-repository results.

- [ ] **Step 4: Write failing tests for file counts and evidence-based stack/pattern analysis**

Fixtures must verify total and grouped tracked-file counts, detection of TypeScript/React/Vite from manifests, Python/FastAPI from Python manifests, and architecture hints only when their evidence paths exist (for example, `domain/`, `application/`, and `infrastructure/` for a layered/ports-and-adapters inference). A repository with no useful docs/manifests must produce explicit unknown purpose/features rather than invented claims.

- [ ] **Step 5: Run analysis tests and confirm RED**

Run: `bun test tests/server/github-repository-analysis.test.ts`

Expected: FAIL because the pure analyzer does not exist yet.

- [ ] **Step 6: Implement pure analysis over the snapshot**

Count tracked files by extension/category. Parse only bounded allowlisted formats such as `README.md`, `package.json`, `bun.lock`/lock metadata, `pyproject.toml`, `requirements.txt`, `Cargo.toml`, `go.mod`, `composer.json`, `Gemfile`, and `.csproj`. Extract headings and non-code prose as candidate documentation evidence; record relative evidence paths for every supported project-purpose, feature, stack, and pattern claim. Do not copy arbitrary source code into output.

- [ ] **Step 7: Run both focused test files and verify GREEN**

Run: `bun test tests/server/github-repository-inspector.test.ts tests/server/github-repository-analysis.test.ts`

Expected: all clone-policy, cleanup, exclusion, file-count, evidence, and uncertainty tests pass.

### Task 3: Contribution detail collection and safe Markdown rendering

**Files:**
- Create: `src/server/knowledge/github-content-safety.ts`
- Create: `src/server/knowledge/github-summary-markdown.ts`
- Test: `tests/server/github-content-safety.test.ts`
- Test: `tests/server/github-summary-markdown.test.ts`
- Modify: `src/server/knowledge/types.ts`
- Modify: `src/server/knowledge/github-markdown.ts`

**Interfaces:**
- Consumes `GithubRepositoryAnalysis` and an optional `GithubContributionRepository` for third-party repositories.
- Produces deterministic Markdown with the required purpose/problem/features, metadata, file counts, stack, patterns, evidence/limits, and contribution sections.
- Provides `inspectSensitivePath(path): boolean`, `sanitizeEvidenceText(text): SanitizationResult`, and `assertSafeGithubMarkdown(markdown): void`. The sanitizer must not return secret values in errors or logs.
- Maps all private reports to a private source type and `isPublic: false`; public third-party contribution reports use a public contribution source type.

- [ ] **Step 1: Write failing content-safety tests**

Cover safe prose, common GitHub/cloud/API credentials, high-entropy credential assignments, PEM/private-key markers, unsafe path names, and Markdown output that still contains a match after attempted redaction. Assert only a generic finding code/count is returned and matched values never appear in test output.

- [ ] **Step 2: Run content-safety test and confirm RED**

Run: `bun test tests/server/github-content-safety.test.ts`

Expected: FAIL because the sensitive-path and content-safety module does not exist.

- [ ] **Step 3: Implement allowlist path policy and fail-closed safety checks**

Exclude sensitive file paths before reads. Redact only well-defined secret formats; for ambiguous credential-bearing paragraphs omit the full evidence paragraph. Run a final high-confidence secret scan on the rendered Markdown and reject the document if a secret remains. Return generic codes such as `credential_pattern` without capturing the matched text.

- [ ] **Step 4: Run content-safety tests and verify GREEN**

Run: `bun test tests/server/github-content-safety.test.ts`

Expected: all safe-content, blocked-path, redaction, fail-closed, and no-secret-in-error assertions pass.

- [ ] **Step 5: Write failing Markdown-rendering tests**

Assert that each report includes purpose, problem, features, visibility, tracked-file totals/categories, stack and evidence, pattern evidence with `inferred` labels when applicable, contribution counts and available PR/issue titles/status/URLs, and limitations. Assert private output contains no raw README/code and carries non-public source metadata.

- [ ] **Step 6: Run the Markdown test and confirm RED**

Run: `bun test tests/server/github-summary-markdown.test.ts`

Expected: FAIL because the evidence-backed renderer does not exist.

- [ ] **Step 7: Implement deterministic renderer and source types**

Render only sanitized facts and references. Use `unknown` when evidence is absent. Keep evidence paths relative to repository root, cap rendered text and contribution-reference counts, include a truncation marker, and assign stable source IDs/URLs for owned versus contributed repositories. Preserve existing profile and WakaTime document behavior.

- [ ] **Step 8: Run focused renderer and safety tests and verify GREEN**

Run: `bun test tests/server/github-content-safety.test.ts tests/server/github-summary-markdown.test.ts tests/server/github-markdown.test.ts`

Expected: all new renderer/security tests and existing repository/profile Markdown tests pass.

### Task 4: Safe sync orchestration, private trackability, and RAG indexing

**Files:**
- Modify: `scripts/sync-github-knowledge.ts`
- Modify: `.gitignore`
- Modify: `docs/knowledge-rag.md`
- Create: `tests/server/github-knowledge-sync.test.ts`
- Modify: `src/server/knowledge/repository.ts`
- Modify: `src/server/knowledge/database-migration.ts`
- Modify: `tests/server/knowledge-database-migration.test.ts`
- Modify: `tests/server/knowledge-retrieval.test.ts`

**Interfaces:**
- Composes the contribution gateway, local inspector, content-safety policy, renderer, Markdown writer, and existing index repository.
- Generates owned summaries under `src/data/github/public/` and `src/data/github/private/`; third-party reports under `src/data/github/contributions/public/` and `src/data/github/contributions/private/`.
- Upserts only complete, safety-approved repository documents. A complete inventory is required before removing stale sources; failed or incomplete sources preserve prior reports and chunks.
- Private source IDs and content remain redacted from logs and filtered from public vector search.

- [ ] **Step 1: Write failing orchestration tests**

Use injected fake gateway/inspector/writer/index repository dependencies. Verify all owned and contributed repositories are rendered to the visibility-appropriate paths; private documents index as `isPublic: false`; unsafe or failed reports do not overwrite existing Markdown/chunks; incomplete contribution inventory does not run stale cleanup; stale cleanup runs after complete success; and logs contain no private repository identifier or secret text.

- [ ] **Step 2: Run orchestration tests and confirm RED**

Run: `bun test tests/server/github-knowledge-sync.test.ts`

Expected: FAIL because the safe sync service contract does not exist.

- [ ] **Step 3: Implement sync service and atomic safe writes**

Extract orchestration from the top-level script into a dependency-injected service. Inspect repositories with bounded concurrency, stage generated reports in memory or temporary output files, run the safety gate before atomic replacement, and separately track complete/incomplete source IDs. Do not remove old indexed rows when the inventory, clone, or sanitizer result is incomplete. Keep repository identifiers out of private failure logs.

- [ ] **Step 4: Update the CLI script and remove the private ignore rule**

Wire the CLI to the new service and preserve profile/WakaTime sync. Remove only `/src/data/github/private/` from `.gitignore`; do not add files to the index or alter unrelated ignore rules. Keep generated clone directories outside the project tree and clean them on all exit paths.

- [ ] **Step 5: Run orchestration, indexing, and retrieval tests and verify GREEN**

Run: `bun test tests/server/github-knowledge-sync.test.ts tests/server/knowledge-index-source.test.ts tests/server/knowledge-repository.test.ts tests/server/knowledge-retrieval.test.ts tests/server/knowledge-database-migration.test.ts`

Expected: all tests pass; the real pgvector test may remain skipped unless `KNOWLEDGE_TEST_DATABASE_URL` is configured.

- [ ] **Step 6: Update operational documentation**

Document the expanded GitHub sync outputs, the temporary clone/inspection process, the GitHub scopes required for private contributions, the incomplete-inventory behavior, the private Markdown tracking/publishing risk, and the fact that the command never stages or pushes files. Keep the independent RAG database setup and public retrieval rule explicit.

- [ ] **Step 7: Run complete verification**

Run: `bun run typecheck && bun test && git diff --check`

Expected: typecheck succeeds, the full test suite reports zero failures, and `git diff --check` reports no whitespace errors.

- [ ] **Step 8: Run the authenticated local sync and inspect only aggregate/sanitized results**

Run: `bun run knowledge:github:sync`

Expected: a sanitized aggregate summary reports repository/report counts and any incomplete coverage without printing private names, contribution text, secret values, or raw errors. Verify public/private output counts, `.gitignore` behavior, and database `is_public` aggregates with SQL that returns counts only. Do not stage, commit, or push.
