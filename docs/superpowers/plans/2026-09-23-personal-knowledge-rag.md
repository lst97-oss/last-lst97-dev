# Personal Knowledge RAG Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ground portfolio chat in curated and public owner knowledge using local Qwen embeddings, pgvector top-10 retrieval, SiliconFlow top-3 reranking, and cited OpenRouter answers.

**Architecture:** Keep domain policy and orchestration behind typed ports in `src/server/knowledge`. Bun scripts manage the local `llama-server` process, loading the user's Unsloth-downloaded Qwen3 Embedding GGUF with embedding mode, Qwen query instruction, last-token pooling, normalized vectors, and an OpenAI-compatible API. Store public chunks and 1024-dimensional embeddings in a private PostgreSQL table; run indexing through Payload jobs on a separate Bun worker. Integrate retrieval after moderation and return only public citation metadata to clients.

**Tech Stack:** Bun, TypeScript, llama.cpp `llama-server` with local Unsloth-downloaded Qwen3-Embedding GGUF, Zod, Payload CMS 4 canary, PostgreSQL/pgvector, OpenAI-compatible embeddings HTTP endpoint, SiliconFlow rerank HTTP API, existing OpenRouter SDK, Bun tests.

**Spec:** `docs/superpowers/specs/2026-09-23-personal-knowledge-rag-design.md`

## Global Constraints

- Use `Qwen3-Embedding-0.6B` at 1024 dimensions, `Qwen/Qwen3-Reranker-0.6B`, pgvector top 10, reranked top 3.
- Keep `SILICONFLOW_API_KEY` server-only; never place a secret in tracked files, logs, tests, or client bundles.
- Local development starts `llama-server` for the configured Unsloth-downloaded GGUF, binding only to loopback and serving OpenAI-compatible `/v1/embeddings` plus health/readiness; production must configure an explicit compatible endpoint or its own sidecar deployment.
- Run Jev moderation before embedding, retrieval, reranking, or LLM calls.
- Never forward full chat history to SiliconFlow; resolve a short query and send only bounded public candidate text.
- Retrieved/user content is untrusted evidence, never instructions. Require citations for personal claims and avoid fabricating unsupported facts.
- External GitHub/WakaTime sync runs as bounded Payload jobs on a separate Bun worker, not in request handlers.
- Remove or exclude unpublished, deleted, private, and stale source chunks; indexing must be idempotent.
- Use Bun-native runtime facilities where practical and existing structured logger conventions.
- All feature behavior is developed test-first; live provider calls are excluded from the default test suite.

## Review Focus

- Malformed or oversized embedding/reranker responses: adapters reject them and never trust arbitrary candidate IDs.
- Prompt injection inside a retrieved README or post: it remains delimited untrusted evidence and cannot override system policy.
- A document becomes draft/private while an indexing job is queued: the job removes/excludes it rather than reintroducing stale public text.
- Provider timeout or outage: reranking falls back to vector order; embedding/retrieval outage does not produce unsupported personal claims.
- A request is general knowledge with no matching owner content: general chat remains usable and does not invent personal citations.

---

### Task 1: Environment and inference adapters

**Files:**
- Modify: `src/server/env-schema.ts`
- Modify: `src/server/env.ts`
- Modify: `.env.example`
- Create: `scripts/embedding-process.ts`
- Create: `scripts/dev-with-embedding.ts`
- Create: `scripts/start-embedding.ts`
- Create: `src/server/knowledge/types.ts`
- Create: `src/server/knowledge/embedding-client.ts`
- Create: `src/server/knowledge/siliconflow-reranker.ts`
- Test: `tests/server/env.test.ts`
- Test: `tests/server/knowledge-providers.test.ts`
- Test: `tests/server/embedding-process.test.ts`

**Interfaces:**
- `EmbeddingPort.embed(input: { text: string; kind: 'query' | 'document' }): Promise<number[]>`; local requests target managed `llama-server` at its OpenAI-compatible `/v1/embeddings` API.
- `RerankerPort.rerank(input: { query: string; candidates: KnowledgeCandidate[]; limit: number }): Promise<RankedKnowledgeCandidate[]>`
- `KnowledgeCandidate` carries opaque stable ID, bounded text, and source metadata; provider adapters do not own persistence.

