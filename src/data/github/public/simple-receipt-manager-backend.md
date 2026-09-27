# simple-receipt-manager-backend

## Retrieval summary

- Relationship: Owned repository.
- Repository: lst97/simple-receipt-manager-backend.
- Purpose: Source implementation indicates these responsibilities: reads runtime environment variables; validates structured input or configuration; defines http request handlers; gets all group; gets group records.
- Observed capabilities: Reads runtime environment variables; Validates structured input or configuration; Defines HTTP request handlers
- Technology: JavaScript, Python
- Software kinds: api_backend
- GitHub topics: flask, python3
- Curated topics: receipt-management, flask

## Repository metadata
- **Repository:** lst97/simple-receipt-manager-backend
- **Visibility:** public
- **URL:** https://github.com/lst97/simple-receipt-manager-backend
- **Default branch:** development
- **Created:** 2023-01-10T03:17:38Z
- **Last updated:** 2023-01-28T12:29:51Z
- **Primary language:** Python
- **License:** Other
- **Stars / forks:** 0 / 0
- **Topics:** `flask`, `python3`
- **Software kinds:** `api_backend`
- **Curated topics:** `receipt-management`, `flask`

### GitHub language breakdown
- Python (82,561 bytes)
- JavaScript (16,700 bytes)

## Project purpose (source-derived)
Source implementation indicates these responsibilities: reads runtime environment variables; validates structured input or configuration; defines http request handlers; gets all group; gets group records.
Evidence: `src/api/srm_api.py`, `src/api/srm_db.py`, `src/api/controllers/group_controller.py`, `src/api/utils/validator.py` (**inferred**)

## Problem addressed
Unknown: source code does not explicitly state the problem addressed.
Evidence: none

## Features observed in source and tests
- Reads runtime environment variables — Evidence: `src/api/srm_api.py`, `src/api/srm_db.py` (**inferred**)
- Validates structured input or configuration — Evidence: `src/api/controllers/group_controller.py`, `src/api/srm_api.py`, `src/api/utils/validator.py` (**inferred**)
- Defines HTTP request handlers — Evidence: `src/api/controllers/group_controller.py`, `src/api/srm_api.py` (**inferred**)
- Gets all group — Evidence: `src/api/controllers/group_controller.py` (**inferred**)
- Gets group records — Evidence: `src/api/controllers/group_controller.py` (**inferred**)
- Handles image upload — Evidence: `src/api/controllers/group_controller.py` (**inferred**)
- Handles submit — Evidence: `src/api/controllers/group_controller.py` (**inferred**)
- Gets group — Evidence: `src/api/controllers/group_controller.py` (**inferred**)
- Creates group — Evidence: `src/api/controllers/group_controller.py` (**inferred**)
- Updates group — Evidence: `src/api/controllers/group_controller.py` (**inferred**)
- Deletes group — Evidence: `src/api/controllers/group_controller.py` (**inferred**)
- Defines the Group Controller type or service — Evidence: `src/api/controllers/group_controller.py` (**inferred**)
- Gets all receipt — Evidence: `src/api/controllers/receipt_controller.py` (**inferred**)
- Gets receipt — Evidence: `src/api/controllers/receipt_controller.py` (**inferred**)
- Creates receipt — Evidence: `src/api/controllers/receipt_controller.py` (**inferred**)
- Updates receipt — Evidence: `src/api/controllers/receipt_controller.py` (**inferred**)
- Deletes receipt — Evidence: `src/api/controllers/receipt_controller.py` (**inferred**)
- Defines the Receipt Controller type or service — Evidence: `src/api/controllers/receipt_controller.py` (**inferred**)
- Gets users — Evidence: `src/api/controllers/user_controller.py` (**inferred**)
- Creates user — Evidence: `src/api/controllers/user_controller.py` (**inferred**)
- Gets user — Evidence: `src/api/controllers/user_controller.py` (**inferred**)
- Defines the Validation Error type or service — Evidence: `src/api/errors/srm_errors.py` (**inferred**)
- Defines the Invalid Request Id Error type or service — Evidence: `src/api/errors/srm_errors.py` (**inferred**)
- Defines the Invalid File Name Error type or service — Evidence: `src/api/errors/srm_errors.py` (**inferred**)

## Tracked files
- **52 tracked files** in total
- Source: 32; tests: 14; documentation: 2; configuration: 2; assets/other: 2

