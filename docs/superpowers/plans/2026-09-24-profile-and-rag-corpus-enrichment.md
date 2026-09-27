# Profile and RAG Corpus Enrichment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrich Nelson's curated profile and all 133 repository/contribution reports, then re-index the 134 Markdown sources in the dedicated knowledge database without weakening privacy boundaries.

**Architecture:** Extend the existing owner-curated profile source and code-grounded GitHub analysis/Markdown renderer. Refresh reports through the existing local clone and safety pipeline; only persist a document's new vectors and Markdown after its content passes validation and embedding, preserving source IDs, per-source transactional upserts, and public/private classification.

**Tech Stack:** Bun, TypeScript, Bun test, GitHub CLI, local Qwen embedding sidecar, PostgreSQL/pgvector, existing GitHub clone-analysis and knowledge indexing services.

**Spec:** `docs/superpowers/specs/2026-09-24-profile-and-rag-corpus-enrichment-design.md`

## Global Constraints

- Keep all repository cloning and code inspection local; do not send private repository code or Markdown to hosted model providers.
- Apply the existing secret/content safety checks to generated Markdown before writing or indexing.
- Keep private owned/contribution documents under their existing `private` paths and index them with `is_public=false`; public chat retrieval must continue filtering to `is_public=true`.
- Never copy credentials, secret values, private keys, local configuration, or sensitive personal data into Markdown. The profile's name, codename explanation, education, work history, skills, and supplied public project references are intentionally owner-provided profile facts.
- Do not alter frontend project-card behavior or publish/stage private summaries as part of the corpus refresh.
- Preserve source identifiers, canonical URLs, chunking rules, 1024-dimensional vectors, and stable vector upsert/delete semantics.
- If a repository clone, code inspection, secret scan, embedding, or database write fails, preserve that source's last-known-good Markdown and vector chunks; do not perform stale-source deletion from an incomplete GitHub inventory.

## Review Focus

- Profile text must include the supplied education, role dates, WAM values, LinkedIn, and LST97 explanation exactly once, without addresses or the duplicated KC Renovation text; pin in `tests/server/knowledge-sources.test.ts`.
- SplitTab may be described as an expense-management app from Nelson's explicit context, but its stack/features must remain clone-evidence-based; pin both owner-context and missing-evidence behavior in `tests/server/github-repository-analysis.test.ts`.
- Search summaries must not promote stale README descriptions to source-derived facts; pin using a deliberately contradictory README fixture in `tests/server/github-repository-analysis.test.ts` and renderer assertions in `tests/server/github-summary-markdown.test.ts`.
- A failed safety check, embedding, or database upsert must not overwrite that source's Markdown or delete its previous vector rows; pin the index-before-write order and failure retention in `tests/server/github-knowledge-sync.test.ts` and the relevant profile sync test seam.
- Private documents must remain in private paths with `isPublic=false`, and incomplete inventories must skip stale cleanup; retain and extend existing cases in `tests/server/github-knowledge-sync.test.ts`.

---

### Task 1: Enrich the owner-curated profile source

**Files:**
- Modify: `src/server/knowledge/profile-source.ts`
- Test: `tests/server/knowledge-sources.test.ts`

**Interfaces:**
- Consumes: existing `createProfileKnowledgeSource(): KnowledgeSource & { listDocuments(): Promise<KnowledgeDocument[]> }`.
- Produces: the same stable `profile/operator-profile` document, with reviewed biographical facts and public profile URLs in retrieval-friendly prose.

- [ ] **Step 1: Replace the narrow profile assertion with fact-by-fact coverage.** In the existing `curated profile knowledge source` test, assert the source remains public with title `Nelson (LST97)` and URL `https://github.com/lst97`, then assert text includes the codename expansion, Hong Kong origin, LinkedIn URL, skills, all five qualifications and completion years, both WAM values, and each of the Rotary Club, ST Zita Cafe, Kmart Tyre & Auto Services, and KC Renovation role names/dates. Assert KC Renovation responsibilities appear once; omit street addresses and reject unrelated project-card copy.