- [x] **Step 1: Add env tests first** for valid/invalid `SILICONFLOW_API_KEY`, `KNOWLEDGE_EMBEDDING_URL`, `UNSLOTH_EMBEDDING_MODEL_PATH`, `KNOWLEDGE_EMBEDDING_SERVER_PATH`, embedding host/port, and optional local model identifier, asserting missing optional provider credentials do not break unrelated site startup.
- [x] **Step 2: Run `bun test tests/server/env.test.ts`** and observe failure specifically because the new env fields are missing.
- [x] **Step 3: Implement env schema/runtime mapping** and add only variable names/placeholders to `.env.example`; do not print or copy local secret values.
- [x] **Step 4: Add launcher tests first** for exact llama-server arguments and safe loopback/GGUF validation; observe failure before implementation.
- [x] **Step 5: Implement Bun lifecycle scripts** using `Bun.spawn`: launch configured `llama-server`, wait for health/readiness, propagate failures, forward termination signals, and avoid orphan processes. Keep launch optional for non-chat/Payload commands.
- [x] **Step 7: Add provider adapter tests** using injected fetch: valid 1024-vector response; reject wrong dimensions, non-finite numbers, non-2xx responses, malformed JSON; validate reranker IDs belong to submitted candidates, clamp output to three, and ensure request bounds.
- [x] **Step 8: Run `bun test tests/server/knowledge-providers.test.ts`** and observe missing adapter behavior before implementation.
- [x] **Step 9: Implement HTTP adapters** with configured timeouts, cancellation, response validation, sanitized errors, and no content/key logging. Embedding requests target managed local `llama-server`; rerank uses SiliconFlow `/v1/rerank` and server-only bearer auth.
- [x] **Step 10: Run launcher tests, both targeted Bun test files, then `bun run typecheck`.**

### Task 2: pgvector schema and repository

**Files:**
- Modify: `docker-compose.yml`
- Modify: `src/migrations/index.ts`
- Create: `src/migrations/20260923_020000_add_knowledge_chunks.ts`
- Create: `src/server/knowledge/repository.ts`
- Test: `tests/server/knowledge-repository.test.ts`
- Test: `tests/server/knowledge-migration.test.ts`

**Interfaces:**
- `KnowledgeIndexRepository.upsertSourceChunks(sourceId, chunks): Promise<void>` atomically upserts current chunks and removes stale chunks for that source.
- `KnowledgeIndexRepository.removeSource(sourceId): Promise<void>`.
- `KnowledgeIndexRepository.search(vector, limit): Promise<KnowledgeCandidate[]>` returns only currently public/eligible rows and uses cosine distance.

- [x] **Step 1: Write repository contract tests** for stable-ID upsert, replacement/removal of stale chunks, visibility filtering, parameterized vector search capped at ten, and dimension mismatch rejection.
- [x] **Step 2: Run `bun test tests/server/knowledge-repository.test.ts`** and observe the missing repository contract.
- [x] **Step 3: Add pgvector integration tests** that skip only when `KNOWLEDGE_TEST_DATABASE_URL` is absent; tests must create/use the extension, verify 1024 dimensions, nearest-neighbor ordering, and rollback-safe source replacement. (Added; skipped in this run because the test database URL is not configured.)
- [x] **Step 4: Run `bun test tests/server/knowledge-migration.test.ts`** and confirm the missing migration/table failure.
- [x] **Step 5: Use an official pgvector Postgres image locally** and add reversible migration creating extension/table/indexes plus source/provenance/visibility/content-hash fields. Parameterize dynamic values; never interpolate input into SQL.
- [x] **Step 6: Implement repository transactions** using the project's Postgres/Payload database connection and verify the `vector(1024)` casts/index query against the installed driver.
- [x] **Step 7: Run repository tests and migration tests; run `bun run typecheck`.**

### Task 3: Chunking, source normalization, and indexing use case

**Files:**
- Create: `src/server/knowledge/chunking.ts`
- Create: `src/server/knowledge/index-source.ts`
- Create: `src/server/knowledge/source-types.ts`
- Create: `src/server/knowledge/profile-source.ts`
- Create: `src/server/knowledge/payload-source.ts`
- Test: `tests/server/knowledge-chunking.test.ts`
- Test: `tests/server/knowledge-index-source.test.ts`

