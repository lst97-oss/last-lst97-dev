# pixel-cast-backend

## Retrieval summary

- Relationship: Owned repository.
- Repository: lst97/pixel-cast-backend.
- Purpose: Source implementation indicates these responsibilities: reads runtime environment variables; calls external http services; persists or queries application data; defines http request handlers.
- Observed capabilities: Reads runtime environment variables; Calls external HTTP services; Persists or queries application data
- Technology: PostgreSQL, TypeScript
- Software kinds: api_backend
- Curated topics: pixel-art, media

## Repository metadata
- **Repository:** lst97/pixel-cast-backend
- **Visibility:** public
- **URL:** https://github.com/lst97/pixel-cast-backend
- **Default branch:** main
- **Created:** 2025-06-23T16:49:57Z
- **Last updated:** 2025-06-30T14:12:46Z
- **Primary language:** TypeScript
- **Stars / forks:** 0 / 0
- **Topics:** No GitHub topics are set.
- **Software kinds:** `api_backend`
- **Curated topics:** `pixel-art`, `media`

### GitHub language breakdown
- TypeScript (80,139 bytes)
- Dockerfile (1,628 bytes)

## Project purpose (source-derived)
Source implementation indicates these responsibilities: reads runtime environment variables; calls external http services; persists or queries application data; defines http request handlers.
Evidence: `src/config.ts`, `src/cleanup.ts`, `src/routes/rooms.ts`, `src/routes/srs-proxy.ts`, `src/routes/sse.ts`, `src/database.ts`, `main.ts`, `src/routes/presence.ts` (**inferred**)

## Problem addressed
Unknown: source code does not explicitly state the problem addressed.
Evidence: none

## Features observed in source and tests
- Reads runtime environment variables — Evidence: `src/config.ts` (**inferred**)
- Calls external HTTP services — Evidence: `src/cleanup.ts`, `src/routes/rooms.ts`, `src/routes/srs-proxy.ts`, `src/routes/sse.ts` (**inferred**)
- Persists or queries application data — Evidence: `src/database.ts` (**inferred**)
- Defines HTTP request handlers — Evidence: `main.ts` (**inferred**)
- Defines the Cleanup Service type or service — Evidence: `src/cleanup.ts` (**inferred**)
- Defines the Room type or service — Evidence: `src/database.ts` (**inferred**)
- Defines the Database Service type or service — Evidence: `src/database.ts` (**inferred**)
- Handles presence update — Evidence: `src/routes/presence.ts` (**inferred**)
- Handles get presence — Evidence: `src/routes/presence.ts` (**inferred**)
- Handles create room — Evidence: `src/routes/rooms.ts` (**inferred**)
- Handles get rooms — Evidence: `src/routes/rooms.ts` (**inferred**)
- Handles get room by stream key — Evidence: `src/routes/rooms.ts` (**inferred**)
- Handles validate room url — Evidence: `src/routes/rooms.ts` (**inferred**)
- Handles get cleanup status — Evidence: `src/routes/rooms.ts` (**inferred**)
- Handles manual cleanup — Evidence: `src/routes/rooms.ts` (**inferred**)
- Handles whip — Evidence: `src/routes/srs-proxy.ts` (**inferred**)
- Handles whep — Evidence: `src/routes/srs-proxy.ts` (**inferred**)
- Handles get streams — Evidence: `src/routes/srs-proxy.ts` (**inferred**)
- Handles stop stream — Evidence: `src/routes/srs-proxy.ts` (**inferred**)
- Handles rtmp ingest — Evidence: `src/routes/srs-proxy.ts` (**inferred**)
- Handles hls player — Evidence: `src/routes/srs-proxy.ts` (**inferred**)
- Handles rtmp stream status — Evidence: `src/routes/srs-proxy.ts` (**inferred**)
- Handles get srs monitor — Evidence: `src/routes/srs-proxy.ts` (**inferred**)
- Handles hls proxy — Evidence: `src/routes/srs-proxy.ts` (**inferred**)

## Tracked files
- **21 tracked files** in total
- Source: 12; tests: 0; documentation: 2; configuration: 6; assets/other: 1

## Repository structure
- Inspected 12 source files from the cloned repository (bounded for safety).
- `src/` (11 tracked files)
- `src/cleanup.ts`
- `src/config.ts`
- `src/database.ts`
- `src/routes/presence.ts`
- `src/routes/rooms.ts`
- `src/routes/srs-proxy.ts`
- `src/routes/srs-webhooks.ts`
- `src/routes/sse.ts`
- `src/types.ts`
- `src/utils.ts`
- `main.ts`
- `test-database.ts`

## Implementation and test evidence
- Reads runtime environment variables — Evidence: `src/config.ts` (**inferred**)
- Calls external HTTP services — Evidence: `src/cleanup.ts`, `src/routes/rooms.ts`, `src/routes/srs-proxy.ts`, `src/routes/sse.ts` (**inferred**)
- Persists or queries application data — Evidence: `src/database.ts` (**inferred**)
- Defines HTTP request handlers — Evidence: `main.ts` (**inferred**)
- Defines the Cleanup Service type or service — Evidence: `src/cleanup.ts` (**inferred**)
- Defines the Room type or service — Evidence: `src/database.ts` (**inferred**)
- Defines the Database Service type or service — Evidence: `src/database.ts` (**inferred**)
- Handles presence update — Evidence: `src/routes/presence.ts` (**inferred**)
- Handles get presence — Evidence: `src/routes/presence.ts` (**inferred**)
- Handles create room — Evidence: `src/routes/rooms.ts` (**inferred**)
- Handles get rooms — Evidence: `src/routes/rooms.ts` (**inferred**)
- Handles get room by stream key — Evidence: `src/routes/rooms.ts` (**inferred**)
- Handles validate room url — Evidence: `src/routes/rooms.ts` (**inferred**)
- Handles get cleanup status — Evidence: `src/routes/rooms.ts` (**inferred**)
- Handles manual cleanup — Evidence: `src/routes/rooms.ts` (**inferred**)
- Handles whip — Evidence: `src/routes/srs-proxy.ts` (**inferred**)
- Handles whep — Evidence: `src/routes/srs-proxy.ts` (**inferred**)
- Handles get streams — Evidence: `src/routes/srs-proxy.ts` (**inferred**)
- Handles stop stream — Evidence: `src/routes/srs-proxy.ts` (**inferred**)
- Handles rtmp ingest — Evidence: `src/routes/srs-proxy.ts` (**inferred**)
- Handles hls player — Evidence: `src/routes/srs-proxy.ts` (**inferred**)
- Handles rtmp stream status — Evidence: `src/routes/srs-proxy.ts` (**inferred**)
- Handles get srs monitor — Evidence: `src/routes/srs-proxy.ts` (**inferred**)
- Handles hls proxy — Evidence: `src/routes/srs-proxy.ts` (**inferred**)

## Frameworks and technology stack
- PostgreSQL — Evidence: `src/database.ts`
- TypeScript — Evidence: `main.ts`, `src/cleanup.ts`, `src/config.ts`, `src/database.ts`, `src/routes/presence.ts`, `src/routes/rooms.ts`, `src/routes/srs-proxy.ts`, `src/routes/srs-webhooks.ts`

## Design and architecture patterns
- Unknown: no supported design-pattern evidence was found.

## Evidence and limitations
- Reports are based on a fresh shallow clone. Safe, bounded documentation, manifests, source, and test files are inspected locally; raw source code is never copied into this report.
- README text and the GitHub description are excluded from project-purpose and feature claims because they may be stale.
- No supported architecture-pattern evidence was found; no pattern is asserted.
