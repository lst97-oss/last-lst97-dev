# toonconv

## Retrieval summary

- Relationship: Owned repository.
- Repository: lst97/toonconv.
- Purpose: Source implementation indicates these responsibilities: validates structured input or configuration; implements command-line behavior; formats file size; formats duration; formats percentage.
- Observed capabilities: Validates structured input or configuration; Implements command-line behavior; Formats file size
- Technology: Rust, JavaScript
- Related topics: cli, json, rust, toon

## Repository metadata
- **Repository:** lst97/toonconv
- **Visibility:** public
- **URL:** https://github.com/lst97/toonconv
- **Default branch:** main
- **Last updated:** 2026-05-12T13:03:44Z
- **Primary language:** Rust
- **License:** MIT License
- **Homepage:** https://crates.io/crates/toonconv
- **Stars / forks:** 3 / 0
- **Topics:** `cli`, `json`, `rust`, `toon`

### GitHub language breakdown
- Rust (444,677 bytes)
- JavaScript (7,783 bytes)

## Project purpose (source-derived)
Source implementation indicates these responsibilities: validates structured input or configuration; implements command-line behavior; formats file size; formats duration; formats percentage.
Evidence: `src/cli/mod.rs`, `src/conversion/config.rs`, `src/conversion/engine.rs`, `src/validation/toon_compliance.rs`, `src/main.rs` (**inferred**)

## Problem addressed
Unknown: source code does not explicitly state the problem addressed.
Evidence: none

## Features observed in source and tests
- Validates structured input or configuration — Evidence: `src/cli/mod.rs`, `src/conversion/config.rs`, `src/conversion/engine.rs`, `src/validation/toon_compliance.rs` (**inferred**)
- Implements command-line behavior — Evidence: `src/main.rs` (**inferred**)
- Formats file size — Evidence: `src/cli/mod.rs` (**inferred**)
- Formats duration — Evidence: `src/cli/mod.rs` (**inferred**)
- Formats percentage — Evidence: `src/cli/mod.rs` (**inferred**)
- Creates progress bar — Evidence: `src/cli/mod.rs` (**inferred**)
- Gets terminal size — Evidence: `src/cli/mod.rs` (**inferred**)
- Handles error — Evidence: `src/cli/mod.rs` (**inferred**)
- Defines the Args type or service — Evidence: `src/cli/mod.rs` (**inferred**)
- Defines the Commands type or service — Evidence: `src/cli/mod.rs` (**inferred**)
- Defines the Delimiter type or service — Evidence: `src/cli/mod.rs` (**inferred**)
- Defines the Cli Config type or service — Evidence: `src/cli/mod.rs` (**inferred**)
- Defines the Cli Utils type or service — Evidence: `src/cli/mod.rs` (**inferred**)
- Converts batch sources — Evidence: `src/conversion/batch.rs` (**inferred**)
- Defines the Delimiter Type type or service — Evidence: `src/conversion/config.rs` (**inferred**)
- Defines the Quote Strategy type or service — Evidence: `src/conversion/config.rs` (**inferred**)
- Defines the Conversion Config type or service — Evidence: `src/conversion/config.rs` (**inferred**)
- Defines the Json Parser Type type or service — Evidence: `src/conversion/config.rs` (**inferred**)
- Defines the Validation Strategy type or service — Evidence: `src/conversion/config.rs` (**inferred**)
- Defines the Performance Profile type or service — Evidence: `src/conversion/config.rs` (**inferred**)
- Converts from source — Evidence: `src/conversion/engine.rs` (**inferred**)
- Converts string — Evidence: `src/conversion/engine.rs` (**inferred**)
- Converts json to toon — Evidence: `src/conversion/engine.rs` (**inferred**)
- Converts json from source — Evidence: `src/conversion/engine.rs` (**inferred**)

## Tracked files
- **72 tracked files** in total
- Source: 31; tests: 28; documentation: 5; configuration: 6; assets/other: 2

