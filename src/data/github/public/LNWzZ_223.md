# LNWzZ_223

## Retrieval summary

- Relationship: Owned repository.
- Repository: lst97/LNWzZ_223.
- Purpose: Source implementation indicates these responsibilities: reads runtime environment variables; persists or queries application data; gets hash.
- Observed capabilities: Reads runtime environment variables; Persists or queries application data; Defines the api type or service
- Technology: JavaScript, Python

## Repository metadata
- **Repository:** lst97/LNWzZ_223
- **Visibility:** public
- **URL:** https://github.com/lst97/LNWzZ_223
- **Default branch:** master
- **Last updated:** 2024-03-19T07:18:45Z
- **Primary language:** Python
- **Stars / forks:** 0 / 0
- **Topics:** No GitHub topics are set.

### GitHub language breakdown
- Python (36,128 bytes)
- CSS (10,080 bytes)
- HTML (8,977 bytes)
- JavaScript (2,523 bytes)
- Shell (145 bytes)

## Project purpose (source-derived)
Source implementation indicates these responsibilities: reads runtime environment variables; persists or queries application data; gets hash.
Evidence: `lnwzz/dcapi.py`, `lnwzz/utils/debug.py`, `lnwzz/utils/hash.py`, `lnwzz/utils/resources.py` (**inferred**)

## Problem addressed
Unknown: source code does not explicitly state the problem addressed.
Evidence: none

## Features observed in source and tests
- Reads runtime environment variables — Evidence: `lnwzz/dcapi.py` (**inferred**)
- Persists or queries application data — Evidence: `lnwzz/dcapi.py` (**inferred**)
- Defines the api type or service — Evidence: `lnwzz/dcapi.py` (**inferred**)
- Defines the dbg type or service — Evidence: `lnwzz/utils/debug.py` (**inferred**)
- Gets hash — Evidence: `lnwzz/utils/hash.py` (**inferred**)
- Defines the zokit hash type or service — Evidence: `lnwzz/utils/hash.py` (**inferred**)
- Reads html — Evidence: `lnwzz/utils/resources.py` (**inferred**)
- Reads js — Evidence: `lnwzz/utils/resources.py` (**inferred**)
- Reads css — Evidence: `lnwzz/utils/resources.py` (**inferred**)
- Reads img — Evidence: `lnwzz/utils/resources.py` (**inferred**)
- Defines the HTML type or service — Evidence: `lnwzz/utils/resources.py` (**inferred**)

## Tracked files
- **34 tracked files** in total
- Source: 19; tests: 3; documentation: 2; configuration: 3; assets/other: 7

## Repository structure
- Inspected 12 source files from the cloned repository (bounded for safety).
- `.vscode/` (1 tracked files)
- `lnwzz/` (25 tracked files)
- `tests/` (3 tracked files)
- `lnwzz/__init__.py`
- `lnwzz/dcapi.py`
- `lnwzz/html/commons/join.html`
- `lnwzz/html/commons/query.html`
- `lnwzz/html/commons/redirect.html`
- `lnwzz/html/index.html`
- `lnwzz/html/scripts/query.js`
- `lnwzz/html/scripts/register.js`
- `lnwzz/html/styles/reset.css`
- `lnwzz/html/styles/style.css`
- `lnwzz/utils/debug.py`
- `lnwzz/utils/hash.py`
- `lnwzz/utils/otp.py`
- `lnwzz/utils/resources.py`
- `tests/__init__.py`
- `tests/test_lnwzz.py`

## Implementation and test evidence
- Reads runtime environment variables — Evidence: `lnwzz/dcapi.py` (**inferred**)
- Persists or queries application data — Evidence: `lnwzz/dcapi.py` (**inferred**)
- Defines the api type or service — Evidence: `lnwzz/dcapi.py` (**inferred**)
- Defines the dbg type or service — Evidence: `lnwzz/utils/debug.py` (**inferred**)
- Gets hash — Evidence: `lnwzz/utils/hash.py` (**inferred**)
- Defines the zokit hash type or service — Evidence: `lnwzz/utils/hash.py` (**inferred**)
- Reads html — Evidence: `lnwzz/utils/resources.py` (**inferred**)
- Reads js — Evidence: `lnwzz/utils/resources.py` (**inferred**)
- Reads css — Evidence: `lnwzz/utils/resources.py` (**inferred**)
- Reads img — Evidence: `lnwzz/utils/resources.py` (**inferred**)
- Defines the HTML type or service — Evidence: `lnwzz/utils/resources.py` (**inferred**)

## Frameworks and technology stack
- JavaScript — Evidence: `lnwzz/html/scripts/query.js`, `lnwzz/html/scripts/register.js`
- Python — Evidence: `lnwzz/__init__.py`, `lnwzz/database.py`, `lnwzz/dcapi.py`, `lnwzz/gsender.py`, `lnwzz/https.py`, `lnwzz/utils/debug.py`, `lnwzz/utils/hash.py`, `lnwzz/utils/otp.py`

## Design and architecture patterns
- domain-driven design (**inferred**) — Evidence: `lnwzz/domain/domain_srv.crt`, `lnwzz/domain/domain_srv.key`
- test-driven development evidence (**inferred**) — Evidence: `tests/.DS_Store`, `tests/__init__.py`, `tests/test_lnwzz.py`

## Evidence and limitations
- Reports are based on a fresh shallow clone. Safe, bounded documentation, manifests, source, and test files are inspected locally; raw source code is never copied into this report.
- README text and the GitHub description are excluded from project-purpose and feature claims because they may be stale.
- No additional inspection limitations were recorded.
