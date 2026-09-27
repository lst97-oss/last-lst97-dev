# tpwfc-worker

## Retrieval summary

- Relationship: Third-party contribution by Nelson.
- Repository: TPWFC/tpwfc-worker.
- Purpose: Source implementation indicates these responsibilities: persists or queries application data; loads config; parses duration; formats markdown.
- Observed capabilities: Persists or queries application data; Defines the Config type or service; Loads config
- Technology: Go

## Repository metadata
- **Repository:** TPWFC/tpwfc-worker
- **Visibility:** public
- **URL:** https://github.com/TPWFC/tpwfc-worker
- **Topics:** No GitHub topics are set.

### GitHub language breakdown
- GitHub language breakdown is unavailable.

## Project purpose (source-derived)
Source implementation indicates these responsibilities: persists or queries application data; loads config; parses duration; formats markdown.
Evidence: `internal/payload/uploader.go`, `cmd/seed/main.go`, `internal/config/config.go` (**inferred**)

## Problem addressed
Unknown: source code does not explicitly state the problem addressed.
Evidence: none

## Features observed in source and tests
- Persists or queries application data — Evidence: `internal/payload/uploader.go` (**inferred**)
- Defines the Config type or service — Evidence: `cmd/seed/main.go` (**inferred**)
- Loads config — Evidence: `internal/config/config.go` (**inferred**)
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
- Parses duration — Evidence: `internal/crawler/parsers/parser_timeline.go` (**inferred**)
- Defines the Parser type or service — Evidence: `internal/crawler/parsers/parser.go` (**inferred**)
- Defines the Casualty Item type or service — Evidence: `internal/crawler/parsers/parser.go` (**inferred**)
- Defines the Casualty Data type or service — Evidence: `internal/crawler/parsers/parser.go` (**inferred**)
- Defines the Event Source type or service — Evidence: `internal/crawler/parsers/parser.go` (**inferred**)
- Defines the Photo type or service — Evidence: `internal/crawler/parsers/parser.go` (**inferred**)
- Defines the Scraper type or service — Evidence: `internal/crawler/scraper.go` (**inferred**)
- Defines the URL Manager type or service — Evidence: `internal/crawler/url_manager.go` (**inferred**)
- Defines the Attemp Result type or service — Evidence: `internal/crawler/url_manager.go` (**inferred**)
- Defines the Source Info type or service — Evidence: `internal/crawler/url_manager.go` (**inferred**)
- Defines the Attemp Stats type or service — Evidence: `internal/crawler/url_manager.go` (**inferred**)

## Tracked files
- **60 tracked files** in total
- Source: 38; tests: 7; documentation: 2; configuration: 8; assets/other: 5

## Repository structure
- Inspected 32 source files from the cloned repository (bounded for safety).
- `.github/` (2 tracked files)
- `cmd/` (8 tracked files)
- `configs/` (1 tracked files)
- `data/` (1 tracked files)
- `deployments/` (1 tracked files)
- `internal/` (28 tracked files)
- `pkg/` (3 tracked files)
- `test/` (7 tracked files)
- `cmd/crawler/main.go`
- `cmd/deploy/main.go`
- `cmd/formatter/main.go`
- `cmd/normalizer/main.go`
- `cmd/seed/main.go`
- `cmd/signer/main.go`
- `internal/config/config_test.go`
- `internal/config/config.go`
- `internal/crawler/client.go`
- `internal/crawler/parsers/parser_detailed_timeline.go`
- `internal/crawler/parsers/parser_test.go`
- `internal/crawler/parsers/parser_timeline.go`
- `internal/crawler/parsers/parser.go`
- `internal/crawler/scraper.go`
- `internal/crawler/url_manager.go`
- `internal/formatter/markdown_test.go`
- `internal/formatter/markdown.go`
- `internal/logger/logger.go`
- `internal/models/article.go`
- `internal/models/event.go`

## Implementation and test evidence
- Persists or queries application data — Evidence: `internal/payload/uploader.go` (**inferred**)
- Defines the Config type or service — Evidence: `cmd/seed/main.go` (**inferred**)
- Loads config — Evidence: `internal/config/config.go` (**inferred**)
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
- Parses duration — Evidence: `internal/crawler/parsers/parser_timeline.go` (**inferred**)
- Defines the Parser type or service — Evidence: `internal/crawler/parsers/parser.go` (**inferred**)
- Defines the Casualty Item type or service — Evidence: `internal/crawler/parsers/parser.go` (**inferred**)
- Defines the Casualty Data type or service — Evidence: `internal/crawler/parsers/parser.go` (**inferred**)
- Defines the Event Source type or service — Evidence: `internal/crawler/parsers/parser.go` (**inferred**)
- Defines the Photo type or service — Evidence: `internal/crawler/parsers/parser.go` (**inferred**)
- Defines the Scraper type or service — Evidence: `internal/crawler/scraper.go` (**inferred**)
- Defines the URL Manager type or service — Evidence: `internal/crawler/url_manager.go` (**inferred**)
- Defines the Attemp Result type or service — Evidence: `internal/crawler/url_manager.go` (**inferred**)
- Defines the Source Info type or service — Evidence: `internal/crawler/url_manager.go` (**inferred**)
- Defines the Attemp Stats type or service — Evidence: `internal/crawler/url_manager.go` (**inferred**)

## Frameworks and technology stack
- Go — Evidence: `data/go.mod`, `go.mod`

## Design and architecture patterns
- test-driven development evidence (**inferred**) — Evidence: `test/fixtures/detailed_timeline.md`, `test/fixtures/expected-timeline-output.json`, `test/fixtures/full_timeline.md`

## Evidence and limitations
- Reports are based on a fresh shallow clone. Safe, bounded documentation, manifests, source, and test files are inspected locally; raw source code is never copied into this report.
- README text and the GitHub description are excluded from project-purpose and feature claims because they may be stale.
- No additional inspection limitations were recorded.

## Nelson's contribution evidence
- 36 commits, 0 pull requests, 0 issues, 0 reviews
### Pull requests
No pull-request titles are available from the contribution API.
### Issues
No issue titles are available from the contribution API.
- Commit contributions are reported as aggregate counts; commit messages and diffs are not copied into this report.
- **Coverage limitation:** GitHub capped at least one contribution list; some contribution details may be omitted and commit totals may be partial.