## Repository structure
- Inspected 25 source files from the cloned repository (bounded for safety).
- `.github/` (1 tracked files)
- `bench/` (1 tracked files)
- `benches/` (5 tracked files)
- `examples/` (3 tracked files)
- `src/` (25 tracked files)
- `tests/` (28 tracked files)
- `src/cli/mod.rs`
- `src/cli/path_mapping.rs`
- `src/conversion/batch.rs`
- `src/conversion/config.rs`
- `src/conversion/engine.rs`
- `src/conversion/limits.rs`
- `src/conversion/memory_opt.rs`
- `src/conversion/mod.rs`
- `src/conversion/stats.rs`
- `src/error/mod.rs`
- `src/formatter/mixed_arrays.rs`
- `src/formatter/mod.rs`
- `src/formatter/nested.rs`
- `src/formatter/quotes.rs`
- `src/formatter/schema.rs`
- `src/lib.rs`
- `src/main.rs`
- `src/parser/directory.rs`
- `src/parser/filter.rs`
- `src/parser/mod.rs`

## Implementation and test evidence
- Validates structured input or configuration — Evidence: `src/cli/mod.rs`, `src/conversion/config.rs`, `src/conversion/engine.rs`, `src/validation/toon_compliance.rs` (**inferred**)
- Implements command-line behavior — Evidence: `src/main.rs` (**inferred**)
- Formats file size — Evidence: `src/cli/mod.rs` (**inferred**)
- Formats duration — Evidence: `src/cli/mod.rs` (**inferred**)
- Formats percentage — Evidence: `src/cli/mod.rs` (**inferred**)
- Creates progress bar — Evidence: `src/cli/mod.rs` (**inferred**)
- Gets terminal size — Evidence: `src/cli/mod.rs` (**inferred**)
- Handles error — Evidence: `src/cli/mod.rs` (**inferred**)
- Defines the Args type or service — Evidence: `src/cli/mod.rs` (**inferred**)
- Defines the Commands type or service — Evidence: `src/cli/mod.rs` (**inferred**)
- Defines the Delimiter type or service — Evidence: `src/cli/mod.rs` (**inferred**)
- Defines the Cli Config type or service — Evidence: `src/cli/mod.rs` (**inferred**)
- Defines the Cli Utils type or service — Evidence: `src/cli/mod.rs` (**inferred**)
- Converts batch sources — Evidence: `src/conversion/batch.rs` (**inferred**)
- Defines the Delimiter Type type or service — Evidence: `src/conversion/config.rs` (**inferred**)
- Defines the Quote Strategy type or service — Evidence: `src/conversion/config.rs` (**inferred**)
- Defines the Conversion Config type or service — Evidence: `src/conversion/config.rs` (**inferred**)
- Defines the Json Parser Type type or service — Evidence: `src/conversion/config.rs` (**inferred**)
- Defines the Validation Strategy type or service — Evidence: `src/conversion/config.rs` (**inferred**)
- Defines the Performance Profile type or service — Evidence: `src/conversion/config.rs` (**inferred**)
- Converts from source — Evidence: `src/conversion/engine.rs` (**inferred**)
- Converts string — Evidence: `src/conversion/engine.rs` (**inferred**)
- Converts json to toon — Evidence: `src/conversion/engine.rs` (**inferred**)
- Converts json from source — Evidence: `src/conversion/engine.rs` (**inferred**)

## Frameworks and technology stack
- Rust — Evidence: `Cargo.toml`
- JavaScript — Evidence: `bench/speed.js`

## Design and architecture patterns
- test-driven development evidence (**inferred**) — Evidence: `tests/fixtures/edge_cases.json`, `tests/fixtures/encode/arrays-nested.json`, `tests/fixtures/encode/arrays-primitive.json`

## Evidence and limitations
- Reports are based on a fresh shallow clone. Safe, bounded documentation, manifests, source, and test files are inspected locally; raw source code is never copied into this report.
- README text and the GitHub description are excluded from project-purpose and feature claims because they may be stale.
- No additional inspection limitations were recorded.
