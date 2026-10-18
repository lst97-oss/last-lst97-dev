# `src/server/knowledge` — RAG index (owner knowledge)

## Role / pipeline position

Read path (chat, wired in `server/chat/runtime.ts`): message → `query-resolution` → `embedding-client` (query) → `repository.search` (exact pgvector scan, 30 candidates) → diversity trim (≤10) → `siliconflow-reranker` → dedupe/top-3 → `relevance-gate` (per-document direct-support decision) → evidence budget → `prompt-evidence` (untrusted block) → citations to the browser. `retrieve.ts` is the only entry the chat calls (`RetrieveKnowledge.execute`). `scripts/knowledge/eval-retrieval.ts` (`bun run knowledge:eval`) measures every stage against a golden query set; it reads the index and never writes.

Write path (worker/jobs/CLIs): `*-source.ts` → `chunking` → `index-source` (embed document) → `repository.upsertSourceChunks`. Triggered by Payload hooks/tasks (`payload-hooks`, `payload-tasks`, `payload-runtime`, `jobs`) and by the CLIs in `scripts/knowledge/` (`sync-knowledge`, `sync-github-knowledge`, `reindex-github-reports`, `index-interview-knowledge`, `index-services-knowledge`, `migrate-knowledge`, `import-wakatime-history`).