- [ ] **Step 2: Run the focused test and confirm it fails on missing profile facts.** Run `bun test tests/server/knowledge-sources.test.ts`; expect the profile test to fail because the current source only contains the short developer summary and social URLs.

- [ ] **Step 3: Update the curated profile text.** Replace the single `summary` field in `src/server/knowledge/profile-source.ts` with a small immutable set of biography, education, work-history, skills, and activity paragraphs. Use owner-provided wording: Deakin College Diploma of Information Technology (2021); Deakin College Certificate IV in Information Technology (2021, 85% WAM); Deakin University Bachelor of Computer Science (2023, 70% WAM); Box Hill Institute of TAFE Diploma of Automotive Technology (2019); Hoyu Secondary School Certificate IV in Automotive (2016); Rotary Club of Melbourne Team Leader internship (Mar–May 2023); KC Renovation customer-service contract (Mar–Jun 2021); ST Zita Cafe kitchen-hand role (Oct 2021–Jul 2022); and Kmart Tyre & Auto Services mechanic placement (Jul 2019–Jan 2020). Keep GitHub and LinkedIn as separate labeled lines. Do not include street addresses, duplicated KC Renovation copy, or unsupported metrics.

- [ ] **Step 4: Run profile source tests.** Run `bun test tests/server/knowledge-sources.test.ts`; expect all source and payload tests to pass.

### Task 2: Make repository reports easier to retrieve and clarify owner context

**Files:**
- Modify: `src/server/knowledge/github-repository-analysis.ts`
- Modify: `src/server/knowledge/github-summary-markdown.ts`
- Modify: `src/server/knowledge/github-knowledge-sync.ts`
- Modify: `scripts/sync-github-knowledge.ts`
- Test: `tests/server/github-repository-analysis.test.ts`
- Test: `tests/server/github-summary-markdown.test.ts`

**Interfaces:**
- Consumes: cloned `GithubRepositorySnapshot`, repository metadata, and existing `GithubRepositoryAnalysis` evidence.
- Produces: an optional, explicitly owner-provided purpose field for the `lst97/splittab` repository only; rendered reports begin with a compact retrieval summary whose repository purpose, capabilities, stack, topics/synonyms, and contribution relationship are grounded in supplied context or inspected evidence.

- [ ] **Step 1: Add failing tests for compact summaries and the SplitTab context boundary.** In `tests/server/github-repository-analysis.test.ts`, add a cloned-source fixture whose README says the project is a blog while exported code and tests indicate expense splitting; assert the README claim is not used. Add a test that explicit owner context `Expense-management app for splitting shared costs.` becomes the purpose while technology/features still come only from clone evidence. In `tests/server/github-summary-markdown.test.ts`, assert the retrieval summary appears before metadata, includes the confirmed purpose and available stack/topic terms, identifies a contribution report as a contribution, and never converts `Unknown` evidence into a positive claim.

- [ ] **Step 2: Run focused analysis and renderer tests to confirm failure.** Run `bun test tests/server/github-repository-analysis.test.ts tests/server/github-summary-markdown.test.ts`; expect the new owner-context and retrieval-summary assertions to fail.

- [ ] **Step 3: Add a narrow owner-provided-purpose seam.** Add optional `ownerProvidedPurpose?: string` to the existing repository sync/analysis inputs. In `scripts/sync-github-knowledge.ts`, map only the case-normalized full repository identity `lst97/splittab` to the owner-provided expense-management sentence; pass it through sync into `analyzeGithubRepository`. When present, mark purpose as owner-provided (not inferred from code) and keep all features, frameworks, counts, and patterns derived from the local clone. Do not use GitHub description or README text as fallback purpose.

