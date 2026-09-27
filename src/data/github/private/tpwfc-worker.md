# tpwfc-worker

## Retrieval summary

- Relationship: Owned repository.
- Repository: lst97/tpwfc-worker.
- Purpose: Source implementation indicates these responsibilities: persists or queries application data; loads config; parses duration; formats markdown.
- Observed capabilities: Persists or queries application data; Loads config; Defines the Config type or service
- Technology: Go
- Software kinds: automation_devtool
- Curated topics: fire-documentary, media-processing

## Repository metadata
- **Repository:** lst97/tpwfc-worker
- **Visibility:** private
- **URL:** https://github.com/lst97/tpwfc-worker
- **Default branch:** main
- **Created:** 2025-12-11T11:47:12Z
- **Last updated:** 2025-12-11T12:02:20Z
- **Primary language:** Go
- **Stars / forks:** 0 / 0
- **Topics:** No GitHub topics are set.
- **Software kinds:** `automation_devtool`
- **Curated topics:** `fire-documentary`, `media-processing`

### GitHub language breakdown
- Go (208,728 bytes)
- Makefile (1,459 bytes)
- Shell (808 bytes)
- Dockerfile (544 bytes)

## Project purpose (source-derived)
Source implementation indicates these responsibilities: persists or queries application data; loads config; parses duration; formats markdown.
Evidence: `internal/payload/uploader.go`, `internal/config/config.go` (**inferred**)

## Problem addressed
Unknown: source code does not explicitly state the problem addressed.
Evidence: none

## Features observed in source and tests
- Persists or queries application data — Evidence: `internal/payload/uploader.go` (**inferred**)
- Loads config — Evidence: `internal/config/config.go` (**inferred**)
- Defines the Config type or service — Evidence: `internal/config/config.go` (**inferred**)
- Defines the Crawler Config type or service — Evidence: `internal/config/config.go` (**inferred**)
- Defines the Source Config type or service — Evidence: `internal/config/config.go` (**inferred**)
- Defines the Retry Policy type or service — Evidence: `internal/config/config.go` (**inferred**)
- Defines the Output Config type or service — Evidence: `internal/config/config.go` (**inferred**)
- Defines the Validation Config type or service — Evidence: `internal/config/config.go` (**inferred**)
- Defines the Patterns Config type or service — Evidence: `internal/config/config.go` (**inferred**)
- Defines the Logging Config type or service — Evidence: `internal/config/config.go` (**inferred**)
- Defines the Features Config type or service — Evidence: `internal/config/config.go` (**inferred**)
- Defines the Advanced Config type or service — Evidence: `internal/config/config.go` (**inferred**)
- Defines the Client type or service — Evidence: `internal/crawler/client.go` (**inferred**)
- Parses duration — Evidence: `internal/crawler/parser.go` (**inferred**)
- Defines the Parser type or service — Evidence: `internal/crawler/parser.go` (**inferred**)
- Defines the Scraper type or service — Evidence: `internal/crawler/scraper.go` (**inferred**)
- Defines the URL Manager type or service — Evidence: `internal/crawler/url_manager.go` (**inferred**)
- Defines the Attemp Result type or service — Evidence: `internal/crawler/url_manager.go` (**inferred**)
- Defines the Source Info type or service — Evidence: `internal/crawler/url_manager.go` (**inferred**)
- Defines the Attemp Stats type or service — Evidence: `internal/crawler/url_manager.go` (**inferred**)
- Formats markdown — Evidence: `internal/formatter/markdown.go` (**inferred**)
- Defines the Logger type or service — Evidence: `internal/logger/logger.go` (**inferred**)
- Defines the Article type or service — Evidence: `internal/models/article.go` (**inferred**)
- Defines the Event type or service — Evidence: `internal/models/event.go` (**inferred**)

## Tracked files
- **56 tracked files** in total
- Source: 33; tests: 7; documentation: 2; configuration: 7; assets/other: 7

