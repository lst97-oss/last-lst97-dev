# split-tab-server

## Retrieval summary

- Relationship: Owned repository.
- Repository: lst97/split-tab-server.
- Purpose: Source implementation indicates these responsibilities: persists or queries application data; builds filtered expenses query.
- Observed capabilities: Persists or queries application data; Defines the Expense Controller type or service; Defines the Household Controller type or service
- Technology: TypeScript
- Software kinds: api_backend
- Curated topics: expense-management, shared-expenses

## Repository metadata
- **Repository:** lst97/split-tab-server
- **Visibility:** private
- **URL:** https://github.com/lst97/split-tab-server
- **Default branch:** main
- **Created:** 2024-10-17T08:49:43Z
- **Last updated:** 2025-01-10T06:09:44Z
- **Primary language:** TypeScript
- **Stars / forks:** 0 / 0
- **Topics:** No GitHub topics are set.
- **Software kinds:** `api_backend`
- **Curated topics:** `expense-management`, `shared-expenses`

### GitHub language breakdown
- TypeScript (465,333 bytes)

## Project purpose (source-derived)
Source implementation indicates these responsibilities: persists or queries application data; builds filtered expenses query.
Evidence: `src/controllers/household_controller.ts`, `src/db/queries/expense/expense_category_query.ts`, `src/db/queries/expense/expense_query.ts`, `src/db/queries/expense/expense_split_query.ts`, `src/db/queries/household/household_query.ts`, `src/controllers/expense_controller.ts`, `src/controllers/settlement_controller.ts`, `src/controllers/user_controller.ts`, `src/db/database.ts`, `src/db/schemas/expense_db_schemas.ts` (**inferred**)

## Problem addressed
Unknown: source code does not explicitly state the problem addressed.
Evidence: none

## Features observed in source and tests
- Persists or queries application data — Evidence: `src/controllers/household_controller.ts`, `src/db/queries/expense/expense_category_query.ts`, `src/db/queries/expense/expense_query.ts`, `src/db/queries/expense/expense_split_query.ts`, `src/db/queries/household/household_query.ts` (**inferred**)
- Defines the Expense Controller type or service — Evidence: `src/controllers/expense_controller.ts` (**inferred**)
- Defines the Household Controller type or service — Evidence: `src/controllers/household_controller.ts` (**inferred**)
- Defines the Settlement Controller type or service — Evidence: `src/controllers/settlement_controller.ts` (**inferred**)
- Defines the User Controller type or service — Evidence: `src/controllers/user_controller.ts` (**inferred**)
- Defines the Database type or service — Evidence: `src/db/database.ts` (**inferred**)
- Builds filtered expenses query — Evidence: `src/db/queries/expense/expense_query.ts` (**inferred**)
- Defines the Expense type or service — Evidence: `src/db/schemas/expense_db_schemas.ts` (**inferred**)
- Defines the New Expense type or service — Evidence: `src/db/schemas/expense_db_schemas.ts` (**inferred**)
- Defines the Expense Split type or service — Evidence: `src/db/schemas/expense_db_schemas.ts` (**inferred**)
- Defines the New Expense Split type or service — Evidence: `src/db/schemas/expense_db_schemas.ts` (**inferred**)
- Defines the Expense Attachment type or service — Evidence: `src/db/schemas/expense_db_schemas.ts` (**inferred**)
- Defines the New Expense Attachment type or service — Evidence: `src/db/schemas/expense_db_schemas.ts` (**inferred**)
- Defines the Expense Category type or service — Evidence: `src/db/schemas/expense_db_schemas.ts` (**inferred**)
- Defines the New Expense Category type or service — Evidence: `src/db/schemas/expense_db_schemas.ts` (**inferred**)
- Defines the Household Expense type or service — Evidence: `src/db/schemas/expense_db_schemas.ts` (**inferred**)
- Defines the Household type or service — Evidence: `src/db/schemas/household_db_schemas.ts` (**inferred**)
- Defines the New Household type or service — Evidence: `src/db/schemas/household_db_schemas.ts` (**inferred**)
- Defines the Household Member type or service — Evidence: `src/db/schemas/household_db_schemas.ts` (**inferred**)
- Defines the New Household Member type or service — Evidence: `src/db/schemas/household_db_schemas.ts` (**inferred**)
- Defines the Payment Method type or service — Evidence: `src/db/schemas/household_db_schemas.ts` (**inferred**)
- Defines the New Payment Method type or service — Evidence: `src/db/schemas/household_db_schemas.ts` (**inferred**)
- Defines the Bank Payment Method type or service — Evidence: `src/db/schemas/household_db_schemas.ts` (**inferred**)
- Defines the New Bank Payment Method type or service — Evidence: `src/db/schemas/household_db_schemas.ts` (**inferred**)

## Tracked files
- **148 tracked files** in total
- Source: 132; tests: 0; documentation: 1; configuration: 6; assets/other: 9

