# bin-time-crawler

## Retrieval summary

- Relationship: Owned repository.
- Repository: lst97/bin-time-crawler.
- Purpose: Source implementation indicates these responsibilities: persists or queries application data; gets council; validates object.
- Observed capabilities: Persists or queries application data; Defines the Config type or service; Defines the Preprocessor type or service
- Technology: Go
- Software kinds: automation_devtool
- GitHub topics: australia, crawler, golang
- Curated topics: web-crawler, australia, council-data

## Repository metadata
- **Repository:** lst97/bin-time-crawler
- **Visibility:** public
- **URL:** https://github.com/lst97/bin-time-crawler
- **Default branch:** dev
- **Created:** 2025-10-07T10:58:00Z
- **Last updated:** 2025-10-09T13:43:07Z
- **Primary language:** Go
- **License:** MIT License
- **Stars / forks:** 0 / 1
- **Topics:** `australia`, `crawler`, `golang`
- **Software kinds:** `automation_devtool`
- **Curated topics:** `web-crawler`, `australia`, `council-data`

### GitHub language breakdown
- Go (50,701 bytes)

## Project purpose (source-derived)
Source implementation indicates these responsibilities: persists or queries application data; gets council; validates object.
Evidence: `internal/infrastructure/persistence/memory/repository.go`, `cmd/preprocessor/framework/framework.go`, `internal/application/crawl_service.go`, `internal/domain/council/council.go`, `internal/domain/council/location.go`, `internal/domain/council/repository.go` (**inferred**)

## Problem addressed
Unknown: source code does not explicitly state the problem addressed.
Evidence: none

## Features observed in source and tests
- Persists or queries application data — Evidence: `internal/infrastructure/persistence/memory/repository.go` (**inferred**)
- Defines the Config type or service — Evidence: `cmd/preprocessor/framework/framework.go` (**inferred**)
- Defines the Preprocessor type or service — Evidence: `cmd/preprocessor/framework/framework.go` (**inferred**)
- Defines the Crawl Service type or service — Evidence: `internal/application/crawl_service.go` (**inferred**)
- Defines the Council type or service — Evidence: `internal/domain/council/council.go` (**inferred**)
- Defines the Crawl Result type or service — Evidence: `internal/domain/council/council.go` (**inferred**)
- Defines the Location type or service — Evidence: `internal/domain/council/location.go` (**inferred**)
- Defines the Repository type or service — Evidence: `internal/domain/council/repository.go` (**inferred**)
- Defines the Crawler type or service — Evidence: `internal/domain/crawling/crawler.go` (**inferred**)
- Defines the Dataset Config type or service — Evidence: `internal/infrastructure/crawling/gleneira/config.go` (**inferred**)
- Defines the Geo JSON Collection type or service — Evidence: `internal/infrastructure/crawling/gleneira/geojson.go` (**inferred**)
- Defines the Geo JSON Feature type or service — Evidence: `internal/infrastructure/crawling/gleneira/geojson.go` (**inferred**)
- Defines the Geo JSON Geometry type or service — Evidence: `internal/infrastructure/crawling/gleneira/geojson.go` (**inferred**)
- Defines the Geo JSON Properties type or service — Evidence: `internal/infrastructure/crawling/gleneira/geojson.go` (**inferred**)
- Gets council — Evidence: `internal/infrastructure/crawling/registry/registry.go` (**inferred**)
- Defines the Dataset UR Ls type or service — Evidence: `internal/infrastructure/crawling/registry/registry.go` (**inferred**)
- Defines the Bin Info UR Ls type or service — Evidence: `internal/infrastructure/crawling/registry/registry.go` (**inferred**)
- Defines the Council Resources type or service — Evidence: `internal/infrastructure/crawling/registry/registry.go` (**inferred**)
- Defines the Logger type or service — Evidence: `internal/infrastructure/logging/logger.go` (**inferred**)
- Validates object — Evidence: `internal/infrastructure/validation/validator.go` (**inferred**)

## Tracked files
- **28 tracked files** in total
- Source: 19; tests: 0; documentation: 3; configuration: 2; assets/other: 4