**Interfaces:**
- `KnowledgeSource.fetch(sourceId): Promise<KnowledgeDocument | null>`.
- `KnowledgeDocument` includes source type/id, title, canonical public URL, text, publication/visibility state, and modified timestamp.
- `IndexKnowledgeSource.execute(sourceId)` skips ineligible sources; chunks deterministically; embeds document text; commits source replacement only after all chunks are valid.

- [x] **Step 1: Write chunking tests** for deterministic IDs, overlap and maximum length, empty input, Lexical text normalization, and stable provenance on each chunk.
- [x] **Step 2: Run `bun test tests/server/knowledge-chunking.test.ts`** and observe missing module/functions.
- [x] **Step 3: Implement pure normalization/chunking** with explicit bounds and content hashes.
- [x] **Step 4: Write indexing tests** for published-only eligibility, empty/unpublished removal, embedding failure preserving last-known-good chunks, and successful atomic replacement.
- [x] **Step 5: Run `bun test tests/server/knowledge-index-source.test.ts`** and observe missing orchestration behavior.
- [x] **Step 6: Implement use case** against injected source, embedding, repository, logger, and clock ports; emit sanitized bounded structured events.
- [x] **Step 7: Add curated profile knowledge source** as tracked, reviewed content with canonical public citations. Do not add private or inferred facts.
- [x] **Step 8: Run targeted test files and `bun run typecheck`.**

### Task 4: Retrieval, reranking, and safe answer evidence

**Files:**
- Create: `src/server/knowledge/retrieve.ts`
- Create: `src/server/knowledge/query-resolution.ts`
- Create: `src/server/knowledge/prompt-evidence.ts`
- Test: `tests/server/knowledge-retrieval.test.ts`

**Interfaces:**
- `RetrieveKnowledge.execute({ message, verifiedHistory }): Promise<{ evidence: KnowledgeEvidence[]; citations: PublicCitation[]; degraded: boolean }>`.
- Query resolution may use only the current message and at most the last two verified turns; SiliconFlow receives only the resolved bounded query plus top-10 public candidate text.
- Final evidence/citations contain at most three selected public chunks, within a configured size budget.

- [x] **Step 1: Write tests** proving exact embedding→top-10 vector search→rerank→top-3 order; short follow-up query resolution; no full history leakage; reranker failure uses vector order; malformed IDs are discarded; empty results return no citations; evidence budget is enforced.
- [x] **Step 2: Run `bun test tests/server/knowledge-retrieval.test.ts`** and observe missing retrieval behavior.
- [x] **Step 3: Implement query resolution and retrieval orchestration** with injected ports and sanitized timing/count logs.
- [x] **Step 4: Write prompt-evidence tests** covering untrusted-content delimiters, citation references, and empty-context instructions.
- [x] **Step 5: Run the focused tests to observe failure, then implement safe evidence formatting.**
- [x] **Step 6: Run retrieval tests and `bun run typecheck`.**

### Task 5: Source lifecycle and background jobs

**Files:**
- Modify: `src/collections/Posts.ts`
- Modify: `src/collections/Projects.ts`
- Modify: `payload.config.ts`
- Create: `src/server/knowledge/github-source.ts`
- Create: `src/server/knowledge/wakatime-source.ts`
- Create: `src/server/knowledge/jobs.ts`
- Create: `src/server/knowledge/payload-hooks.ts`
- Create: `src/server/knowledge/payload-runtime.ts`
- Create: `src/server/knowledge/payload-tasks.ts`
- Create: `scripts/knowledge-worker.ts`
- Modify: `package.json`
- Test: `tests/server/knowledge-sources.test.ts`
- Test: `tests/server/knowledge-jobs.test.ts`

**Interfaces:**
- Payload lifecycle hooks enqueue only the affected document's id and visibility intent; handlers re-read current public state before indexing.
- External source adapters are read-only, bounded, and return only public profile/repository/README and public WakaTime share data.
- Worker handles queued Payload jobs in its own Bun process and exits/handles signals without starting inside web requests.

