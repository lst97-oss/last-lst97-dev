# Personal knowledge chat (RAG)

The chat knowledge feature is opt-in. With `KNOWLEDGE_RAG_ENABLED=false` (the default), chat uses its existing moderation and OpenRouter flow without starting the local model or querying pgvector.

## Local development

1. Configure `.env` with `DATABASE_URL` and (when using RAG) `KNOWLEDGE_DATABASE_URL` pointing at remote PostgreSQL databases with the pgvector extension, `KNOWLEDGE_RAG_ENABLED=true`, `UNSLOTH_EMBEDDING_MODEL_PATH` pointing to the downloaded Qwen3-Embedding-0.6B GGUF file, and `SILICONFLOW_API_KEY`. Use URL-safe hex passwords or URL-encode any reserved characters. Keep credentials only in the ignored local `.env` or deployment secret store. `KNOWLEDGE_EMBEDDING_SERVER_PATH` can select a non-default `llama-server` executable.
2. Apply only the RAG schema migration against the remote knowledge database:

   ```sh
   bun run knowledge:migrate
   ```

   This does not run or modify Payload CMS migrations or its database. The migration creates the `knowledge_chunks` table and vector index in the database named by `KNOWLEDGE_DATABASE_URL`.

   Rotate remote database credentials in the provider dashboard, then update the matching connection URLs; there are no local data volumes to manage.
3. Start the embedding server manually in its own terminal when RAG is enabled:
   ```sh
   bun run embedding:serve
   ```
   Then start the web app with `bun run dev`. `dev` never starts `llama-server` itself. The manual server exposes an OpenAI-compatible embeddings endpoint on the configured loopback host/port, binds only to loopback, and limits browser CORS origins to localhost; the model is not served publicly. (`bun run dev:rag` remains as an explicit opt-in that starts both together.)
4. In another terminal, run `bun run worker` to process Payload indexing and scheduled synchronization jobs.
5. Once the database and model server are available, run `bun run knowledge:github:sync`. The command discovers owned repositories and GitHub contribution repositories across the contribution years returned by GitHub, then uses `gh repo clone` for temporary shallow, blob-filtered, no-checkout clones. Inspection is local: it reads bounded allowlisted documentation/manifests and tracked path names, never submits repository contents to a hosted model, and removes each clone afterward. It writes evidence-backed reports under `src/data/github/public/`, `src/data/github/private/`, `src/data/github/contributions/public/`, and `src/data/github/contributions/private/`, then embeds them into the dedicated RAG database.

   The GitHub CLI must already be authenticated. Public contribution data is available under ordinary visibility, but GitHub may restrict private/internal contribution details unless the existing OAuth authorization includes `read:user`. The sync never expands scopes automatically. API permission failures and result caps are reported as incomplete aggregate status; incomplete inventory skips stale-source deletion, and failed individual repositories retain their last-known-good report and chunks. Logs omit private repository identifiers, report contents, secret matches, and raw GitHub errors.

   Private summaries are intentionally tracked in this workspace: they are sanitized summaries, not source, and a server test scans every committed report for secret patterns. They describe work the owner has chosen to present, so they are safe to commit and to surface through chat — but review them before publishing to a new audience. `knowledge:github:sync` does not stage, commit, or push files.

   If a run reports a failed repository refresh, `bun run knowledge:github:sync --retry-missing` retries only reports whose new summary file is absent. This mode never removes stale database records.

   To rebuild contribution reports alone after changing their renderer, run `bun run knowledge:github:sync --refresh-contributions`; it also skips stale-source cleanup.
6. To additionally index published Payload posts/projects, run `bun run knowledge:sync` once to queue and process the initial sync. Later content changes enqueue indexing jobs; the worker also performs the scheduled refresh. Payload must already have its own database configured for that path, but RAG vector rows remain exclusively in the dedicated knowledge database.

If you only want the public site and ordinary chat, leave the flag disabled; no model file or SiliconFlow key is needed in that mode.

## Production

Provide a dedicated PostgreSQL database with the pgvector extension and set `KNOWLEDGE_DATABASE_URL` separately from Payload's `DATABASE_URL`. Run `bun run knowledge:migrate` against the RAG database; it only changes the knowledge database schema. Configure an OpenAI-compatible embedding service through `KNOWLEDGE_EMBEDDING_URL` (and `KNOWLEDGE_EMBEDDING_API_KEY` if required), plus the server-only `SILICONFLOW_API_KEY` and `TYPESAFE_API_KEY`. Run the Payload knowledge worker as a separate process alongside the web service. Do not expose the embedding service or secrets to browser code. Local development runs `llama-server` only via the manual `bun run embedding:serve` (or the explicit `bun run dev:rag` launcher); production deployment is responsible for its own embedding endpoint and TypeSafe account access.

Retrieval is performed only after chat moderation. It searches at most ten chunks, reranks at most ten with SiliconFlow, then sends the trusted top three through independent Jev `Noul` decisions. A document reaches the final prompt only when both direct-support probabilities are at least `0.60`; an individual Jev failure keeps that document as a reranker fallback and marks the result degraded. Sanitized private-repository summaries are retrievable and remain eligible for this gate: the model may describe what such a project does, its technology, and its structure, and cites render a `private` badge next to the source. The browser receives citation titles/URLs and a generic degraded-state indicator, never the retrieved chunk text or provider scores.

