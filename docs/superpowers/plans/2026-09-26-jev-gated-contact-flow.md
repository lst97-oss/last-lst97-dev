# Jev-Gated Contact Flow Implementation Plan

**Goal:** Add a persistent Jev-screened email, bug report, and feature request workflow to chat, with explicit state confirmations, client-side draft values, deterministic validation, review, and email delivery. Bug and feature reports are refined by OpenRouter for clarity; the owner email uses the refined version and attaches the original report as a PDF.

**Architecture:** Keep normal chat routing in its existing service. Add contact intent to the existing normal-chat Jev call and route confirmed contact actions through a dedicated contact workflow module. Put only mode, phase, template, and a non-reversible review approval binding in the versioned signed context. Keep user-entered fields in the request and UI state only. Reuse the contact email sender, Turnstile verifier, and rate-limit infrastructure. Persist random approval claims without contact content to prevent replay.

**Global constraints:**

- Existing user work is heavily uncommitted; preserve it and make narrow edits.
- Contact mode receives only the fresh contact session, never normal chat history.
- Contact content is sent to Jev for classification by user choice, but never to Discord diagnostics or application logs.
- Model failures, invalid/uncertain decisions, server validation failures, and rejected safety decisions do not advance state or send email.
- Only explicit confirmation changes mode, locks a template, discards, or sends.
- Keep all user content escaped in fixed email markup and plain text.

## Tasks

1. Add shared typed templates, field definitions, server validation, and tests for completeness, email syntax, unknown keys, and field bounds.
2. Version signed chat state with mode, phase, template, and review approval metadata; old tokens default to normal chat. Add review-draft binding and signer tests.
3. Add Jev contact intent to the existing chat decision call. Add a single contact workflow decision call combining safety, template intent, and field presence; test representative labels and fail-closed paths.
4. Add typed contact email templates using the site palette and escaping. Refine bug and feature report fields through strict OpenRouter structured output; keep email messages unchanged. Reuse contact services, Turnstile, contact rate limits, and an atomic content-free approval claim. Send the refined report in the owner email and attach the original wording as a generated PDF; cover delivery and receipt failure paths.
5. Add contact workflow actions and SSE events for confirmation, template, form completeness, review, discard, and delivery. Preserve state on errors and reject mode bypasses.
6. Add accessible inline chat cards, locked templates, draft editing, Turnstile, explicit send/discard confirmations, and updated privacy disclosure.
7. Update chat architecture documentation. Run focused tests, typecheck/build checks, inspect the final diff, and record remaining limits.

## Review focus

- Legacy tokens and normal chat remain normal unless Jev selects contact and the user confirms.
- Starting contact drops prior transcript and topic data; contact Jev requests contain only current contact inputs.
- Template choices remain locked until confirmed discard starts a blank chat.
- Missing, invalid, unsafe, uncertain, out-of-scope, or Jev-unavailable input never advances or sends.
- Review confirmation binds to exact field values; duplicate requests cause at most one email attempt.
- Issue and feature review shows both refined body and original source; confirmation binds both versions and the original PDF is generated from validated text.
- Turnstile and contact rate limits guard delivery; receipt failure does not undo operator delivery.
- Email HTML uses fixed markup, inline theme styles, escaped user values, and a plain-text alternative.
- Contact fields and message bodies are absent from signed tokens, logs, and Discord diagnostics.
