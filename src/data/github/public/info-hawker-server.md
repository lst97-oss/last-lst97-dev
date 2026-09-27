# info-hawker-server

## Retrieval summary

- Relationship: Owned repository.
- Repository: lst97/info-hawker-server.
- Purpose: Source implementation indicates these responsibilities: reads runtime environment variables; persists or queries application data; creates http server.
- Observed capabilities: Reads runtime environment variables; Persists or queries application data; Defines the Address Lookup Service type or service
- Technology: PostgreSQL, TypeScript
- Related topics: australia, deno, opendata, postgresql

## Repository metadata
- **Repository:** lst97/info-hawker-server
- **Visibility:** public
- **URL:** https://github.com/lst97/info-hawker-server
- **Default branch:** dev
- **Last updated:** 2025-10-09T13:39:12Z
- **Primary language:** TypeScript
- **License:** Apache License 2.0
- **Stars / forks:** 0 / 1
- **Topics:** `australia`, `deno`, `opendata`, `postgresql`

### GitHub language breakdown
- TypeScript (14,329 bytes)

## Project purpose (source-derived)
Source implementation indicates these responsibilities: reads runtime environment variables; persists or queries application data; creates http server.
Evidence: `src/config/env.ts`, `src/infrastructure/db/repositories/gnaf_address_repository.ts`, `src/application/services/address_lookup_service.ts`, `src/domain/models/address_detail.ts`, `src/domain/models/address_suggestion.ts`, `src/domain/models/nearby_address.ts`, `src/domain/repositories/address_repository.ts` (**inferred**)

## Problem addressed
Unknown: source code does not explicitly state the problem addressed.
Evidence: none

## Features observed in source and tests
- Reads runtime environment variables — Evidence: `src/config/env.ts` (**inferred**)
- Persists or queries application data — Evidence: `src/infrastructure/db/repositories/gnaf_address_repository.ts` (**inferred**)
- Defines the Address Lookup Service type or service — Evidence: `src/application/services/address_lookup_service.ts` (**inferred**)
- Defines the Address Lookup Service Impl type or service — Evidence: `src/application/services/address_lookup_service.ts` (**inferred**)
- Defines the Address Detail type or service — Evidence: `src/domain/models/address_detail.ts` (**inferred**)
- Defines the Address Suggestion type or service — Evidence: `src/domain/models/address_suggestion.ts` (**inferred**)
- Defines the Nearby Address type or service — Evidence: `src/domain/models/nearby_address.ts` (**inferred**)
- Defines the Address Repository type or service — Evidence: `src/domain/repositories/address_repository.ts` (**inferred**)
- Defines the Gnaf Address Repository type or service — Evidence: `src/infrastructure/db/repositories/gnaf_address_repository.ts` (**inferred**)
- Defines the Logger type or service — Evidence: `src/infrastructure/logging/logger.ts` (**inferred**)
- Creates http server — Evidence: `src/interfaces/http/server.ts` (**inferred**)
- Defines the Route Handler type or service — Evidence: `src/interfaces/http/types.ts` (**inferred**)
- Defines the Middleware type or service — Evidence: `src/interfaces/http/types.ts` (**inferred**)

## Tracked files
- **42 tracked files** in total
- Source: 21; tests: 0; documentation: 6; configuration: 3; assets/other: 12

## Repository structure
- Inspected 18 source files from the cloned repository (bounded for safety).
- `data/` (8 tracked files)
- `prisma/` (2 tracked files)
- `scripts/` (4 tracked files)
- `src/` (20 tracked files)
- `src/application/index.ts`
- `src/application/services/address_lookup_service.ts`
- `src/config/env.ts`
- `src/domain/models/address_detail.ts`
- `src/domain/models/address_suggestion.ts`
- `src/domain/models/nearby_address.ts`
- `src/domain/repositories/address_repository.ts`
- `src/infrastructure/db/repositories/gnaf_address_repository.ts`
- `src/infrastructure/di/bootstrap.ts`
- `src/infrastructure/logging/logger.ts`
- `src/interfaces/http/handlers/address_autocomplete_handler.ts`
- `src/interfaces/http/handlers/address_detail_handler.ts`
- `src/interfaces/http/handlers/address_nearby_handler.ts`
- `src/interfaces/http/middleware/composer.ts`
- `src/interfaces/http/middleware/request_logger.ts`
- `src/interfaces/http/server.ts`
- `src/interfaces/http/types.ts`
- `src/main.ts`
- `scripts/seed.ts`