## Repository structure
- Inspected 93 source files from the cloned repository (bounded for safety).
- `.vscode/` (2 tracked files)
- `configs/` (2 tracked files)
- `data/` (1 tracked files)
- `scripts/` (1 tracked files)
- `src/` (135 tracked files)
- `src/constants/sql.ts`
- `src/controllers/expense_controller.ts`
- `src/controllers/household_controller.ts`
- `src/controllers/settlement_controller.ts`
- `src/controllers/user_controller.ts`
- `src/db/context.ts`
- `src/db/database.ts`
- `src/db/queries/expense/expense_category_query.ts`
- `src/db/queries/expense/expense_query.ts`
- `src/db/queries/expense/expense_split_query.ts`
- `src/db/queries/household/household_query.ts`
- `src/db/queries/microservice/microservice_query.ts`
- `src/db/queries/permission/permission_query.ts`
- `src/db/queries/settlement/settlement_config_category_query.ts`
- `src/db/queries/settlement/settlement_config_expense_type_query.ts`
- `src/db/queries/settlement/settlement_config_query.ts`
- `src/db/queries/settlement/settlement_participant_query.ts`
- `src/db/queries/settlement/settlement_query.ts`
- `src/db/queries/user/user_group_query.ts`
- `src/db/queries/user/user_permission_query.ts`

## Implementation and test evidence
- Persists or queries application data — Evidence: `src/controllers/household_controller.ts`, `src/db/queries/expense/expense_category_query.ts`, `src/db/queries/expense/expense_query.ts`, `src/db/queries/expense/expense_split_query.ts`, `src/db/queries/household/household_query.ts` (**inferred**)
- Defines the Expense Controller type or service — Evidence: `src/controllers/expense_controller.ts` (**inferred**)
- Defines the Household Controller type or service — Evidence: `src/controllers/household_controller.ts` (**inferred**)
- Defines the Settlement Controller type or service — Evidence: `src/controllers/settlement_controller.ts` (**inferred**)
- Defines the User Controller type or service — Evidence: `src/controllers/user_controller.ts` (**inferred**)
- Defines the Database type or service — Evidence: `src/db/database.ts` (**inferred**)
- Builds filtered expenses query — Evidence: `src/db/queries/expense/expense_query.ts` (**inferred**)
- Defines the Expense type or service — Evidence: `src/db/schemas/expense_db_schemas.ts` (**inferred**)
- Defines the New Expense type or service — Evidence: `src/db/schemas/expense_db_schemas.ts` (**inferred**)
- Defines the Expense Split type or service — Evidence: `src/db/schemas/expense_db_schemas.ts` (**inferred**)
- Defines the New Expense Split type or service — Evidence: `src/db/schemas/expense_db_schemas.ts` (**inferred**)
- Defines the Expense Attachment type or service — Evidence: `src/db/schemas/expense_db_schemas.ts` (**inferred**)
- Defines the New Expense Attachment type or service — Evidence: `src/db/schemas/expense_db_schemas.ts` (**inferred**)
- Defines the Expense Category type or service — Evidence: `src/db/schemas/expense_db_schemas.ts` (**inferred**)
- Defines the New Expense Category type or service — Evidence: `src/db/schemas/expense_db_schemas.ts` (**inferred**)
- Defines the Household Expense type or service — Evidence: `src/db/schemas/expense_db_schemas.ts` (**inferred**)
- Defines the Household type or service — Evidence: `src/db/schemas/household_db_schemas.ts` (**inferred**)
- Defines the New Household type or service — Evidence: `src/db/schemas/household_db_schemas.ts` (**inferred**)
- Defines the Household Member type or service — Evidence: `src/db/schemas/household_db_schemas.ts` (**inferred**)
- Defines the New Household Member type or service — Evidence: `src/db/schemas/household_db_schemas.ts` (**inferred**)
- Defines the Payment Method type or service — Evidence: `src/db/schemas/household_db_schemas.ts` (**inferred**)
- Defines the New Payment Method type or service — Evidence: `src/db/schemas/household_db_schemas.ts` (**inferred**)
- Defines the Bank Payment Method type or service — Evidence: `src/db/schemas/household_db_schemas.ts` (**inferred**)
- Defines the New Bank Payment Method type or service — Evidence: `src/db/schemas/household_db_schemas.ts` (**inferred**)

## Frameworks and technology stack
- TypeScript — Evidence: `main.ts`, `main_test.ts`, `scripts/migrate.ts`, `src/api/http_client.ts`, `src/constants/api_paths.ts`, `src/constants/sql.ts`, `src/controllers/expense_controller.ts`, `src/controllers/household_controller.ts`

## Design and architecture patterns
- Unknown: no supported design-pattern evidence was found.

## Evidence and limitations
- Reports are based on a fresh shallow clone. Safe, bounded documentation, manifests, source, and test files are inspected locally; raw source code is never copied into this report.
- README text and the GitHub description are excluded from project-purpose and feature claims because they may be stale.
- No supported architecture-pattern evidence was found; no pattern is asserted.
