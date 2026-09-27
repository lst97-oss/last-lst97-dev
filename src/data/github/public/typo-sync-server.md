# typo-sync-server

## Retrieval summary

- Relationship: Owned repository.
- Repository: lst97/typo-sync-server.
- Purpose: Source implementation indicates these responsibilities: reads runtime environment variables; calls external http services; implements command-line behavior; defines http request handlers; creates error.
- Observed capabilities: Reads runtime environment variables; Calls external HTTP services; Implements command-line behavior
- Technology: TypeScript, Python
- Software kinds: api_backend, automation_devtool
- Curated topics: synchronization, developer-tools

## Repository metadata
- **Repository:** lst97/typo-sync-server
- **Visibility:** public
- **URL:** https://github.com/lst97/typo-sync-server
- **Default branch:** main
- **Created:** 2025-07-15T06:29:56Z
- **Last updated:** 2026-07-06T21:18:21Z
- **Primary language:** TypeScript
- **Stars / forks:** 1 / 0
- **Topics:** No GitHub topics are set.
- **Software kinds:** `api_backend`, `automation_devtool`
- **Curated topics:** `synchronization`, `developer-tools`

### GitHub language breakdown
- TypeScript (67,572 bytes)
- Python (41,821 bytes)
- Makefile (3,688 bytes)
- Dockerfile (1,423 bytes)
- Shell (702 bytes)

## Project purpose (source-derived)
Source implementation indicates these responsibilities: reads runtime environment variables; calls external http services; implements command-line behavior; defines http request handlers; creates error.
Evidence: `api/config/config.ts`, `rhythm_engine/run.py`, `api/healthcheck.ts`, `rhythm_engine/app/main.py`, `rhythm_engine/app/routers/analysis.py`, `api/controllers/analysis-controller.ts`, `api/middleware/error-handler.ts` (**inferred**)

## Problem addressed
Unknown: source code does not explicitly state the problem addressed.
Evidence: none

## Features observed in source and tests
- Reads runtime environment variables — Evidence: `api/config/config.ts`, `rhythm_engine/run.py` (**inferred**)
- Calls external HTTP services — Evidence: `api/healthcheck.ts` (**inferred**)
- Implements command-line behavior — Evidence: `rhythm_engine/run.py` (**inferred**)
- Defines HTTP request handlers — Evidence: `rhythm_engine/app/main.py`, `rhythm_engine/app/routers/analysis.py` (**inferred**)
- Defines the Configuration type or service — Evidence: `api/config/config.ts` (**inferred**)
- Defines the Analysis Controller type or service — Evidence: `api/controllers/analysis-controller.ts` (**inferred**)
- Creates error — Evidence: `api/middleware/error-handler.ts` (**inferred**)
- Defines the App Error type or service — Evidence: `api/middleware/error-handler.ts` (**inferred**)
- Defines the Validation Error type or service — Evidence: `api/middleware/error-handler.ts` (**inferred**)
- Defines the Not Found Error type or service — Evidence: `api/middleware/error-handler.ts` (**inferred**)
- Defines the File Upload Error type or service — Evidence: `api/middleware/error-handler.ts` (**inferred**)
- Defines the Internal Server Error type or service — Evidence: `api/middleware/error-handler.ts` (**inferred**)
- Defines the Analysis Service type or service — Evidence: `api/services/analysis-service.ts` (**inferred**)
- Defines the IPC Result type or service — Evidence: `api/services/python-ipc.ts` (**inferred**)
- Defines the Python IPC Service type or service — Evidence: `api/services/python-ipc.ts` (**inferred**)
- Creates task manager — Evidence: `api/services/task-manager.ts` (**inferred**)
- Defines the Task Manager type or service — Evidence: `api/services/task-manager.ts` (**inferred**)
- Defines the In Memory Task Manager type or service — Evidence: `api/services/task-manager.ts` (**inferred**)
- Defines the Redis Task Manager type or service — Evidence: `api/services/task-manager.ts` (**inferred**)
- Defines the Melody Note type or service — Evidence: `api/types/schemas.ts` (**inferred**)
- Defines the Analysis Info type or service — Evidence: `api/types/schemas.ts` (**inferred**)
- Defines the Analysis Result type or service — Evidence: `api/types/schemas.ts` (**inferred**)
- Analyzes response — Evidence: `api/types/schemas.ts` (**inferred**)
- Defines the Success Response type or service — Evidence: `api/types/schemas.ts` (**inferred**)

## Tracked files
- **49 tracked files** in total
- Source: 21; tests: 6; documentation: 5; configuration: 13; assets/other: 4