- [ ] **Step 4: Render a concise retrieval summary from trusted fields.** In `github-summary-markdown.ts`, add a `## Retrieval summary` immediately after the title. Use the selected purpose, up to three observed feature statements, the evidence-backed technology names, safe topics, and an explicit owned/contribution relation. Sanitize each value with the existing helpers, label owner context, and omit empty/unknown items rather than inventing synonyms. Keep detailed evidence sections unchanged.

- [ ] **Step 5: Run analysis and renderer tests.** Run `bun test tests/server/github-repository-analysis.test.ts tests/server/github-summary-markdown.test.ts`; expect all assertions to pass, including the stale README contradiction case.

### Task 3: Preserve per-source Markdown when indexing fails

**Files:**
- Modify: `src/server/knowledge/github-knowledge-sync.ts`
- Modify: `scripts/sync-github-knowledge.ts`
- Create: `src/server/knowledge/github-profile-markdown.ts`
- Create: `src/server/knowledge/github-profile-sync.ts`
- Test: `tests/server/github-knowledge-sync.test.ts`
- Test: `tests/server/github-profile-markdown.test.ts`
- Test: `tests/server/github-profile-sync.test.ts`

**Interfaces:**
- Consumes: validated report Markdown and `KnowledgeDocument` objects, existing atomic file writer, and transactional `upsertSourceChunks` via the indexer.
- Produces: no report file write until its document passes safety validation and the per-source vector upsert succeeds; generated `profile.md` uses the same content-safety and atomic-write boundary.

- [ ] **Step 1: Add a failure-retention test for report indexing.** In `tests/server/github-knowledge-sync.test.ts`, make `index()` throw for one report; assert its path is absent from writes, its source is not removed, and other successful reports continue under existing behavior. Keep the current incomplete-inventory cleanup test intact.

- [ ] **Step 2: Add profile rendering and sync use-case tests.** Extract profile-Markdown assembly into `src/server/knowledge/github-profile-markdown.ts`, exporting `renderGithubProfileMarkdown(input: { githubProfileMarkdown: string; curatedProfileMarkdown: string; wakaTimeMarkdown?: string; wakaTimeSourceUrl: string }): string`. Add `src/server/knowledge/github-profile-sync.ts` with `syncGithubProfileDocument(input: { document: KnowledgeDocument; outputPath: string; indexDocument(document: KnowledgeDocument): Promise<void>; writeAtomically(path: string, text: string): Promise<void> }): Promise<void>`; it content-checks `document.text`, awaits indexing, then atomically writes that exact text with one trailing newline. In `tests/server/github-profile-markdown.test.ts`, test sections and optional WakaTime handling. In `tests/server/github-profile-sync.test.ts`, test that unsafe Markdown and a rejected index never call the writer.

- [ ] **Step 3: Run the focused tests and confirm they fail.** Run `bun test tests/server/github-knowledge-sync.test.ts tests/server/github-profile-markdown.test.ts tests/server/github-profile-sync.test.ts`; expect the report failure-retention case to fail because the current sync writes before indexing and the profile module tests to fail until extraction exists.

- [ ] **Step 4: Index before atomic Markdown promotion.** In `syncGithubRepositoryReports`, preserve the existing metadata and safety validation, call `dependencies.index(rendered.document)` before `writeAtomically`, and increment `writtenCount` only after the atomic write. This relies on the existing database repository's transactional per-source upsert; if indexing fails, the old Markdown and old vector chunks remain untouched. Keep sanitization and public/private metadata checks before indexing.

- [ ] **Step 5: Apply the profile validation and write boundary.** In `scripts/sync-github-knowledge.ts`, build profile Markdown through `renderGithubProfileMarkdown`, construct the stable `github-profile/lst97-profile` document, and call `syncGithubProfileDocument` with the existing indexer and `writeMarkdownAtomically` helper for `src/data/profile.md`. Retain the existing source ID, title, and canonical URL.

