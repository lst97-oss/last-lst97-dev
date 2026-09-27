# cantolyrics_refactor

## Retrieval summary

- Relationship: Owned repository.
- Repository: lst97/cantolyrics_refactor.
- Purpose: Source implementation indicates these responsibilities: implements authentication; uses a distributed or explicit cache; gets real cost; builds headers; generates content.
- Observed capabilities: Implements authentication; Uses a distributed or explicit cache; Defines the Settings type or service
- Technology: React, TypeScript, Python
- Software kinds: web_app, api_backend
- Curated topics: cantonese, lyrics

## Repository metadata
- **Repository:** lst97/cantolyrics_refactor
- **Visibility:** private
- **URL:** https://github.com/lst97/cantolyrics_refactor
- **Default branch:** main
- **Created:** 2026-04-23T13:16:16Z
- **Last updated:** 2026-04-23T13:16:16Z
- **Primary language:** TypeScript
- **Stars / forks:** 0 / 0
- **Topics:** No GitHub topics are set.
- **Software kinds:** `web_app`, `api_backend`
- **Curated topics:** `cantonese`, `lyrics`

### GitHub language breakdown
- TypeScript (240,914 bytes)
- Python (81,998 bytes)
- PLpgSQL (16,747 bytes)
- CSS (3,166 bytes)
- HTML (3,037 bytes)
- Shell (362 bytes)

## Project purpose (source-derived)
Source implementation indicates these responsibilities: implements authentication; uses a distributed or explicit cache; gets real cost; builds headers; generates content.
Evidence: `backend/app/services/billing_service.py`, `backend/app/services/supabase_client.py`, `backend/app/config.py`, `backend/app/schemas.py` (**inferred**)

## Problem addressed
Unknown: source code does not explicitly state the problem addressed.
Evidence: none

## Features observed in source and tests
- Implements authentication — Evidence: `backend/app/services/billing_service.py` (**inferred**)
- Uses a distributed or explicit cache — Evidence: `backend/app/services/supabase_client.py` (**inferred**)
- Defines the Settings type or service — Evidence: `backend/app/config.py` (**inferred**)
- Defines the Config type or service — Evidence: `backend/app/config.py` (**inferred**)
- Defines the Gemini Request type or service — Evidence: `backend/app/schemas.py` (**inferred**)
- Defines the Gemini Response type or service — Evidence: `backend/app/schemas.py` (**inferred**)
- Defines the Stripe Create Checkout Session Request type or service — Evidence: `backend/app/schemas.py` (**inferred**)
- Defines the Stripe Create Checkout Session Response type or service — Evidence: `backend/app/schemas.py` (**inferred**)
- Defines the Stripe Create Portal Session Request type or service — Evidence: `backend/app/schemas.py` (**inferred**)
- Defines the Stripe Create Portal Session Response type or service — Evidence: `backend/app/schemas.py` (**inferred**)
- Gets real cost — Evidence: `backend/app/services/billing_service.py` (**inferred**)
- Defines the Billing Service type or service — Evidence: `backend/app/services/billing_service.py` (**inferred**)
- Builds headers — Evidence: `backend/app/services/gemini_client.py` (**inferred**)
- Generates content — Evidence: `backend/app/services/gemini_client.py` (**inferred**)
- Generates content stream — Evidence: `backend/app/services/gemini_client.py` (**inferred**)
- Defines the Gemini Response Wrapper type or service — Evidence: `backend/app/services/gemini_client.py` (**inferred**)
- Defines the Gemini Stream Chunk type or service — Evidence: `backend/app/services/gemini_client.py` (**inferred**)
- Gets supabase — Evidence: `backend/app/services/supabase_client.py` (**inferred**)

## Tracked files
- **44 tracked files** in total
- Source: 14; tests: 0; documentation: 4; configuration: 9; assets/other: 17

## Repository structure
- Inspected 12 source files from the cloned repository (bounded for safety).
- `backend/` (12 tracked files)
- `frontend/` (11 tracked files)
- `supabase/` (15 tracked files)
- `frontend/vite.config.ts`
- `backend/app/__init__.py`
- `backend/app/config.py`
- `backend/app/schemas.py`
- `backend/app/services/__init__.py`
- `backend/app/services/billing_service.py`
- `backend/app/services/gemini_client.py`
- `backend/app/services/supabase_client.py`
- `frontend/i18n.ts`
- `frontend/index.html`
- `frontend/styles.css`
- `frontend/vite.config.ts`

## Implementation and test evidence
- Implements authentication — Evidence: `backend/app/services/billing_service.py` (**inferred**)
- Uses a distributed or explicit cache — Evidence: `backend/app/services/supabase_client.py` (**inferred**)
- Defines the Settings type or service — Evidence: `backend/app/config.py` (**inferred**)
- Defines the Config type or service — Evidence: `backend/app/config.py` (**inferred**)
- Defines the Gemini Request type or service — Evidence: `backend/app/schemas.py` (**inferred**)
- Defines the Gemini Response type or service — Evidence: `backend/app/schemas.py` (**inferred**)
- Defines the Stripe Create Checkout Session Request type or service — Evidence: `backend/app/schemas.py` (**inferred**)
- Defines the Stripe Create Checkout Session Response type or service — Evidence: `backend/app/schemas.py` (**inferred**)
- Defines the Stripe Create Portal Session Request type or service — Evidence: `backend/app/schemas.py` (**inferred**)
- Defines the Stripe Create Portal Session Response type or service — Evidence: `backend/app/schemas.py` (**inferred**)
- Gets real cost — Evidence: `backend/app/services/billing_service.py` (**inferred**)
- Defines the Billing Service type or service — Evidence: `backend/app/services/billing_service.py` (**inferred**)
- Builds headers — Evidence: `backend/app/services/gemini_client.py` (**inferred**)
- Generates content — Evidence: `backend/app/services/gemini_client.py` (**inferred**)
- Generates content stream — Evidence: `backend/app/services/gemini_client.py` (**inferred**)
- Defines the Gemini Response Wrapper type or service — Evidence: `backend/app/services/gemini_client.py` (**inferred**)
- Defines the Gemini Stream Chunk type or service — Evidence: `backend/app/services/gemini_client.py` (**inferred**)
- Gets supabase — Evidence: `backend/app/services/supabase_client.py` (**inferred**)

## Frameworks and technology stack
- React — Evidence: `frontend/index.html`
- TypeScript — Evidence: `frontend/i18n.ts`, `frontend/index.tsx`, `frontend/vite.config.ts`, `middleware.ts`, `supabase/functions/cantonese-lyrics-api/index.ts`
- Python — Evidence: `backend/app/__init__.py`, `backend/app/config.py`, `backend/app/main.py`, `backend/app/schemas.py`, `backend/app/services/__init__.py`, `backend/app/services/billing_service.py`, `backend/app/services/gemini_client.py`, `backend/app/services/stripe_service.py`

## Design and architecture patterns
- Unknown: no supported design-pattern evidence was found.

## Evidence and limitations
- Reports are based on a fresh shallow clone. Safe, bounded documentation, manifests, source, and test files are inspected locally; raw source code is never copied into this report.
- README text and the GitHub description are excluded from project-purpose and feature claims because they may be stale.
- No supported architecture-pattern evidence was found; no pattern is asserted.