- [x] **Step 1: Write source adapter tests** for GitHub pagination/forks/private repositories/size bounds and WakaTime JSON validation/timeout; verify provider tokens and response bodies are never logged.
- [x] **Step 2: Run source tests and observe missing adapters.**
- [x] **Step 3: Implement source adapters** with injected fetch and configured public URLs/tokens only where needed.
- [x] **Step 4: Write job tests** for idempotent reindex, unpublish/delete removal, visibility re-check at execution time, retries, and daily scheduled source refresh.
- [x] **Step 5: Run `bun test tests/server/knowledge-jobs.test.ts`** and observe missing queue/worker integration.
- [x] **Step 6: Consult current Payload Jobs Queue documentation through Context7 before coding hooks/worker APIs; implement the narrow queue integration and separate Bun worker command.**
- [x] **Step 7: Run source/job tests and typecheck.**

### Task 6: Chat integration, citations, UI, and rollout controls

**Files:**
- Modify: `src/server/chat/service.ts`
- Modify: `src/server/chat/types.ts`
- Modify: `src/server/chat/openrouter-responder.ts`
- Modify: `src/server/chat/http-handler.ts`
- Modify: `src/server/chat/runtime.ts`
- Modify: chat UI route/components under `src/routes/_site.chat.tsx` and `src/components/site/`
- Modify: `.env.example`
- Modify: `package.json`
- Test: `tests/server/chat-service.test.ts`
- Test: `tests/server/chat-http-handler.test.ts`
- Test: `tests/site-chat-citations.test.tsx`

**Interfaces:**
- Moderation remains first. `ChatResponderInput` receives bounded history, the moderated user message, and typed evidence; chat response includes public citations.
- Feature flag can disable RAG without disabling existing general chat.
- Client renders only citation title and canonical public URL; no chunk body, internal IDs, scores, or provider metadata.

- [ ] **Step 1: Extend chat service tests first** to prove blocked messages invoke no retrieval/provider; allowed messages retrieve after moderation; evidence and citations flow to responder/response; retrieval outage preserves general chat but marks personal evidence unavailable.
- [x] **Step 2: Run chat tests** and observe missing retrieval integration.
- [ ] **Step 3: Implement chat wiring** and update HTTP response schema with backward-compatible optional citations.
- [ ] **Step 4: Add UI test** for safe external citation rendering and no raw evidence display; observe failure before changing UI.
- [ ] **Step 5: Implement citation presentation and RAG feature flag.**
- [x] **Step 6: Add worker/startup documentation and local pgvector setup instructions.** See `docs/knowledge-rag.md`.
- [x] **Step 7: Run `bun test`, `bun run typecheck`, `bun run build`, and `git diff --check`; perform a whole-change security review for secret handling, prompt injection, SQL parameters, visibility removal, and response privacy.** Full tests, typecheck, build, and diff check pass; build emits third-party Payload direct-eval warnings. Local Qwen GGUF startup and a 1024-dimensional embedding request pass. The live pgvector integration remains skipped unless `KNOWLEDGE_TEST_DATABASE_URL` is configured; SiliconFlow/OpenRouter were not live-tested.

## Plan self-review

- Spec coverage: provider adapters/env (Task 1); pgvector schema/repository (Task 2); source normalization and profile corpus (Task 3); retrieval/rerank/prompt safety (Task 4); Payload/GitHub/WakaTime ingestion and worker (Task 5); moderation integration/citations/fallback/UI/rollout (Task 6).
- No live-provider calls are required in default tests; all network boundaries use injected fetch/ports.
- The project uses generated Payload migration metadata; Task 2 must create metadata consistent with the installed Payload CLI and verify it without overwriting unrelated generated state.
- Ruling: run the Unsloth-downloaded GGUF through the already-installed `llama-server`, not a Python Transformers sidecar — the actual cache format is GGUF and llama-server supports the required embedding endpoint and pooling; cost if wrong: setup requires a compatible GGUF file and installed llama-server, which the launcher will report explicitly.
- The plan owns startup and health checks for the local model server; it does not assume Unsloth Studio already has a usable embeddings endpoint.
