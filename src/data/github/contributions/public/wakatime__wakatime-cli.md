# wakatime-cli

## Retrieval summary

- Relationship: Third-party contribution by Nelson.
- Repository: wakatime/wakatime-cli.
- Purpose: Source implementation indicates these responsibilities: loads params; runs ai sync activity; sends heartbeats; builds heartbeats.
- Observed capabilities: Loads params; Defines the Params type or service; Defines the Config type or service
- Technology: Go, TypeScript, JavaScript, Python, Rust, Java, Kotlin, Swift

## Repository metadata
- **Repository:** wakatime/wakatime-cli
- **Visibility:** public
- **URL:** https://github.com/wakatime/wakatime-cli
- **Topics:** No GitHub topics are set.

### GitHub language breakdown
- GitHub language breakdown is unavailable.

## Project purpose (source-derived)
Source implementation indicates these responsibilities: loads params; runs ai sync activity; sends heartbeats; builds heartbeats.
Evidence: `cmd/configread/configread.go`, `cmd/handler/handler.go`, `cmd/heartbeat/ai_sync.go`, `cmd/heartbeat/heartbeat.go`, `cmd/heartbeat/testdata/main.py`, `cmd/offline/offline.go` (**inferred**)

## Problem addressed
Unknown: source code does not explicitly state the problem addressed.
Evidence: none

## Features observed in source and tests
- Loads params — Evidence: `cmd/configread/configread.go` (**inferred**)
- Defines the Params type or service — Evidence: `cmd/configread/configread.go` (**inferred**)
- Defines the Config type or service — Evidence: `cmd/handler/handler.go` (**inferred**)
- Runs ai sync activity — Evidence: `cmd/heartbeat/ai_sync.go` (**inferred**)
- Sends heartbeats — Evidence: `cmd/heartbeat/heartbeat.go` (**inferred**)
- Builds heartbeats — Evidence: `cmd/heartbeat/heartbeat.go` (**inferred**)
- Defines the My Class type or service — Evidence: `cmd/heartbeat/testdata/main.py` (**inferred**)
- Saves heartbeats — Evidence: `cmd/offline/offline.go` (**inferred**)
- Saves heartbeats with params — Evidence: `cmd/offline/offline.go` (**inferred**)
- Defines the Noop type or service — Evidence: `cmd/offline/offline.go` (**inferred**)
- Runs without rate limiting — Evidence: `cmd/offlinesync/offlinesync.go` (**inferred**)
- Runs with rate limiting — Evidence: `cmd/offlinesync/offlinesync.go` (**inferred**)
- Synchronizes offline activity — Evidence: `cmd/offlinesync/offlinesync.go` (**inferred**)
- Runs e — Evidence: `cmd/run.go` (**inferred**)
- Runs cmd — Evidence: `cmd/run.go` (**inferred**)
- Runs cmd with offline sync — Evidence: `cmd/run.go` (**inferred**)

## Tracked files
- **1207 tracked files** in total
- Source: 784; tests: 5; documentation: 22; configuration: 100; assets/other: 296

## Repository structure
- Inspected 46 source files from the cloned repository (bounded for safety).
- `.github/` (7 tracked files)
- `.vscode/` (1 tracked files)
- `bin/` (8 tracked files)
- `cmd/` (91 tracked files)
- `pkg/` (1053 tracked files)
- `testdata/` (30 tracked files)
- `cmd/api/api_test.go`
- `cmd/api/api.go`
- `cmd/configread/configread_test.go`
- `cmd/configread/configread.go`
- `cmd/configwrite/configwrite_test.go`
- `cmd/configwrite/configwrite.go`
- `cmd/dispatch_internal_test.go`
- `cmd/fileexperts/fileexperts_test.go`
- `cmd/fileexperts/fileexperts.go`
- `cmd/fileexperts/testdata/main.go`
- `cmd/handler/handler.go`
- `cmd/handler/option_test.go`
- `cmd/handler/option.go`
- `cmd/heartbeat/ai_sync_test.go`
- `cmd/heartbeat/ai_sync.go`
- `cmd/heartbeat/heartbeat_internal_test.go`
- `cmd/heartbeat/heartbeat_test.go`
- `cmd/heartbeat/heartbeat.go`
- `cmd/heartbeat/testdata/localfile.go`
- `cmd/heartbeat/testdata/main.go`

