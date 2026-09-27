# Personal Knowledge RAG Design

Date: 2026-09-23
Status: Awaiting user review

## Goal

Ground portfolio chat answers in the owner's public, maintainable knowledge sources, while retaining the existing Jev moderation, signed chat context, OpenRouter responder, structured logging, and public-source citations.

The retrieval pipeline is:

```text
moderated current message + bounded recent context
  -> Qwen3-Embedding-0.6B (local)
  -> pgvector top 10
  -> Qwen/Qwen3-Reranker-0.6B (SiliconFlow)
  -> top 3 evidence chunks
  -> OpenRouter response with source metadata
```

## Agreed choices

- Embedding model: `Qwen3-Embedding-0.6B`, served from the user's existing Unsloth-downloaded GGUF by a project-managed `llama-server` process.
- Embedding vector size: 1024 dimensions.
- Vector store: PostgreSQL with pgvector.
- Candidate retrieval: 10 chunks by cosine similarity.
- Reranker: SiliconFlow serverless `Qwen/Qwen3-Reranker-0.6B`.
- Final context: 3 reranked chunks, subject to a token/character budget.
- Answer model: existing OpenRouter configuration.
- Source citations: return public source titles and URLs with the chat response.
- Unsupported personal facts: say the available sources do not establish the answer; do not fabricate.
- General questions: remain available when no personal knowledge matches; distinguish general knowledge from sourced personal facts.
- Retrieval failure: use the vector candidate order if reranking fails. If embedding/retrieval is unavailable, preserve general chat but do not assert unsupported personal facts.
- Chat security: retain moderation before retrieval/provider calls. Send only a query resolved from the latest message and a small amount of verified context to SiliconFlow; never forward the full conversation history. Treat retrieved text as untrusted evidence, not instructions.

## Sources and ownership

1. Published Payload Posts and Projects: index public fields and Lexical content; include stable Payload ID, slug, title, public URL, content type, and update timestamp as provenance.
2. Curated profile facts: add a version-controlled profile knowledge document so the operator can explicitly control durable biography/skills facts. Do not scrape LinkedIn or infer facts from private accounts.
3. Public GitHub: profile and non-fork public repositories, descriptions, and selected README content. Store canonical URLs and repository metadata.
4. Public WakaTime share data: periodically ingest only the publicly shared summary (languages and coding-time totals) and preserve the share URL and observation timestamp.

Every chunk records source type, stable source identifier, canonical URL, title, chunk ordinal, content hash, last indexed timestamp, and visibility/publication status. Only public and intentionally curated data enters the corpus. Deleted, unpublished, or no-longer-public source material must be removed or excluded from retrieval.

## Architecture and boundaries

- `KnowledgeSource` adapters fetch/normalize one source type.
- `ChunkingPolicy` produces bounded, overlapping text chunks with stable IDs and source metadata.
- `EmbeddingPort` hides local model transport. In local development, Bun scripts start and stop `llama-server` with the downloaded Unsloth GGUF and OpenAI-compatible `/v1/embeddings`; bind to loopback and fail clearly if the executable/model is unavailable. Apply Qwen3's documented query instruction before submission and configure last-token pooling, normalized vectors, and 1024 dimensions. Avoid depending on Unsloth Studio's embeddings API unless verified end-to-end.
- Keep inference isolated from the Bun web process. Configure the local GGUF path, server executable, port, and timeout without hardcoding a developer-specific path. Production may point at an independently managed OpenAI-compatible embedding endpoint.
- `KnowledgeIndexRepository` owns transactional chunk/vector upsert, stale-chunk deletion, visibility filtering, and pgvector candidate search.
- `RerankerPort` calls SiliconFlow with the short query and top-10 candidate text, returning validated candidate IDs/scores. It has a timeout, bounded input, and no secret/body logging.
- `RetrieveKnowledgeUseCase` orchestrates query construction, embedding, vector retrieval, optional reranking, evidence budgeting, and source metadata.
- `ChatService` calls retrieval only after successful moderation, supplies bounded evidence to the responder, and returns citations in a typed response.
- The OpenRouter system instructions explicitly label evidence as untrusted, require citation for portfolio-specific claims, and disallow following instructions embedded in retrieved content.
- Payload content changes enqueue reindex/delete work. External GitHub/WakaTime sync is scheduled through the existing Payload Jobs Queue, executed by a separate Bun worker process. No request handler performs a full external sync.

## Data and database

