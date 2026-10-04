# One browser-facing API, and everything else behind signed internal calls

- **Category:** Architecture
- **Source ID:** canton101-service-boundaries
- **URL:** https://www.lst97.dev/projects/canton-101
- **Visibility:** Private

Canto101 is three cooperating pieces deployed together: an API server that owns the product, a learner-facing web app, and a set of small Python micro-services for the language, AI and media work the API server does not want to host.

The rule that shapes the whole arrangement is short: the web app is the only browser-facing surface, and every request from the browser is answered by the API server. No micro-service is exposed. The API server fans out internally as needed, and the browser never learns that it happened.

## Why the API server is the only answer

A learner searching a word, opening a song, or submitting a practice attempt sends a request to the API server. The API server decides whether that request needs a micro-service, calls it, and returns the answer.

The alternative — letting the browser call an alignment or translation service directly — fails in three ways at once. It publishes an internal service to the internet. It requires credentials that then live in browser code. And it makes a compromised browser session able to invoke expensive model work directly, which is both an abuse surface and a bill.

Keeping every micro-service unreachable from outside the deployment means a leaked browser token buys an attacker exactly what it is supposed to buy: the read and write operations an authenticated learner is allowed to perform, and nothing more.

## The micro-services and why each is separate

The micro-services are small and single-purpose. There is one for NLP — tokenisation, part of speech and romanisation. One for alignment, which produces word-level lyric timings. One for audio retrieval. One for enrichment — translation, themes, difficulty. One for speech synthesis. One for image generation.

Each earns its separation by the same criterion: the work is slow, bursty, or independently failing. Alignment depends on model weights and a Python runtime. Synthesis loads an audio model. Image generation calls an external provider. Enrichment is a batch operation over content. None of these has the same reliability or resource profile as serving a dictionary lookup, and coupling them would mean a model that fails to load also takes down search.

Keeping them small is a second deliberate choice. Each is one concern with a contract, so it can be started only when the deployment needs it, scaled independently, and replaced without touching the rest.

## Signed internal calls

Internal calls are authenticated so nothing is callable from outside the deployment. Each request from the API server to a micro-service is signed, and a micro-service rejects anything that does not verify. A request captured from inside the network is therefore not replayable against a micro-service by whoever captured it.

Authentication is one property of the boundary; the other is reachability. The micro-services are never published — no port is exposed to the internet, and the edge proxy does not route to them — so they are reachable only over the private network from the API server. Signing handles the case where something inside the boundary is compromised; unpublishing handles everything else.

## The layering inside the API server

The API server is organised in four layers, and the rule between them is one sentence: domain knows nothing about frameworks, application orchestrates, infrastructure implements the ports, and interface is the only layer that speaks HTTP.

The domain layer holds business rules, entities and ports in pure TypeScript — no framework, no database client, no HTTP types. The application layer holds use cases that orchestrate domain logic. Infrastructure implements the ports: database repositories, auth, storage, generated service clients, observability. The interface layer holds the routes, middleware and API schemas.

The value of the rule is testability of the part that matters. Business rules are testable without a database or a request, because they do not know either exists. And because dependencies point inward, swapping the storage backend or adding a second one does not reach into the domain.

## Why the web app is thin

The learner-facing app is a single-process application: a React single-page app plus a thin backend for auth, rewards, analytics and provider proxies. It reads all learning content from the API server.

That division is deliberate. Learning content — the lexicon, the lyrics, sentences, talk lessons — is owned by the API server and served from there, so there is one copy of the truth and one place where it is seeded. The web app owns only what is inherently per-session: who is signed in, their progress, and the analytics that describe their own behaviour.

The result is a learner-facing app that can be replaced or restyled without touching the content, and an API that can gain a second surface without touching the learner experience.