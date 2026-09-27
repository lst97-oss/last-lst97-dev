# Owned Project Catalogue Implementation Plan

Date: 2026-09-25
Status: Implemented and verified

**Goal:** Give Jev a direct, filterable catalogue for Nelson's owned repositories, return at most ten concise project records per tool call, and use RAG in a later Jev routing step for requested detail.

**Approved design:** [Owned Project Catalogue for Jev](../specs/2026-09-25-complete-owned-project-list-design.md)

## Completed work

- [x] Define validated catalogue query filters and controlled software-kind values with bounded dates, metrics, and batch limit.
- [x] Add `knowledge_projects` with visibility checks and indexes for language, kind, topics, date, stars, and forks. Keep it in the dedicated knowledge database.
- [x] Populate the table with GitHub metadata, existing report summaries, curated kinds/topics, and public/private visibility. Join WakaTime daily project totals at query time.
- [x] Add `list_owned_projects` to Jev's approved tool set. Return short records and citations without vector embedding, search, reranking, or relevance checks.
- [x] Route inventory requests directly to the catalogue. When both inventory and detail lookup are approved, execute the catalogue first and ask Jev for a new RAG decision after seeing its output.
- [x] Sign the shown source IDs and active filters. Keep continuation batches filtered and deduplicated across turns.
- [x] Render project creation/update dates, languages, GitHub topics, software kinds, and curated topics into owned GitHub reports for future full reindexing.
- [x] Update README and RAG operations documentation, including `knowledge:github:catalog` for fast API metadata refresh and `knowledge:github:reindex` for report reindexing.
- [x] Verify the focused catalogue, repository, report, tool-routing, signed-context, moderation, and chat-service suites.

## Verification record

- `bun run knowledge:migrate` completed against the dedicated local knowledge database.
- `bun run knowledge:github:reindex` indexed 133 GitHub reports into 752 chunks.
- `bun run knowledge:github:catalog` refreshed 111 owned catalogue rows: 89 public and 22 private.
- Database checks confirmed 56 explicitly classified records, working Python and CLI filters, `SIT320-Project-MD5` with C++ and Python metadata, the most-starred first result, and the GNAF WakaTime join.
- `bun run typecheck` and the focused server test suites pass. No contribution rows are included in the owned catalogue.
