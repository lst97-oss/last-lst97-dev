# WakaTime coding-history warehouse

Answers deep-history questions ("how much did I code in 2025?", "longest streak?",
"top languages last March") from a local heartbeat warehouse instead of the
bounded public-share snapshots.

## Data

Source is a WakaTime data-dump export (`days[].heartbeats[]`, ~1GB / 1.1M
heartbeats / 959 days in the current load). Import:

Before running the import, configure `RAG_DB_PASSWORD` and `KNOWLEDGE_DATABASE_URL`
in `.env` to use the local `rag-db` credentials. See the local setup in
[`knowledge-rag.md`](knowledge-rag.md).

```sh
docker compose up -d rag-db
bun run knowledge:migrate        # creates wakatime_heartbeats + wakatime_imports
bun run wakatime:import /path/to/dump.json   # or set WAKATIME_DUMP_PATH
```

The importer streams the file day-by-day (never fully parsed), computes each
heartbeat's duration as the gap to the next heartbeat capped at the 15-minute
keystroke timeout (trailing heartbeat 0), and inserts idempotently
(`ON CONFLICT (waka_id) DO NOTHING`), so re-runs are safe.

## Schema

`wakatime_heartbeats` (one row per heartbeat, PK `waka_id`) with a single
`(day) INCLUDE (duration_seconds)` covering index. The old
`(project, day)` / `(language, day)` secondary indexes were dropped: every
chat query reads daily rollups instead, so fewer indexes also means faster
inserts. `wakatime_imports` ledgers each run. See
`src/server/knowledge/database-migration.ts`.

## Precomputed daily rollups

`wakatime_daily_summary(day PK, total_seconds, heartbeat_count)`,
`wakatime_daily_projects(day, project, seconds, heartbeats)`, and
`wakatime_daily_languages(day, language, seconds, heartbeats)` hold one row
per day (plus per-day breakdown rows) — 815 summary rows instead of 1.1M
heartbeat rows for an all-time scan. The importer recomputes each touched
day from the heartbeat table (`ON CONFLICT ... DO UPDATE`, never deltas, so
re-imports are safe) and finishes with `VACUUM ANALYZE`. Repository reads
(`src/server/wakatime/history-repository.ts`) hit the rollups first and fall
back to the heartbeat queries only when the rollup tables are absent, so
existing heartbeat-only test fixtures keep passing unchanged.

Measured on the live warehouse (Postgres 16, warm cache):

- 2025 summary: ~8ms → ~2ms (100k rows → 307 rollup rows)
- 2025 top projects: ~12ms → ~2ms
- all-time daily series: ~72ms → ~2ms (1.1M rows, truncated at 400 points → 815 rollup rows, no truncation)
- streaks: ~22ms → ~1ms (`DISTINCT` over 1.1M rows → 815-row PK scan)
- full re-import: ~22s → ~19s on conflict-only runs, ~55-65 round-trips
  instead of ~959 day-scoped round-trips

The importer also needs `shm_size: 256mb` on `rag-db`
(`docker-compose.yml`): parallel aggregates on 1.1M rows exhaust the default
64MB `/dev/shm` (`could not resize shared memory segment`, SQLSTATE 53100).

## Privacy

Raw file paths are **hashed at import** (`entity_hash`); absolute paths never
reach the database. Query tools return aggregates only (totals, top-N,
daily points, streaks) — never raw rows, entities, or dependency lists. This
matches the repo's evidence-only discipline for the browser/LLM boundary.

## Chat wiring

`coding_history` is the imported-warehouse tool behind the chat tool-runner seam
(`src/server/chat/coding-history-tool.ts`). It owns per-project breakdowns,
named-project time, daily series, trends, streaks, and arbitrary historical
dates. Both per-project breakdowns and named-project totals accept the explicit
`all_time`, `last_year`, `last_30_days`, and `last_7_days` presets; `last_year`
means the previous calendar year. `coding_stats` owns the
public-share activity, language, editor, operating-system, and AI/human category
percentages for the configured 7-day, 30-day, yearly, and all-time periods.
The warehouse is not live beyond its import range; the current import ends on
22 September 2026, so answers must state that freshness when it matters.
Both stream `tool_start`/`tool_result` over the existing SSE events. The route
(`src/routes/_site.chat.tsx`) shows `tool_start.label` as a status pill
("SEARCHING CODING HISTORY…"), clears it on `tool_result` or the first
`token`, and always clears it when the request settles. Verified by
`tests/server/chat-service.test.ts` (`tool_start` → `tool_result` pairs) —
ask "How much did I code in 2025?" in dev to see the pill live. Failures
degrade to plain answers instead of erroring the turn.