- [ ] **Step 6: Run focused sync tests.** Run `bun test tests/server/github-knowledge-sync.test.ts tests/server/github-profile-markdown.test.ts tests/server/github-profile-sync.test.ts`; expect failures to leave existing report files and index rows unchanged, and successful writes/indexes to retain their existing metadata.

### Task 4: Refresh the corpus and verify live RAG indexing

**Files:**
- Generated: `src/data/profile.md`
- Generated: existing 133 Markdown files under `src/data/github/`
- No migration or frontend files.

**Interfaces:**
- Consumes: updated curated profile source, current complete GitHub/contribution inventory, local clone pipeline, safety checks, local Qwen embedding service, and the dedicated knowledge database.
- Produces: 134 refreshed Markdown files and corresponding updated knowledge vectors with stable source IDs and existing visibility classification.

- [ ] **Step 1: Run the focused unit suite and typecheck before external sync.** Run `bun test tests/server/knowledge-sources.test.ts tests/server/github-repository-analysis.test.ts tests/server/github-summary-markdown.test.ts tests/server/github-knowledge-sync.test.ts tests/server/github-content-safety.test.ts` and `bun run typecheck`; both must pass before touching generated data or the live index.

- [ ] **Step 2: Run the existing end-to-end corpus syncs with the local embedding service.** Run `bun run knowledge:github:sync` from the repository root with the configured GitHub CLI authentication, knowledge database, and local Qwen embedding environment; it refreshes `github-profile/lst97-profile` plus repository/contribution sources. Then run `bun run knowledge:sync` to refresh the separate curated `profile/operator-profile` record alongside the existing Payload/WakaTime sources. Do not switch document embeddings to SiliconFlow or send repository text to any hosted service. Require complete GitHub inventory and zero failed repository refreshes; inspect and report any unrelated source failures from `knowledge:sync`.

- [ ] **Step 3: Verify corpus coverage and secret scan.** Run `rg --files src/data -g '*.md' | wc -l` and expect `134`. Then run `bun -e 'import { assertSafeGithubMarkdown } from "./src/server/knowledge/github-content-safety.ts"; let count = 0; for await (const path of new Bun.Glob("src/data/**/*.md").scan(".")) { assertSafeGithubMarkdown(await Bun.file(path).text()); count += 1 }; console.log(JSON.stringify({ markdownFiles: count, safe: true }))'` and expect `{"markdownFiles":134,"safe":true}`. Verify no private reports moved out of `private/` and the generated profile omits street addresses and duplicated KC Renovation paragraphs.

- [ ] **Step 4: Reconcile database visibility and IDs.** Query the dedicated knowledge database read-only for distinct `(source_type, source_id, is_public)` and per-source chunk counts. Confirm both profile records (`github-profile/lst97-profile` and `profile/operator-profile`) are current, repository IDs match report identities, private sources remain `is_public=false`, and no private source appears in the existing public search path.

- [ ] **Step 5: Verify retrieval on representative questions.** Using the existing retrieval service and configured query-time SiliconFlow embeddings, check answers/evidence for “What does LST97 mean?”, “What did Nelson study?”, “What experience did Nelson gain at KC Renovation?”, “What did Nelson contribute to?”, and “What is SplitTab?”. Confirm citations point to refreshed profile/repository sources and private content is absent.

### Task 5: Run final verification and report results

**Files:**
- Test: full repository test suite; no source files unless verification reveals a scoped defect.

- [ ] **Step 1: Run all tests.** Run `bun test`; record any failure unrelated to this change separately rather than modifying unrelated worktree changes.

- [ ] **Step 2: Run typecheck and whitespace validation.** Run `bun run typecheck` and `git diff --check`.

- [ ] **Step 3: Review only the task diff and report the verified state.** Inspect `git status --short`, `git diff --stat`, the 134 generated Markdown files, and the sync/index logs. Report test results, file/chunk counts, visibility check results, any baseline failures, and any live DB/retrieval checks that could not run. Do not stage or commit unrelated user work.