## Repository structure
- Inspected 27 source files from the cloned repository (bounded for safety).
- `cmd/` (5 tracked files)
- `configs/` (2 tracked files)
- `data/` (1 tracked files)
- `deployments/` (3 tracked files)
- `internal/` (26 tracked files)
- `pkg/` (3 tracked files)
- `scripts/` (2 tracked files)
- `test/` (7 tracked files)
- `cmd/crawler/main.go`
- `cmd/formatter/main.go`
- `cmd/normalizer/main.go`
- `internal/config/config_test.go`
- `internal/config/config.go`
- `internal/crawler/client.go`
- `internal/crawler/parser_test.go`
- `internal/crawler/parser.go`
- `internal/crawler/scraper.go`
- `internal/crawler/url_manager.go`
- `internal/formatter/markdown_test.go`
- `internal/formatter/markdown.go`
- `internal/logger/logger.go`
- `internal/models/article.go`
- `internal/models/event.go`
- `internal/models/person.go`
- `internal/models/timeline.go`
- `internal/normalizer/processor_test.go`
- `internal/normalizer/processor.go`
- `internal/normalizer/transformer_test.go`

## Implementation and test evidence
- Persists or queries application data — Evidence: `internal/payload/uploader.go` (**inferred**)
- Loads config — Evidence: `internal/config/config.go` (**inferred**)
- Defines the Config type or service — Evidence: `internal/config/config.go` (**inferred**)
- Defines the Crawler Config type or service — Evidence: `internal/config/config.go` (**inferred**)
- Defines the Source Config type or service — Evidence: `internal/config/config.go` (**inferred**)
- Defines the Retry Policy type or service — Evidence: `internal/config/config.go` (**inferred**)
- Defines the Output Config type or service — Evidence: `internal/config/config.go` (**inferred**)
- Defines the Validation Config type or service — Evidence: `internal/config/config.go` (**inferred**)
- Defines the Patterns Config type or service — Evidence: `internal/config/config.go` (**inferred**)
- Defines the Logging Config type or service — Evidence: `internal/config/config.go` (**inferred**)
- Defines the Features Config type or service — Evidence: `internal/config/config.go` (**inferred**)
- Defines the Advanced Config type or service — Evidence: `internal/config/config.go` (**inferred**)
- Defines the Client type or service — Evidence: `internal/crawler/client.go` (**inferred**)
- Parses duration — Evidence: `internal/crawler/parser.go` (**inferred**)
- Defines the Parser type or service — Evidence: `internal/crawler/parser.go` (**inferred**)
- Defines the Scraper type or service — Evidence: `internal/crawler/scraper.go` (**inferred**)
- Defines the URL Manager type or service — Evidence: `internal/crawler/url_manager.go` (**inferred**)
- Defines the Attemp Result type or service — Evidence: `internal/crawler/url_manager.go` (**inferred**)
- Defines the Source Info type or service — Evidence: `internal/crawler/url_manager.go` (**inferred**)
- Defines the Attemp Stats type or service — Evidence: `internal/crawler/url_manager.go` (**inferred**)
- Formats markdown — Evidence: `internal/formatter/markdown.go` (**inferred**)
- Defines the Logger type or service — Evidence: `internal/logger/logger.go` (**inferred**)
- Defines the Article type or service — Evidence: `internal/models/article.go` (**inferred**)
- Defines the Event type or service — Evidence: `internal/models/event.go` (**inferred**)

## Frameworks and technology stack
- Go — Evidence: `data/go.mod`, `go.mod`

## Design and architecture patterns
- test-driven development evidence (**inferred**) — Evidence: `test/fixtures/detailed_timeline.md`, `test/fixtures/expected-timeline-output.json`, `test/fixtures/full_timeline.md`

## Evidence and limitations
- Reports are based on a fresh shallow clone. Safe, bounded documentation, manifests, source, and test files are inspected locally; raw source code is never copied into this report.
- README text and the GitHub description are excluded from project-purpose and feature claims because they may be stale.
- No additional inspection limitations were recorded.