## Repository structure
- Inspected 22 source files from the cloned repository (bounded for safety).
- `.github/` (1 tracked files)
- `api/` (24 tracked files)
- `rhythm_engine/` (15 tracked files)
- `api/config/config.ts`
- `api/controllers/analysis-controller.ts`
- `api/deps.ts`
- `api/docs/docs-handler.ts`
- `api/healthcheck.ts`
- `api/main.ts`
- `api/middleware/error-handler.ts`
- `api/middleware/request-logger.ts`
- `api/routes/analysis.ts`
- `api/services/analysis-service.ts`
- `api/services/python-ipc.ts`
- `api/services/task-manager.ts`
- `api/types/schemas.ts`
- `api/utils/logger.ts`
- `rhythm_engine/app/__init__.py`
- `rhythm_engine/app/analysis_utils.py`
- `rhythm_engine/app/config.py`
- `rhythm_engine/app/main.py`
- `rhythm_engine/app/routers/analysis.py`
- `rhythm_engine/app/schemas.py`

## Implementation and test evidence
- Reads runtime environment variables — Evidence: `api/config/config.ts`, `rhythm_engine/run.py` (**inferred**)
- Calls external HTTP services — Evidence: `api/healthcheck.ts` (**inferred**)
- Implements command-line behavior — Evidence: `rhythm_engine/run.py` (**inferred**)
- Defines HTTP request handlers — Evidence: `rhythm_engine/app/main.py`, `rhythm_engine/app/routers/analysis.py` (**inferred**)
- Defines the Configuration type or service — Evidence: `api/config/config.ts` (**inferred**)
- Defines the Analysis Controller type or service — Evidence: `api/controllers/analysis-controller.ts` (**inferred**)
- Creates error — Evidence: `api/middleware/error-handler.ts` (**inferred**)
- Defines the App Error type or service — Evidence: `api/middleware/error-handler.ts` (**inferred**)
- Defines the Validation Error type or service — Evidence: `api/middleware/error-handler.ts` (**inferred**)
- Defines the Not Found Error type or service — Evidence: `api/middleware/error-handler.ts` (**inferred**)
- Defines the File Upload Error type or service — Evidence: `api/middleware/error-handler.ts` (**inferred**)
- Defines the Internal Server Error type or service — Evidence: `api/middleware/error-handler.ts` (**inferred**)
- Defines the Analysis Service type or service — Evidence: `api/services/analysis-service.ts` (**inferred**)
- Defines the IPC Result type or service — Evidence: `api/services/python-ipc.ts` (**inferred**)
- Defines the Python IPC Service type or service — Evidence: `api/services/python-ipc.ts` (**inferred**)
- Creates task manager — Evidence: `api/services/task-manager.ts` (**inferred**)
- Defines the Task Manager type or service — Evidence: `api/services/task-manager.ts` (**inferred**)
- Defines the In Memory Task Manager type or service — Evidence: `api/services/task-manager.ts` (**inferred**)
- Defines the Redis Task Manager type or service — Evidence: `api/services/task-manager.ts` (**inferred**)
- Defines the Melody Note type or service — Evidence: `api/types/schemas.ts` (**inferred**)
- Defines the Analysis Info type or service — Evidence: `api/types/schemas.ts` (**inferred**)
- Defines the Analysis Result type or service — Evidence: `api/types/schemas.ts` (**inferred**)
- Analyzes response — Evidence: `api/types/schemas.ts` (**inferred**)
- Defines the Success Response type or service — Evidence: `api/types/schemas.ts` (**inferred**)

## Frameworks and technology stack
- TypeScript — Evidence: `api/config/config.ts`, `api/controllers/analysis-controller.ts`, `api/deps.ts`, `api/docs/docs-handler.ts`, `api/healthcheck.ts`, `api/main.ts`, `api/middleware/error-handler.ts`, `api/middleware/request-logger.ts`
- Python — Evidence: `rhythm_engine/app/__init__.py`, `rhythm_engine/app/analysis_utils.py`, `rhythm_engine/app/config.py`, `rhythm_engine/app/main.py`, `rhythm_engine/app/routers/analysis.py`, `rhythm_engine/app/schemas.py`, `rhythm_engine/app/worker.py`, `rhythm_engine/run.py`

## Design and architecture patterns
- test-driven development evidence (**inferred**) — Evidence: `api/tests/integration_test.ts`, `api/tests/test_analysis_service.ts`, `api/tests/test_python_ipc.ts`

## Evidence and limitations
- Reports are based on a fresh shallow clone. Safe, bounded documentation, manifests, source, and test files are inspected locally; raw source code is never copied into this report.
- README text and the GitHub description are excluded from project-purpose and feature claims because they may be stale.
- No additional inspection limitations were recorded.