## Repository structure
- Inspected 18 source files from the cloned repository (bounded for safety).
- `cmd/` (4 tracked files)
- `data/` (1 tracked files)
- `internal/` (17 tracked files)
- `cmd/crawler/main.go`
- `cmd/preprocessor/framework/framework.go`
- `internal/application/crawl_service.go`
- `internal/domain/council/council.go`
- `internal/domain/council/location.go`
- `internal/domain/council/repository.go`
- `internal/domain/crawling/crawler.go`
- `internal/infrastructure/config/config.go`
- `internal/infrastructure/crawling/gleneira/config.go`
- `internal/infrastructure/crawling/gleneira/crawler.go`
- `internal/infrastructure/crawling/gleneira/fetch.go`
- `internal/infrastructure/crawling/gleneira/geojson.go`
- `internal/infrastructure/crawling/gleneira/payload.go`
- `internal/infrastructure/crawling/registry/registry.go`
- `internal/infrastructure/logging/logger.go`
- `internal/infrastructure/persistence/filesystem/repository.go`
- `internal/infrastructure/persistence/memory/repository.go`
- `internal/infrastructure/validation/validator.go`

## Implementation and test evidence
- Persists or queries application data — Evidence: `internal/infrastructure/persistence/memory/repository.go` (**inferred**)
- Defines the Config type or service — Evidence: `cmd/preprocessor/framework/framework.go` (**inferred**)
- Defines the Preprocessor type or service — Evidence: `cmd/preprocessor/framework/framework.go` (**inferred**)
- Defines the Crawl Service type or service — Evidence: `internal/application/crawl_service.go` (**inferred**)
- Defines the Council type or service — Evidence: `internal/domain/council/council.go` (**inferred**)
- Defines the Crawl Result type or service — Evidence: `internal/domain/council/council.go` (**inferred**)
- Defines the Location type or service — Evidence: `internal/domain/council/location.go` (**inferred**)
- Defines the Repository type or service — Evidence: `internal/domain/council/repository.go` (**inferred**)
- Defines the Crawler type or service — Evidence: `internal/domain/crawling/crawler.go` (**inferred**)
- Defines the Dataset Config type or service — Evidence: `internal/infrastructure/crawling/gleneira/config.go` (**inferred**)
- Defines the Geo JSON Collection type or service — Evidence: `internal/infrastructure/crawling/gleneira/geojson.go` (**inferred**)
- Defines the Geo JSON Feature type or service — Evidence: `internal/infrastructure/crawling/gleneira/geojson.go` (**inferred**)
- Defines the Geo JSON Geometry type or service — Evidence: `internal/infrastructure/crawling/gleneira/geojson.go` (**inferred**)
- Defines the Geo JSON Properties type or service — Evidence: `internal/infrastructure/crawling/gleneira/geojson.go` (**inferred**)
- Gets council — Evidence: `internal/infrastructure/crawling/registry/registry.go` (**inferred**)
- Defines the Dataset UR Ls type or service — Evidence: `internal/infrastructure/crawling/registry/registry.go` (**inferred**)
- Defines the Bin Info UR Ls type or service — Evidence: `internal/infrastructure/crawling/registry/registry.go` (**inferred**)
- Defines the Council Resources type or service — Evidence: `internal/infrastructure/crawling/registry/registry.go` (**inferred**)
- Defines the Logger type or service — Evidence: `internal/infrastructure/logging/logger.go` (**inferred**)
- Validates object — Evidence: `internal/infrastructure/validation/validator.go` (**inferred**)

## Frameworks and technology stack
- Go — Evidence: `go.mod`

## Design and architecture patterns
- domain-driven design (**inferred**) — Evidence: `internal/domain/council/council.go`, `internal/domain/council/location.go`, `internal/domain/council/repository.go`
- layered architecture (**inferred**) — Evidence: `internal/domain/council/council.go`, `internal/domain/council/location.go`, `internal/domain/council/repository.go`, `internal/application/crawl_service.go`, `internal/infrastructure/config/config.go`, `internal/infrastructure/crawling/bininfo/fetcher.go`, `internal/infrastructure/crawling/gleneira/config.go`
- hexagonal architecture (**inferred**) — Evidence: `internal/domain/council/council.go`, `internal/domain/council/location.go`, `internal/domain/council/repository.go`, `internal/application/crawl_service.go`, `internal/infrastructure/config/config.go`, `internal/infrastructure/crawling/bininfo/fetcher.go`, `internal/infrastructure/crawling/gleneira/config.go`

## Evidence and limitations
- Reports are based on a fresh shallow clone. Safe, bounded documentation, manifests, source, and test files are inspected locally; raw source code is never copied into this report.
- README text and the GitHub description are excluded from project-purpose and feature claims because they may be stale.
- No additional inspection limitations were recorded.