- Enable the pgvector extension in the local Postgres image and production database before applying the vector-table migration.
- Add a dedicated knowledge-chunk table with a 1024-dimensional vector column, source/provenance fields, content hash, and visibility metadata. Use cosine-distance indexing/querying and a source/visibility filter.
- Keep vectors outside Payload's normal public collection API; expose no public write path for embeddings.
- Use an explicit migration with a reversible down path where feasible. Migration must fail clearly if pgvector is unavailable rather than silently degrading schema.
- Use idempotent upserts keyed by stable source/chunk identity and content hash. A reindex replaces changed chunks and removes obsolete chunks for that source.

## Sync behavior

- Payload publish/update: enqueue source reindex; unpublish/delete: enqueue source removal. Jobs are idempotent and scoped to one document.
- GitHub and WakaTime: scheduled daily refresh with bounded timeouts, pagination, rate-limit handling, and last-success timestamps. Do not log private payloads or tokens.
- Initial sync is an explicit worker job with progress and per-source outcomes; retry transient provider failures with bounded retries.
- Keep last-known-good public chunks when a refresh fails, but remove content immediately when a source becomes private, unpublished, or deleted.
- Separate `bun run dev` web process and `bun run worker` indexing process; no hidden auto-run worker inside the web server.

## Resilience and user behavior

- Reranker timeout/error: log a sanitized warning and retain nearest-neighbor order.
- Empty retrieval: continue general chat, but answer personal/profile questions conservatively.
- Embedding/retrieval outage: do not send stale or fabricated citations; chat may answer only clearly general questions and should be transparent when personal context is unavailable.
- Provider errors must not disclose API keys, full retrieved text, or full chat history in logs.
- SiliconFlow receives only query text plus the bounded top-10 public evidence texts and opaque candidate identifiers.

## Security and privacy

- Keep `SILICONFLOW_API_KEY` server-only and only in the ignored local `.env`; add the variable name (never its value) to `.env.example` and T3 env validation.
- Add separate configuration for the managed local GGUF/server executable and an optional remote embedding endpoint; never assume the developer's model files exist in production.
- Validate provider response shapes and candidate IDs before using scores. Clamp query, candidate count, candidate text length, and total reranking request size.
- Prevent prompt injection by treating user, history, and source content as untrusted; moderation remains before retrieval; retrieved content is delimited and passed as evidence rather than system instructions.
- Public chat responses may include public citations only. Do not expose internal IDs or storage metadata.
- Add rate limits/circuit-breaker behavior to remote inference calls and avoid logging content-bearing requests.

## Observability

Emit structured events with request/job IDs and bounded metadata:

- `knowledge.embedding.completed|failed`
- `knowledge.retrieval.completed|failed`
- `knowledge.rerank.completed|failed|fallback`
- `knowledge.index.started|completed|failed|deleted`
- `knowledge.sync.started|completed|failed`
- `chat.retrieval.completed`

Include source-type counts, candidate/result counts, durations, model identifiers, fallback reason, and sanitized failure category. Exclude message text, retrieved chunks, credentials, and raw provider response bodies. Avoid high-cardinality labels.

## Testing strategy (TDD)

- Unit tests for deterministic chunking, stable IDs, deduplication, source visibility, query resolution, evidence budgets, citation shaping, fallback behavior, and validation of provider results.
- Port tests with fake embedding, vector repository, and reranker to verify exact order and error behavior without external calls.
- Chat service tests proving moderation happens before retrieval and that only bounded evidence reaches the responder.
- HTTP contract tests for citations and degraded responses while preserving existing request/response compatibility where possible.
- Migration/integration tests against a pgvector-enabled Postgres instance for vector dimensions, cosine ranking, transactional reindex, and deletion/unpublish semantics.
- Job tests for idempotency, retries, scheduled sync, and cancellation/visibility changes.
- No live SiliconFlow/OpenRouter calls in the default test suite; use a separately gated smoke test only when explicitly configured.

## Rollout

1. Add and test the managed local embedding sidecar contract/startup/readiness, server-only env validation, and sanitized provider adapters.
2. Add pgvector-enabled local database and migration.
3. Build TDD-tested domain/application ports and ingestion/indexing.
4. Add source adapters and Payload lifecycle/job integration.
5. Integrate retrieval into moderated chat and add citations/UI rendering.
6. Run local initial sync, inspect indexed sources, then enable retrieval behind a feature flag before making it the default.

## Review questions

1. Should the curated profile knowledge file live in the repository (recommended) or be managed in Payload?
2. Should the GitHub source index every eligible public repository README, or only selected repositories? (Current proposal: every non-fork public repository, bounded to README and metadata.)
3. Confirm the local sidecar plan loads the Unsloth-downloaded checkpoint directly and exposes OpenAI-compatible `/v1/embeddings`; no pre-existing model server is assumed.
4. Confirm top-10 to top-3 and daily GitHub/WakaTime sync cadence.