## Implementation and test evidence
- Loads params — Evidence: `cmd/configread/configread.go` (**inferred**)
- Defines the Params type or service — Evidence: `cmd/configread/configread.go` (**inferred**)
- Defines the Config type or service — Evidence: `cmd/handler/handler.go` (**inferred**)
- Runs ai sync activity — Evidence: `cmd/heartbeat/ai_sync.go` (**inferred**)
- Sends heartbeats — Evidence: `cmd/heartbeat/heartbeat.go` (**inferred**)
- Builds heartbeats — Evidence: `cmd/heartbeat/heartbeat.go` (**inferred**)
- Defines the My Class type or service — Evidence: `cmd/heartbeat/testdata/main.py` (**inferred**)
- Saves heartbeats — Evidence: `cmd/offline/offline.go` (**inferred**)
- Saves heartbeats with params — Evidence: `cmd/offline/offline.go` (**inferred**)
- Defines the Noop type or service — Evidence: `cmd/offline/offline.go` (**inferred**)
- Runs without rate limiting — Evidence: `cmd/offlinesync/offlinesync.go` (**inferred**)
- Runs with rate limiting — Evidence: `cmd/offlinesync/offlinesync.go` (**inferred**)
- Synchronizes offline activity — Evidence: `cmd/offlinesync/offlinesync.go` (**inferred**)
- Runs e — Evidence: `cmd/run.go` (**inferred**)
- Runs cmd — Evidence: `cmd/run.go` (**inferred**)
- Runs cmd with offline sync — Evidence: `cmd/run.go` (**inferred**)

## Frameworks and technology stack
- Go — Evidence: `go.mod`
- TypeScript — Evidence: `pkg/deps/testdata/react.tsx`, `pkg/deps/testdata/typescript.ts`, `pkg/deps/testdata/typescript_minimal.ts`, `pkg/language/testdata/codefiles/typescript.ts`
- JavaScript — Evidence: `pkg/deps/testdata/es6.js`, `pkg/deps/testdata/es6_minimal.js`, `pkg/deps/testdata/react.jsx`
- Python — Evidence: `cmd/heartbeat/testdata/main.py`, `cmd/offline/testdata/main.py`, `pkg/deps/testdata/python.py`, `pkg/deps/testdata/python_minimal.py`, `pkg/deps/testdata/python_with_long_import.py`, `pkg/deps/testdata/python_with_many_imports.py`, `pkg/language/testdata/codefiles/py_with_c_files/see.py`, `pkg/lexer/testdata/numpy.py`
- Rust — Evidence: `pkg/deps/testdata/rust.rs`, `pkg/deps/testdata/rust_minimal.rs`
- Java — Evidence: `pkg/deps/testdata/java.java`, `pkg/deps/testdata/java_minimal.java`
- Kotlin — Evidence: `pkg/deps/testdata/kotlin.kt`, `pkg/deps/testdata/kotlin_minimal.kt`
- Swift — Evidence: `pkg/deps/testdata/swift.swift`, `pkg/deps/testdata/swift_minimal.swift`
- C# — Evidence: `pkg/deps/testdata/csharp.cs`, `pkg/deps/testdata/csharp_minimal.cs`
- PHP — Evidence: `pkg/deps/testdata/php.php`, `pkg/deps/testdata/php_minimal.php`

## Design and architecture patterns
- test-driven development evidence (**inferred**) — Evidence: `bin/tests/data/changelog_develop.txt`, `bin/tests/data/changelog_release.txt`, `bin/tests/data/changelog_release_incorrect.txt`

## Evidence and limitations
- Reports are based on a fresh shallow clone. Safe, bounded documentation, manifests, source, and test files are inspected locally; raw source code is never copied into this report.
- README text and the GitHub description are excluded from project-purpose and feature claims because they may be stale.
- No additional inspection limitations were recorded.

## Nelson's contribution evidence
- 0 commits, 0 pull requests, 1 issues, 0 reviews
### Pull requests
No pull-request titles are available from the contribution API.
### Issues
- [Email] Unusual coding activity from WakaTime plugin, High CPU usage (CLOSED) — https://github.com/wakatime/wakatime-cli/issues/1432
- Commit contributions are reported as aggregate counts; commit messages and diffs are not copied into this report.
- **Coverage limitation:** GitHub capped at least one contribution list; some contribution details may be omitted and commit totals may be partial.