## WakaTime chat tool

`coding_stats` uses Nelson’s public WakaTime JSON shares directly; it does not
require a WakaTime API key. The typed query shape is
`{ category, range }`:

- `category`: `activity`, `languages`, `editors`, `operating_systems`, or `categories`;
- `range`: `last_7_days`, `last_30_days`, `last_year`, or `all_time`.

Operating-system shares are all-time only. Category percentages are paired
with the matching activity share so the tool can return estimated hours for
AI Coding, human Coding, Writing Docs, and other categories. `coding_history`
remains the conditional source for arbitrary dates, named projects, daily
series, trends, and streaks; its imported range currently ends on 22 September
2026. Public-share output is fetched on demand and includes its retrieval
timestamp and share period, while warehouse output is not described as live
past the import date.

## Troubleshooting

- A missing model-file error means the configured GGUF path does not exist; confirm the downloaded artifact itself is present (not only a cache symlink).
- A local embedding health timeout usually means `llama-server` could not load the GGUF, the configured port is occupied, or the model is incompatible. Check its startup output.
- If indexing fails, confirm PostgreSQL is reachable, migrations are applied, the embedding service is ready, and `SILICONFLOW_API_KEY` is configured. Job/provider errors are sanitized and do not include credentials or indexed content.
- `KNOWLEDGE_TEST_DATABASE_URL` enables the opt-in real pgvector integration test; ordinary tests use injected adapters and do not call external providers.

## Owned-project catalogue

`list_owned_projects` is a Jev-routed read-only tool backed by `knowledge_projects` in the dedicated knowledge database. It gives Jev a compact repository inventory without embedding a long list into vector search. The response is capped at ten records and includes the repository name, short summary, visibility, languages, software kinds, topics, created and updated dates, stars, forks, and imported WakaTime time when available. `search_knowledge` remains the source for report-level details and citations; Jev may request it in a later routing step after seeing catalogue results.

Every call also returns the exact, filter-aware total of matching projects (`matchingTotal`, computed before the ten-record cap) and a breakdown of that same set by visibility, software kind, and topic, capped at twelve entries per dimension. A count question passes `op: "count"`, which skips the list page and returns only the total and breakdown; nothing is cited for a pure count. The server renders those figures and passes them to the responder as authoritative, so a count is never inferred from the visible page. Topic and kind are multi-valued, so their counts overlap and do not partition the total; topics present in both `github_topics` and `curated_topics` are counted once per project.

Filters use AND between categories and OR among values in one category. Supported fields are free-text `query`; `languages`; `kinds`; `topics`; `visibility`; `created_after` / `created_before`; `updated_after` / `updated_before`; `min_stars` / `max_stars`; `min_forks` / `max_forks`; `min_time_spent_seconds` / `max_time_spent_seconds`; `time_spent_range` (`all_time`, `last_year`, `last_30_days`, or `last_7_days`); and explicit `time_spent_from` / `time_spent_to`. Choose either a named range or explicit dates. `sort_by` supports relevance, stars, forks, created, updated, and time spent; `sort_direction` is ascending or descending; `limit` is 1–10. WakaTime time defaults to the full imported range, and missing time remains unknown rather than zero. Date bounds are inclusive calendar days.

For coding-time rankings across projects, Jev uses `coding_history` with `op: "by_project"` and a named `range`. It returns up to the top ten projects. Supported ranges are `all_time`, `last_year` (previous calendar year), `last_30_days`, and `last_7_days`. The range resolves against the trusted current date. The warehouse reports its import cutoff and cannot provide activity newer than that date. Replies speak for Nelson: refer to this as “my WakaTime data” or “Nelson’s WakaTime data,” never the visitor’s account.

Kinds are multi-label curated values: `web_app`, `mobile_app`, `desktop_app`, `api_backend`, `cli_tool`, `library_package`, `automation_devtool`, `data_ml`, `game`, `infrastructure_devops`, `plugin_extension`, and `other`. Kind filters only match explicitly classified projects. GitHub topic tags and curated tags share the topic filter. Owned public and private repositories are included; contribution repositories are excluded. For a first unfiltered batch, the most-starred project is highlighted, with the remaining results favoring recently updated repositories. Signed conversation context records surfaced IDs and active filters so “more” can continue without duplicates.

The `knowledge_projects` table is updated in the same transaction as each owned GitHub report’s vector chunks. `bun run knowledge:migrate` creates or updates its schema and indexes. `bun run knowledge:github:sync` refreshes reports and catalogue metadata from GitHub; `bun run knowledge:github:catalog` refreshes only the structured catalogue fields from the authenticated GitHub repository API without cloning or re-embedding repositories; `bun run knowledge:github:reindex` rebuilds report chunks and catalogue rows from existing Markdown reports without stale-source cleanup. The sync renderer writes `createdAt`, languages, GitHub topics, curated software kinds, and curated topics into each owned report so a reindex can reconstruct catalogue rows. Contributions and non-GitHub sources do not create catalogue records.