## Repository structure
- Inspected 30 source files from the cloned repository (bounded for safety).
- `src/` (34 tracked files)
- `test/` (14 tracked files)
- `src/__init__.py`
- `src/api/__init__.py`
- `src/api/controllers/group_controller.py`
- `src/api/controllers/receipt_controller.py`
- `src/api/controllers/record_controller.py`
- `src/api/controllers/user_controller.py`
- `src/api/errors/srm_errors.py`
- `src/api/handlers/parse_request_handler.py`
- `src/api/helpers/response_helper.py`
- `src/api/models/groups.py`
- `src/api/models/receipt.py`
- `src/api/models/record.py`
- `src/api/receipt_parser/__init__.py`
- `src/api/receipt_parser/core/__init__.py`
- `src/api/receipt_parser/core/config.py`
- `src/api/receipt_parser/core/enhancer.py`
- `src/api/receipt_parser/core/objectview.py`
- `src/api/receipt_parser/core/parse.py`
- `src/api/receipt_parser/core/receipt.py`
- `src/api/receipt_parser/core/util.py`

## Implementation and test evidence
- Reads runtime environment variables — Evidence: `src/api/srm_api.py`, `src/api/srm_db.py` (**inferred**)
- Validates structured input or configuration — Evidence: `src/api/controllers/group_controller.py`, `src/api/srm_api.py`, `src/api/utils/validator.py` (**inferred**)
- Defines HTTP request handlers — Evidence: `src/api/controllers/group_controller.py`, `src/api/srm_api.py` (**inferred**)
- Gets all group — Evidence: `src/api/controllers/group_controller.py` (**inferred**)
- Gets group records — Evidence: `src/api/controllers/group_controller.py` (**inferred**)
- Handles image upload — Evidence: `src/api/controllers/group_controller.py` (**inferred**)
- Handles submit — Evidence: `src/api/controllers/group_controller.py` (**inferred**)
- Gets group — Evidence: `src/api/controllers/group_controller.py` (**inferred**)
- Creates group — Evidence: `src/api/controllers/group_controller.py` (**inferred**)
- Updates group — Evidence: `src/api/controllers/group_controller.py` (**inferred**)
- Deletes group — Evidence: `src/api/controllers/group_controller.py` (**inferred**)
- Defines the Group Controller type or service — Evidence: `src/api/controllers/group_controller.py` (**inferred**)
- Gets all receipt — Evidence: `src/api/controllers/receipt_controller.py` (**inferred**)
- Gets receipt — Evidence: `src/api/controllers/receipt_controller.py` (**inferred**)
- Creates receipt — Evidence: `src/api/controllers/receipt_controller.py` (**inferred**)
- Updates receipt — Evidence: `src/api/controllers/receipt_controller.py` (**inferred**)
- Deletes receipt — Evidence: `src/api/controllers/receipt_controller.py` (**inferred**)
- Defines the Receipt Controller type or service — Evidence: `src/api/controllers/receipt_controller.py` (**inferred**)
- Gets users — Evidence: `src/api/controllers/user_controller.py` (**inferred**)
- Creates user — Evidence: `src/api/controllers/user_controller.py` (**inferred**)
- Gets user — Evidence: `src/api/controllers/user_controller.py` (**inferred**)
- Defines the Validation Error type or service — Evidence: `src/api/errors/srm_errors.py` (**inferred**)
- Defines the Invalid Request Id Error type or service — Evidence: `src/api/errors/srm_errors.py` (**inferred**)
- Defines the Invalid File Name Error type or service — Evidence: `src/api/errors/srm_errors.py` (**inferred**)

## Frameworks and technology stack
- JavaScript — Evidence: `test/mongodb/app/groups.js`, `test/mongodb/app/receipts.js`, `test/mongodb/app/records.js`, `test/mongodb/app/user.js`, `test/mongodb/test/mocha_create_test.js`, `test/mongodb/test/mocha_helper_test.js`, `test/mongodb/test/mocha_insert_test.js`, `test/mongodb/test/mocha_test.js`
- Python — Evidence: `src/__init__.py`, `src/api/__init__.py`, `src/api/controllers/group_controller.py`, `src/api/controllers/receipt_controller.py`, `src/api/controllers/record_controller.py`, `src/api/controllers/user_controller.py`, `src/api/errors/srm_errors.py`, `src/api/handlers/parse_request_handler.py`

## Design and architecture patterns
- test-driven development evidence (**inferred**) — Evidence: `test/mongodb/app/groups.js`, `test/mongodb/app/receipts.js`, `test/mongodb/app/records.js`

## Evidence and limitations
- Reports are based on a fresh shallow clone. Safe, bounded documentation, manifests, source, and test files are inspected locally; raw source code is never copied into this report.
- README text and the GitHub description are excluded from project-purpose and feature claims because they may be stale.
- No additional inspection limitations were recorded.