## Implementation and test evidence
- Reads runtime environment variables — Evidence: `src/config/env.ts` (**inferred**)
- Persists or queries application data — Evidence: `src/infrastructure/db/repositories/gnaf_address_repository.ts` (**inferred**)
- Defines the Address Lookup Service type or service — Evidence: `src/application/services/address_lookup_service.ts` (**inferred**)
- Defines the Address Lookup Service Impl type or service — Evidence: `src/application/services/address_lookup_service.ts` (**inferred**)
- Defines the Address Detail type or service — Evidence: `src/domain/models/address_detail.ts` (**inferred**)
- Defines the Address Suggestion type or service — Evidence: `src/domain/models/address_suggestion.ts` (**inferred**)
- Defines the Nearby Address type or service — Evidence: `src/domain/models/nearby_address.ts` (**inferred**)
- Defines the Address Repository type or service — Evidence: `src/domain/repositories/address_repository.ts` (**inferred**)
- Defines the Gnaf Address Repository type or service — Evidence: `src/infrastructure/db/repositories/gnaf_address_repository.ts` (**inferred**)
- Defines the Logger type or service — Evidence: `src/infrastructure/logging/logger.ts` (**inferred**)
- Creates http server — Evidence: `src/interfaces/http/server.ts` (**inferred**)
- Defines the Route Handler type or service — Evidence: `src/interfaces/http/types.ts` (**inferred**)
- Defines the Middleware type or service — Evidence: `src/interfaces/http/types.ts` (**inferred**)

## Frameworks and technology stack
- PostgreSQL — Evidence: `docker-compose.yml`
- TypeScript — Evidence: `scripts/seed.ts`, `src/application/index.ts`, `src/application/services/address_lookup_service.ts`, `src/config/env.ts`, `src/domain/models/address_detail.ts`, `src/domain/models/address_suggestion.ts`, `src/domain/models/nearby_address.ts`, `src/domain/repositories/address_repository.ts`

## Design and architecture patterns
- domain-driven design (**inferred**) — Evidence: `src/domain/models/address_detail.ts`, `src/domain/models/address_suggestion.ts`, `src/domain/models/nearby_address.ts`
- layered architecture (**inferred**) — Evidence: `src/domain/models/address_detail.ts`, `src/domain/models/address_suggestion.ts`, `src/domain/models/nearby_address.ts`, `src/application/index.ts`, `src/application/services/address_lookup_service.ts`, `src/infrastructure/db/clients.ts`, `src/infrastructure/db/repositories/gnaf_address_repository.ts`, `src/infrastructure/di/bootstrap.ts`
- hexagonal architecture (**inferred**) — Evidence: `src/domain/models/address_detail.ts`, `src/domain/models/address_suggestion.ts`, `src/domain/models/nearby_address.ts`, `src/application/index.ts`, `src/application/services/address_lookup_service.ts`, `src/infrastructure/db/clients.ts`, `src/infrastructure/db/repositories/gnaf_address_repository.ts`, `src/infrastructure/di/bootstrap.ts`

## Evidence and limitations
- Reports are based on a fresh shallow clone. Safe, bounded documentation, manifests, source, and test files are inspected locally; raw source code is never copied into this report.
- README text and the GitHub description are excluded from project-purpose and feature claims because they may be stale.
- No additional inspection limitations were recorded.