Store: `database.ts` (Bun SQL client + drizzle bun-sql adapter), `repository/database-adapter.ts` (normalizes Bun SQL's row arrays to the `{ rows }` port), `database-migration.ts` (schema), `repository.ts` (upsert/remove/list/search facade and stable port), and `repository/` (chunk and catalogue persistence internals). `types.ts` holds the ports (`EmbeddingPort`, `RerankerPort`, `KnowledgeRelevancePort`) and row shapes. Sources: `payload-source` (posts/projects), `profile-source` (curated bio — **generator only, not indexed**; its text is merged into `github-profile`/`lst97-profile` by `renderGithubProfileMarkdown`, so indexing it separately stored the same biography under two identities), `wakatime-source` (public share JSON), `github/source.ts` (currently unwired lightweight API), `github/contributions.ts` (API inventory).

Note: `database-migration.ts` also owns the WakaTime heartbeat/rollup tables because they share the knowledge DB.

## Invariants

- **Private evidence is retrievable and labelled.** `repository.search` returns every row and carries `is_public`; `retrieve` keeps non-http(s) URLs out but serves private chunks, stamps `isPublic: false` on the citation, and `prompt-evidence` labels them "private repository (sanitized summary; safe to summarize for the user)". The policy in `chat/openrouter-responder.ts` allows describing the project while forbidding claims that a visitor can view the source. Re-filtering to public-only in SQL would silently drop these — do not.
- **Vector search is exact, not approximate.** `repository.search` runs `SET LOCAL enable_indexscan = off` inside a transaction so the `ORDER BY "embedding" <=> …` cannot take an HNSW walk: an approximate walk can miss the true nearest chunk, and no reranker or gate can recover a chunk that never entered the pool. The sequential scan costs single-digit milliseconds at this corpus size; revisit above roughly 10^4–10^5 chunks, where a high `hnsw.ef_search` is the right trade. `SET LOCAL` only applies inside a transaction, which is why the search runs through `database.transaction` rather than a bare `execute`.
- **Evidence is untrusted data.** `prompt-evidence` wraps text in `<untrusted_evidence>` with `<`/`>`/`&` escaped and JSON-quoted content; never render chunk text as instructions.
- **No fabrication.** `renderGithubRepositorySummary` must emit `Unknown: …` rows and limitations instead of guessing when evidence is missing; `analyzeGithubRepository` marks inferences (`inferred: true`).
- **Sanitize before persisting.** `assertSafeGithubMarkdown` / `sanitizeEvidenceText` / `inspectSensitivePath` gate any GitHub-derived markdown; secrets, credential assignments, PEM blocks, and emails never reach files, the index, or logs. Logs use `[private]` for non-public source ids.
- **Upsert is the unit of truth.** `upsertSourceChunks` replaces all chunks for a `(source_type, source_id)` inside one transaction and deletes stale indices; delete a source instead of zero-chunk writes. Not-found / unpublished / empty content ⇒ `removeSource`, not an error.
- **Fail-additive.** A failed repository refresh keeps its last-known-good report and chunks; stale-source deletion only runs when the inventory was complete (`github/knowledge-sync.ts`). Sync/index errors are sanitized (fixed message, no provider body).
- **Public/private type pairing.** Source type is chosen from (owned|contribution) × (public|private); `isPublic === !isPrivate` is asserted before indexing a report. `KnowledgeSourceReference.type` must satisfy the DB `CHECK` list — new types need the schema, zod enum, and types updated together.

## Conventions

- Every external dependency is constructor-injected with a default (`fetcher = fetch`, `GithubCommandRunner`, `now`, `embedding`); tests pass fakes through these params. Do not inline network/process calls.
- Ports + `Pick<…>` dependency objects; factories return frozen-shaped objects, no classes except typed errors.
- The knowledge store runs on `drizzle-orm/bun-sql`; `db.execute()` returns the rows array, not node-postgres's `{ rows }`. Always go through `createKnowledgeDatabase` (`repository/database-adapter.ts`) so the repository port stays `{ rows }`. `payload-runtime.ts` dynamic-imports `database.ts` because `payload.config.ts` is loaded under Node by the local Payload CLI; a static import would pull in the `bun` module and break `generate:types` and `migrate`.
- Validate at the boundary with zod (`safeParse`) or explicit asserts, then trust the parsed value; throw fixed sanitized messages.
- Sizes are named constants near the top (`MAX_*`); dimensions `1024` are asserted in `repository`, `embedding-client`, and `index-source`. Durations are `timeoutMs`; timing logs use `durationMs: Math.max(0, Math.round(now() - startedAt))`.
- Sources are `async fetch(sourceId) => KnowledgeDocument | null` with a single well-known id (`operator-profile`, `wakatime-all-time`) and optional `listDocuments`; ids are the sync/dedupe key.
- Constants tuned together: `retrieve.VECTOR_CANDIDATE_LIMIT = 30`, with the repository clamp `MAX_VECTOR_SEARCH_RESULTS = 40` (keep the clamp ≥ the pool, or the pool silently shrinks); `RERANK_CANDIDATE_LIMIT = 10` matching reranker `MAX_CANDIDATES = 10`; `MAX_CHUNKS_PER_SOURCE_FOR_RERANK = 2`, because the final selection dedupes to one chunk per source and one source's chunk cluster must not fill the rerank window; `FINAL_CANDIDATE_LIMIT = 3`; `relevance-gate` thresholds are `0.60` for both direct-support Noul probabilities; `evidenceBudget` default 5,000 chars (cap 20,000).
- Chunk text opens with the document's `chunkContextPrefix` — repeated on **every** chunk, not just the first — and `chunkHeadingDelimitedDocument` additionally prefixes a nested section with its ancestor breadcrumb (`## Section → Subsection`) before the body. The parsers put identity headers (`## Project: …`, the offering label, the interview question, the report title) in `chunkContextPrefix`, never in `text`: `text` is windowed, so a header left in `text` reaches the first chunk only.
- Dedupe is by source identity (`type:sourceId`), not chunk id — several chunks of one post would otherwise surface as K1/K2/K3 with the same title/URL.
- Cron and retry policy live in `payload-tasks.ts` (`KNOWLEDGE_SYNC_CRON` in `jobs.ts`); `payload.config.ts` registers the tasks and auto-run queue.
- RAG is opt-in: `KNOWLEDGE_RAG_ENABLED=false` by default. `chat` degrades (`knowledgeUnavailable`) when retrieval fails; it must never block a reply.

- **Project deep-dive documents carry their project in every chunk.** `src/data/projects/<project>/*.md` is
  one hand-authored document per topic per project, for the three projects that get asked about in depth
  (`gnaf-address-autocomplete`, `smartplay-hk-oss`, `wat-wat-new-zealand`). The folder is the only source of
  truth for which project a document belongs to and for whether that project is public — `parseProjectDocument`
  rejects an unknown folder, and rejects a `**Visibility:**` line that disagrees with the folder, rather than
  defaulting either. Both matter: every chunk prefix states the project, and `isPublic` decides whether the
  citation is marked private, so a wrong folder attributes a chunk to the wrong build or invites the responder
  to imply a private repository is viewable. `sourceId` stays the bare file name, so `source_id` rows are
  unchanged by adding or removing a topic. Adding a project folder is a four-file change: `PROJECT_LABELS` and
  `PRIVATE_PROJECT_LABELS` in `project-document.ts` stay in lockstep, and the source type must satisfy the DB
  `CHECK` list. The corpus is authored, not derived: no script generates or rewrites it.

- **Services documents carry their offering in every chunk.** `src/data/services/<offering>/*.md`
  is split into `packages/` (new website builds) and `support/` (Go Support Plan). The folder is
  the only source of truth for a document's offering — never infer it from prose — and
  `parseServicesDocument` rejects an unknown folder instead of defaulting, so a mistyped path
  fails the index run rather than silently merging both offerings. The label is emitted as the
  FIRST line of the chunk prefix; `chunking` repeats that prefix on every chunk, so a chunk that
  begins mid-document still states its offering before it states anything else. `sourceId` stays
  the bare file name, so `source_id` rows are unchanged by the split and no stale-row purge is
  needed.

## Do not "fix" without a change request

- `github/source.ts` is currently unwired (only tests use it): `createPayloadKnowledgeSourceList` deliberately omits it so lightweight API docs cannot overwrite clone-inspected summaries. Re-adding it is an OpenSpec change, not a cleanup.
- `IndexKnowledgeSource.execute` (public-only, removes non-public) vs `executeDocument(..., allowPrivate=true)` (full sync path) — both are intentional.
- `github/knowledge-sync.ts` caps workers at 3 and is the only place that writes report files; keep the write-after-index ordering and the metadata assertions.
- Private summaries under `src/data/github/private/` are intentionally tracked: they are sanitized summaries, not source, and the sanitizer test scans every committed report. `knowledge:github:sync` still never stages or commits.
